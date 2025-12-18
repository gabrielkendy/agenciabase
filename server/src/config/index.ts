import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',
  env: process.env.NODE_ENV || 'development',

  // URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3001',

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },

  // Redis (Upstash)
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    token: process.env.REDIS_TOKEN,
  },

  // AI Providers (chaves da plataforma - fallback)
  providers: {
    freepik: {
      apiKey: process.env.FREEPIK_API_KEY,
      baseUrl: 'https://api.freepik.com/v1',
    },
    falai: {
      apiKey: process.env.FALAI_API_KEY,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    google: {
      apiKey: process.env.GEMINI_API_KEY,
    },
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY,
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
    },
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32b',
    algorithm: 'aes-256-gcm' as const,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'jwt-secret-change-in-production',
    expiresIn: '7d',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: {
      free: 10,
      starter: 30,
      professional: 60,
      business: 120,
      enterprise: 300,
    } as Record<string, number>,
  },

  // Queue
  queue: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
};

export default config;
