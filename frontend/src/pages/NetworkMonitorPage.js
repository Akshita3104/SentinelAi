import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectNetworkStatus,
  selectIsCapturing,
  selectInterfaces,
  selectActiveInterface,
  connectToCapture,
  startCapture,
  stopCapture,
  setActiveInterface,
  clearPackets,
  selectFilteredPackets,
  selectStats,
  selectBandwidth,
  selectFilters,
  setFilter,
  selectSelectedPacket,
  selectPacket
} from '../features/network/networkSlice';
import NetworkMonitor from '../components/NetworkMonitor';

const NetworkMonitorPage = () => {
  const dispatch = useDispatch();
  const status = useSelector(selectNetworkStatus);
  const isConnected = status === 'connected';
  const isCapturing = useSelector(selectIsCapturing);
  const interfaces = useSelector(selectInterfaces);
  const currentInterface = useSelector(selectActiveInterface);
  const packets = useSelector(selectFilteredPackets);
  const stats = useSelector(selectStats);
  const bandwidth = useSelector(selectBandwidth);
  const filters = useSelector(selectFilters);
  const selectedPacket = useSelector(selectSelectedPacket);

  // Initialize WebSocket connection when component mounts
  useEffect(() => {
    dispatch(connectToCapture());
    
    // Cleanup on unmount
    return () => {
      // Cleanup if needed
    };
  }, [dispatch]);

  const handleStartCapture = () => {
    dispatch(startCapture({ interface: currentInterface }));
  };

  const handleStopCapture = () => {
    dispatch(stopCapture());
  };

  const handleInterfaceChange = (e) => {
    const newInterface = e.target.value;
    dispatch(setActiveInterface(newInterface));
    
    // Restart capture if already running
    if (isCapturing) {
      dispatch(stopCapture()).then(() => {
        dispatch(startCapture({ interface: newInterface }));
      });
    }
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    dispatch(setFilter({ [name]: value }));
  };
  
  const handleClearPackets = () => {
    dispatch(clearPackets());
  };
  
  const handleSelectPacket = (packet) => {
    dispatch(selectPacket(packet));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Network Monitor</h1>
      <NetworkMonitor 
        isConnected={isConnected}
        isCapturing={isCapturing}
        interfaces={interfaces}
        currentInterface={currentInterface}
        packets={packets}
        stats={stats}
        bandwidth={bandwidth}
        filters={filters}
        selectedPacket={selectedPacket}
        onStartCapture={handleStartCapture}
        onStopCapture={handleStopCapture}
        onInterfaceChange={handleInterfaceChange}
        onFilterChange={handleFilterChange}
        onClearPackets={handleClearPackets}
        onSelectPacket={handleSelectPacket}
      />
    </div>
  );
};

export default NetworkMonitorPage;
