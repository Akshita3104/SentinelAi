const { performance } = require('perf_hooks');

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const start = performance.now();
  
  // Override res.json to measure response time
  const originalJson = res.json;
  res.json = function(data) {
    const duration = performance.now() - start;
    
    // Add performance headers
    res.set({
      'X-Response-Time': `${duration.toFixed(2)}ms`,
      'X-Performance-Target': 'sub-second',
      'X-Timestamp': new Date().toISOString()
    });
    
    // Log slow requests
    if (duration > 500) {
      console.warn(`⚠️  Slow request: ${req.method} ${req.path} - ${duration.toFixed(0)}ms`);
    } else if (duration < 200) {
      console.log(`⚡ Fast request: ${req.method} ${req.path} - ${duration.toFixed(0)}ms`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = { performanceMiddleware };