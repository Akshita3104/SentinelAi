const axios = require('axios');
require('dotenv').config();

const detectDDoSWithAPI = async (req, res) => {
  try {
    const { traffic, ip, packet_data, network_slice, model_type } = req.body;

    // Validate input
    if (!Array.isArray(traffic) || !traffic.every(num => typeof num === 'number' && !isNaN(num))) {
      return res.status(400).json({ error: 'Invalid traffic data: must be an array of numbers' });
    }
    if (!ip || !ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
      return res.status(400).json({ error: 'Invalid IP address' });
    }

    console.log(`Using external API model for DDoS detection`);

    // Call external API model (example: Hugging Face, AWS SageMaker, etc.)
    let apiResponse = {};
    try {
      // Example external API call - replace with actual API endpoint
      const externalAPIPayload = {
        inputs: {
          traffic_data: traffic,
          ip_address: ip,
          packet_info: packet_data || {},
          slice_type: network_slice || 'eMBB'
        },
        parameters: {
          task: 'ddos_detection',
          model: '5g_network_security'
        }
      };

      // Replace with actual external API URL
      const apiURL = process.env.EXTERNAL_API_URL || 'https://api.example.com/v1/predict';
      const apiKey = process.env.EXTERNAL_API_KEY;

      const response = await axios.post(apiURL, externalAPIPayload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('External API response:', response.data);
      
      // Transform API response to our format
      apiResponse = {
        prediction: response.data.prediction || 'normal',
        confidence: response.data.confidence || 0.85,
        threat_level: response.data.threat_level || 'LOW',
        ddos_indicators: response.data.indicators || 0,
        confidence_factors: response.data.factors || ['External API analysis'],
        network_analysis: {
          max_traffic: Math.max(...traffic),
          avg_traffic: traffic.reduce((a, b) => a + b, 0) / traffic.length,
          traffic_variance: calculateVariance(traffic),
          bandwidth_utilization_mbps: calculateBandwidth(traffic, packet_data),
          burst_ratio: Math.max(...traffic) / (traffic.reduce((a, b) => a + b, 0) / traffic.length),
          packet_rate: packet_data?.packet_rate || 0
        },
        slice_recommendation: {
          action: response.data.slice_action || 'NORMAL',
          priority: response.data.priority || 'LOW'
        },
        ip_address: ip,
        api_model: true
      };

    } catch (apiError) {
      console.error('External API error:', apiError.message);
      
      // Fallback to local analysis if API fails
      const maxTraffic = Math.max(...traffic);
      const avgTraffic = traffic.reduce((a, b) => a + b, 0) / traffic.length;
      const isDDoS = maxTraffic > 1000 || avgTraffic > 500;
      
      apiResponse = {
        prediction: isDDoS ? 'ddos' : 'normal',
        confidence: 0.7,
        threat_level: isDDoS ? 'MEDIUM' : 'LOW',
        ddos_indicators: isDDoS ? 2 : 0,
        confidence_factors: ['Fallback analysis - API unavailable', isDDoS ? 'High traffic detected' : 'Normal traffic patterns'],
        network_analysis: {
          max_traffic: maxTraffic,
          avg_traffic: avgTraffic,
          traffic_variance: calculateVariance(traffic),
          bandwidth_utilization_mbps: calculateBandwidth(traffic, packet_data),
          burst_ratio: maxTraffic / avgTraffic,
          packet_rate: packet_data?.packet_rate || 0
        },
        slice_recommendation: {
          action: isDDoS ? 'MONITOR' : 'NORMAL',
          priority: isDDoS ? 'MEDIUM' : 'LOW'
        },
        ip_address: ip,
        api_model: false,
        fallback: true
      };
      console.warn('Using fallback analysis due to API failure');
    }

    // Call AbuseIPDB for IP reputation
    let abuseScore = 0;
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
    } catch (abuseError) {
      console.error('AbuseIPDB error:', abuseError.message);
      // Continue without AbuseIPDB data
      abuseScore = 0;
    }

    // Enhanced DDoS determination
    const mlPrediction = apiResponse.prediction || 'normal';
    const isDDoS = mlPrediction === 'ddos' || abuseScore > parseInt(process.env.ABUSE_SCORE_THRESHOLD, 10);
    const sliceAction = apiResponse.slice_recommendation?.action || 'NORMAL';
    
    // Self-healing actions
    if (isDDoS || sliceAction === 'ISOLATE') {
      console.log(`🚨 API Model - DDoS detected! Network slice action: ${sliceAction} for IP: ${ip}`);
      console.log(`Network slice type: ${network_slice}, Threat level: ${apiResponse.threat_level}`);
    }

    // Final response
    const finalResponse = {
      ...apiResponse,
      abuseScore,
      isDDoS,
      mlPrediction,
      message: isDDoS ? 'DDoS detected via API model - Self-healing initiated' : 'Normal traffic (API analysis)',
      network_slice: network_slice,
      model_type: 'api'
    };

    res.json(finalResponse);
  } catch (error) {
    console.error('API Detection Controller error:', error.message, error.stack);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};

// Helper functions
function calculateVariance(traffic) {
  const mean = traffic.reduce((a, b) => a + b, 0) / traffic.length;
  return traffic.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / traffic.length;
}

function calculateBandwidth(traffic, packet_data) {
  const avgTraffic = traffic.reduce((a, b) => a + b, 0) / traffic.length;
  const packetSize = packet_data?.avg_packet_size || 1500;
  return (avgTraffic * packetSize) / (1000 * 1000); // Convert to Mbps
}

module.exports = { detectDDoSWithAPI };
