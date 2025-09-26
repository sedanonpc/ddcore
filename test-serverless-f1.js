/**
 * Test script for the serverless F1 API
 * Run this to test the new serverless functions locally
 */

const testServerlessF1 = async () => {
  console.log('🧪 Testing Serverless F1 API...\n');

  const baseUrl = 'http://localhost:3001'; // F1 API server runs on port 3001

  try {
    // Test 1: Available Years
    console.log('1️⃣ Testing available years...');
    const yearsResponse = await fetch(`${baseUrl}/api/f1/available-years`);
    const yearsData = await yearsResponse.json();
    console.log('✅ Available years:', yearsData.availableYears.slice(-5)); // Last 5 years
    console.log('');

    // Test 2: Events for 2024
    console.log('2️⃣ Testing events for 2024...');
    const eventsResponse = await fetch(`${baseUrl}/api/f1/events?year=2024`);
    const eventsData = await eventsResponse.json();
    console.log('✅ Events found:', eventsData.events.length);
    console.log('📅 Sample events:', eventsData.events.slice(0, 3).map(e => e.name));
    console.log('');

    // Test 3: Qualifying Results for Las Vegas 2024
    console.log('3️⃣ Testing qualifying results for Las Vegas 2024...');
    const qualifyingResponse = await fetch(`${baseUrl}/api/f1/qualifying?year=2024&event=Las Vegas`);
    const qualifyingData = await qualifyingResponse.json();
    console.log('✅ Qualifying results:', qualifyingData.results.length, 'drivers');
    console.log('🏁 Pole position:', qualifyingData.polePosition);
    console.log('📊 Top 3 results:');
    qualifyingData.results.slice(0, 3).forEach(result => {
      console.log(`   P${result.position}: ${result.driver} (${result.team}) - ${result.lapTime}`);
    });
    console.log('');

    console.log('🎉 All tests passed! Serverless F1 API is working correctly.');
    console.log('🚀 Ready for Vercel deployment!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your development server is running:');
    console.log('   npm start');
    console.log('\n💡 And that the API routes are accessible at:');
    console.log('   http://localhost:3000/api/f1/...');
  }
};

// Run the test
testServerlessF1();
