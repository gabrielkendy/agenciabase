import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware de audit logging
 */
export async function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Gerar request ID
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Capturar início
  const startTime = Date.now();

  // Interceptar resposta
  const originalJson = res.json.bind(res);

  res.json = (data: unknown) => {
    const duration = Date.now() - startTime;

    // Log estruturado
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.userId,
      organizationId: req.user?.organizationId,
    }, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);

    // Audit log para operações importantes (POST, PUT, DELETE)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      // Fire and forget - não bloquear a resposta
      saveAuditLog({
        organizationId: req.user?.organizationId,
        userId: req.user?.userId,
        action: `${req.method.toLowerCase()}`,
        resourceType: extractResourceType(req.path),
        description: `${req.method} ${req.path}`,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
        requestId,
        status: res.statusCode < 400 ? 'success' : 'failure',
      }).catch(err => {
        logger.error('Failed to save audit log:', err);
      });
    }

    return originalJson(data);
  };

  next();
}

interface AuditLogEntry {
  organizationId?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status?: string;
  errorMessage?: string;
}

async function saveAuditLog(entry: AuditLogEntry): Promise<void> {
  await supabase.from('audit_logs').insert({
    organization_id: entry.organizationId,
    user_id: entry.userId,
    action: entry.action,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    description: entry.description,
    old_values: entry.oldValues,
    new_values: entry.newValues,
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
    request_id: entry.requestId,
    status: entry.status,
    error_message: entry.errorMessage,
  });
}

function extractResourceType(path: string): string {
  const parts = path.split('/').filter(Boolean);
  // /api/v1/images -> images
  // /api/ai/image -> ai.image
  if (parts[0] === 'api' && parts.length > 1) {
    return parts.slice(1).join('.');
  }
  return parts[0] || 'unknown';
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export default auditMiddleware;
