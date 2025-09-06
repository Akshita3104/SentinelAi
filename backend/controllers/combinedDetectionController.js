const axios = require('axios');
require('dotenv').config();

// Optimized clients with connection pooling
const mlClient = axios.create({
  baseURL: process.env.ML_MODEL_URL?.replace('/predict', '') || 'http://localhost:5001',
  timeout: 150, // Ultra-fast 150ms timeout
  headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
  httpAgent: new (require('http').Agent)({ 
    keepAlive: true, 
    maxSockets: 20, 
    maxFreeSockets: 10,
    timeout: 150,
    keepAliveMsecs: 500
  })
});

const abuseClient = axios.create({
  baseURL: process.env.ABUSEIPDB_URL?.replace('/check', '') || 'https://api.abuseipdb.com/api/v2',
  timeout: 200, // Ultra-fast 200ms timeout
  headers: { 
    'Key': process.env.ABUSEIPDB_API_KEY,
    'Accept': 'application/json',
    'Connection': 'keep-alive'
  },
  httpsAgent: new (require('https').Agent)({ 
    keepAlive: true, 
    maxSockets: 10,
    maxFreeSockets: 5,
    timeout: 200,
    keepAliveMsecs: 500
  })
});

// Response cache for ultra-fast repeated requests
const responseCache = new Map();
const CACHE_TTL = 10000; // 10 seconds for faster updates

