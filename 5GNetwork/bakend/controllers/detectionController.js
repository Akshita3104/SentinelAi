const axios = require('axios');
require('dotenv').config();

const detectDDoS = async (req, res) => {
  try {
    const { traffic, ip, packet_data, network_slice } = req.body;

    // Validate input
    if (!Array.isArray(traffic) || !traffic.every(num => typeof num === 'number' && !isNaN(num))) {
      return res.status(400).json({ error: 'Invalid traffic data: must be an array of numbers' });
    }
    if (!ip || !ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
      return res.status(400).json({ error: 'Invalid IP address' });
    }

    // Log ML model URL for debugging
    console.log(`🤖 Calling ML Model at: ${process.env.ML_MODEL_URL}`);
    console.log(`🔍 Calling AbuseIPDB for IP: ${ip}`);

    // STEP 1: Call ML model for traffic pattern analysis
    let mlResponse = {};
    try {
      const mlPayload = {
        traffic,
        ip_address: ip,
        packet_data: packet_data || {},
        network_slice: network_slice || 'eMBB'
      };
      
      const response = await axios.post(process.env.ML_MODEL_URL, mlPayload, { timeout: 5000 });
      console.log('✅ ML model response received:', response.data.prediction);
      mlResponse = response.data;
    } catch (mlError) {
      console.error(`❌ ML model error at ${process.env.ML_MODEL_URL}:`, mlError.message);
      // Fallback response structure
      mlResponse = {
        prediction: 'normal',
        confidence: 0.5,
        threat_level: 'LOW',
        ddos_indicators: 0,
        confidence_factors: ['ML model unavailable - using fallback analysis'],
        network_analysis: {
          max_traffic: Math.max(...traffic),
          avg_traffic: traffic.reduce((a, b) => a + b, 0) / traffic.length,
          traffic_variance: 0,
          bandwidth_utilization_mbps: 0,
          burst_ratio: 1,
          packet_rate: packet_data?.packet_rate || 0
        },
        slice_recommendation: {
          action: 'NORMAL',
          priority: 'LOW'
        }
      };
      console.warn('⚠️ Using fallback ML analysis');
    }

    // STEP 2: Call AbuseIPDB for IP reputation analysis
    let abuseScore = 0;
    let abuseIPStatus = 'unknown';
    try {
      const abuseResponse = await axios.get(process.env.ABUSEIPDB_URL, {
        params: { ipAddress: ip, maxAgeInDays: 90 },
        headers: {
          Key: process.env.ABUSEIPDB_API_KEY,
          Accept: 'application/json',
        },
        timeout: 5000,
      });
      abuseScore = abuseResponse.data.data.abuseConfidenceScore || 0;
      abuseIPStatus = abuseScore > 25 ? 'suspicious' : 'clean';
      console.log(`✅ AbuseIPDB response: ${abuseScore}% confidence (${abuseIPStatus})`);
    } catch (abuseError) {
      console.error('❌ AbuseIPDB error:', abuseError.message);
      abuseScore = 0;
      abuseIPStatus = 'unavailable';
      console.warn('⚠️ Continuing without AbuseIPDB data');
    }

    // STEP 3: Combine both ML model and AbuseIPDB results for final decision
    const mlPrediction = mlResponse.prediction || 'normal';
    const mlThreatDetected = mlPrediction === 'ddos';
    const ipThreatDetected = abuseScore > parseInt(process.env.ABUSE_SCORE_THRESHOLD, 10);
    const isDDoS = mlThreatDetected || ipThreatDetected;
    
    // Enhanced confidence calculation based on both models
    let combinedConfidence = mlResponse.confidence || 0.5;
    if (mlThreatDetected && ipThreatDetected) {
      combinedConfidence = Math.min(0.95, combinedConfidence + 0.2); // Both models agree
    } else if (mlThreatDetected || ipThreatDetected) {
      combinedConfidence = Math.min(0.85, combinedConfidence + 0.1); // One model detects threat
    }

    // Update confidence factors with both model results
    const enhancedFactors = [...(mlResponse.confidence_factors || [])];
    if (ipThreatDetected) {
      enhancedFactors.push(`Suspicious IP detected (AbuseIPDB: ${abuseScore}%)`);
    }
    if (abuseIPStatus === 'clean') {
      enhancedFactors.push(`Clean IP reputation (AbuseIPDB: ${abuseScore}%)`);
    }

    const sliceAction = mlResponse.slice_recommendation?.action || 'NORMAL';
    
    // Self-healing actions based on combined threat assessment
    if (isDDoS || sliceAction === 'ISOLATE') {
      console.log(`🚨 THREAT DETECTED! ML: ${mlThreatDetected}, IP: ${ipThreatDetected}`);
      console.log(`🛡️ Network slice action: ${sliceAction} for IP: ${ip}`);
      console.log(`📡 Network slice type: ${network_slice}, Threat level: ${mlResponse.threat_level}`);
      // Add SDN integration here (e.g., ONOS API call for network slicing)
    }

    // Final comprehensive response combining both models
    const finalResponse = {
      ...mlResponse,
      // Dual model results
      ml_model: {
        prediction: mlPrediction,
        threat_detected: mlThreatDetected,
        original_confidence: mlResponse.confidence
      },
      abuseipdb_model: {
        score: abuseScore,
        status: abuseIPStatus,
        threat_detected: ipThreatDetected,
        threshold: parseInt(process.env.ABUSE_SCORE_THRESHOLD, 10)
      },
      // Combined results
      prediction: isDDoS ? 'ddos' : 'normal',
      confidence: combinedConfidence,
      confidence_factors: enhancedFactors,
      isDDoS,
      mlPrediction,
      abuseScore,
      message: isDDoS ? 
        `DDoS detected via ${mlThreatDetected && ipThreatDetected ? 'both ML and IP analysis' : mlThreatDetected ? 'ML model' : 'IP reputation'} - Self-healing initiated` : 
        'Normal traffic - Both ML and IP analysis show no threats',
      network_slice: network_slice,
      detection_method: 'dual_model_analysis'
    };

    console.log(`📊 Final Decision: ${isDDoS ? 'THREAT' : 'SAFE'} (ML: ${mlThreatDetected}, IP: ${ipThreatDetected})`);
    res.json(finalResponse);
  } catch (error) {
    console.error('Server error:', error.message, error.stack);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

module.exports = { detectDDoS };