const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

// Simple HTTP request function
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(2000, () => reject(new Error('Timeout')));
    if (options.data) req.write(options.data);
    req.end();
  });
}

async function testConnectivity() {
  console.log('🚀 SentinelAI Connectivity Test\n');
  
  const tests = [
    {
      name: 'Backend Health',
      url: 'http://localhost:3000/',
      target: 200
    },
    {
      name: 'ML Model Health', 
      url: 'http://localhost:5001/health',
      target: 500
    },
    {
      name: 'DDoS Detection',
      url: 'http://localhost:3000/api/detect',
      method: 'POST',
      data: JSON.stringify({
        traffic: [10,20,30,40,50],
        ip: '192.168.1.100'
      }),
      headers: { 'Content-Type': 'application/json' },
      target: 800
    }
  ];

  for (const test of tests) {
    const start = performance.now();
    try {
      await makeRequest(test.url, {
        method: test.method || 'GET',
        headers: test.headers,
        data: test.data
      });
      const time = Math.round(performance.now() - start);
      const status = time <= test.target ? '✅ PASS' : '⚠️  SLOW';
      console.log(`${status} ${test.name}: ${time}ms (target: <${test.target}ms)`);
    } catch (error) {
      const time = Math.round(performance.now() - start);
      console.log(`❌ FAIL ${test.name}: ${time}ms - ${error.message}`);
    }
  }
  
  console.log('\n🎯 Test completed! All services should respond in <1000ms');
}

testConnectivity().catch(console.error);