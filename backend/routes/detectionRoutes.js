const express = require('express');
const os = require('os');
const { detectDDoS } = require('../controllers/detectionController');
const { detectDDoSWithAPI } = require('../controllers/apiDetectionController');
const { detectDDoSCombined } = require('../controllers/combinedDetectionController');

const router = express.Router();

const PacketCapture = require('../services/packetCapture');
const captureInstance = new PacketCapture();

// Get all local machine IPs
router.get('/local-ips', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const results = [];
    
    for (const [name, nets] of Object.entries(interfaces)) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          results.push({ interface: name, address: net.address });
        }
      }
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get local IPs' });
  }
});

// Start simulation capture
router.post('/start-capture', (req, res) => {
  try {
    const { targetIP, interfaceName } = req.body;
    
    if (!targetIP) {
      return res.status(400).json({ error: 'targetIP required' });
    }
    
    captureInstance.on('simulationMode', (message) => {
      console.log('Simulation mode:', message);
    });
    
    captureInstance.on('flowReady', (flowFeatures) => {
      console.log('Simulated flow features ready:', flowFeatures.total_packets, 'packets');
    });
    
    captureInstance.startCapture(targetIP, interfaceName);
    
    res.json({ 
      message: 'Simulation mode started - Real packet capture requires system dependencies (npcap/tshark)', 
      targetIP, 
      mode: 'simulation' 
    });
  } catch (error) {
    console.error('Start simulation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop simulation capture
router.post('/stop-capture', (req, res) => {
  try {
    captureInstance.stopCapture();
    res.json({ message: 'Simulation mode stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Combined ensemble detection endpoint (uses both models)
router.post('/detect', detectDDoSCombined);

// Legacy endpoints (kept for backward compatibility)
router.post('/detect-local', detectDDoS);
router.post('/detect-api', detectDDoSWithAPI);

module.exports = { router, captureInstance };