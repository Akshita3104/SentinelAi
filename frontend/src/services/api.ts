import axios from 'axios';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
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
