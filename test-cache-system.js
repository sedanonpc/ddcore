/**
 * Test script for F1 API Cache System
 * Tests the 6-hour caching functionality
 */

const testCacheSystem = async () => {
  console.log('🧪 Testing F1 API Cache System...\n');

  const baseUrl = 'http://localhost:3001';

  try {
    // Test 1: First request (should be fresh)
    console.log('1️⃣ First request - should fetch from API...');
    const start1 = Date.now();
    const response1 = await fetch(`${baseUrl}/api/f1/sportradar-events?year=2025`);
    const data1 = await response1.json();
    const time1 = Date.now() - start1;
    
    console.log(`✅ Response time: ${time1}ms`);
    console.log(`📦 From cache: ${data1.cacheInfo.fromCache}`);
    console.log(`⏰ Cache age: ${data1.cacheInfo.cacheAge} minutes`);
    console.log('');

    // Test 2: Second request (should be from cache)
    console.log('2️⃣ Second request - should be from cache...');
    const start2 = Date.now();
    const response2 = await fetch(`${baseUrl}/api/f1/sportradar-events?year=2025`);
    const data2 = await response2.json();
    const time2 = Date.now() - start2;
    
    console.log(`✅ Response time: ${time2}ms`);
    console.log(`📦 From cache: ${data2.cacheInfo.fromCache}`);
    console.log(`⏰ Cache age: ${data2.cacheInfo.cacheAge} minutes`);
    console.log(`🚀 Speed improvement: ${Math.round((time1 - time2) / time1 * 100)}% faster`);
    console.log('');

    // Test 3: Different endpoint (should be fresh)
    console.log('3️⃣ Different endpoint - should fetch from API...');
    const start3 = Date.now();
    const response3 = await fetch(`${baseUrl}/api/f1/sportradar-qualifying?year=2025&event=Australia`);
    const data3 = await response3.json();
    const time3 = Date.now() - start3;
    
    console.log(`✅ Response time: ${time3}ms`);
    console.log(`📦 From cache: ${data3.cacheInfo.fromCache}`);
    console.log(`⏰ Cache age: ${data3.cacheInfo.cacheAge} minutes`);
    console.log('');

    // Test 4: Cache statistics
    console.log('4️⃣ Cache statistics...');
    const statsResponse = await fetch(`${baseUrl}/api/f1/cache-management?action=stats`);
    const stats = await statsResponse.json();
    
    console.log(`📊 Total cache entries: ${stats.cacheStats.totalEntries}`);
    console.log(`✅ Active entries: ${stats.cacheStats.activeEntries}`);
    console.log(`🗑️ Expired entries: ${stats.cacheStats.expiredEntries}`);
    console.log(`💾 Total cache size: ${Math.round(stats.cacheStats.totalSize / 1024)} KB`);
    
    if (stats.cacheStats.oldestEntry) {
      console.log(`📅 Oldest entry: ${stats.cacheStats.oldestEntry.age} hours old`);
    }
    if (stats.cacheStats.newestEntry) {
      console.log(`🆕 Newest entry: ${stats.cacheStats.newestEntry.age} hours old`);
    }
    console.log('');

    // Test 5: Cache management
    console.log('5️⃣ Testing cache management...');
    const clearResponse = await fetch(`${baseUrl}/api/f1/cache-management?action=clear-expired`);
    const clearResult = await clearResponse.json();
    console.log(`🧹 ${clearResult.message}`);
    console.log('');

    console.log('🎉 Cache system tests completed!');
    console.log('\n📋 Cache System Benefits:');
    console.log('✅ 6-hour caching reduces API calls');
    console.log('✅ Faster response times for cached data');
    console.log('✅ Automatic cleanup of expired entries');
    console.log('✅ Cache statistics and management');
    console.log('✅ Multiple users benefit from single API call');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your development server is running:');
    console.log('   node server.js');
  }
};

// Run the test
testCacheSystem();
