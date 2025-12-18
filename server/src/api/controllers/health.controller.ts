import { Request, Response } from 'express';
import { config } from '../../config/index.js';
import { testDatabaseConnection } from '../../config/database.js';
import { getRedisClient } from '../../config/redis.js';
import { AIProviderFactory } from '../../services/ai/index.js';

export const healthController = {
  /**
   * Health check básico
   */
  async check(req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
      },
    });
  },

  /**
   * Health check detalhado
   */
  async detailed(req: Request, res: Response) {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // Check database
    const dbStart = Date.now();
    try {
      const dbOk = await testDatabaseConnection();
      checks.database = {
        status: dbOk ? 'healthy' : 'unhealthy',
        latency: Date.now() - dbStart,
      };
    } catch (error: any) {
      checks.database = {
        status: 'unhealthy',
        error: error.message,
      };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      const redis = getRedisClient();
      await redis.ping();
      checks.redis = {
        status: 'healthy',
        latency: Date.now() - redisStart,
      };
    } catch (error: any) {
      checks.redis = {
        status: 'unhealthy',
        error: error.message,
      };
    }

    // Check providers availability
    checks.providers = {
      status: 'info',
    };

    const providers = ['falai', 'openai', 'google', 'freepik', 'elevenlabs'] as const;
    const providerStatus: Record<string, boolean> = {};

    for (const provider of providers) {
      providerStatus[provider] = AIProviderFactory.isAvailable(provider);
    }

    // Overall status
    const isHealthy = checks.database?.status === 'healthy' && checks.redis?.status === 'healthy';

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        version: process.env.npm_package_version || '2.0.0',
        checks,
        providers: providerStatus,
      },
    });
  },

  /**
   * Readiness check (para Kubernetes/containers)
   */
  async ready(req: Request, res: Response) {
    try {
      // Check database
      const dbOk = await testDatabaseConnection();
      if (!dbOk) {
        return res.status(503).json({ ready: false, reason: 'Database not available' });
      }

      // Check Redis
      const redis = getRedisClient();
      await redis.ping();

      res.json({ ready: true });
    } catch (error: any) {
      res.status(503).json({ ready: false, reason: error.message });
    }
  },

  /**
   * Liveness check (para Kubernetes/containers)
   */
  async live(req: Request, res: Response) {
    res.json({ alive: true });
  },
};

export default healthController;
