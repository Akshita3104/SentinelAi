const WebSocket = require('ws');
const packetCaptureService = require('../services/packetCaptureService');

function setupPacketCaptureWebSocket(wss) {
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection for packet capture');
    
    // Send current status on connection
    ws.send(JSON.stringify({
      type: 'status',
      data: packetCaptureService.getStatus()
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const { action, data } = JSON.parse(message);
        
        switch (action) {
          case 'start':
            const success = packetCaptureService.startCapture(data?.interface);
            ws.send(JSON.stringify({
              type: 'status',
              data: packetCaptureService.getStatus(),
              success
            }));
            break;
            
          case 'stop':
            packetCaptureService.stopCapture();
            ws.send(JSON.stringify({
              type: 'status',
              data: packetCaptureService.getStatus(),
              success: true
            }));
            break;
            
          case 'status':
            ws.send(JSON.stringify({
              type: 'status',
              data: packetCaptureService.getStatus()
            }));
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });
  });

  // Listen for packet capture events
  const removeListener = packetCaptureService.addListener((packet) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'packet',
          data: packet
        }));
      }
    });
  });

  // Clean up on server shutdown
  wss.on('close', () => {
    removeListener();
    packetCaptureService.stopCapture();
  });
}

module.exports = setupPacketCaptureWebSocket;
