/**
 * Test script for Sportradar F1 API
 * Run this to test the new Sportradar functions locally
 */

const testSportradarAPI = async () => {
  console.log('🧪 Testing Sportradar F1 API...\n');

  const baseUrl = 'http://localhost:3001'; // F1 API server runs on port 3001

  try {
    // Test 1: Sportradar Events
    console.log('1️⃣ Testing Sportradar events for 2025...');
    const eventsResponse = await fetch(`${baseUrl}/api/f1/sportradar-events?year=2025`);
    const eventsData = await eventsResponse.json();
    console.log('✅ Events found:', eventsData.events.length);
    console.log('📅 Sample events:', eventsData.events.slice(0, 3).map(e => e.name));
    console.log('');

    // Test 2: Sportradar Qualifying Results for Australia 2025
    console.log('2️⃣ Testing Sportradar qualifying results for Australia 2025...');
    const qualifyingResponse = await fetch(`${baseUrl}/api/f1/sportradar-qualifying?year=2025&event=Australia`);
    const qualifyingData = await qualifyingResponse.json();
    console.log('✅ Qualifying results:', qualifyingData.results.length, 'drivers');
    console.log('🏁 Pole position:', qualifyingData.polePosition);
    console.log('📊 Top 3 results:');
    qualifyingData.results.slice(0, 3).forEach(result => {
      console.log(`   P${result.position}: ${result.driver} (${result.team}) - ${result.lapTime}`);
    });
    console.log('');

    // Test 3: Sportradar Betting Insights
    console.log('3️⃣ Testing Sportradar betting insights for Australia 2025...');
    const insightsResponse = await fetch(`${baseUrl}/api/f1/sportradar-insights?year=2025&event=Australia`);
    const insightsData = await insightsResponse.json();
    console.log('✅ Betting insights generated');
    console.log('🎯 Race info:', insightsData.raceInfo.name);
    console.log('🌤️ Weather:', insightsData.raceInfo.weather);
    console.log('🏁 Track:', insightsData.raceInfo.location);
    console.log('📈 Confidence:', insightsData.confidence + '%');
    console.log('');

    // Test 4: Betting Recommendations
    console.log('4️⃣ Testing betting recommendations...');
    if (insightsData.bettingRecommendations) {
      console.log('🎯 Favorites:', insightsData.bettingRecommendations.favorites.length);
      console.log('🏆 Track specialists:', insightsData.bettingRecommendations.trackSpecialists.length);
      console.log('🌧️ Weather specialists:', insightsData.bettingRecommendations.weatherSpecialists.length);
      console.log('📊 Form-based:', insightsData.bettingRecommendations.formBased.length);
      console.log('💰 Value bets:', insightsData.bettingRecommendations.valueBets.length);
    }
    console.log('');

    console.log('🎉 All Sportradar API tests passed!');
    console.log('🚀 Ready for component integration!');
    console.log('\n📋 Next steps:');
    console.log('1. Update F1QualifyingResults component to use Sportradar API');
    console.log('2. Add betting insights panels');
    console.log('3. Test component with 2025 data');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your development server is running:');
    console.log('   node server.js');
    console.log('\n💡 And that the Sportradar API routes are accessible at:');
    console.log('   http://localhost:3001/api/f1/sportradar-...');
    
    if (error.message.includes('fetch')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check if server is running on port 3001');
      console.log('2. Verify Sportradar API key is valid');
      console.log('3. Check network connectivity to Sportradar');
    }
  }
};

// Run the test
testSportradarAPI();
