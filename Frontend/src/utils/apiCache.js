// API Caching and Performance Optimization

class APICache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  // Set cache with TTL
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }

  // Get from cache if not expired
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() < timestamp) {
      return this.cache.get(key);
    }
    // Clean up expired entries
    this.cache.delete(key);
    this.timestamps.delete(key);
    return null;
  }

  // Clear specific key
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now >= timestamp) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }
  }
}

// Global cache instance
export const apiCache = new APICache();

// Request deduplication
class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  async dedupe(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Batch request utility
export class BatchRequestManager {
  constructor() {
    this.batchQueue = new Map();
    this.batchTimeout = null;
    this.batchDelay = 50; // 50ms delay
  }

  addToBatch(endpoint, params, resolve, reject) {
    const key = `${endpoint}-${JSON.stringify(params)}`;
    
    if (!this.batchQueue.has(endpoint)) {
      this.batchQueue.set(endpoint, []);
    }
    
    this.batchQueue.get(endpoint).push({ params, resolve, reject, key });
    
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.processBatch(), this.batchDelay);
    }
  }

  async processBatch() {
    const currentBatch = new Map(this.batchQueue);
    this.batchQueue.clear();
    this.batchTimeout = null;

    for (const [endpoint, requests] of currentBatch) {
      try {
        // Process all requests for this endpoint
        // This is a simplified version - you'd implement actual batching logic
        for (const request of requests) {
          // For now, process individually but could be optimized for actual batching
          request.resolve(await this.makeRequest(endpoint, request.params));
        }
      } catch (error) {
        // Reject all requests in this batch
        requests.forEach(req => req.reject(error));
      }
    }
  }

  async makeRequest(endpoint, params) {
    // This would be your actual API call
    // Placeholder implementation
    throw new Error('Implement actual API call logic');
  }
}

export const batchManager = new BatchRequestManager();

// Performance monitoring
export const performanceMonitor = {
  timers: new Map(),
  
  start(key) {
    this.timers.set(key, performance.now());
  },
  
  end(key, logToConsole = false) {
    const startTime = this.timers.get(key);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.timers.delete(key);
      
      if (logToConsole) {
        console.log(`⚡ ${key}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    return 0;
  }
};

// Clean up expired cache entries periodically
setInterval(() => {
  apiCache.cleanup();
}, 60000); // Clean every minute