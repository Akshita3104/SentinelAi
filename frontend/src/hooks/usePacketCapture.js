import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useCallback } from 'react';
import {
  selectIsConnected,
  selectIsCapturing,
  selectInterfaces,
  selectActiveInterface,
  selectPackets,
  selectStats,
  selectBandwidth,
  selectError,
  startCapture as startCaptureAction,
  stopCapture as stopCaptureAction,
  clearPackets as clearPacketsAction,
  setActiveInterface as setActiveInterfaceAction,
  connectToCapture
} from '../features/network/networkSlice';

const usePacketCapture = () => {
  const dispatch = useDispatch();
  
  // Select data from Redux store
  const isConnected = useSelector(selectIsConnected);
  const isCapturing = useSelector(selectIsCapturing);
  const interfaces = useSelector(selectInterfaces);
  const activeInterface = useSelector(selectActiveInterface);
  const packets = useSelector(selectPackets);
  const stats = useSelector(selectStats);
  const bandwidth = useSelector(selectBandwidth);
  const error = useSelector(selectError);

  // Initialize WebSocket connection
  useEffect(() => {
    dispatch(connectToCapture());
  }, [dispatch]);

  // Start packet capture
  const startCapture = useCallback((interfaceName) => {
    dispatch(startCaptureAction(interfaceName));
  }, [dispatch]);

  // Stop packet capture
  const stopCapture = useCallback(() => {
    dispatch(stopCaptureAction());
  }, [dispatch]);

  // Clear captured packets
  const clearPackets = useCallback(() => {
    dispatch(clearPacketsAction());
  }, [dispatch]);

  // Set active interface
  const setInterfaceName = useCallback((interfaceName) => {
    dispatch(setActiveInterfaceAction(interfaceName));
  }, [dispatch]);

  return {
    // State
    isConnected,
    isCapturing,
    interfaces,
    activeInterface,
    packets,
    stats,
    bandwidth,
    error,
    
    // Actions
    startCapture,
    stopCapture,
    clearPackets,
    setInterfaceName,
    
    // For backward compatibility
    interfaceName: activeInterface,
  };
};

export default usePacketCapture;
