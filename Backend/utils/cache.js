import redis from 'redis';

/**
 * Redis Cache Manager
 * Handles caching of frequently accessed data to reduce database queries
 */

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis connection (optional - graceful fallback if Redis unavailable)
 */
export const initializeCache = async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
    });

    redisClient.on('error', (err) => {
      console.warn('Redis Client Error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis cache');
      isConnected = true;
    });

    await redisClient.connect();
    return true;
  } catch (error) {
    console.warn('Redis initialization failed - caching disabled:', error.message);
    isConnected = false;
    return false;
  }
};

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached data or null
 */
export const getCachedData = async (key) => {
  if (!isConnected || !redisClient) return null;

  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 */
export const setCachedData = async (key, data, ttl = 300) => {
  if (!isConnected || !redisClient) return;

  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

/**
 * Delete cached data
 * @param {string} key - Cache key
 */
export const deleteCachedData = async (key) => {
  if (!isConnected || !redisClient) return;

  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
};

/**
 * Clear all cached data matching pattern
 * @param {string} pattern - Key pattern (e.g., 'employee:*')
 */
export const clearCachePattern = async (pattern) => {
  if (!isConnected || !redisClient) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache clear pattern error:', error);
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = async () => {
  if (!isConnected || !redisClient) return;

  try {
    await redisClient.flushDb();
  } catch (error) {
    console.error('Cache clear all error:', error);
  }
};

/**
 * Cache key builders - standardized cache keys
 */
export const cacheKeys = {
  // Employee cache keys
  employee: (id) => `employee:${id}`,
  employeeList: (department, status) => `employee:list:${department}:${status}`,
  employeeStats: (department) => `employee:stats:${department}`,

  // Salary cache keys
  salary: (employeeId, month) => `salary:${employeeId}:${month}`,
  salaryReport: (month) => `salary:report:${month}`,
  payrollSummary: (month) => `payroll:summary:${month}`,

  // Attendance cache keys
  attendance: (employeeId, date) => `attendance:${employeeId}:${date}`,
  attendanceReport: (month) => `attendance:report:${month}`,
  attendanceStats: (department, month) => `attendance:stats:${department}:${month}`,

  // Fine cache keys
  fine: (employeeId) => `fine:${employeeId}`,
  fineReport: (month) => `fine:report:${month}`,

  // Sales target keys
  salesTarget: (employeeId, date) => `sales:${employeeId}:${date}`,
  salesReport: (employeeId, month) => `sales:report:${employeeId}:${month}`,
  salesLeaderboard: (month) => `sales:leaderboard:${month}`,

  // Message cache keys
  messageUnread: (userId) => `messages:unread:${userId}`,
  messageStats: () => 'messages:stats',

  // User cache keys
  user: (id) => `user:${id}`,
  userByUsername: (username) => `user:username:${username}`,

  // Dashboard cache keys
  dashboardAdmin: (month) => `dashboard:admin:${month}`,
  dashboardEmployee: (employeeId, month) => `dashboard:employee:${employeeId}:${month}`,
};

/**
 * Middleware to cache GET requests
 * @param {number} ttl - Time to live in seconds
 */
export const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `route:${req.originalUrl}`;
    
    // Try to get from cache
    const cachedData = await getCachedData(cacheKey);
    if (cachedData) {
      return res.status(cachedData.statusCode || 200).json(cachedData.data);
    }

    // Intercept response to cache it
    const originalJson = res.json;
    res.json = function (data) {
      if (res.statusCode === 200) {
        setCachedData(cacheKey, { statusCode: res.statusCode, data }, ttl).catch(e => 
          console.error('Failed to cache response:', e)
        );
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Close Redis connection
 */
export const closeCache = async () => {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
};

export default {
  initializeCache,
  getCachedData,
  setCachedData,
  deleteCachedData,
  clearCachePattern,
  clearAllCache,
  cacheKeys,
  cacheMiddleware,
  closeCache,
};
