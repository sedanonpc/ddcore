import React, { useState } from 'react';

/**
 * Simple component to test Sportradar API directly
 */
const SportradarAPITest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const API_KEY = 'YfECfX62lNPYcCLAvxAnOENKpkwAvjduvjEWyobs';
  const BASE_URL = 'https://api.sportradar.com/formula1/trial/v2/en';

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testAPI = async () => {
    setLoading(true);
    setTestResults([]);
    
    addResult('Starting Sportradar API tests...');
    addResult(`API Key: ${API_KEY.substring(0, 10)}...`);
    addResult(`Base URL: ${BASE_URL}`);

    // Test 1: Try to get seasons (correct endpoint)
    try {
      addResult('Test 1: Trying to get seasons...');
      const seasonsUrl = `${BASE_URL}/seasons.json`;
      addResult(`URL: ${seasonsUrl}`);
      
      const response = await fetch(seasonsUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': API_KEY,
        },
        mode: 'cors',
      });

      addResult(`Response status: ${response.status}`);
      addResult(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Seasons API SUCCESS! Found ${data.seasons?.length || 0} seasons`);
        if (data.seasons && data.seasons.length > 0) {
          addResult(`Latest season: ${JSON.stringify(data.seasons[0], null, 2)}`);
        }
      } else {
        const errorText = await response.text();
        addResult(`❌ Seasons API FAILED: ${errorText}`);
      }
    } catch (error: any) {
      addResult(`❌ Seasons API ERROR: ${error.message}`);
    }

    // Test 2: Try to get a specific stage
    try {
      addResult('Test 2: Trying to get stage summary...');
      const stageId = 'sr:stage:1190921';
      const stageUrl = `${BASE_URL}/sport_events/${stageId}/summary.json`;
      addResult(`URL: ${stageUrl}`);
      
      const response = await fetch(stageUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': API_KEY,
        },
        mode: 'cors',
      });

      addResult(`Response status: ${response.status}`);
      addResult(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Stage API SUCCESS! Data keys: ${Object.keys(data).join(', ')}`);
        if (data.competitors) {
          addResult(`Found ${data.competitors.length} competitors`);
        }
      } else {
        const errorText = await response.text();
        addResult(`❌ Stage API FAILED: ${errorText}`);
      }
    } catch (error: any) {
      addResult(`❌ Stage API ERROR: ${error.message}`);
    }

    // Test 3: Try with different headers
    try {
      addResult('Test 3: Trying with different headers...');
      const stageId = 'sr:stage:1190921';
      const stageUrl = `${BASE_URL}/sport_events/${stageId}/summary.json`;
      
      const response = await fetch(stageUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      });

      addResult(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Alternative headers SUCCESS!`);
      } else {
        const errorText = await response.text();
        addResult(`❌ Alternative headers FAILED: ${errorText}`);
      }
    } catch (error: any) {
      addResult(`❌ Alternative headers ERROR: ${error.message}`);
    }

    // Test 4: Try a simple endpoint
    try {
      addResult('Test 4: Trying simple endpoint...');
      const simpleUrl = `${BASE_URL}/competitors.json`;
      addResult(`URL: ${simpleUrl}`);
      
      const response = await fetch(simpleUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': API_KEY,
        },
        mode: 'cors',
      });

      addResult(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        addResult(`✅ Simple endpoint SUCCESS!`);
      } else {
        const errorText = await response.text();
        addResult(`❌ Simple endpoint FAILED: ${errorText}`);
      }
    } catch (error: any) {
      addResult(`❌ Simple endpoint ERROR: ${error.message}`);
    }

    setLoading(false);
    addResult('API testing completed!');
    addResult('');
    addResult('⚠️  IMPORTANT: If you see CORS errors above, this is expected!');
    addResult('Sportradar APIs are designed for server-to-server communication.');
    addResult('You need to create a backend proxy to use this API properly.');
  };

  return (
    <div className="p-6 bg-background border border-border/50 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">🏎️ Sportradar API Test</h3>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>

      <div className="bg-muted/30 rounded-lg p-4 max-h-96 overflow-y-auto">
        <h4 className="font-semibold mb-2">Test Results:</h4>
        {testResults.length === 0 ? (
          <p className="text-muted-foreground">Click "Test API" to start testing...</p>
        ) : (
          <div className="space-y-1">
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SportradarAPITest;
