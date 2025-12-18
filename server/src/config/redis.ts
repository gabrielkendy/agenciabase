import { Redis } from 'ioredis';
import { config } from './index.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

export function getRedisConnection(): Redis {
  return getRedisClient();
}

export async function initializeRedis(): Promise<Redis> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = config.redis.url;

  // Upstash Redis connection
  if (redisUrl.includes('upstash.io')) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: {
        rejectUnauthorized: false,
      },
    });
  } else {
    // Local Redis
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  // Event handlers
  redisClient.on('error', (err: Error) => {
    console.error('Redis connection error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected');
  });

  redisClient.on('ready', () => {
    console.log('Redis ready');
  });

  // Test connection
  try {
    await redisClient.ping();
    console.log('Redis ping successful');
  } catch (error) {
    console.error('Redis ping failed:', error);
    throw error;
  }

  return redisClient;
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    if (!redisClient) {
      await initializeRedis();
    }
    await redisClient!.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Export redis instance getter
export const redis = {
  get client(): Redis {
    return getRedisClient();
  },
  quit: closeRedis,
};

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const client = getRedisClient();
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, data);
    } else {
      await client.set(key, data);
    }
  },

  async del(key: string): Promise<void> {
    const client = getRedisClient();
    await client.del(key);
  },

  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    return (await client.exists(key)) === 1;
  },

  async incr(key: string): Promise<number> {
    const client = getRedisClient();
    return client.incr(key);
  },

  async expire(key: string, seconds: number): Promise<void> {
    const client = getRedisClient();
    await client.expire(key, seconds);
  },
};

export default cache;
