import { configureStore } from '@reduxjs/toolkit';
import networkReducer from '../features/network/networkSlice';
import websocketMiddleware from '../middleware/websocketMiddleware';

// Configure the Redux store with middleware
const store = configureStore({
  reducer: {
    network: networkReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'network/updateCaptureStatus',
          'network/addPacket',
          'network/updateStats',
          'network/updateBandwidth',
          'network/updateInterfaces'
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: [
          'network.packets',
          'network.stats',
          'network.bandwidth',
          'network.interfaces'
        ],
      },
    }).concat(websocketMiddleware)
});

// Initialize WebSocket service with store's dispatch
store.dispatch({ type: 'websocket/init' });

// Connect to WebSocket endpoint
const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080';
store.dispatch({
  type: 'websocket/connect',
  payload: { url: wsUrl }
});

export default store;
