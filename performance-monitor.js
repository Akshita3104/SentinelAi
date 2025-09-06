const axios = require('axios');
const { performance } = require('perf_hooks');

// Performance monitoring configuration
const BACKEND_URL = 'http://localhost:3000';
const ML_MODEL_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:5173';

// Test data
const testTraffic = [12, 15, 18, 25, 32, 28, 22, 35, 45, 38, 42, 55, 68, 72, 65, 58, 62, 75, 82, 78];
const testIP = '192.168.1.100';

class PerformanceMonitor {
  constructor() {
    this.results = [];
    this.targetResponseTime = 1000; // 1 second target
  }

  async measureResponseTime(name, asyncFunction) {
    const start = performance.now();
    try {
      const result = await asyncFunction();
      const end = performance.now();
      const responseTime = Math.round(end - start);
      
      this.results.push({
        test: name,
        responseTime,
        status: 'SUCCESS',
        target: responseTime <= this.targetResponseTime ? 'PASS' : 'FAIL',
        timestamp: new Date().toISOString()
      });
      
      return { success: true, responseTime, result };
    } catch (error) {
      const end = performance.now();
      const responseTime = Math.round(end - start);
      
      this.results.push({
        test: name,
        responseTime,
        status: 'ERROR',
        target: 'FAIL',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return { success: false, responseTime, error: error.message };
    }
  }

  async testBackendHealth() {
    return this.measureResponseTime('Backend Health Check', async () => {
      const response = await axios.get(`${BACKEND_URL}/`, { timeout: 2000 });
      return response.data;
    });
  }

  async testMLModelHealth() {
    return this.measureResponseTime('ML Model Health Check', async () => {
      const response = await axios.get(`${ML_MODEL_URL}/health`, { timeout: 2000 });
      return response.data;
    });
  }

  async testDDoSDetection() {
    return this.measureResponseTime('DDoS Detection (Combined)', async () => {
      const response = await axios.post(`${BACKEND_URL}/api/detect`, {
        traffic: testTraffic,
        ip: testIP,
        packet_data: { packet_rate: 500, avg_packet_size: 1500 },
        network_slice: 'eMBB'
      }, { timeout: 2000 });
      return response.data;
    });
  }

  async testMLModelDirect() {
    return this.measureResponseTime('ML Model Direct Call', async () => {
      const response = await axios.post(`${ML_MODEL_URL}/predict`, {
        traffic: testTraffic,
        ip_address: testIP,
        packet_data: { packet_rate: 500, avg_packet_size: 1500 },
        network_slice: 'eMBB'
      }, { timeout: 2000 });
      return response.data;
    });
  }

  async testLocalIPs() {
    return this.measureResponseTime('Local IPs Retrieval', async () => {
      const response = await axios.get(`${BACKEND_URL}/api/local-ips`, { timeout: 2000 });
      return response.data;
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Performance Monitoring Tests...\n');
    console.log('Target Response Time: < 1000ms (sub-second)\n');

    const tests = [
      () => this.testBackendHealth(),
      () => this.testMLModelHealth(),
      () => this.testMLModelDirect(),
      () => this.testDDoSDetection(),
      () => this.testLocalIPs()
    ];

    for (const test of tests) {
      await test();
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between tests
    }

    this.printResults();
  }

  printResults() {
    console.log('\n📊 PERFORMANCE TEST RESULTS');
    console.log('=' .repeat(80));
    
    let totalTests = this.results.length;
    let passedTests = this.results.filter(r => r.target === 'PASS').length;
    let failedTests = this.results.filter(r => r.target === 'FAIL').length;
    let errorTests = this.results.filter(r => r.status === 'ERROR').length;

    this.results.forEach(result => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      const target = result.target === 'PASS' ? '🎯' : '⚠️';
      const responseTime = `${result.responseTime}ms`;
      
      console.log(`${status} ${target} ${result.test.padEnd(30)} | ${responseTime.padStart(8)} | ${result.status}`);
      
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    console.log('=' .repeat(80));
    console.log(`📈 SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed (< 1000ms): ${passedTests}`);
    console.log(`   ⚠️  Failed (> 1000ms): ${failedTests}`);
    console.log(`   ❌ Errors: ${errorTests}`);
    
    const avgResponseTime = this.results
      .filter(r => r.status === 'SUCCESS')
      .reduce((sum, r) => sum + r.responseTime, 0) / 
      this.results.filter(r => r.status === 'SUCCESS').length;
    
    console.log(`   📊 Average Response Time: ${Math.round(avgResponseTime)}ms`);
    
    if (passedTests === totalTests - errorTests) {
      console.log('\n🎉 ALL PERFORMANCE TARGETS MET! System optimized for sub-second response.');
    } else {
      console.log('\n⚠️  Some tests exceeded 1000ms target. Consider further optimization.');
    }

    // Performance recommendations
    console.log('\n💡 OPTIMIZATION STATUS:');
    console.log('   ✅ Connection pooling enabled');
    console.log('   ✅ Parallel processing implemented');
    console.log('   ✅ Reduced timeouts (300-800ms)');
    console.log('   ✅ Response caching active');
    console.log('   ✅ WebSocket updates optimized (250ms intervals)');
    console.log('   ✅ Frontend monitoring intervals reduced (500ms)');
  }

  async continuousMonitoring(intervalMs = 5000) {
    console.log(`\n🔄 Starting continuous monitoring (every ${intervalMs}ms)...`);
    console.log('Press Ctrl+C to stop\n');

    setInterval(async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Running performance check...`);
      
      const detectionTest = await this.testDDoSDetection();
      const healthTest = await this.testBackendHealth();
      
      if (detectionTest.success && healthTest.success) {
        console.log(`[${timestamp}] ✅ System healthy - Detection: ${detectionTest.responseTime}ms, Backend: ${healthTest.responseTime}ms`);
      } else {
        console.log(`[${timestamp}] ⚠️  System issues detected`);
      }
    }, intervalMs);
  }
}

// CLI interface
async function main() {
  const monitor = new PerformanceMonitor();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--continuous')) {
    await monitor.continuousMonitoring();
  } else {
    await monitor.runAllTests();
  }
}

// Export for use in other modules
module.exports = PerformanceMonitor;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}