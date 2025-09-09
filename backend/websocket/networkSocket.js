import { WebSocket } from 'ws';
import networkService from '../services/networkService.js';
import logger from '../utils/logger.js';

const handleNetworkWebSocket = (wss) => {
  wss.on('connection', (ws, req) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logger.info(`New WebSocket connection from ${clientIp} for network monitoring`);

    // Send initial status
    const sendStatus = () => {
      ws.send(JSON.stringify({
        type: 'status',
        data: networkService.getStatus(),
        timestamp: new Date().toISOString()
      }));
    };

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.action) {
          case 'start':
            await networkService.startMonitoring(data.interface);
            sendStatus();
            break;
            
          case 'stop':
            await networkService.stopMonitoring();
            sendStatus();
            break;
            
          case 'status':
            sendStatus();
            break;
            
          case 'list_interfaces':
            const interfaces = networkService.listInterfaces();
            ws.send(JSON.stringify({
              type: 'interfaces',
              data: interfaces,
              timestamp: new Date().toISOString()
            }));
            break;
            
          default:
            logger.warn(`Unknown action: ${data.action}`);
        }
      } catch (error) {
        logger.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle network service events
    const onActivity = (activity) => {
      ws.send(JSON.stringify({
        type: 'activity',
        data: activity,
        timestamp: new Date().toISOString()
      }));
    };

    const onStatus = (status) => {
      ws.send(JSON.stringify({
        type: 'status',
        data: status,
        timestamp: new Date().toISOString()
      }));
    };

    // Set up event listeners
    networkService.on('activity', onActivity);
    networkService.on('status', onStatus);

    // Send initial data
    sendStatus();
    
    // Send available interfaces
    const interfaces = networkService.listInterfaces();
    ws.send(JSON.stringify({
      type: 'interfaces',
      data: interfaces,
      timestamp: new Date().toISOString()
    }));

    // Clean up on disconnect
    ws.on('close', () => {
      logger.info(`WebSocket connection closed for ${clientIp}`);
      networkService.off('activity', onActivity);
      networkService.off('status', onStatus);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error from ${clientIp}:`, error);
      networkService.off('activity', onActivity);
      networkService.off('status', onStatus);
    });
  });

  // Clean up when the WebSocket server is closed
  wss.on('close', () => {
    networkService.removeAllListeners();
  });
};

export default handleNetworkWebSocket;
