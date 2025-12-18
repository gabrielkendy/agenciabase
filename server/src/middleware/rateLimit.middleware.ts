import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { cache, getRedisClient } from '../config/redis.js';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

/**
 * Rate limiting por plano de assinatura
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const redis = getRedisClient();

    // Identificador (preferência: org > user > ip)
    const identifier = req.user?.organizationId
      || req.user?.userId
      || req.ip
      || 'anonymous';

    const plan = req.user?.plan || 'free';
    const maxRequests = config.rateLimit.maxRequests[plan] || 10;

    const windowMs = config.rateLimit.windowMs;
    const windowKey = `rate:${identifier}:${Math.floor(Date.now() / windowMs)}`;

    // Incrementar contador
    const current = await redis.incr(windowKey);

    // Definir expiração na primeira requisição da janela
    if (current === 1) {
      await redis.expire(windowKey, Math.ceil(windowMs / 1000));
    }

    // Headers de rate limit
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / windowMs) * windowMs);

    // Verificar limite
    if (current > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    next();
  } catch (error) {
    // Se Redis falhar, permitir a requisição (fail open)
    console.error('Rate limit error:', error);
    next();
  }
}

/**
 * Rate limiting específico para endpoints
 */
export function createRateLimiter(options: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = getRedisClient();
      const identifier = req.user?.organizationId || req.ip || 'anonymous';
      const endpoint = req.path;

      const windowKey = `rate:${identifier}:${endpoint}:${Math.floor(Date.now() / options.windowMs)}`;

      const current = await redis.incr(windowKey);

      if (current === 1) {
        await redis.expire(windowKey, Math.ceil(options.windowMs / 1000));
      }

      if (current > options.max) {
        return res.status(429).json({
          error: 'Too many requests to this endpoint',
          code: 'ENDPOINT_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(options.windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      next();
    }
  };
}

// Rate limiters pré-configurados
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por minuto para AI
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas de login
});

export default rateLimitMiddleware;
