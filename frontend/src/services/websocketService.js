import React, { useEffect, useState } from 'react';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.errorHandlers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 10000; // Max 10 seconds
    this.connectionStatus = 'disconnected';
    this.connectionStatusListeners = new Set();
    this.reconnectTimeout = null;
    this.url = null;
    this.dispatch = null;
  }

  // Set the Redux dispatch function
  setDispatch(dispatch) {
    this.dispatch = dispatch;
  }

  connect(url) {
    // Clean up any existing connection
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.close();
        }
      } catch (e) {
        console.warn('[WebSocket] Error cleaning up previous connection:', e);
      }
    }

    this.url = url;
    console.log(`[WebSocket] Initializing connection to ${url}`);
    this.updateConnectionStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        // Create new WebSocket instance
        if (this.socket) {
          console.log('[WebSocket] Closing existing connection...');
          this.disconnect();
        }

        console.log(`[WebSocket] Creating new WebSocket instance to ${url}`);
        this.socket = new WebSocket(url);
        this.updateConnectionStatus('connecting');

        // Notify Redux store about connection attempt
        if (this.dispatch) {
          this.dispatch({ type: 'network/updateCaptureStatus', payload: { status: 'connecting' } });
        }

        // Bind event handlers
        this.socket.onopen = (event) => {
          console.log('[WebSocket] Connection established', {
            url: this.socket.url,
            protocol: this.socket.protocol,
            extensions: this.socket.extensions,
            binaryType: this.socket.binaryType
          });

          this.reconnectAttempts = 0;
          this.updateConnectionStatus('connected');
          this.notifyConnectionStatus('connected');

          // Send initial handshake or subscription message if needed
          try {
            const initMessage = JSON.stringify({
              type: 'init',
              timestamp: new Date().toISOString(),
              client: 'sentinel-ai-frontend'
            });
            this.socket.send(initMessage);
            console.debug('[WebSocket] Sent init message');
          } catch (e) {
            console.warn('[WebSocket] Failed to send init message:', e);
          }

          resolve();
        };

        this.socket.onerror = (error) => {
          const errorInfo = {
            message: error.message || 'Unknown WebSocket error',
            type: error.type || 'unknown',
            readyState: this.socket ? this.socket.readyState : 'no-socket',
            url: this.url,
            timestamp: new Date().toISOString()
          };

          console.error('[WebSocket] Connection error:', errorInfo);
          this.updateConnectionStatus('error');
          this.notifyErrorHandlers(new Error(errorInfo.message));

          // Only reject if this is the initial connection attempt
          if (this.reconnectAttempts === 0) {
            const wsError = new Error(`WebSocket error: ${errorInfo.message}`);
            wsError.details = errorInfo;
            console.error('[WebSocket] Rejecting connection promise', wsError);
            reject(wsError);
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const message = event.data;

            if (!message) {
              console.debug('[WebSocket] Received empty message, ignoring');
              return;
            }

            // Try to parse JSON if it's a string
            let parsedData;
            if (typeof message === 'string') {
              try {
                parsedData = JSON.parse(message);
              } catch (parseError) {
                console.debug('[WebSocket] Received non-JSON message:', message);
                return; // Skip non-JSON messages
              }
            } else if (typeof message === 'object') {
              parsedData = message; // Already parsed (e.g., from MessageEvent)
            } else {
              console.debug('[WebSocket] Received message with unsupported type:', typeof message);
              return;
            }

            console.debug('[WebSocket] Processing message:', parsedData);
            this.processMessage(parsedData);

          } catch (error) {
            console.error('[WebSocket] Error in onmessage handler:', {
              error: error.message,
              stack: error.stack,
              rawData: event?.data
            });
            this.notifyErrorHandlers(error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('[WebSocket] Connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });

          const newStatus = 'disconnected';
          this.updateConnectionStatus(newStatus);

          // Notify Redux store about disconnection
          if (this.dispatch) {
            this.dispatch({ type: 'network/updateCaptureStatus', payload: { status: newStatus } });
          }

          this.attemptReconnect();
        };
      } catch (error) {
        console.error('WebSocket Connection Error:', error);
        reject(error);
      }
    });
  }

  updateConnectionStatus(status) {
    this.connectionStatus = status;
    this.notifyStatusChange(status);
  }

  onStatusChange(callback) {
    this.connectionStatusListeners.add(callback);
    return () => this.connectionStatusListeners.delete(callback);
  }

  notifyStatusChange(status) {
    this.connectionStatusListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status change handler:', error);
      }
    });
  }

  getStatus() {
    return this.connectionStatus;
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageHandlers.clear();
  }

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const messageString = typeof message === 'string' ? message : JSON.stringify(message);
        this.socket.send(messageString);
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    console.warn('WebSocket is not connected');
    return false;
  }

  addMessageHandler(handler) {
    this.messageHandlers.add(handler);

    // Return cleanup function
    return () => this.messageHandlers.delete(handler);
  }

  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  // Notify all connection status listeners
  notifyConnectionStatus(status) {
    console.log(`[WebSocket] Connection status: ${status}`);
    this.connectionStatus = status;
    this.connectionStatusListeners.forEach(listener => {
      try {
        if (typeof listener === 'function') {
          listener(status);
        }
      } catch (e) {
        console.error('[WebSocket] Error in connection status listener:', e);
      }
    });
  }

  processMessage(data) {
    if (!data) {
      console.warn('[WebSocket] processMessage called with no data');
      return;
    }

    console.debug('[WebSocket] Processing message data:', data);

    try {
      // Notify all message handlers first
      this.messageHandlers.forEach(handler => {
        try {
          if (typeof handler === 'function') {
            handler(data);
          }
        } catch (error) {
          console.error('[WebSocket] Error in message handler:', error);
        }
      });

      // Dispatch to Redux if dispatch is available
      if (!this.dispatch) {
        return;
      }

      const { type, data: messageData, timestamp } = data || {};
      const payload = messageData || data;

      switch (type) {
        case 'init':
          // Handle initialization message with all initial data
          if (payload.interfaces) {
            this.dispatch({
              type: 'network/updateInterfaces',
              payload: payload.interfaces
            });
          }
          if (payload.isCapturing !== undefined) {
            this.dispatch({
              type: 'network/updateCaptureStatus',
              payload: { isCapturing: payload.isCapturing }
            });
          }
          if (payload.stats) {
            this.dispatch({
              type: 'network/updateStats',
              payload: payload.stats
            });
          }
          if (payload.bandwidth) {
            this.dispatch({
              type: 'network/updateBandwidth',
              payload: payload.bandwidth
            });
          }
          break;

        case 'packet':
          this.dispatch({
            type: 'network/addPacket',
            payload: payload
          });
          break;

        case 'status':
          this.dispatch({
            type: 'network/updateCaptureStatus',
            payload: payload
          });
          break;

        case 'stats':
          this.dispatch({
            type: 'network/updateStats',
            payload: payload
          });
          break;

        case 'bandwidth':
          this.dispatch({
            type: 'network/updateBandwidth',
            payload: payload
          });
          break;

        case 'interfaces':
          this.dispatch({
            type: 'network/updateInterfaces',
            payload: payload
          });
          break;

        case 'error':
          console.error('[WebSocket] Server error:', payload);
          this.dispatch({
            type: 'network/setError',
            payload: {
              message: payload.message || 'WebSocket error',
              timestamp: payload.timestamp || new Date().toISOString()
            }
          });
          break;

        default:
          // Handle direct packet objects without type
          if (payload.protocol) {
            this.dispatch({
              type: 'network/addPacket',
              payload: payload
            });
          } else if (payload.isCapturing !== undefined) {
            this.dispatch({
              type: 'network/updateCaptureStatus',
              payload: payload
            });
          } else {
            console.debug('[WebSocket] Unhandled message type:', type, payload);
          }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', {
        error: error.message,
        stack: error.stack,
        rawMessage: data,
        timestamp: new Date().toISOString()
      });
    }
  }

  onError(handler) {
    if (typeof handler === 'function') {
      this.errorHandlers.add(handler);
      return () => this.errorHandlers.delete(handler);
    }
    return () => { };
  }

  removeErrorHandler(handler) {
    this.errorHandlers.delete(handler);
  }

  notifyErrorHandlers(error) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error in error handler:', err);
      }
    });
  }

  attemptReconnect() {
    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.url);
    }, this.reconnectDelay);
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();

// Helper hook for React components
export const useWebSocket = (onMessage, dependencies = []) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const handleMessage = (message) => {
      if (message.type === 'connection/established') {
        setIsConnected(true);
        setError(null);
      } else if (message.type === 'connection/error') {
        setError(message.payload);
      }

      if (onMessage) {
        onMessage(message);
      }
    };

    // Add the handler
    const removeHandler = webSocketService.addMessageHandler(handleMessage);

    // Clean up
    return () => {
      removeHandler();
    };
  }, [onMessage, ...dependencies]);
};
