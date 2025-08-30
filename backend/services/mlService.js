const axios = require('axios');

const predictTraffic = async (traffic) => {
  try {
    const response = await axios.post(process.env.ML_MODEL_URL, { traffic });
    return response.data; // Assume { prediction: 'ddos' | 'normal' }
  } catch (err) {
    throw new Error(`ML model error: ${err.message}`);
  }
};

module.exports = { predictTraffic };