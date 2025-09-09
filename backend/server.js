import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import setupNetworkWebSocket from './websocket/networkSocket.js';
import { ModelSocketServer } from './websocket/modelSocket.js';
import logger from './utils/logger.js';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes

// WebSocket upgrade handler will be set up after the server starts listening
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: ['api', 'packet-capture', 'model-service'],
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'Sentinel AI API',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      '/api/status': 'GET - Get service status',
      '/api/health': 'GET - Health check',
      '/api/interfaces': 'GET - List available network interfaces',
      '/ws': 'WebSocket - Real-time packet capture and analysis'
    }
  });
});

import networkService from './services/networkService.js';

// Network interfaces endpoint
app.get('/api/interfaces', (req, res) => {
  try {
    const interfaces = networkService.listInterfaces();
    res.json({
      success: true,
      data: interfaces,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const frontendBuild = path.join(__dirname, '../frontend/build');
  app.use(express.static(frontendBuild));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// WebSocket server and interval will be created after the HTTP server starts listening
let wss;
let interval;

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  logger.error(`[${statusCode}] ${err.message}`, {
    stack: isProduction ? undefined : err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: isProduction && statusCode === 500 ? 'Something went wrong!' : err.message,
    ...(!isProduction && { stack: err.stack })
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't crash the process in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  // Close the HTTP server
  server.close(async () => {
    logger.info('HTTP server closed');
    
    // Close database connections, etc.
    // await database.close();
    
    process.exit(0);
  });
  
  // Force close after timeout
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Only start the server if this file is run directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, HOST, () => {
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Process ID: ${process.pid}`);
    
    // Initialize WebSocket server after HTTP server is listening
    const WebSocketServer = require('ws').Server;
    const wss = new WebSocketServer({
      server,
      path: process.env.WS_PATH || '/ws',
      clientTracking: true,
      maxPayload: 10 * 1024 * 1024, // 10MB max payload
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024,
      }
    });

    // Handle WebSocket server errors
    wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });

    // Handle new connections
    wss.on('connection', (ws, request) => {
      const clientIp = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
      const clientId = request.headers['sec-websocket-key'] || Date.now().toString(36);
      
      logger.info(`New WebSocket connection from ${clientIp} (ID: ${clientId})`);
      
      // Handle client disconnection
      ws.on('close', () => {
        logger.info(`WebSocket client disconnected: ${clientId}`);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error from ${clientId}:`, error);
      });
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection/established',
        clientId,
        timestamp: new Date().toISOString()
      }));
    });
    
    // Log available interfaces in development
    if (process.env.NODE_ENV !== 'production') {
      import('./utils/wireshark.js').then(({ default: wireshark }) => {
        wireshark.listInterfaces().then(interfaces => {
          logger.info('Available network interfaces:', interfaces);
        }).catch(err => {
          logger.warn('Could not list network interfaces:', err.message);
        });
      });
    }
  });
}

export default server;
