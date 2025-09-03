const express = require('express');
const router = express.Router();
const packetCaptureService = require('../services/packetCaptureService');

// Start packet capture
router.post('/start', (req, res) => {
  const { interface } = req.body;
  const success = packetCaptureService.startCapture(interface);
  
  if (success) {
    res.json({ 
      success: true, 
      message: 'Packet capture started',
      ...packetCaptureService.getStatus()
    });
  } else {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to start packet capture' 
    });
  }
});

// Stop packet capture
router.post('/stop', (req, res) => {
  packetCaptureService.stopCapture();
  res.json({ 
    success: true, 
    message: 'Packet capture stopped',
    ...packetCaptureService.getStatus()
  });
});

// Get capture status
router.get('/status', (req, res) => {
  res.json({
    success: true,
    ...packetCaptureService.getStatus()
  });
});

module.exports = router;