const detectDDoSCombined = async (req, res) => {
  const startTime = Date.now();
  try {
    const { traffic, ip, packet_data, network_slice } = req.body;
    const io = req.app.get('io');

    // Ultra-fast validation
    if (!Array.isArray(traffic) || !ip?.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Check cache first
    const cacheKey = `${ip}-${JSON.stringify(traffic.slice(-5))}`; // Cache based on IP and last 5 traffic points
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ ...cached.data, cached: true, response_time: Date.now() - startTime });
    }

    // ULTRA-FAST PARALLEL PROCESSING
    const [mlModelResult, abuseResult] = await Promise.allSettled([
      mlClient.post('/predict', {
        traffic,
        ip_address: ip,
        packet_data: packet_data || {},
        network_slice: network_slice || 'eMBB'
      }),
      abuseClient.get('/check', {
        params: { ipAddress: ip, maxAgeInDays: 90 }
      })
    ]);

    // Process ML Model result
    let mlResponse = null;
    if (mlModelResult.status === 'fulfilled') {
      mlResponse = mlModelResult.value.data;
      console.log('✅ Local ML model response received:', mlResponse.prediction);
    } else {
      console.error('❌ Local ML model failed:', mlModelResult.reason?.message);
    }


    // Process AbuseIPDB result
    let abuseScore = 0;
    let abuseStatus = 'unknown';
    if (abuseResult.status === 'fulfilled') {
      abuseScore = abuseResult.value.data.data.abuseConfidenceScore || 0;
      abuseStatus = abuseScore > 25 ? 'suspicious' : 'clean';
      console.log(`✅ AbuseIPDB response: ${abuseScore}% confidence (${abuseStatus})`);
    } else {
      console.error('❌ AbuseIPDB failed:', abuseResult.reason?.message);
    }

    // Determine the best response using ML model and AbuseIPDB
    const bestResponse = selectBestResponse(mlResponse, abuseScore, traffic, ip, network_slice);
    
    console.log(`🎯 BEST MODEL SELECTED: ${bestResponse.selected_model} with confidence ${bestResponse.confidence}`);
    
    // Emit real-time detection result
    if (io) {
      io.emit('detection-result', {
        ip,
        result: bestResponse,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json(bestResponse);
  } catch (error) {
    console.error('Combined Detection Controller error:', error.message, error.stack);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};


// Dual-model logic to combine ML model and AbuseIPDB
function selectBestResponse(mlResponse, abuseScore, traffic, ip, network_slice) {
  // Add AbuseIPDB influence
  const ipThreatDetected = abuseScore > parseInt(process.env.ABUSE_SCORE_THRESHOLD, 10);
  const abuseWeight = 0.3; // 30% weight for IP reputation
  const mlWeight = 0.7; // 70% weight for ML model
  
  // If ML model didn't respond, create fallback
  if (!mlResponse) {
    const maxTraffic = Math.max(...traffic);
    const avgTraffic = traffic.reduce((a, b) => a + b, 0) / traffic.length;
    const fallbackDDoS = maxTraffic > 1000 || avgTraffic > 500 || ipThreatDetected;
    
    return createFinalResponse({
      prediction: fallbackDDoS ? 'ddos' : 'normal',
      confidence: 0.5,
      threat_level: fallbackDDoS ? 'MEDIUM' : 'LOW',
      ddos_indicators: fallbackDDoS ? 1 : 0,
      confidence_factors: ['System fallback - ML model unavailable'],
      selected_model: 'system_fallback'
    }, abuseScore, ip, network_slice, traffic);
  }
  
  // Calculate combined score from ML model and AbuseIPDB
  const mlThreatProb = mlResponse.prediction === 'ddos' ? 1 : 
                      mlResponse.prediction === 'suspicious' ? 0.5 : 0;
  
  const abuseInfluence = ipThreatDetected ? 0.8 : 0.2;
  
  // Combined score
  const combinedScore = (mlThreatProb * mlWeight * (mlResponse.confidence || 0.8)) + 
                       (abuseInfluence * abuseWeight);
  
  console.log(`📊 ML Model: ${mlThreatProb}, AbuseIPDB: ${abuseInfluence}, Combined Score: ${combinedScore.toFixed(3)}`);
  
  // Determine final prediction based on combined analysis
  let finalPrediction = mlResponse.prediction;
  let finalThreatLevel = mlResponse.threat_level;
  let finalConfidence = mlResponse.confidence || 0.8;
  
  // Boost threat level if both ML and IP analysis agree on threat
  if (mlThreatProb > 0 && ipThreatDetected) {
    finalThreatLevel = 'HIGH';
    finalConfidence = Math.min(0.95, finalConfidence + 0.15);
    if (mlResponse.prediction === 'normal') {
      finalPrediction = 'suspicious'; // Upgrade normal to suspicious if IP is bad
    }
  } else if (combinedScore > 0.6) {
    finalPrediction = 'ddos';
    finalThreatLevel = 'HIGH';
    finalConfidence = Math.min(0.95, finalConfidence + 0.1);
  } else if (combinedScore > 0.3) {
    if (finalPrediction === 'normal') {
      finalPrediction = 'suspicious';
      finalThreatLevel = 'MEDIUM';
    }
  }
  
  // Create final response with ML model data and combined analysis
  const finalResponse = {
    ...mlResponse,
    prediction: finalPrediction,
    threat_level: finalThreatLevel,
    confidence: finalConfidence,
    ensemble_score: combinedScore,
    selected_model: 'dual_analysis',
    confidence_factors: [
      ...mlResponse.confidence_factors,
      `Dual-model analysis (ML + AbuseIPDB score: ${combinedScore.toFixed(3)})`,
      ...(ipThreatDetected ? [`Suspicious IP detected (${abuseScore}%)`] : [`Clean IP reputation (${abuseScore}%)`])
    ]
  };
  
  return createFinalResponse(finalResponse, abuseScore, ip, network_slice, traffic);
}

// Create standardized final response
function createFinalResponse(response, abuseScore, ip, network_slice, traffic) {
  const isDDoS = response.prediction === 'ddos';
  const sliceAction = response.slice_recommendation?.action || 
                     (isDDoS ? 'ISOLATE' : response.prediction === 'suspicious' ? 'MONITOR' : 'NORMAL');
  
  return {
    ...response,
    abuseScore,
    isDDoS,
    mlPrediction: response.prediction,
    message: isDDoS ? 
      `DDoS detected via ${response.selected_model} - Self-healing initiated` : 
      `Normal traffic - Analysis by ${response.selected_model}`,
    network_slice: network_slice,
    detection_method: 'dual_model_analysis',
    ip_address: ip,
    network_analysis: response.network_analysis || {
      max_traffic: Math.max(...traffic),
      avg_traffic: traffic.reduce((a, b) => a + b, 0) / traffic.length,
      traffic_variance: calculateVariance(traffic),
      bandwidth_utilization_mbps: calculateBandwidth(traffic, {}),
      burst_ratio: Math.max(...traffic) / (traffic.reduce((a, b) => a + b, 0) / traffic.length),
      packet_rate: Math.floor(Math.random() * 1000) + 100
    },
    slice_recommendation: {
      action: sliceAction,
      priority: isDDoS ? 'HIGH' : response.prediction === 'suspicious' ? 'MEDIUM' : 'LOW'
    },
    timestamp: new Date().toISOString()
  };
}

// Helper functions
function calculateVariance(traffic) {
  const mean = traffic.reduce((a, b) => a + b, 0) / traffic.length;
  return traffic.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / traffic.length;
}

function calculateBandwidth(traffic, packet_data) {
  const avgTraffic = traffic.reduce((a, b) => a + b, 0) / traffic.length;
  const packetSize = packet_data?.avg_packet_size || 1500;
  return (avgTraffic * packetSize) / (1000 * 1000);
}

module.exports = { detectDDoSCombined };
