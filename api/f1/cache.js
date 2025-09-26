/**
 * F1 API Cache System
 * Implements 6-hour caching for Sportradar API responses
 * Reduces API calls and improves performance
 */

const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
const cache = new Map();

/**
 * Cache entry structure
 */
class CacheEntry {
  constructor(data, timestamp = Date.now()) {
    this.data = data;
    this.timestamp = timestamp;
    this.expiresAt = timestamp + CACHE_DURATION;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  getAge() {
    return Date.now() - this.timestamp;
  }

  getTimeUntilExpiry() {
    return this.expiresAt - Date.now();
  }
}

/**
 * Generate cache key for API requests
 */
function generateCacheKey(endpoint, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`;
}

/**
 * Get cached data if available and not expired
 */
function getCachedData(cacheKey) {
  const entry = cache.get(cacheKey);
  
  if (!entry) {
    return null;
  }

  if (entry.isExpired()) {
    cache.delete(cacheKey);
    return null;
  }

  return entry.data;
}

/**
 * Store data in cache
 */
function setCachedData(cacheKey, data) {
  const entry = new CacheEntry(data);
  cache.set(cacheKey, entry);
  
  console.log(`📦 Cached data for key: ${cacheKey}`);
  console.log(`⏰ Cache expires in: ${Math.round(entry.getTimeUntilExpiry() / (60 * 60 * 1000))} hours`);
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  const now = Date.now();
  const entries = Array.from(cache.entries());
  
  const stats = {
    totalEntries: entries.length,
    expiredEntries: 0,
    activeEntries: 0,
    oldestEntry: null,
    newestEntry: null,
    totalSize: 0
  };

  let oldestTime = Infinity;
  let newestTime = 0;

  entries.forEach(([key, entry]) => {
    if (entry.isExpired()) {
      stats.expiredEntries++;
    } else {
      stats.activeEntries++;
    }

    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      stats.oldestEntry = {
        key,
        age: Math.round((now - entry.timestamp) / (60 * 60 * 1000)),
        expiresIn: Math.round(entry.getTimeUntilExpiry() / (60 * 60 * 1000))
      };
    }

    if (entry.timestamp > newestTime) {
      newestTime = entry.timestamp;
      stats.newestEntry = {
        key,
        age: Math.round((now - entry.timestamp) / (60 * 60 * 1000)),
        expiresIn: Math.round(entry.getTimeUntilExpiry() / (60 * 60 * 1000))
      };
    }

    // Estimate size (rough calculation)
    stats.totalSize += JSON.stringify(entry.data).length;
  });

  return stats;
}

/**
 * Clear expired entries from cache
 */
function clearExpiredEntries() {
  const beforeCount = cache.size;
  const expiredKeys = [];

  for (const [key, entry] of cache.entries()) {
    if (entry.isExpired()) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach(key => cache.delete(key));
  
  const afterCount = cache.size;
  const clearedCount = beforeCount - afterCount;

  if (clearedCount > 0) {
    console.log(`🧹 Cleared ${clearedCount} expired cache entries`);
  }

  return clearedCount;
}

/**
 * Clear all cache entries
 */
function clearAllCache() {
  const count = cache.size;
  cache.clear();
  console.log(`🗑️ Cleared all ${count} cache entries`);
  return count;
}

/**
 * Cache middleware for API endpoints
 */
function withCache(endpoint, params = {}) {
  return async (fetchFunction) => {
    const cacheKey = generateCacheKey(endpoint, params);
    
    // Try to get cached data first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT for ${endpoint}`);
      return {
        data: cachedData,
        fromCache: true,
        cacheAge: Math.round((Date.now() - cache.get(cacheKey).timestamp) / (60 * 1000))
      };
    }

    console.log(`📦 Cache MISS for ${endpoint} - fetching from API`);
    
    try {
      // Fetch fresh data from API
      const freshData = await fetchFunction();
      
      // Store in cache
      setCachedData(cacheKey, freshData);
      
      return {
        data: freshData,
        fromCache: false,
        cacheAge: 0
      };
    } catch (error) {
      console.error(`❌ API fetch failed for ${endpoint}:`, error);
      throw error;
    }
  };
}

/**
 * Initialize cache cleanup interval
 */
function initializeCacheCleanup() {
  // Clean up expired entries every hour
  setInterval(() => {
    clearExpiredEntries();
  }, 60 * 60 * 1000);

  console.log('🔄 Cache cleanup initialized (runs every hour)');
}

/**
 * Export cache functions
 */
export {
  withCache,
  getCachedData,
  setCachedData,
  getCacheStats,
  clearExpiredEntries,
  clearAllCache,
  initializeCacheCleanup,
  CACHE_DURATION
};
