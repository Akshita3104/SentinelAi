import { webSocketService } from '../services/websocketService';

const websocketMiddleware = store => next => action => {
  // Initialize WebSocket service with store's dispatch
  if (action.type === 'websocket/init') {
    webSocketService.setDispatch(store.dispatch);
    return next(action);
  }
  
  // Handle WebSocket connection actions
  if (action.type === 'websocket/connect') {
    const { url } = action.payload;
    webSocketService.connect(url)
      .then(() => {
        console.log('WebSocket connected successfully');
      })
      .catch(error => {
        console.error('WebSocket connection failed:', error);
        store.dispatch({
          type: 'network/updateCaptureStatus',
          payload: { 
            status: 'error',
            error: error.message || 'Failed to connect to WebSocket'
          }
        });
      });
    return next(action);
  }
  
  // Handle WebSocket disconnection
  if (action.type === 'websocket/disconnect') {
    webSocketService.disconnect();
    return next(action);
  }
  
  // Handle sending messages through WebSocket
  if (action.type === 'websocket/send') {
    const { message } = action.payload;
    webSocketService.send(message);
    return next(action);
  }
  
  return next(action);
};

export default websocketMiddleware;
