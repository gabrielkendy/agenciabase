import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger.js';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validate request using Zod schema
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = target === 'body' ? req.body :
                   target === 'query' ? req.query :
                   req.params;

      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = formatZodErrors(result.error);

        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      // Replace with parsed/transformed data
      if (target === 'body') {
        req.body = result.data;
      } else if (target === 'query') {
        req.query = result.data;
      } else {
        req.params = result.data;
      }

      next();
    } catch (error) {
      logger.error('Validation error:', error);
      res.status(500).json({ error: 'Validation failed' });
    }
  };
}

/**
 * Validate multiple targets at once
 */
export function validateAll(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: ValidationError[] = [];

    for (const [target, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      const data = target === 'body' ? req.body :
                   target === 'query' ? req.query :
                   req.params;

      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = formatZodErrors(result.error, target);
        allErrors.push(...errors);
      } else {
        // Replace with parsed data
        if (target === 'body') {
          req.body = result.data;
        } else if (target === 'query') {
          req.query = result.data;
        } else {
          req.params = result.data;
        }
      }
    }

    if (allErrors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: allErrors,
      });
      return;
    }

    next();
  };
}

/**
 * Format Zod errors into a consistent structure
 */
function formatZodErrors(error: ZodError, prefix?: string): ValidationError[] {
  return error.errors.map(err => ({
    field: prefix
      ? `${prefix}.${err.path.join('.')}`
      : err.path.join('.') || 'root',
    message: err.message,
    code: err.code,
  }));
}

// ============ Common Schemas ============

export const schemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  // UUID parameter
  uuid: z.object({
    id: z.string().uuid(),
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  // Search
  search: z.object({
    q: z.string().min(1).max(100).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Email
  email: z.string().email(),

  // Password
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),

  // URL
  url: z.string().url(),

  // Positive number
  positiveNumber: z.coerce.number().positive(),

  // Non-empty string
  nonEmptyString: z.string().min(1).trim(),
};

// ============ Helpers ============

/**
 * Create a schema with optional fields
 */
export function optional<T extends ZodSchema>(schema: T): z.ZodOptional<T> {
  return schema.optional();
}

/**
 * Create a schema with default value
 */
export function withDefault<T extends ZodSchema>(
  schema: T,
  defaultValue: z.infer<T>
): z.ZodDefault<T> {
  return schema.default(defaultValue);
}

/**
 * Validate and transform a value
 */
export async function validateAsync<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: ValidationError[] }> {
  const result = await schema.safeParseAsync(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: formatZodErrors(result.error) };
}

export default validate;
