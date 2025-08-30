const express = require('express');
const { detectDDoS } = require('../controllers/detectionController');
const { detectDDoSWithAPI } = require('../controllers/apiDetectionController');
const { detectDDoSCombined } = require('../controllers/combinedDetectionController');

const router = express.Router();

// Combined ensemble detection endpoint (uses both models)
router.post('/detect', detectDDoSCombined);

// Legacy endpoints (kept for backward compatibility)
router.post('/detect-local', detectDDoS);
router.post('/detect-api', detectDDoSWithAPI);

module.exports = router;