import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, User, Activity, Network, AlertTriangle, Settings, Eye, Loader2, Wifi, WifiOff } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { apiService, handleApiError, DetectionRequest, DetectionResponse, initializeWebSocket, getSocket } from './services/api';

interface AlertData {
  id: number;
  time: string;
  ip: string;
  srcIP?: string;
  dstIP?: string;
  protocol?: string;
  slice: string;
  mlResult: string;
  abuseScore: number;
  action: string;
}

interface DetectionData {
  timestamp: string;
  riskScore: number;
}

function App() {
  const [currentSlice, setCurrentSlice] = useState('eMBB');
  const [mlPrediction, setMlPrediction] = useState('Normal');
  const [abuseScore, setAbuseScore] = useState(15);
  const [mitigationStatus, setMitigationStatus] = useState('Idle');
  const [trafficData, setTrafficData] = useState('0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0');
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [localIPs, setLocalIPs] = useState<any[]>([]);
  const [isRealCapture, setIsRealCapture] = useState(false);
  const [isAutoMonitoring, setIsAutoMonitoring] = useState(false);
  const [networkInterface, setNetworkInterface] = useState('auto');
  const [capturedPackets, setCapturedPackets] = useState(0);
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);
  const [ddosRisk, setDdosRisk] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastDetectionResult, setLastDetectionResult] = useState<DetectionResponse | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    threatScore: 25,
    networkLoad: 45,
    anomalyCount: 0,
    responseTime: 0
  });
  const [networkAnalysis, setNetworkAnalysis] = useState<any>(null);
  const [detectionLogs, setDetectionLogs] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [detectionHistory, setDetectionHistory] = useState<DetectionData[]>([]);


  // Load local IPs from backend
  const loadLocalIPs = async () => {
    try {
      const ips = await apiService.getLocalIPs();
      setLocalIPs(ips);
      if (ips.length > 0) {
        setIpAddress(ips[0].address);
      }
    } catch (error) {
      console.log('Could not load local IPs');
    }
  };

  // Start automatic network monitoring
  const startAutoMonitoring = async () => {
    if (isAutoMonitoring) {
      stopAutoMonitoring();
      return;
    }

    setIsAutoMonitoring(true);
    setErrorMessage('');
    
    // Add initial log
    setDetectionLogs([`🚀 Network monitoring started at ${new Date().toLocaleTimeString()}`]);
    
    // Force immediate update
    const initialTraffic = Math.floor(Math.random() * 50) + 10;
    setTrafficData(prev => {
      const currentData = prev.split(',').map(v => parseInt(v.trim()) || 0);
      const newData = [...currentData.slice(1), initialTraffic];
      return newData.join(',');
    });
    setCapturedPackets(prev => prev + initialTraffic);
    
    // Try real packet capture first (only for Ethernet/Wi-Fi)
    const selectedIP = localIPs.find(ip => ip.address === ipAddress);
    const name = selectedIP?.interface.toLowerCase() || '';
    const isVirtual = name.includes('vmware') || name.includes('bluetooth');
    const isValidInterface = !isVirtual && ((name.includes('ethernet') && !name.includes('vmware')) || 
                            name.includes('wi-fi') || name.includes('wifi') || 
                            name.includes('wireless lan') || name.includes('wlan'));
    
    if (selectedIP && isValidInterface) {
      try {
        await apiService.startPacketCapture(ipAddress, selectedIP.interface);
        setIsRealCapture(true);
        setErrorMessage(`✅ Real capture started on ${selectedIP.interface}`);
        setTimeout(() => setErrorMessage(''), 3000);
      } catch (error) {
        console.log('Real capture failed, using simulation:', error);
        setErrorMessage('⚠️ Real capture failed. Using simulation mode.');
        setIsRealCapture(false);
        setTimeout(() => setErrorMessage(''), 5000);
      }
    } else {
      setErrorMessage('⚠️ No valid interface. Using simulation mode.');
      setIsRealCapture(false);
      setTimeout(() => setErrorMessage(''), 5000);
    }
    
    // Start monitoring interval (real or simulation)
    const interval = setInterval(async () => {
      if (isRealCapture) {
        try {
          const status = await apiService.getCaptureStatus();
          console.log('Real capture status:', status);
          
          if (status.packetCount !== undefined) {
            setCapturedPackets(status.packetCount);
          }
          
          if (status.recentTraffic && status.recentTraffic !== '0') {
            setTrafficData(status.recentTraffic);
          }
          
          if (status.packetsPerSecond > 20) {
            await performDetection();
          }
        } catch (error) {
          console.error('Error getting capture status:', error);
        }
      } else {
        // Simulation mode
        try {
          const currentTraffic = Math.floor(Math.random() * 100) + 10;
          
          setTrafficData(prev => {
            const currentData = prev.split(',').map(v => parseInt(v.trim()) || 0);
            const newData = [...currentData.slice(1), currentTraffic];
            return newData.join(',');
          });
          
          setCapturedPackets(prev => prev + currentTraffic);
          
          // Add detection logs
          if (Math.random() > 0.8) {
            const logMessage = `🔍 Simulation: Analyzing ${currentTraffic} packets/sec`;
            setDetectionLogs(prev => [logMessage, ...prev.slice(0, 9)]);
          }
          
          // Run ML detection periodically
          if (Math.random() > 0.85) {
            const detectionLog = `🤖 Running ML detection on traffic pattern`;
            setDetectionLogs(prev => [detectionLog, ...prev.slice(0, 9)]);
            await performDetection();
          }
        } catch (error) {
          console.error('Simulation error:', error);
        }
      }
    }, 500);
    setMonitoringInterval(interval);
  };

  const stopAutoMonitoring = async () => {
    setIsAutoMonitoring(false);
    
    // Stop real capture
    try {
      await apiService.stopPacketCapture();
      console.log('Real packet capture stopped');
    } catch (error) {
      console.error('Error stopping real capture:', error);
    }
    setIsRealCapture(false);
    
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  };

  // Check backend connectivity and auto-detect IP on component mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const isHealthy = await apiService.healthCheck();
        setBackendConnected(isHealthy);
        if (!isHealthy) {
          setErrorMessage('Backend server is not responding. Please start the backend server on port 3000.');
        } else {
          setErrorMessage('');
        }
      } catch (error) {
        setBackendConnected(false);
        setErrorMessage('Failed to connect to backend server.');
      }
    };

    // Initialize WebSocket connection with error handling
    let socket = null;
    const initWebSocket = async () => {
      try {
        // Check if backend is available first
        const backendHealthy = await apiService.healthCheck();
        if (!backendHealthy) {
          console.log('Backend not available, skipping WebSocket');
          return;
        }
        
        socket = initializeWebSocket();
        console.log('WebSocket initialization attempted');
      
      socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully');
        setBackendConnected(true);
      });
      
      socket.on('status', (data) => {
        console.log('Backend status:', data);
        setBackendConnected(true);
      });
      
      socket.on('status-update', (data) => {
        console.log('Status update:', data);
        setBackendConnected(true);
      });
      
      socket.on('detection-result', (data) => {
        console.log('Detection result received:', data);
        const result = data.result;
        
        // Update UI with real detection results
        setLastDetectionResult(result);
        setMlPrediction(result.prediction === 'ddos' ? 'DDoS Detected' : 
                       result.prediction === 'suspicious' ? 'Suspicious' : 'Normal');
        setAbuseScore(result.abuseScore || 0);
        setDdosRisk(Math.floor(result.confidence * 100));
        
        if (result.network_analysis) {
          setNetworkAnalysis(result.network_analysis);
        }
        
        // Add to alerts with real packet details from latest captured packets
        const latestPackets = captureInstance?.flowWindow?.slice(-5) || [];
        const latestPacket = latestPackets[latestPackets.length - 1] || {};
        const newAlert = {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          ip: data.ip,
          srcIP: latestPacket.srcIP || data.ip,
          dstIP: latestPacket.dstIP || 'N/A',
          protocol: latestPacket.protocol || 'TCP',
          slice: result.network_slice || currentSlice,
          mlResult: result.prediction === 'ddos' ? 'DDoS Detected' : 
                   result.prediction === 'suspicious' ? 'Suspicious' : 'Normal',
          abuseScore: result.abuseScore || 0,
          action: result.slice_recommendation?.action || 'None'
        };
        setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
      });
      

      
      socket.on('detection-log', (data) => {
        console.log('Detection log:', data.message);
        // Add to detection logs
        setDetectionLogs(prev => {
          const newLogs = [data.message, ...prev.slice(0, 9)];
          return newLogs;
        });
      });
      
        socket.on('packet-update', (data) => {
          console.log('Frontend received packet-update:', data.packetCount);
          setCapturedPackets(data.packetCount);
        });
        
        socket.on('traffic-data', (data) => {
          console.log('Frontend received traffic-data:', data.recentTraffic);
          if (data.recentTraffic && data.recentTraffic !== '0') {
            setTrafficData(data.recentTraffic);
            console.log('Updated traffic data in UI:', data.recentTraffic);
          }
        });
        
        socket.on('connect_error', () => {
          console.log('WebSocket connection failed - using HTTP only');
        });
      } catch (error) {
        console.log('WebSocket initialization failed - using HTTP only');
      }
    };
    
    initWebSocket();

    // Load local IPs on startup
    loadLocalIPs();
    
    checkBackendHealth();
    // Check every 10 seconds for faster connectivity detection
    const interval = setInterval(checkBackendHealth, 10000);
    
    return () => {
      clearInterval(interval);
      stopAutoMonitoring();
      const currentSocket = getSocket();
      if (currentSocket) {
        currentSocket.disconnect();
      }
    };
  }, []);

  const getTrafficChartData = () => {
    return trafficData.split(',').map((value, index) => ({
      time: `T${index + 1}`,
      traffic: parseInt(value.trim()) || 0
    }));
  };

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-400';
    if (score <= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getRiskBgColor = (score: number) => {
    if (score <= 30) return 'bg-green-500/20 border-green-500/30';
    if (score <= 70) return 'bg-amber-500/20 border-amber-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  const performDetection = async () => {
    if (!backendConnected) {
      setErrorMessage('Cannot perform detection: Backend server is not connected.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    const startTime = Date.now();
    
    try {
      const traffic = trafficData.split(',').map(v => parseInt(v.trim()) || 0);
      
      // Validate input
      if (traffic.length === 0 || traffic.some(isNaN)) {
        throw new Error('Invalid traffic data. Please enter comma-separated numbers.');
      }
      
      const detectionRequest: DetectionRequest = {
        traffic,
        ip: ipAddress,
        packet_data: {
          packet_rate: Math.floor(Math.random() * 1000) + 100,
          avg_packet_size: 1500
        },
        network_slice: currentSlice,
      };

      // Use combined detection (automatically selects best model)
      const result: DetectionResponse = await apiService.detectDDoS(detectionRequest);

      setLastDetectionResult(result);
      
      // Update UI with real results
      const riskScore = result.isDDoS ? Math.min(100, Math.floor(result.confidence * 100)) : Math.max(10, Math.floor(result.confidence * 50));
      setDdosRisk(riskScore);
      setMlPrediction(result.prediction === 'ddos' ? 'DDoS Detected' : result.prediction === 'normal' ? 'Normal' : 'Suspicious');
      setAbuseScore(result.abuseScore);
      
      // Update network analysis data
      setNetworkAnalysis(result.network_analysis);
      
      // Update real-time metrics based on detection results
      setRealTimeMetrics({
        threatScore: riskScore,
        networkLoad: Math.floor(result.network_analysis?.bandwidth_utilization_mbps || 0),
        anomalyCount: result.ddos_indicators || 0,
        responseTime: Date.now() - startTime
      });
      
      // Determine mitigation status
      let mitigation = 'Idle';
      if (result.isDDoS) {
        mitigation = result.slice_recommendation?.action === 'ISOLATE' ? 'Blackhole Route' : 'Rate-limit Applied';
      }
      setMitigationStatus(mitigation);

      // Add new alert with real packet details
      const newAlert: AlertData = {
        id: alerts.length + 1,
        time: new Date().toLocaleTimeString(),
        ip: ipAddress,
        srcIP: ipAddress,
        dstIP: 'Manual Detection',
        protocol: 'TCP',
        slice: currentSlice,
        mlResult: result.prediction === 'ddos' ? 'DDoS Detected' : result.prediction === 'normal' ? 'Normal' : 'Suspicious',
        abuseScore: result.abuseScore,
        action: mitigation === 'Idle' ? 'None' : mitigation
      };

      setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);

      // Update detection history
      const newDetection: DetectionData = {
        timestamp: new Date().toLocaleTimeString().slice(0, 5),
        riskScore
      };

      setDetectionHistory(prev => [...prev.slice(1), newDetection]);
      
      // Update traffic chart with new data points
      const newTrafficPoint = {
        timestamp: new Date().toLocaleTimeString().slice(0, 5),
        traffic: result.network_analysis?.max_traffic || 0,
        avgTraffic: result.network_analysis?.avg_traffic || 0,
        threatLevel: riskScore
      };
      
      // Add real-time traffic data visualization
      setTrafficData(prev => {
        const currentData = prev.split(',').map(v => parseInt(v.trim()) || 0);
        const newData = [...currentData.slice(1), result.network_analysis?.max_traffic || Math.floor(Math.random() * 100)];
        return newData.join(',');
      });
      
    } catch (error: any) {
      const errorMsg = handleApiError(error);
      setErrorMessage(errorMsg);
      console.error('Detection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const gaugeData = [
    { name: 'Risk', value: ddosRisk, fill: ddosRisk <= 30 ? '#10b981' : ddosRisk <= 70 ? '#f59e0b' : '#ef4444' }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">AI-Driven DDoS Detection</h1>
            <p className="text-sm text-gray-400">SDN-Powered 5G Networks</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`px-3 py-1 border rounded-full text-sm flex items-center gap-2 ${
              backendConnected 
                ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                : 'bg-red-500/20 border-red-500/30 text-red-400'
            }`}>
              {backendConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {backendConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 min-h-screen border-r border-gray-700 p-4">
          <nav className="space-y-2">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-600 text-white"
            >
              <Activity className="w-5 h-5" />
              Dashboard
            </button>
          </nav>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Active Slices</h3>
            <div className="space-y-3">
              {[
                { name: 'eMBB', color: 'bg-blue-500', label: 'Enhanced Mobile Broadband' },
                { name: 'URLLC', color: 'bg-green-500', label: 'Ultra-Reliable Low Latency' },
                { name: 'mMTC', color: 'bg-purple-500', label: 'Massive Machine Type Comms' }
              ].map((slice) => (
                <div key={slice.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-700/50">
                  <div className={`w-3 h-3 rounded-full ${slice.color}`}></div>
                  <div>
                    <div className="text-sm font-medium text-white">{slice.name}</div>
                    <div className="text-xs text-gray-400">{slice.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Error:</span>
              </div>
              <p className="mt-1 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Current Slice</h3>
              <select 
                value={currentSlice} 
                onChange={(e) => setCurrentSlice(e.target.value)}
                disabled={isLoading}
                className="w-full bg-gray-700/80 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50"
              >
                <option>eMBB</option>
                <option>URLLC</option>
                <option>mMTC</option>
              </select>
            </div>


            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">ML Prediction</h3>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{mlPrediction}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  mlPrediction === 'Normal' ? 'bg-green-500/20 text-green-400' :
                  mlPrediction === 'Suspicious' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {mlPrediction === 'Normal' ? 'Safe' : mlPrediction === 'Suspicious' ? 'Warning' : 'Critical'}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl p-6 border border-gray-700 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">AbuseIPDB Score</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{abuseScore}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskBgColor(abuseScore)}`}>
                  {abuseScore <= 30 ? 'Low Risk' : abuseScore <= 70 ? 'Medium Risk' : 'High Risk'}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl p-6 border border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Mitigation Status</h3>
              <div className="flex items-center gap-2">
                <Shield className={`w-5 h-5 ${
                  mitigationStatus === 'Idle' ? 'text-gray-400' :
                  mitigationStatus.includes('Rate-limit') ? 'text-amber-400' :
                  'text-red-400'
                }`} />
                <span className="text-white font-medium">{mitigationStatus}</span>
              </div>
            </div>
          </div>

          {/* Automatic Network Monitoring Panel */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 mb-8">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" />Network Monitoring</h3>
            
            {/* Auto Monitoring Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">
                      Traffic Capture Mode
                    </label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className={`flex items-center gap-2 text-sm ${
                        isRealCapture ? 'text-blue-400' : 'text-green-400'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          isRealCapture ? 'bg-blue-400' : 'bg-green-400'
                        }`}></div>
                        {isRealCapture ? 'Real Capture Mode' : 'Simulation Mode'}
                      </label>
                      <span className="text-xs text-gray-500">
                        {isRealCapture 
                          ? '(Using Wireshark/tshark)' 
                          : '(Install Wireshark for real capture)'
                        }
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={startAutoMonitoring}
                    disabled={!backendConnected}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                      isAutoMonitoring 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isAutoMonitoring ? (
                      <>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        Stop Monitoring
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        Start Network Monitor
                      </>
                    )}
                  </button>
                </div>
                
                {isAutoMonitoring && (
                  <div className={`border rounded-lg p-3 mb-4 ${
                    isRealCapture 
                      ? 'bg-blue-500/10 border-blue-500/30' 
                      : 'bg-green-500/10 border-green-500/30'
                  }`}>
                    <div className={`flex items-center gap-2 text-sm ${
                      isRealCapture ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        isRealCapture ? 'bg-blue-400' : 'bg-green-400'
                      }`}></div>
                      <span>
                        {isRealCapture 
                          ? `Real capture active - Monitoring ${ipAddress}` 
                          : `Simulation mode active - Monitoring ${ipAddress}`
                        }
                      </span>
                    </div>
                    <div className={`text-xs mt-1 ${
                      isRealCapture ? 'text-blue-300' : 'text-green-300'
                    }`}>
                      {isRealCapture 
                        ? `Capturing live network traffic via Wireshark | Packets: ${capturedPackets.toLocaleString()}` 
                        : `Generating simulated network traffic | Packets: ${capturedPackets.toLocaleString()}`
                      }
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Local IP to Monitor
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={ipAddress}
                      onChange={(e) => setIpAddress(e.target.value)}
                      className="flex-1 bg-gray-700/80 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      {localIPs.filter(ip => {
                        const name = ip.interface.toLowerCase();
                        const isVirtual = name.includes('vmware') || name.includes('bluetooth');
                        const isValid = (name.includes('ethernet') && !name.includes('vmware')) || 
                                       name.includes('wi-fi') || name.includes('wifi') || 
                                       name.includes('wireless lan') || name.includes('wlan');
                        return !isVirtual && isValid;
                      }).map((ip, index) => (
                        <option key={index} value={ip.address}>
                          {ip.address}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={loadLocalIPs}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all"
                      title="Refresh IPs"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Live Traffic Data
                </label>
                <textarea
                  value={trafficData}
                  readOnly
                  className="w-full h-24 bg-gray-700/80 border border-gray-600 rounded-xl px-4 py-3 text-white resize-none text-xs font-mono"
                  placeholder="Live traffic data (captured from real network)..."
                />
                <button
                  onClick={performDetection}
                  disabled={isLoading || !backendConnected}
                  className="mt-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Run Detection
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Live Detection Logs */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Live Detection Logs</h4>
              <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3 max-h-32 overflow-y-auto">
                {detectionLogs.length > 0 ? (
                  detectionLogs.map((log, index) => (
                    <div key={index} className="text-xs text-green-400 font-mono mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 font-mono">
                    Waiting for detection events...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Metrics Cards */}
          {networkAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-800/50 to-blue-900/50 rounded-xl p-4 border border-blue-500/30">
                <h4 className="text-sm text-blue-300 mb-2">Max Traffic</h4>
                <div className="text-2xl font-bold text-white">{networkAnalysis.max_traffic}</div>
                <div className="text-xs text-blue-400">packets/sec</div>
              </div>
              <div className="bg-gradient-to-br from-green-800/50 to-green-900/50 rounded-xl p-4 border border-green-500/30">
                <h4 className="text-sm text-green-300 mb-2">Avg Traffic</h4>
                <div className="text-2xl font-bold text-white">{Math.floor(networkAnalysis.avg_traffic)}</div>
                <div className="text-xs text-green-400">packets/sec</div>
              </div>
              <div className="bg-gradient-to-br from-purple-800/50 to-purple-900/50 rounded-xl p-4 border border-purple-500/30">
                <h4 className="text-sm text-purple-300 mb-2">Bandwidth</h4>
                <div className="text-2xl font-bold text-white">{networkAnalysis.bandwidth_utilization_mbps?.toFixed(2)}</div>
                <div className="text-xs text-purple-400">Mbps</div>
              </div>
              <div className="bg-gradient-to-br from-amber-800/50 to-amber-900/50 rounded-xl p-4 border border-amber-500/30">
                <h4 className="text-sm text-amber-300 mb-2">Burst Ratio</h4>
                <div className="text-2xl font-bold text-white">{networkAnalysis.burst_ratio?.toFixed(1)}</div>
                <div className="text-xs text-amber-400">ratio</div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            {/* Traffic Chart */}
            <div className="xl:col-span-2 bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-blue-400" />Traffic Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getTrafficChartData()}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="traffic"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorTraffic)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Enhanced DDoS Risk Gauge with Animation */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><Shield className="w-5 h-5 text-red-400" />DDoS Risk Level</h3>
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-20 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ value: 100 }]}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={60}
                        outerRadius={80}
                        fill="#374151"
                        dataKey="value"
                      />
                      <Pie
                        data={[{ value: ddosRisk }]}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={180 - (ddosRisk * 1.8)}
                        innerRadius={60}
                        outerRadius={80}
                        fill={ddosRisk <= 30 ? '#10b981' : ddosRisk <= 70 ? '#f59e0b' : '#ef4444'}
                        dataKey="value"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getRiskColor(ddosRisk)} transition-all duration-500`}>
                    {ddosRisk}%
                  </div>
                  <div className="text-gray-400 text-sm">Risk Level</div>
                  {lastDetectionResult && (
                    <div className="mt-2 text-xs text-gray-500">
                      Confidence: {Math.floor(lastDetectionResult.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Detection Results */}
          <div className="mb-8">
            <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2"><Eye className="w-5 h-5 text-green-400" />Detection Results</h3>
              {lastDetectionResult && (
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Best Model:</span>
                      <span className="ml-2 font-medium text-blue-400">
                        {(lastDetectionResult as any).selected_model?.replace('_', ' ').toUpperCase() || 'ENSEMBLE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Prediction:</span>
                      <span className={`ml-2 font-medium ${
                        lastDetectionResult.prediction === 'ddos' ? 'text-red-400' :
                        lastDetectionResult.prediction === 'suspicious' ? 'text-amber-400' : 'text-green-400'
                      }`}>
                        {lastDetectionResult.prediction.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Threat Level:</span>
                      <span className={`ml-2 font-medium ${
                        lastDetectionResult.threat_level === 'HIGH' ? 'text-red-400' :
                        lastDetectionResult.threat_level === 'MEDIUM' ? 'text-amber-400' : 'text-green-400'
                      }`}>
                        {lastDetectionResult.threat_level}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Ensemble Score:</span>
                      <span className="ml-2 font-medium text-white">
                        {((lastDetectionResult as any).ensemble_score * 100)?.toFixed(1) || 'N/A'}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Indicators:</span>
                      <span className="ml-2 font-medium text-white">{lastDetectionResult.ddos_indicators}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Action:</span>
                      <span className="ml-2 font-medium text-blue-400">{lastDetectionResult.slice_recommendation?.action}</span>
                    </div>
                  </div>
                  {lastDetectionResult.confidence_factors && (
                    <div className="mt-3 text-xs text-gray-400">
                      <strong>Analysis:</strong> {lastDetectionResult.confidence_factors.slice(-2).join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                      <th className="pb-3">Time</th>
                      <th className="pb-3">Target IP</th>
                      <th className="pb-3">Source IP</th>
                      <th className="pb-3">Dest IP</th>
                      <th className="pb-3">Protocol</th>
                      <th className="pb-3">Slice</th>
                      <th className="pb-3">Result</th>
                      <th className="pb-3">Score</th>
                      <th className="pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.slice(0, 10).map((alert, index) => (
                      <tr key={`alert-${alert.id}-${index}`} className="text-sm border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="py-3 text-gray-300">{alert.time}</td>
                        <td className="py-3 text-white font-mono text-xs">{alert.ip}</td>
                        <td className="py-3 text-white font-mono text-xs">{alert.srcIP || 'N/A'}</td>
                        <td className="py-3 text-white font-mono text-xs">{alert.dstIP || 'N/A'}</td>
                        <td className="py-3 text-gray-300 text-xs">{alert.protocol || 'TCP'}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            alert.slice === 'eMBB' ? 'bg-blue-500/20 text-blue-400' :
                            alert.slice === 'URLLC' ? 'bg-green-500/20 text-green-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {alert.slice}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`text-xs font-medium ${
                            alert.mlResult === 'Normal' ? 'text-green-400' :
                            alert.mlResult === 'Suspicious' ? 'text-amber-400' :
                            'text-red-400'
                          }`}>
                            {alert.mlResult}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`font-bold ${getRiskColor(alert.abuseScore)}`}>
                            {alert.abuseScore}
                          </span>
                        </td>
                        <td className="py-3 text-gray-300 text-xs">
                          <span className={`px-2 py-1 rounded ${
                            alert.action === 'None' ? 'bg-gray-600/50 text-gray-300' :
                            alert.action.includes('Blackhole') ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {alert.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* System Status Footer */}
          <footer className="text-center text-sm text-gray-500 mt-8">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                <span>SDN-Powered 5G Security</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  backendConnected ? 'bg-green-400' : 'bg-red-400'
                } animate-pulse`}></div>
                <span>Backend: {backendConnected ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Self-Healing: {mitigationStatus !== 'Idle' ? 'Active' : 'Standby'}</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;