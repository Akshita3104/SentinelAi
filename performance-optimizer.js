const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      backend: [],
      mlModel: [],
      frontend: [],
      endToEnd: []
    };
    this.targetResponseTime = 800; // Sub-second target (800ms)
  }

  async measureBackendHealth() {
    const start = performance.now();
    try {
      await axios.get('http://localhost:3000/', { timeout: 300 });
      const duration = performance.now() - start;
      this.metrics.backend.push(duration);
      return { success: true, duration };
    } catch (error) {
      return { success: false, duration: performance.now() - start, error: error.message };
    }
  }

  async measureMLModelHealth() {
    const start = performance.now();
    try {
      await axios.get('http://localhost:5001/health', { timeout: 200 });
      const duration = performance.now() - start;
      this.metrics.mlModel.push(duration);
      return { success: true, duration };
    } catch (error) {
      return { success: false, duration: performance.now() - start, error: error.message };
    }
  }

  async measureEndToEndDetection() {
    const start = performance.now();
    try {
      const testData = {
        traffic: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
        ip: '192.168.1.100',
        network_slice: 'eMBB'
      };
      
      await axios.post('http://localhost:3000/api/detect', testData, { timeout: 500 });
      const duration = performance.now() - start;
      this.metrics.endToEnd.push(duration);
      return { success: true, duration };
    } catch (error) {
      return { success: false, duration: performance.now() - start, error: error.message };
    }
  }

  getAverageMetrics() {
    return {
      backend: this.calculateAverage(this.metrics.backend),
      mlModel: this.calculateAverage(this.metrics.mlModel),
      endToEnd: this.calculateAverage(this.metrics.endToEnd)
    };
  }

  calculateAverage(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  async runPerformanceTest(iterations = 10) {
    console.log('🚀 Starting Performance Optimization Test...\n');
    
    for (let i = 0; i < iterations; i++) {
      console.log(`Test ${i + 1}/${iterations}`);
      
      const [backend, mlModel, endToEnd] = await Promise.all([
        this.measureBackendHealth(),
        this.measureMLModelHealth(),
        this.measureEndToEndDetection()
      ]);
      
      console.log(`  Backend: ${backend.duration.toFixed(0)}ms ${backend.success ? '✅' : '❌'}`);
      console.log(`  ML Model: ${mlModel.duration.toFixed(0)}ms ${mlModel.success ? '✅' : '❌'}`);
      console.log(`  End-to-End: ${endToEnd.duration.toFixed(0)}ms ${endToEnd.success ? '✅' : '❌'}`);
      
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms between tests
    }
    
    const averages = this.getAverageMetrics();
    
    console.log('\n📊 Performance Results:');
    console.log(`  Average Backend Response: ${averages.backend.toFixed(0)}ms`);
    console.log(`  Average ML Model Response: ${averages.mlModel.toFixed(0)}ms`);
    console.log(`  Average End-to-End Detection: ${averages.endToEnd.toFixed(0)}ms`);
    
    const isOptimal = averages.endToEnd < this.targetResponseTime;
    console.log(`\n🎯 Target: <${this.targetResponseTime}ms | Achieved: ${averages.endToEnd.toFixed(0)}ms ${isOptimal ? '✅' : '❌'}`);
    
    if (!isOptimal) {
      console.log('\n⚡ Optimization Recommendations:');
      if (averages.backend > 200) console.log('  - Backend response too slow, check server load');
      if (averages.mlModel > 150) console.log('  - ML model response too slow, optimize model inference');
      if (averages.endToEnd > 800) console.log('  - End-to-end too slow, check network latency');
    }
    
    return { averages, isOptimal };
  }
}

// Run performance test if called directly
if (require.main === module) {
  const optimizer = new PerformanceOptimizer();
  optimizer.runPerformanceTest(20).then(results => {
    process.exit(results.isOptimal ? 0 : 1);
  }).catch(error => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceOptimizer;