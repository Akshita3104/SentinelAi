// WebSocket Message Types
export const MESSAGE_TYPES = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Packet Capture
  CAPTURE_START: 'capture:start',
  CAPTURE_STOP: 'capture:stop',
  CAPTURE_STATUS: 'capture:status',
  PACKET_RECEIVED: 'packet:received',
  
  // Model Training
  TRAIN_START: 'model:train:start',
  TRAIN_PROGRESS: 'model:train:progress',
  TRAIN_COMPLETE: 'model:train:complete',
  
  // Prediction
  PREDICT: 'model:predict',
  PREDICTION_RESULT: 'model:prediction:result',
  
  // System
  SYSTEM_STATUS: 'system:status',
  SYSTEM_STATS: 'system:stats'
};

// Standard message format
export function createMessage(type, payload = {}, meta = {}) {
  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    type,
    payload,
    meta: {
      source: 'client', // or 'server' on the backend
      ...meta
    }
  };
}

// Validation function for incoming messages
export function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid message: must be an object');
  }
  
  const { type, payload } = message;
  
  if (!type || typeof type !== 'string') {
    throw new Error('Invalid message: type must be a string');
  }
  
  if (payload && typeof payload !== 'object') {
    throw new Error('Invalid message: payload must be an object');
  }
  
  return true;
}

// Helper functions for specific message types
export const messageCreators = {
  captureStart: (interfaceName, filter = '') => 
    createMessage(MESSAGE_TYPES.CAPTURE_START, { interface: interfaceName, filter }),
    
  captureStop: () => 
    createMessage(MESSAGE_TYPES.CAPTURE_STOP),
    
  trainStart: (options = {}) =>
    createMessage(MESSAGE_TYPES.TRAIN_START, options),
    
  predict: (packet) =>
    createMessage(MESSAGE_TYPES.PREDICT, { packet })
};
