/**
 * Cache Management API
 * Provides endpoints to monitor and manage the F1 API cache
 */

import { getCacheStats, clearExpiredEntries, clearAllCache, initializeCacheCleanup } from './cache.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action = 'stats' } = req.query;

    switch (action) {
      case 'stats':
        const stats = getCacheStats();
        return res.status(200).json({
          cacheStats: stats,
          timestamp: new Date().toISOString()
        });

      case 'clear-expired':
        const clearedCount = clearExpiredEntries();
        return res.status(200).json({
          message: `Cleared ${clearedCount} expired cache entries`,
          clearedCount,
          timestamp: new Date().toISOString()
        });

      case 'clear-all':
        const totalCleared = clearAllCache();
        return res.status(200).json({
          message: `Cleared all ${totalCleared} cache entries`,
          clearedCount: totalCleared,
          timestamp: new Date().toISOString()
        });

      case 'init':
        initializeCacheCleanup();
        return res.status(200).json({
          message: 'Cache cleanup initialized',
          timestamp: new Date().toISOString()
        });

      default:
        return res.status(400).json({
          error: 'Invalid action',
          availableActions: ['stats', 'clear-expired', 'clear-all', 'init']
        });
    }

  } catch (error) {
    console.error('❌ Error in cache management:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      detail: error.message 
    });
  }
}
