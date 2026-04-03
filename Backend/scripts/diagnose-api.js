#!/usr/bin/env node

/**
 * Quick diagnostic to check backend API connectivity
 * Run: node scripts/diagnose-api.js
 */

async function diagnoseAPI() {
  const API_URL = 'http://localhost:5000/api';
  
  console.log('🔍 BACKEND API DIAGNOSTICS\n');
  console.log(`Testing API at: ${API_URL}\n`);
  
  const tests = [
    {
      name: 'Health Check',
      endpoint: '/health',
      baseUrl: 'http://localhost:5000'
    },
    {
      name: 'API Info',
      endpoint: '/api',
      baseUrl: 'http://localhost:5000'
    },
    {
      name: 'Sales Debug Status',
      endpoint: '/api/sales-submissions/debug/status',
      baseUrl: 'http://localhost:5000'
    },
    {
      name: 'Sales Debug All Records',
      endpoint: '/api/sales-submissions/debug/all-records',
      baseUrl: 'http://localhost:5000'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`📤 Testing: ${test.name}`);
      const url = `${test.baseUrl}${test.endpoint}`;
      console.log(`   URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);
      const contentType = response.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);

      const isJSON = contentType?.includes('application/json');
      
      if (isJSON) {
        const data = await response.json();
        console.log(`   ✅ Response is valid JSON`);
        console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
      } else {
        const text = await response.text();
        const preview = text.substring(0, 100);
        console.log(`   ❌ Response is NOT JSON (got ${contentType})`);
        console.log(`   Preview: ${preview}...`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Possible cause: Backend is not running on port 5000\n`);
    }
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('\n1️⃣  Make sure the backend is running:');
  console.log('   cd Backend');
  console.log('   npm start\n');
  
  console.log('2️⃣  Check that it prints:');
  console.log('   "Server running on port 5000"\n');
  
  console.log('3️⃣  Verify with curl (in separate terminal):');
  console.log('   curl http://localhost:5000/api\n');
  
  console.log('4️⃣  If backend is running but tests still fail:');
  console.log('   - Check firewall/port blocking');
  console.log('   - Verify MONGO_URI environment variable is set');
  console.log('   - Check Backend/config/db.js for connection issues\n');
}

diagnoseAPI().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
