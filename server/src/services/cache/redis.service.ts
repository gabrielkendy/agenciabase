import { getRedisClient } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

type CacheSerializer = {
  serialize: (value: any) => string;
  deserialize: (value: string) => any;
};

const defaultSerializer: CacheSerializer = {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
};

export const redisService = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      if (!data) return null;
      return defaultSerializer.deserialize(data) as T;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = getRedisClient();
      const data = defaultSerializer.serialize(value);

      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, data);
      } else {
        await client.set(key, data);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  },

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      return await client.del(...keys);
    } catch (error) {
      logger.error('Redis DEL pattern error:', error);
      return 0;
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const client = getRedisClient();
      return (await client.exists(key)) === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  },

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      return await client.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', error);
      return 0;
    }
  },

  /**
   * Decrement a counter
   */
  async decr(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      return await client.decr(key);
    } catch (error) {
      logger.error('Redis DECR error:', error);
      return 0;
    }
  },

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const client = getRedisClient();
      await client.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  },

  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    try {
      const client = getRedisClient();
      return await client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL error:', error);
      return -2;
    }
  },

  /**
   * Get or set pattern - returns cached value or executes function and caches result
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fn();
    await this.set(key, value, ttlSeconds);
    return value;
  },

  /**
   * Hash operations
   */
  hash: {
    async get<T>(key: string, field: string): Promise<T | null> {
      try {
        const client = getRedisClient();
        const data = await client.hget(key, field);
        if (!data) return null;
        return defaultSerializer.deserialize(data) as T;
      } catch (error) {
        logger.error('Redis HGET error:', error);
        return null;
      }
    },

    async set(key: string, field: string, value: any): Promise<boolean> {
      try {
        const client = getRedisClient();
        const data = defaultSerializer.serialize(value);
        await client.hset(key, field, data);
        return true;
      } catch (error) {
        logger.error('Redis HSET error:', error);
        return false;
      }
    },

    async getAll<T>(key: string): Promise<Record<string, T>> {
      try {
        const client = getRedisClient();
        const data = await client.hgetall(key);
        const result: Record<string, T> = {};
        for (const [field, value] of Object.entries(data)) {
          result[field] = defaultSerializer.deserialize(value) as T;
        }
        return result;
      } catch (error) {
        logger.error('Redis HGETALL error:', error);
        return {};
      }
    },

    async del(key: string, field: string): Promise<boolean> {
      try {
        const client = getRedisClient();
        await client.hdel(key, field);
        return true;
      } catch (error) {
        logger.error('Redis HDEL error:', error);
        return false;
      }
    },
  },

  /**
   * List operations
   */
  list: {
    async push(key: string, ...values: any[]): Promise<number> {
      try {
        const client = getRedisClient();
        const serialized = values.map(v => defaultSerializer.serialize(v));
        return await client.rpush(key, ...serialized);
      } catch (error) {
        logger.error('Redis RPUSH error:', error);
        return 0;
      }
    },

    async pop<T>(key: string): Promise<T | null> {
      try {
        const client = getRedisClient();
        const data = await client.lpop(key);
        if (!data) return null;
        return defaultSerializer.deserialize(data) as T;
      } catch (error) {
        logger.error('Redis LPOP error:', error);
        return null;
      }
    },

    async range<T>(key: string, start: number, stop: number): Promise<T[]> {
      try {
        const client = getRedisClient();
        const data = await client.lrange(key, start, stop);
        return data.map(d => defaultSerializer.deserialize(d) as T);
      } catch (error) {
        logger.error('Redis LRANGE error:', error);
        return [];
      }
    },

    async length(key: string): Promise<number> {
      try {
        const client = getRedisClient();
        return await client.llen(key);
      } catch (error) {
        logger.error('Redis LLEN error:', error);
        return 0;
      }
    },
  },

  /**
   * Set operations (Redis SET data structure)
   */
  sets: {
    async add(key: string, ...members: string[]): Promise<number> {
      try {
        const client = getRedisClient();
        return await client.sadd(key, ...members);
      } catch (error) {
        logger.error('Redis SADD error:', error);
        return 0;
      }
    },

    async remove(key: string, ...members: string[]): Promise<number> {
      try {
        const client = getRedisClient();
        return await client.srem(key, ...members);
      } catch (error) {
        logger.error('Redis SREM error:', error);
        return 0;
      }
    },

    async members(key: string): Promise<string[]> {
      try {
        const client = getRedisClient();
        return await client.smembers(key);
      } catch (error) {
        logger.error('Redis SMEMBERS error:', error);
        return [];
      }
    },

    async isMember(key: string, member: string): Promise<boolean> {
      try {
        const client = getRedisClient();
        return (await client.sismember(key, member)) === 1;
      } catch (error) {
        logger.error('Redis SISMEMBER error:', error);
        return false;
      }
    },
  },
};

export default redisService;
