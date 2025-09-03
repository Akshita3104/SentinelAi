import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { webSocketService } from '../../services/websocketService';

// WebSocket server URL (should be moved to environment variables in production)
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
const PACKET_CAPTURE_WS_URL = process.env.REACT_APP_PACKET_CAPTURE_WS_URL || 'ws://localhost:8080/ws/packets';

const initialState = {
  status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'
  error: null,
  interfaces: [],
  availableInterfaces: ['Wi-Fi', 'Ethernet'],
  activeInterface: 'Wi-Fi',
  isCapturing: false,
  isCaptureConnected: false,
  packets: [],
  stats: {
    total: 0,
    tcp: 0,
    udp: 0,
    http: 0,
    https: 0,
    dns: 0,
    other: 0,
    dropped: 0,
  },
  bandwidth: {
    in: 0,
    out: 0,
    history: [],
    lastUpdate: null,
  },
  filters: {
    protocol: 'all',
    sourceIp: '',
    destinationIp: '',
    port: '',
  },
  selectedPacket: null,
};

// Thunks for WebSocket operations
export const connectToCapture = createAsyncThunk(
  'network/connectToCapture',
  async (_, { dispatch, getState }) => {
    try {
      const { activeInterface } = getState().network;
      if (!activeInterface) {
        throw new Error('No network interface selected');
      }

      // Connect to WebSocket server
      await webSocketService.connect(WS_URL);
      
      // Set up packet capture WebSocket
      const packetWs = new WebSocket(PACKET_CAPTURE_WS_URL);
      
      packetWs.onopen = () => {
        dispatch(setCaptureConnected(true));
      };
      
      packetWs.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'packet') {
          dispatch(addPacket(message.data));
        } else if (message.type === 'status') {
          dispatch(updateCaptureStatus(message.data));
        }
      };
      
      packetWs.onclose = () => {
        dispatch(setCaptureConnected(false));
      };
      
      // Store WebSocket instance in the state for later use
      return { ws: packetWs };
      
      // Set up message handler
      webSocketService.addMessageHandler((message) => {
        switch (message.type) {
          case 'packet':
            dispatch(addPacket(message.payload));
            break;
          case 'stats/update':
            dispatch(updateStats(message.payload));
            break;
          case 'bandwidth/update':
            dispatch(updateBandwidth(message.payload));
            break;
          case 'interfaces/update':
            dispatch(updateInterfaces(message.payload));
            break;
          case 'error':
            console.error('WebSocket Error:', message.payload);
            break;
          default:
            console.log('Unhandled message type:', message.type);
        }
      });

      // Request initial data
      webSocketService.sendMessage({ type: 'interfaces/list' });
      
      return { status: 'connected' };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      return { error: error.message };
    }
  }
);

export const startCapture = createAsyncThunk(
  'network/startCapture',
  async (_, { getState }) => {
    const { activeInterface } = getState().network;
    if (!activeInterface) {
      throw new Error('No network interface selected');
    }
    
    const success = webSocketService.startCapture(activeInterface);
    if (!success) {
      throw new Error('Failed to send start capture command');
    }
    return { success: true };
  }
);

export const stopCapture = createAsyncThunk(
  'network/stopCapture',
  async () => {
    const success = webSocketService.stopCapture();
    if (!success) {
      throw new Error('Failed to send stop capture command');
    }
    return { success: true };
  }
);

