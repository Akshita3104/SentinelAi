import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WEBSOCKET_URL = 'http://localhost:3000';

// WebSocket connection
let socket: Socket | null = null;

export const initializeWebSocket = () => {
  if (!socket) {
    socket = io(WEBSOCKET_URL, {
      transports: ['polling', 'websocket'], // Use polling first, then websocket
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      forceNew: false
    });
    
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    socket.on('connect_error', (error) => {
      console.log('WebSocket connection failed:', error.message);
    });
  }
  return socket;
};

export const getSocket = () => socket;

// Optimized axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 800,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Types for API requests and responses
export interface DetectionRequest {
  traffic: number[];
  ip: string;
  packet_data?: {
    packet_rate?: number;
    avg_packet_size?: number;
  };
  network_slice?: string;
  model_type?: string;
}

export interface DetectionResponse {
  prediction: string;
  confidence: number;
  threat_level: string;
  ddos_indicators: number;
  confidence_factors: string[];
  network_analysis: {
    max_traffic: number;
    avg_traffic: number;
    traffic_variance: number;
    bandwidth_utilization_mbps: number;
    burst_ratio: number;
    packet_rate: number;
  };
  slice_recommendation: {
    action: string;
    priority: string;
  };
  ip_address: string;
  abuseScore: number;
  isDDoS: boolean;
  mlPrediction: string;
  message: string;
  network_slice: string;
  detection_method?: string;
  ml_model?: {
    prediction: string;
    threat_detected: boolean;
    original_confidence: number;
  };
  abuseipdb_model?: {
    score: number;
    status: string;
    threat_detected: boolean;
    threshold: number;
  };
}

// API service functions
export const apiService = {
  // Detect DDoS using local ML model
  async detectDDoS(data: DetectionRequest): Promise<DetectionResponse> {
    try {
      const response = await apiClient.post('/detect', data);
      return response.data;
    } catch (error) {
      console.error('DDoS detection API error:', error);
      throw new Error('Failed to detect DDoS. Please check if the backend server is running.');
    }
  },

  // Detect DDoS using external API model
  async detectDDoSWithAPI(data: DetectionRequest): Promise<DetectionResponse> {
    try {
      const response = await apiClient.post('/detect-api', data);
      return response.data;
    } catch (error) {
      console.error('External API detection error:', error);
      throw new Error('Failed to detect DDoS with external API. Please check if the backend server is running.');
    }
  },

  // Get all local machine IPs from backend
  async getLocalIPs(): Promise<any[]> {
    try {
      const response = await apiClient.get('/local-ips');
      return response.data;
    } catch (error) {
      console.error('Failed to get local IPs:', error);
      return [];
    }
  },

  // Start real packet capture
  async startPacketCapture(targetIP: string, interfaceName: string): Promise<any> {
    try {
      const response = await apiClient.post('/start-capture', { targetIP, interfaceName });
      return response.data;
    } catch (error) {
      console.error('Failed to start packet capture:', error);
      throw error;
    }
  },

  // Stop packet capture
  async stopPacketCapture(): Promise<any> {
    try {
      const response = await apiClient.post('/stop-capture');
      return response.data;
    } catch (error) {
      console.error('Failed to stop packet capture:', error);
      throw error;
    }
  },

  // Get capture status
  async getCaptureStatus(): Promise<any> {
    try {
      const response = await apiClient.get('/capture-status');
      return response.data;
    } catch (error) {
      console.error('Failed to get capture status:', error);
      return { isCapturing: false, mode: 'idle' };
    }
  },

  // Health check to verify backend connectivity
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get('http://localhost:3000/');
      return response.status === 200;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  },
};

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error status
    return error.response.data?.error || `Server error: ${error.response.status}`;
  } else if (error.request) {
    // Request was made but no response received
    return 'No response from server. Please check if the backend is running on port 3000.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};
