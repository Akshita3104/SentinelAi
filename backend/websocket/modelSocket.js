import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class ModelSocketServer {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/model' });
    this.clients = new Map();
    this.setupEventHandlers();
    console.log('Model WebSocket server started');
  }

  setupEventHandlers() {
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      this.clients.set(clientId, ws);
      console.log(`New model client connected: ${clientId}`);

      // Send initial model status
      this.sendToClient(ws, {
        type: 'status',
        data: {
          status: 'idle',
          clients: this.wss.clients.size,
          timestamp: new Date().toISOString()
        }
      });

      // Handle incoming messages
      ws.on('message', (message) => this.handleIncomingMessage(ws, clientId, message));
      
      // Handle client disconnection
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`Client disconnected: ${clientId}`);
        this.broadcastClientCount();
      });

      // Broadcast updated client count
      this.broadcastClientCount();
    });

    // Handle server errors
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  handleIncomingMessage(ws, clientId, message) {
    try {
      const { type, data } = JSON.parse(message);
      console.log(`Message from ${clientId}:`, { type, data: type === 'training_update' ? '...' : data });

      switch (type) {
        case 'start_training':
          this.handleStartTraining(ws, data);
          break;
          
        case 'get_status':
          this.sendStatus(ws);
          break;
          
        case 'ping':
          this.sendToClient(ws, { type: 'pong', data: { timestamp: Date.now() } });
          break;
          
        default:
          console.warn(`Unknown message type: ${type}`);
          this.sendToClient(ws, {
            type: 'error',
            error: `Unknown message type: ${type}`
          });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      this.sendToClient(ws, {
        type: 'error',
        error: 'Invalid message format'
      });
    }
  }

  async handleStartTraining(ws, config) {
    console.log('Starting model training with config:', config);
    
    // Simulate training process (replace with actual model training)
    this.sendToClient(ws, {
      type: 'training_started',
      data: { config }
    });

    const epochs = config.epochs || 10;
    
    for (let epoch = 1; epoch <= epochs; epoch++) {
      // Simulate training progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = {
        epoch,
        epochs,
        loss: Math.max(0.1, Math.random() * 2),
        accuracy: Math.min(0.05 + (epoch / epochs) * 0.9 + (Math.random() * 0.1), 0.99),
        val_loss: Math.max(0.1, Math.random() * 2.5),
        val_accuracy: Math.min(0.05 + (epoch / epochs) * 0.85 + (Math.random() * 0.1), 0.98)
      };
      
      this.sendToClient(ws, {
        type: 'training_update',
        data: metrics
      });
      
      // Simulate occasional predictions
      if (epoch % 2 === 0) {
        this.simulatePrediction(ws);
      }
    }
    
    // Send final evaluation
    this.sendEvaluationResults(ws);
  }
  
  simulatePrediction(ws) {
    const isAnomaly = Math.random() > 0.8; // 20% chance of anomaly
    const confidence = isAnomaly ? 
      0.85 + Math.random() * 0.14 : // 85-99% confidence for anomalies
      0.9 + Math.random() * 0.09;   // 90-99% confidence for normal
      
    this.sendToClient(ws, {
      type: 'prediction',
      data: {
        isAnomaly,
        confidence,
        features: Array(10).fill(0).map(() => Math.random()),
        timestamp: new Date().toISOString()
      }
    });
  }
  
  sendEvaluationResults(ws) {
    const metrics = {
      accuracy: 0.95 + Math.random() * 0.04, // 95-99%
      precision: 0.94 + Math.random() * 0.05,
      recall: 0.93 + Math.random() * 0.05,
      f1Score: 0.94 + Math.random() * 0.05,
      rocAuc: 0.96 + Math.random() * 0.03,
      prAuc: 0.95 + Math.random() * 0.04,
      confusionMatrix: {
        truePositives: Math.floor(950 + Math.random() * 50),
        trueNegatives: Math.floor(940 + Math.random() * 50),
        falsePositives: Math.floor(10 + Math.random() * 20),
        falseNegatives: Math.floor(5 + Math.random() * 15)
      }
    };
    
    this.sendToClient(ws, {
      type: 'evaluation',
      data: metrics
    });
    
    this.sendToClient(ws, {
      type: 'model_metadata',
      data: {
        name: 'ddos_detection_model',
        version: '1.0.0',
        lastTrained: new Date().toISOString(),
        inputShape: [null, 10],
        classes: ['normal', 'ddos_attack']
      }
    });
  }
  
  sendStatus(ws) {
    this.sendToClient(ws, {
      type: 'status',
      data: {
        status: 'idle',
        clients: this.wss.clients.size,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  broadcastClientCount() {
    const message = JSON.stringify({
      type: 'clients_update',
      data: { count: this.wss.clients.size }
    });
    
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  broadcast(message) {
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }
}

export default ModelSocketServer;
