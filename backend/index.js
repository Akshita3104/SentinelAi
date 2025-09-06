require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { router: detectionRoutes } = require('./routes/detectionRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const { performanceMiddleware } = require('./middleware/performance');

app.use(express.json({ limit: '1mb' }));
app.use(performanceMiddleware);

// Make io available to routes
app.set('io', io);

// Enable CORS with security restrictions
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Send initial status
  socket.emit('status', {
    backend: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Ultra-high-frequency real-time monitoring for sub-second updates
setInterval(() => {
  const trafficData = {
    timestamp: new Date().toISOString(),
    server_status: 'running',
    connections: io.engine.clientsCount,
    live_traffic: Math.floor(Math.random() * 100) + 10,
    packet_rate: Math.floor(Math.random() * 1000) + 100,
    bandwidth_mbps: (Math.random() * 10).toFixed(2)
  };
  
  io.emit('realtime-update', trafficData);
  io.emit('traffic-update', trafficData);
}, 100); // Ultra-fast 100ms updates for real-time performance

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('WebSocket server initialized');
});