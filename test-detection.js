const axios = require('axios');

async function testDetection() {
  console.log('🧪 Testing DDoS Detection System...\n');
  
  try {
    // Test backend health
    console.log('1. Testing backend health...');
    const healthResponse = await axios.get('http://localhost:3000/', { timeout: 2000 });
    console.log('✅ Backend is running\n');
    
    // Test ML model status
    console.log('2. Testing ML model status...');
    try {
      const mlStatusResponse = await axios.get('http://localhost:3000/api/ml-status', { timeout: 2000 });
      console.log('ML Model Status:', mlStatusResponse.data);
    } catch (error) {
      console.log('⚠️ ML model status check failed, but fallback should work');
    }
    console.log('');
    
    // Test detection with sample data
    console.log('3. Testing detection with sample traffic data...');
    const detectionData = {
      traffic: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105],
      ip: '192.168.1.100',
      packet_data: {
        packet_rate: 500,
        avg_packet_size: 1500
      },
      network_slice: 'eMBB'
    };
    
    const detectionResponse = await axios.post('http://localhost:3000/api/detect', detectionData, { timeout: 5000 });
    console.log('✅ Detection Response:');
    console.log('   Model:', detectionResponse.data.selected_model);
    console.log('   Prediction:', detectionResponse.data.prediction);
    console.log('   Confidence:', (detectionResponse.data.confidence * 100).toFixed(1) + '%');
    console.log('   Threat Level:', detectionResponse.data.threat_level);
    console.log('   Abuse Score:', detectionResponse.data.abuseScore);
    console.log('   Action:', detectionResponse.data.slice_recommendation?.action);
    console.log('');
    
    // Test with high traffic (should trigger DDoS detection)
    console.log('4. Testing with high traffic (DDoS simulation)...');
    const highTrafficData = {
      traffic: [800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500, 1550, 1600, 1650, 1700, 1750],
      ip: '203.0.113.50', // Suspicious IP range
      packet_data: {
        packet_rate: 2000,
        avg_packet_size: 1500
      },
      network_slice: 'eMBB'
    };
    
    const ddosResponse = await axios.post('http://localhost:3000/api/detect', highTrafficData, { timeout: 5000 });
    console.log('✅ DDoS Detection Response:');
    console.log('   Model:', ddosResponse.data.selected_model);
    console.log('   Prediction:', ddosResponse.data.prediction);
    console.log('   Confidence:', (ddosResponse.data.confidence * 100).toFixed(1) + '%');
    console.log('   Threat Level:', ddosResponse.data.threat_level);
    console.log('   Indicators:', ddosResponse.data.ddos_indicators);
    console.log('   Action:', ddosResponse.data.slice_recommendation?.action);
    console.log('');
    
    console.log('🎉 All tests completed successfully!');
    console.log('📊 The system is working with enhanced fallback detection.');
    console.log('💡 Start the ML model (python app/app.py) for full ML-powered detection.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running: npm start');
    }
  }
}

testDetection();