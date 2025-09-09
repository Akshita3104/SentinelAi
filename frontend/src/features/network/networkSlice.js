import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { webSocketService } from '../../services/websocketService';
import { toast } from 'react-toastify';

// WebSocket server URLs from environment variables
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
const PACKET_CAPTURE_WS_URL = process.env.REACT_APP_PACKET_CAPTURE_WS_URL || 'ws://localhost:8080/ws';

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
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const { activeInterface } = getState().network;
      if (!activeInterface) {
        throw new Error('No network interface selected');
      }

      console.log('[Network] Initializing WebSocket connection...');
      
      // Configure WebSocket service with dispatch
      webSocketService.setDispatch(dispatch);
      
      // Initialize WebSocket connection using our service
      await webSocketService.initializeConnection(WS_URL, {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000
      });
      
      // Set up message handler
      webSocketService.onMessage((message) => {
        try {
          console.log('[Network] Received message:', message);
          const data = typeof message === 'string' ? JSON.parse(message) : message;
          
          if (data.type === 'packet') {
            console.log('[Network] Processing packet:', data.data);
            dispatch(addPacket(data.data));
          } else if (data.type === 'stats') {
            console.log('[Network] Updating stats:', data.data);
            dispatch(updateStats(data.data));
          } else if (data.type === 'interfaces') {
            console.log('[Network] Updating interfaces:', data.data);
            dispatch(updateInterfaces(data.data));
          } else if (data.type === 'error') {
            console.error('[Network] Server error:', data.message);
            toast.error(`Network error: ${data.message}`);
          }
        } catch (error) {
          console.error('[Network] Error processing message:', error);
        }
      });
      
      // Set up error handler
      webSocketService.onError((error) => {
        console.error('[Network] WebSocket error:', error);
        dispatch(setCaptureConnected(false));
        toast.error(`Connection error: ${error.message || 'Unknown error'}`);
      });
      
      // Set up connection status handler
      webSocketService.onConnectionStatusChange((status) => {
        console.log('[Network] Connection status changed:', status);
        dispatch(updateCaptureStatus({ status }));
        
        if (status === 'connected') {
          dispatch(setCaptureConnected(true));
          
          // Send initialization message with interface selection
          const initMsg = {
            type: 'start_capture',
            interface: activeInterface
          };
          webSocketService.send(JSON.stringify(initMsg));
          
        } else if (status === 'disconnected' || status === 'error') {
          dispatch(setCaptureConnected(false));
        }
      });
      
      return { status: 'connecting' };
    } catch (error) {
      console.error('[Network] Error connecting to WebSocket:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const startCapture = createAsyncThunk(
  'network/startCapture',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { activeInterface, isCaptureConnected } = getState().network;
      
      if (!activeInterface) {
        throw new Error('No network interface selected');
      }

      if (!webSocketService.isConnected()) {
        throw new Error('WebSocket connection not established');
      }

      const message = {
        type: 'start_capture',
        interface: activeInterface
      };
      
      webSocketService.send(JSON.stringify(message));
      return { status: 'capture_started' };
    } catch (error) {
      console.error('[Network] Error starting capture:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const stopCapture = createAsyncThunk(
  'network/stopCapture',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { isCaptureConnected } = getState().network;
      console.log('[Network] Stopping packet capture...');
      
      // Ensure we're connected to the WebSocket
      if (!isCaptureConnected) {
        throw new Error('Not connected to packet capture service');
      }

      if (!webSocketService.isConnected()) {
        throw new Error('WebSocket connection not established');
      }

      const message = {
        type: 'stop_capture'
      };
      
      webSocketService.send(JSON.stringify(message));
      return { status: 'capture_stopped' };
    } catch (error) {
      console.error('[Network] Error stopping capture:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const updateCaptureFilter = createAsyncThunk(
  'network/updateCaptureFilter',
  async (filter, { getState, dispatch, rejectWithValue }) => {
    try {
      const { isCaptureConnected } = getState().network;
      console.log('[Network] Updating capture filter:', filter);
      
      // Ensure we're connected to the WebSocket
      if (!isCaptureConnected) {
        throw new Error('Not connected to packet capture service');
      }

      if (!webSocketService.isConnected()) {
        throw new Error('WebSocket connection not established');
      }

      const message = {
        type: 'update_filter',
        filter
      };
      
      webSocketService.send(JSON.stringify(message));
      return { success: true, message: 'Filter updated' };
    } catch (error) {
      console.error('[Network] Error updating capture filter:', error);
      return rejectWithValue(error.message);
    }
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
      const { payload } = action;
      if (!payload) return;
      
      // Update isCapturing if provided (handle both snake_case and camelCase for backend compatibility)
      if (payload.is_capturing !== undefined) {
        state.isCapturing = payload.is_capturing;
      } else if (payload.isCapturing !== undefined) {
        state.isCapturing = payload.isCapturing;
      }
      
      // Update interface if provided (handle both snake_case and camelCase)
      if (payload.interface) {
        state.activeInterface = payload.interface;
      } else if (payload.current_interface) {
        state.activeInterface = payload.current_interface;
      }
      
      // Update status if provided
      if (payload.status) {
        state.status = payload.status;
      }
      
      // Update statistics if provided
      if (payload.stats) {
        state.stats = { ...state.stats, ...payload.stats };
      } else if (payload.stats) {
        // Handle case where stats might be in a different format from backend
        state.stats = { ...state.stats, ...payload.stats };
      }
      
      // Update bandwidth if provided
      if (payload.bandwidth) {
        state.bandwidth = { ...state.bandwidth, ...payload.bandwidth };
      }
      
      // Update filter if provided
      if (payload.filter) {
        state.filters = { ...state.filters, ...payload.filter };
      }
      
      // Log status update
      console.log('[Network] Capture status updated:', {
        isCapturing: state.isCapturing,
        interface: state.activeInterface,
        status: state.status,
        stats: state.stats,
        bandwidth: state.bandwidth
      });
    },
    addPacket(state, action) {
      const packet = action.payload;
      
      // Ensure packet has required fields
      if (!packet || typeof packet !== 'object') {
        console.warn('Received invalid packet:', packet);
        return;
      }
      
      // Add timestamp if not present
      if (!packet.timestamp) {
        packet.timestamp = new Date().toISOString();
      }
      
      // Add to packets array (limit to 1000 most recent packets)
      state.packets.unshift(packet);
      if (state.packets.length > 1000) {
        state.packets.pop();
      }
      
      // Update statistics
      state.stats.total += 1;
      
      // Update protocol stats
      const protocol = (packet.protocol || '').toLowerCase();
      if (protocol && state.stats[protocol] !== undefined) {
        state.stats[protocol] += 1;
      } else {
        state.stats.other += 1;
      }
      
      // Update bandwidth stats (if available)
      if (packet.length) {
        const bytes = parseInt(packet.length, 10) || 0;
        state.bandwidth.in += bytes;
        
        // Update bandwidth history (keep last 60 entries - 1 minute at 1s updates)
        const now = Date.now();
        const lastUpdate = state.bandwidth.lastUpdate || now;
        
        // If more than 1 second has passed, add a new entry
        if (now - lastUpdate >= 1000) {
          state.bandwidth.history.push({
            timestamp: now,
            bytes: state.bandwidth.in
          });
          
          // Keep only the last 60 entries
          if (state.bandwidth.history.length > 60) {
            state.bandwidth.history.shift();
          }
          
          state.bandwidth.lastUpdate = now;
        }
      }
    },
    updateStats(state, action) {
      if (!action.payload) return;
              
      // Only update stats that exist in the initial state
      Object.keys(action.payload).forEach(key => {
        if (state.stats.hasOwnProperty(key)) {
          state.stats[key] = action.payload[key];
        }
      });
              
      console.log('[Network] Stats updated:', state.stats);
    },
    updateBandwidth(state, action) {
      if (!action.payload) return;
              
      const now = Date.now();
      const { in: inBytes, out: outBytes } = action.payload;
              
      // Update current bandwidth
      if (inBytes !== undefined) state.bandwidth.in = inBytes;
      if (outBytes !== undefined) state.bandwidth.out = outBytes || 0;
              
      // Calculate bytes per second
      const lastUpdate = state.bandwidth.lastUpdate || now;
      const timeDiff = Math.max(1, (now - lastUpdate) / 1000); // in seconds
              
      // Calculate bytes per second
      const inBps = inBytes !== undefined ? (inBytes - (state.bandwidth.in || 0)) / timeDiff : 0;
              
      // Update history (keep last 60 entries - 1 minute at 1s updates)
      state.bandwidth.history.push({
        timestamp: now,
        in: inBps,
        out: outBytes || 0,
        total: inBps + (outBytes || 0)
      });
              
      // Keep only the last 60 entries
      if (state.bandwidth.history.length > 60) {
        state.bandwidth.history.shift();
      }
              
      // Update last update time
      state.bandwidth.lastUpdate = now;
              
      console.log('[Network] Bandwidth updated:', {
        in: state.bandwidth.in,
        out: state.bandwidth.out,
        bps: inBps
      });
    },
    updateInterfaces(state, action) {
      if (!Array.isArray(action?.payload)) {
        console.warn('Invalid interfaces payload:', action.payload);
        return;
      }
      
      state.interfaces = action.payload;
      
      // Set default active interface if none is selected or if current active interface is not in the list
      if (action.payload.length > 0) {
        const activeInterfaceExists = action.payload.some(
          iface => iface.name === state.activeInterface
        );
        
        if (!activeInterfaceExists) {
          state.activeInterface = action.payload[0].name;
          console.log(`[Network] Active interface set to: ${state.activeInterface}`);
        }
      } else {
        state.activeInterface = null;
      }
      
      console.log(`[Network] Updated interfaces:`, {
        count: state.interfaces.length,
        active: state.activeInterface
      });
    },
    setFilter(state, action) {
      if (!action.payload || typeof action.payload !== 'object') {
        console.warn('Invalid filter payload:', action.payload);
        return;
      }
      
      // Only update filters that exist in the initial state
      const validFilters = {};
      Object.keys(action.payload).forEach(key => {
        if (state.filters.hasOwnProperty(key)) {
          validFilters[key] = action.payload[key];
        }
      });
      
      if (Object.keys(validFilters).length > 0) {
        state.filters = { ...state.filters, ...validFilters };
        console.log('[Network] Filters updated:', state.filters);
      }
    },
    selectPacket(state, action) {
      // Only update if the packet exists in the current packets array
      if (action.payload === null || 
          (typeof action.payload === 'object' && action.payload !== null)) {
        state.selectedPacket = action.payload;
        console.log('[Network] Selected packet:', 
          action.payload ? 'Packet selected' : 'Selection cleared');
      } else {
        console.warn('Invalid packet selection:', action.payload);
      }
    },
    clearPackets(state) {
      const packetCount = state.packets.length;
      state.packets = [];
      state.selectedPacket = null;
      
      // Log the clear action
      console.log(`[Network] Cleared ${packetCount} packets`);
      
      // Reset all statistics
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
      
      // Reset bandwidth tracking
      state.bandwidth = {
        in: 0,
        out: 0,
        history: [],
        lastUpdate: null
      };
      
      console.log('[Network] All packets and statistics cleared');
    },
  },
  extraReducers: (builder) => {
    // Handle connectToCapture thunk
    builder
      .addCase(connectToCapture.pending, (state) => {
        console.log('[Network] Connecting to WebSocket...');
        state.status = 'connecting';
        state.error = null;
      })
      .addCase(connectToCapture.fulfilled, (state) => {
        console.log('[Network] WebSocket connection established');
        state.status = 'connected';
        state.isCaptureConnected = true;
        state.error = null;
      })
      .addCase(connectToCapture.rejected, (state, action) => {
        const error = action.error?.message || 'Connection failed';
        console.error('[Network] WebSocket connection failed:', error);
        state.status = 'error';
        state.isCaptureConnected = false;
        state.error = error;
      })
      
      // Handle startCapture thunk
      .addCase(startCapture.pending, (state) => {
        console.log('[Network] Starting packet capture...');
        state.isCapturing = true;
        state.error = null;
      })
      .addCase(startCapture.fulfilled, (state) => {
        console.log('[Network] Packet capture started');
        state.isCapturing = true;
      })
      .addCase(startCapture.rejected, (state, action) => {
        const error = action.error?.message || 'Failed to start capture';
        console.error('[Network] Start capture failed:', error);
        state.isCapturing = false;
        state.error = error;
      })
      
      // Handle stopCapture thunk
      .addCase(stopCapture.pending, (state) => {
        console.log('[Network] Stopping packet capture...');
        state.isCapturing = true; // Still capturing until confirmed stopped
      })
      .addCase(stopCapture.fulfilled, (state) => {
        console.log('[Network] Packet capture stopped');
        state.isCapturing = false;
      })
      .addCase(stopCapture.rejected, (state, action) => {
        const error = action.error?.message || 'Failed to stop capture';
        console.error('[Network] Stop capture failed:', error);
        state.error = error;
      })
      
      // Handle updateCaptureFilter thunk
      .addCase(updateCaptureFilter.pending, (state) => {
        console.log('[Network] Updating capture filter...');
      })
      .addCase(updateCaptureFilter.fulfilled, (state) => {
        console.log('[Network] Capture filter updated');
      })
      .addCase(updateCaptureFilter.rejected, (state, action) => {
        const error = action.error?.message || 'Failed to update filter';
        console.error('[Network] Update filter failed:', error);
        state.error = error;
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