export const updateCaptureFilter = createAsyncThunk(
  'network/updateCaptureFilter',
  async (filter, { getState }) => {
    const success = webSocketService.setFilter(filter);
    if (!success) {
      throw new Error('Failed to update capture filter');
    }
    return { filter };
  }
);

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setActiveInterface(state, action) {
      state.activeInterface = action.payload;
    },
    setCaptureConnected(state, action) {
      state.isCaptureConnected = action.payload;
    },
    updateCaptureStatus(state, action) {
      if (action.payload) {
        state.isCapturing = action.payload.isCapturing ?? state.isCapturing;
        state.activeInterface = action.payload.interface ?? state.activeInterface;
        if (action.payload.status) {
          state.status = action.payload.status;
        }
      }
    },
    addPacket(state, action) {
      const packet = action.payload;
      state.packets.unshift(packet);
      state.stats.total += 1;
      // Update protocol stats
      const protocol = packet.protocol?.toLowerCase() || 'other';
      if (state.stats[protocol] !== undefined) {
        state.stats[protocol] += 1;
      } else {
        state.stats.other += 1;
      }
      
      // Update bandwidth
      const now = Date.now();
      const length = packet.length || 0;
      state.bandwidth.in += length;
      
      // Keep last 100 bandwidth updates
      state.bandwidth.history.push({ time: now, value: length });
      if (state.bandwidth.history.length > 100) {
        state.bandwidth.history.shift();
      }
      state.bandwidth.lastUpdate = now;
    },
    updateStats(state, action) {
      state.stats = { ...state.stats, ...action.payload };
    },
    updateBandwidth(state, action) {
      const { in: inBytes, out: outBytes } = action.payload;
      const now = new Date().toISOString();
      
      state.bandwidth.in = inBytes;
      state.bandwidth.out = outBytes;
      state.bandwidth.history.push({
        timestamp: now,
        in: inBytes,
        out: outBytes
      });
      
      // Keep only the last 60 data points (1 minute at 1s intervals)
      if (state.bandwidth.history.length > 60) {
        state.bandwidth.history.shift();
      }
      
      state.bandwidth.lastUpdate = now;
    },
    updateInterfaces(state, action) {
      state.interfaces = action.payload;
      if (action.payload.length > 0 && !state.activeInterface) {
        state.activeInterface = action.payload[0].name;
      }
    },
    setFilter(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    selectPacket(state, action) {
      state.selectedPacket = action.payload;
    },
    clearPackets(state) {
      state.packets = [];
      state.stats = {
        total: 0,
        tcp: 0,
        udp: 0,
        http: 0,
        https: 0,
        dns: 0,
        other: 0,
        dropped: 0,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectToCapture.pending, (state) => {
        state.status = 'connecting';
      })
      .addCase(connectToCapture.fulfilled, (state, action) => {
        if (action.payload.error) {
          state.status = 'error';
          state.error = action.payload.error;
        } else {
          state.status = 'connected';
        }
      })
      .addCase(connectToCapture.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.error.message;
      })
      .addCase(startCapture.pending, (state) => {
        state.isCapturing = true;
      })
      .addCase(startCapture.fulfilled, (state) => {
        state.isCapturing = true;
      })
      .addCase(startCapture.rejected, (state, action) => {
        state.isCapturing = false;
        state.error = action.error.message;
      });
  },
});

export const { 
  setActiveInterface, 
  setCaptureConnected, 
  updateCaptureStatus,
  addPacket, 
  updateStats, 
  updateBandwidth, 
  updateInterfaces, 
  setFilter, 
  selectPacket, 
  clearPackets 
} = networkSlice.actions;

export default networkSlice.reducer;

// Selectors
export const selectNetworkStatus = (state) => state.network.status;
export const selectInterfaces = (state) => state.network.interfaces;
export const selectActiveInterface = (state) => state.network.activeInterface;
export const selectIsCapturing = (state) => state.network.isCapturing;
export const selectPackets = (state) => state.network.packets;
export const selectStats = (state) => state.network.stats;
export const selectBandwidth = (state) => state.network.bandwidth;
export const selectFilters = (state) => state.network.filters;
export const selectSelectedPacket = (state) => state.network.selectedPacket;

export const selectFilteredPackets = (state) => {
  const { packets, filters } = state.network;
  const { protocol, sourceIp, destinationIp, port } = filters;

  // If no filters are active, return all packets
  const hasActiveFilters = protocol !== 'all' || sourceIp || destinationIp || port;
  if (!hasActiveFilters) {
    return packets;
  }

  return packets.filter((packet) => {
    // Filter by protocol
    if (protocol !== 'all' && packet.protocol && 
        !packet.protocol.toLowerCase().includes(protocol.toLowerCase())) {
      return false;
    }

    // Filter by source IP
    if (sourceIp && packet.source && 
        !packet.source.toLowerCase().includes(sourceIp.toLowerCase())) {
      return false;
    }

    // Filter by destination IP
    if (destinationIp && packet.destination && 
        !packet.destination.toLowerCase().includes(destinationIp.toLowerCase())) {
      return false;
    }

    // Filter by port (check both source and destination ports if they exist)
    if (port) {
      const portStr = port.toString();
      const sourcePort = packet.source?.split(':')[1];
      const destPort = packet.destination?.split(':')[1];
      
      if ((!sourcePort || sourcePort !== portStr) && 
          (!destPort || destPort !== portStr)) {
        return false;
      }
    }

    return true;
  });
};

// New selector for capture status
export const selectCaptureStatus = (state) => ({
  isConnected: state.network.isCaptureConnected,
  isCapturing: state.network.isCapturing,
  activeInterface: state.network.activeInterface,
  availableInterfaces: state.network.availableInterfaces
});

// Async thunks are already exported from createAsyncThunk
// No need to re-export them here
