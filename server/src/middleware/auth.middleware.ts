import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        organizationId: string;
        email: string;
        role: string;
        plan: string;
      };
      estimatedCredits?: number;
    }
  }
}

interface JWTPayload {
  sub: string;
  email: string;
  org_id?: string;
  role?: string;
}

/**
 * Middleware de autenticação JWT
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header required',
        code: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Buscar usuário no banco
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        organization_id,
        role,
        is_active,
        organizations (
          id,
          name,
          subscriptions (
            status,
            plans (
              slug
            )
          )
        )
      `)
      .eq('auth_id', decoded.sub)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'User account is disabled',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // Extrair plano da organização
    const org = user.organizations as any;
    const subscription = org?.subscriptions?.[0];
    const plan = subscription?.plans?.slug || 'free';

    // Setar user no request
    req.user = {
      userId: user.id,
      organizationId: user.organization_id,
      email: user.email,
      role: user.role,
      plan,
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Middleware opcional de autenticação (não falha se não autenticado)
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  return authMiddleware(req, res, next);
}

/**
 * Middleware para verificar role específica
 */
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Middleware para verificar se é admin
 */
export const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Middleware para verificar se é super admin
 */
export const requireSuperAdmin = requireRole(['super_admin']);

export default authMiddleware;
