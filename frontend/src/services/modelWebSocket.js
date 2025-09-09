class ModelWebSocket {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.messageHandlers = new Map();
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.connectionListeners = new Set();
    this.isExplicitDisconnect = false;
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isExplicitDisconnect = false;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        console.log(`Connecting to model WebSocket at ${this.url}`);
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log('Model WebSocket connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.notifyConnectionChange(true);
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.debug('Received WebSocket message:', message);
            
            // Call all handlers for this message type
            const handlers = this.messageHandlers.get(message.type) || [];
            handlers.forEach(handler => {
              try {
                handler(message.data);
              } catch (error) {
                console.error('Error in message handler:', error);
              }
            });
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        this.socket.onerror = (error) => {
          console.error('Model WebSocket error:', error);
          this.notifyConnectionChange(false, error);
          reject(error);
        };

        this.socket.onclose = (event) => {
          console.log(`Model WebSocket closed: ${event.code} ${event.reason || ''}`.trim());
          this.connectionPromise = null;
          this.socket = null;
          this.notifyConnectionChange(false);
          
          // Only attempt to reconnect if the disconnect was not explicit
          if (!this.isExplicitDisconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay);
            // Exponential backoff with jitter
            this.reconnectDelay = Math.min(
              this.reconnectDelay * 1.5 + Math.random() * 1000,
              this.maxReconnectDelay
            );
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  disconnect() {
    this.isExplicitDisconnect = true;
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
    this.connectionPromise = null;
    this.notifyConnectionChange(false);
  }
  
  // Add connection state change listener
  addConnectionListener(callback) {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }
  
  // Notify all connection listeners
  notifyConnectionChange(isConnected, error = null) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(isConnected, error);
      } catch (err) {
        console.error('Error in connection listener:', err);
      }
    });
  }
  
  // Send a message to the WebSocket server
  send(message) {
    if (!this.isConnected()) {
      console.error('Cannot send message: WebSocket not connected');
      return false;
    }
    
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send(messageStr);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  onMessage(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
    
    // Return cleanup function
    return () => {
      const handlers = this.messageHandlers.get(type) || [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }

  offMessage(type, handler) {
    const handlers = this.messageHandlers.get(type) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create a singleton instance
const modelWebSocket = new ModelWebSocket(
  process.env.REACT_APP_MODEL_WS_URL || 'ws://localhost:8081'
);

export default modelWebSocket;
