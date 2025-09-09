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
  
  /**
   * Initialize WebSocket connection with proper configuration
   * @param {string} url - WebSocket server URL
   * @param {Object} options - Connection options
   * @param {boolean} [options.autoReconnect=true] - Enable/disable auto-reconnection
   * @param {number} [options.maxReconnectAttempts=5] - Maximum reconnection attempts
   * @param {number} [options.reconnectDelay=1000] - Initial reconnection delay in ms
   */
  initializeConnection(url, options = {}) {
    const {
      autoReconnect = true,
      maxReconnectAttempts = 5,
      reconnectDelay = 1000
    } = options;
    
    this.url = url;
    this.autoReconnect = autoReconnect;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.reconnectDelay = reconnectDelay;
    
    // Clear any existing connection
    this.disconnect();
    
    // Set up connection
    return this.connect(url);
  }

  connect(url) {
    // Clean up any existing connection
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        if (this.socket.readyState === WebSocket.OPEN || 
            this.socket.readyState === WebSocket.CONNECTING) {
          this.socket.close();
        }
      } catch (e) {
        console.warn('[WebSocket] Error cleaning up previous connection:', e);
      }
    }

    this.url = url;
    console.log(`[WebSocket] Initializing connection to ${url}`);
    this.updateConnectionStatus('connecting');

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    return new Promise((resolve, reject) => {
      // Clear any existing reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      try {
        console.log(`[WebSocket] Creating new WebSocket instance to ${url}`);
        this.socket = new WebSocket(url);
        this.updateConnectionStatus('connecting');
        
        // Set binary type if needed
        this.socket.binaryType = 'arraybuffer';

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
            binaryType: this.socket.binaryType,
            readyState: this.socket.readyState
          });

          // Reset reconnection attempts on successful connection
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000; // Reset delay
          this.updateConnectionStatus('connected');
          this.notifyConnectionStatus('connected');

          // Send initial handshake message
          try {
            const initMessage = JSON.stringify({
              type: 'init',
              timestamp: new Date().toISOString(),
              client: 'sentinel-ai-frontend',
              version: process.env.REACT_APP_VERSION || '1.0.0'
            });
            this.socket.send(initMessage);
            console.debug('[WebSocket] Sent init message');
          } catch (e) {
            console.warn('[WebSocket] Failed to send init message:', e);
          }

          resolve();
        };

        this.socket.onerror = (error) => {
          const errorDetails = {
            message: error.message || 'Unknown WebSocket error',
            type: error.type || 'error',
            readyState: this.socket?.readyState,
            timestamp: new Date().toISOString()
          };
          
          console.error('[WebSocket] Connection error:', errorDetails);
          this.updateConnectionStatus('error');
          this.notifyErrorHandlers(errorDetails);
          
          // Only reject if this is the initial connection attempt
          if (!this.reconnectAttempts) {
            reject(errorDetails);
          }
          
          // Attempt to reconnect if we're not already trying to reconnect
          if (!this.reconnectTimeout) {
            console.log('[WebSocket] Attempting to reconnect...');
            this.handleReconnect();
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

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      // Exponential backoff with jitter
      const baseDelay = Math.min(
        this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );
      const jitter = Math.random() * 1000; // Add up to 1s jitter
      const delay = Math.min(baseDelay + jitter, this.maxReconnectDelay);
      
      const status = `Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`;
      console.log(`[WebSocket] ${status} Next attempt in ${Math.round(delay)}ms`);
      this.updateConnectionStatus(status);
      
      // Clear any existing timeout to prevent multiple reconnection attempts
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      
      this.reconnectTimeout = setTimeout(() => {
        console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        this.connect(this.url)
          .then(() => {
            console.log('[WebSocket] Reconnection successful');
            this.reconnectAttempts = 0; // Reset attempt counter on successful reconnection
            this.reconnectDelay = 1000; // Reset delay
          })
          .catch(error => {
            console.warn(`[WebSocket] Reconnection attempt ${this.reconnectAttempts} failed:`, error.message || 'Unknown error');
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.handleReconnect(); // Continue reconnection attempts
            } else {
              this.handleMaxReconnectAttemptsReached();
            }
          });
      }, delay);
    } else {
      this.handleMaxReconnectAttemptsReached();
    }
  }
  
  handleMaxReconnectAttemptsReached() {
    const errorMsg = `Max reconnection attempts (${this.maxReconnectAttempts}) reached`;
    console.error(`[WebSocket] ${errorMsg}`);
    this.updateConnectionStatus('disconnected');
    this.notifyErrorHandlers(new Error(errorMsg));
    this.reconnectAttempts = 0; // Reset for future connection attempts
    this.reconnectDelay = 1000; // Reset delay
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
