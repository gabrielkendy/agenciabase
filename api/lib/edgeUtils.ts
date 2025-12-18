// ============================================
// EDGE FUNCTIONS UTILITIES
// Retry, Circuit Breaker, Logging, Validation
// ============================================

// ============================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const { maxRetries, baseDelayMs, maxDelayMs, retryableStatuses } = {
    ...defaultRetryConfig,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!retryableStatuses.includes(response.status)) {
        return response;
      }

      if (attempt === maxRetries) {
        return response;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// ============================================
// CIRCUIT BREAKER
// ============================================
interface CircuitState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  successesInHalfOpen: number;
}

const circuits = new Map<string, CircuitState>();

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenSuccesses: number;
}

const defaultCircuitConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  halfOpenSuccesses: 2,
};

export const circuitBreaker = {
  getState: (service: string): CircuitState => {
    if (!circuits.has(service)) {
      circuits.set(service, {
        failures: 0,
        lastFailure: 0,
        state: 'closed',
        successesInHalfOpen: 0,
      });
    }
    return circuits.get(service)!;
  },

  isOpen: (service: string, config: Partial<CircuitBreakerConfig> = {}): boolean => {
    const { resetTimeoutMs } = { ...defaultCircuitConfig, ...config };
    const state = circuitBreaker.getState(service);

    if (state.state === 'open') {
      // Check if we should transition to half-open
      if (Date.now() - state.lastFailure > resetTimeoutMs) {
        state.state = 'half-open';
        state.successesInHalfOpen = 0;
        return false;
      }
      return true;
    }

    return false;
  },

  recordSuccess: (service: string, config: Partial<CircuitBreakerConfig> = {}) => {
    const { halfOpenSuccesses } = { ...defaultCircuitConfig, ...config };
    const state = circuitBreaker.getState(service);

    if (state.state === 'half-open') {
      state.successesInHalfOpen++;
      if (state.successesInHalfOpen >= halfOpenSuccesses) {
        state.state = 'closed';
        state.failures = 0;
      }
    } else {
      state.failures = Math.max(0, state.failures - 1);
    }
  },

  recordFailure: (service: string, config: Partial<CircuitBreakerConfig> = {}) => {
    const { failureThreshold } = { ...defaultCircuitConfig, ...config };
    const state = circuitBreaker.getState(service);

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= failureThreshold) {
      state.state = 'open';
    }

    if (state.state === 'half-open') {
      state.state = 'open';
    }
  },

  reset: (service: string) => {
    circuits.delete(service);
  },
};

// ============================================
// REQUEST VALIDATION (ZOD-LIKE)
// ============================================
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validate = {
  string: (value: any, field: string, options?: { minLength?: number; maxLength?: number; pattern?: RegExp }): string[] => {
    const errors: string[] = [];

    if (typeof value !== 'string') {
      errors.push(`${field} must be a string`);
      return errors;
    }

    if (options?.minLength && value.length < options.minLength) {
      errors.push(`${field} must be at least ${options.minLength} characters`);
    }

    if (options?.maxLength && value.length > options.maxLength) {
      errors.push(`${field} must be at most ${options.maxLength} characters`);
    }

    if (options?.pattern && !options.pattern.test(value)) {
      errors.push(`${field} has invalid format`);
    }

    return errors;
  },

  number: (value: any, field: string, options?: { min?: number; max?: number }): string[] => {
    const errors: string[] = [];

    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${field} must be a number`);
      return errors;
    }

    if (options?.min !== undefined && value < options.min) {
      errors.push(`${field} must be at least ${options.min}`);
    }

    if (options?.max !== undefined && value > options.max) {
      errors.push(`${field} must be at most ${options.max}`);
    }

    return errors;
  },

  enum: (value: any, field: string, allowedValues: string[]): string[] => {
    if (!allowedValues.includes(value)) {
      return [`${field} must be one of: ${allowedValues.join(', ')}`];
    }
    return [];
  },

  required: (value: any, field: string): string[] => {
    if (value === undefined || value === null || value === '') {
      return [`${field} is required`];
    }
    return [];
  },

  url: (value: any, field: string): string[] => {
    if (typeof value !== 'string') {
      return [`${field} must be a string`];
    }
    try {
      new URL(value);
      return [];
    } catch {
      return [`${field} must be a valid URL`];
    }
  },

  base64: (value: any, field: string): string[] => {
    if (typeof value !== 'string') {
      return [`${field} must be a string`];
    }
    // Check for data URL or raw base64
    if (value.startsWith('data:')) {
      return [];
    }
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(value) || value.length < 10) {
      return [`${field} must be valid base64`];
    }
    return [];
  },
};

// ============================================
// STRUCTURED LOGGING
// ============================================
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  action: string;
  duration?: number;
  userId?: string;
  ip?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export const structuredLog = {
  info: (service: string, action: string, metadata?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service,
      action,
      metadata,
    };
    console.log(JSON.stringify(entry));
  },

  warn: (service: string, action: string, metadata?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      service,
      action,
      metadata,
    };
    console.warn(JSON.stringify(entry));
  },

  error: (service: string, action: string, error: any, metadata?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      service,
      action,
      error: error instanceof Error ? error.message : String(error),
      metadata,
    };
    console.error(JSON.stringify(entry));
  },

  request: (service: string, action: string, startTime: number, success: boolean, metadata?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? 'info' : 'error',
      service,
      action,
      duration: Date.now() - startTime,
      metadata,
    };
    console.log(JSON.stringify(entry));
  },
};

// ============================================
// RATE LIMITING (EDGE)
// ============================================
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

export const edgeRateLimit = {
  check: (key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetIn: number } => {
    const now = Date.now();
    const entry = rateLimits.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, resetIn: windowMs };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetAt - now };
  },

  headers: (remaining: number, resetIn: number, limit: number): Record<string, string> => ({
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
  }),
};

// ============================================
// RESPONSE HELPERS
// ============================================
export const jsonResponse = (data: any, status: number = 200, headers: Record<string, string> = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  });
};

export const errorResponse = (message: string, status: number = 500, headers: Record<string, string> = {}) => {
  return jsonResponse({ success: false, error: message }, status, headers);
};

export const successResponse = <T>(data: T, headers: Record<string, string> = {}) => {
  return jsonResponse({ success: true, data }, 200, headers);
};

// ============================================
// CORS HANDLER
// ============================================
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Request-ID',
  'Access-Control-Max-Age': '86400',
};

export const handleCors = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
};

// ============================================
// REQUEST ID
// ============================================
export const generateRequestId = (): string => {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================
// SECURITY HEADERS
// ============================================
export const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};
