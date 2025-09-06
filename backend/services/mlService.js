const axios = require('axios');

// Optimized axios instance with connection pooling and keep-alive
const mlClient = axios.create({
  baseURL: process.env.ML_MODEL_URL?.replace('/predict', '') || 'http://localhost:5001',
  timeout: 800, // Reduced to 800ms for sub-second response
  headers: {
    'Connection': 'keep-alive',
    'Content-Type': 'application/json'
  },
  httpAgent: new (require('http').Agent)({
    keepAlive: true,
    maxSockets: 10,
    maxFreeSockets: 5,
    timeout: 800
  })
});

// Cache for health status to avoid repeated checks
let healthCache = { status: null, timestamp: 0 };
const HEALTH_CACHE_TTL = 5000; // 5 seconds

const checkMLModelHealth = async () => {
  try {
    // Use cached result if recent
    if (healthCache.timestamp > Date.now() - HEALTH_CACHE_TTL) {
      return healthCache.status;
    }
    
    const response = await mlClient.get('/health');
    const isHealthy = response.status === 200;
    
    // Update cache
    healthCache = { status: isHealthy, timestamp: Date.now() };
    return isHealthy;
  } catch (err) {
    healthCache = { status: false, timestamp: Date.now() };
    return false;
  }
};

const predictTraffic = async (traffic) => {
  try {
    const response = await mlClient.post('/predict', { traffic });
    return response.data;
  } catch (err) {
    throw new Error(`ML model error: ${err.message}`);
  }
};

module.exports = { predictTraffic, checkMLModelHealth };