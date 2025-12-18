import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { decrypt } from '../utils/encryption.js';

interface ApiKeyPayload {
  organizationId: string;
  userId: string;
  keyId: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyPayload;
    }
  }
}

/**
 * Validate API Key from header
 */
export async function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({ error: 'API key is required' });
      return;
    }

    // API keys are prefixed with "sk_" for secret keys
    if (!apiKey.startsWith('sk_')) {
      res.status(401).json({ error: 'Invalid API key format' });
      return;
    }

    // Hash the key to compare with stored hash
    const crypto = await import('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Find the API key in database
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select(`
        id,
        organization_id,
        user_id,
        permissions,
        last_used_at,
        expires_at,
        is_active
      `)
      .eq('key_hash', keyHash)
      .single();

    if (error || !keyData) {
      logger.warn('Invalid API key attempt', {
        keyPrefix: apiKey.substring(0, 10),
        ip: req.ip,
      });
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Check if key is active
    if (!keyData.is_active) {
      res.status(401).json({ error: 'API key is disabled' });
      return;
    }

    // Check if key is expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      res.status(401).json({ error: 'API key has expired' });
      return;
    }

    // Update last used timestamp (async, don't wait)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id)
      .then(() => {});

    // Attach API key info to request
    req.apiKey = {
      organizationId: keyData.organization_id,
      userId: keyData.user_id,
      keyId: keyData.id,
      permissions: keyData.permissions || [],
    };

    logger.debug('API key validated', {
      keyId: keyData.id,
      organizationId: keyData.organization_id,
    });

    next();
  } catch (error) {
    logger.error('API key middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Require specific permission from API key
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({ error: 'API key is required' });
      return;
    }

    const hasPermission =
      req.apiKey.permissions.includes('*') ||
      req.apiKey.permissions.includes(permission);

    if (!hasPermission) {
      res.status(403).json({
        error: `Permission denied: ${permission} required`,
      });
      return;
    }

    next();
  };
}

/**
 * Optional API key - doesn't fail if missing
 */
export async function optionalApiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    next();
    return;
  }

  // If API key is provided, validate it
  await apiKeyMiddleware(req, res, next);
}

export default apiKeyMiddleware;
