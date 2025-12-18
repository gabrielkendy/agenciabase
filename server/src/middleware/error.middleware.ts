import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Middleware de tratamento de erros
 */
export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Log do erro
  if (statusCode >= 500) {
    logger.error({
      err,
      req: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
      },
    }, `Server error: ${err.message}`);
  } else {
    logger.warn({
      code,
      message: err.message,
      path: req.path,
    }, `Client error: ${err.message}`);
  }

  // Resposta
  const response: Record<string, unknown> = {
    success: false,
    error: err.message || 'Internal server error',
    code,
  };

  // Incluir detalhes apenas em desenvolvimento
  if (config.nodeEnv === 'development' && err.details) {
    response.details = err.details;
  }

  // Incluir stack trace apenas em desenvolvimento
  if (config.nodeEnv === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Middleware para capturar rotas não encontradas
 */
export function notFoundMiddleware(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
}

/**
 * Helper para criar erros customizados
 */
export function createError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: unknown
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Wrapper para async handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorMiddleware;
