require('dotenv').config();
const express = require('express');
const detectionRoutes = require('./routes/detectionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json()); // Parse JSON bodies

// Enable CORS for all routes (if integrating with a frontend)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Routes
app.use('/api', detectionRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('AI-Driven DDoS Detection Backend is running');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});