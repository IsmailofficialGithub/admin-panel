import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000); 
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true, // Allow queuing when Redis is offline
  lazyConnect: false, // Connect immediately
  connectTimeout: 10000, // 10 second timeout
  // Don't fail immediately if Redis is unavailable
  showFriendlyErrorStack: true,
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis client connected');
});

redis.on('ready', () => {
  console.log('✅ Redis client ready');
});

redis.on('error', (err) => {
  // Only log error if it's not a connection error (to avoid spam)
  // With enableOfflineQueue: true, we won't get "Stream isn't writeable" errors
  if (!err.message.includes('ECONNREFUSED') && !err.message.includes('connect ETIMEDOUT')) {
    console.error('❌ Redis connection error:', err.message);
  }
});

let reconnectCount = 0;
let lastReconnectLog = 0;

redis.on('close', () => {
  // Only log close events occasionally to avoid spam
  const now = Date.now();
  if (now - lastReconnectLog > 10000) { // Log at most once every 10 seconds
    console.log('⚠️ Redis connection closed');
    lastReconnectLog = now;
  }
});

redis.on('reconnecting', () => {
  reconnectCount++;
  const now = Date.now();
  // Only log reconnection attempts occasionally to avoid spam
  if (now - lastReconnectLog > 10000) { // Log at most once every 10 seconds
    console.log(`🔄 Redis reconnecting... (attempt ${reconnectCount})`);
    lastReconnectLog = now;
  }
});

// Test connection
export const testRedisConnection = async () => {
  try {
    // Use a timeout to prevent hanging
    const pingPromise = redis.ping();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis ping timeout')), 2000)
    );
    
    await Promise.race([pingPromise, timeoutPromise]);
    console.log('✅ Redis connection test successful');
    return true;
  } catch (error) {
    // Don't log as error - Redis is optional for basic functionality
    // Only log if it's not a connection/timeout error
    if (!error.message.includes('ECONNREFUSED') && 
        !error.message.includes('timeout') && 
        !error.message.includes('ETIMEDOUT')) {
      console.error('❌ Redis connection test failed:', error.message);
    }
    return false;
  }
};

// Cache helper functions
export const cacheService = {
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached data or null
   */
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      // Silently fail - Redis is optional
      // Only log if it's not a connection error
      if (!error.message.includes('ECONNREFUSED') && 
          !error.message.includes('timeout') && 
          !error.message.includes('ETIMEDOUT')) {
        console.error(`❌ Redis GET error for key ${key}:`, error.message);
      }
      return null;
    }
  },

  /**
   * Set cached data with expiration
   * @param {string} key - Cache key
   * @param {any} value - Data to cache
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttl = 300) {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      // Silently fail - Redis is optional
      // Only log if it's not a connection error
      if (!error.message.includes('ECONNREFUSED') && 
          !error.message.includes('timeout') && 
          !error.message.includes('ETIMEDOUT')) {
        console.error(`❌ Redis SET error for key ${key}:`, error.message);
      }
      return false;
    }
  },

  /**
   * Delete cached data
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      // Silently fail - Redis is optional
      if (!error.message.includes('ECONNREFUSED') && 
          !error.message.includes('timeout') && 
          !error.message.includes('ETIMEDOUT')) {
        console.error(`❌ Redis DEL error for key ${key}:`, error.message);
      }
      return false;
    }
  },

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'users:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  async delByPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      return await redis.del(...keys);
    } catch (error) {
      // Silently fail - Redis is optional
      if (!error.message.includes('ECONNREFUSED') && 
          !error.message.includes('timeout') && 
          !error.message.includes('ETIMEDOUT')) {
        console.error(`❌ Redis DEL pattern error for ${pattern}:`, error.message);
      }
      return 0;
    }
  },

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Exists status
   */
  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      // Silently fail - Redis is optional
      if (!error.message.includes('ECONNREFUSED') && 
          !error.message.includes('timeout') && 
          !error.message.includes('ETIMEDOUT')) {
        console.error(`❌ Redis EXISTS error for key ${key}:`, error.message);
      }
      return false;
    }
  },

  /**
   * Get or set cache (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} - Cached or fetched data
   */
  async getOrSet(key, fetchFn, ttl = 300) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        console.log(`✅ Cache HIT for key: ${key}`);
        return cached;
      }

      // Cache miss - fetch data
      console.log(`❌ Cache MISS for key: ${key}`);
      const data = await fetchFn();
      
      // Store in cache
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error(`❌ Cache getOrSet error for key ${key}:`, error.message);
      // On error, try to fetch directly
      return await fetchFn();
    }
  }
};

export default redis;

