import React, { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Default stats object to prevent undefined access
const defaultStats = {
  packetCount: 0,
  protocols: {},
  sourceIps: {},
  destinationIps: {}
};

// Default bandwidth object
const defaultBandwidth = {
  current: { in: 0, out: 0 },
  total: { in: 0, out: 0 }
};

const NetworkMonitor = ({
  isConnected,
  isCapturing,
  interfaces = [],
  currentInterface = '',
  packets = [],
  stats = defaultStats,
  bandwidth = defaultBandwidth,
  filters = {},
  selectedPacket = null,
  onStartCapture,
  onStopCapture,
  onInterfaceChange,
  onFilterChange,
  onClearPackets,
  onSelectPacket
}) => {
  const [activeTab, setActiveTab] = useState('packets');
  const [selectedInterface, setSelectedInterface] = useState(currentInterface);
  const [packetFilter, setPacketFilter] = useState('');

  // Update selectedInterface when currentInterface prop changes
  useEffect(() => {
    setSelectedInterface(currentInterface);
  }, [currentInterface]);

  // Handle interface change
  const handleInterfaceChange = (e) => {
    const newInterface = e.target.value;
    setSelectedInterface(newInterface);
    onInterfaceChange(e);
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setPacketFilter(value);
    onFilterChange(e);
  };

  // Handle packet selection
  const handleSelectPacket = (packet) => {
    onSelectPacket(packet);
  };

  // Render packet details
  const renderPacketDetails = (packet) => (
    <div className="mt-4 p-4 bg-gray-50 rounded">
      <h4 className="font-medium mb-2">Packet Details</h4>
      <pre className="text-xs overflow-auto max-h-64">
        {JSON.stringify(packet, null, 2)}
      </pre>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Connection status and controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              className="border rounded px-3 py-1 text-sm"
              value={selectedInterface}
              onChange={handleInterfaceChange}
              disabled={isCapturing}
            >
              <option value="">Select interface</option>
              {interfaces.map((iface) => (
                <option key={iface.name} value={iface.name}>
                  {iface.name} ({iface.addresses?.[0]?.address || 'No IP'})
                </option>
              ))}
            </select>
            
            {!isCapturing ? (
              <button
                onClick={onStartCapture}
                disabled={!selectedInterface || !isConnected}
                className="bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50"
              >
                Start Capture
              </button>
            ) : (
              <button
                onClick={onStopCapture}
                className="bg-red-500 text-white px-4 py-1 rounded"
              >
                Stop Capture
              </button>
            )}
            
            <button
              onClick={onClearPackets}
              className="bg-gray-200 px-4 py-1 rounded text-sm"
              disabled={packets.length === 0}
            >
              Clear Packets
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['packets', 'statistics', 'bandwidth'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`${activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === 'packets' && (
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Filter packets..."
                  className="border rounded px-3 py-1 w-full"
                  value={packetFilter}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Length</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-sm">
                    {packets
                      .filter(pkt => 
                        packetFilter === '' || 
                        JSON.stringify(pkt).toLowerCase().includes(packetFilter.toLowerCase())
                      )
                      .map((packet, index) => (
                        <tr 
                          key={index} 
                          className={`hover:bg-gray-50 cursor-pointer ${selectedPacket === packet ? 'bg-blue-50' : ''}`}
                          onClick={() => handleSelectPacket(packet)}
                        >
                          <td className="px-6 py-2 whitespace-nowrap">{new Date(packet.timestamp).toLocaleTimeString()}</td>
                          <td className="px-6 py-2 whitespace-nowrap">{packet.source}</td>
                          <td className="px-6 py-2 whitespace-nowrap">{packet.destination}</td>
                          <td className="px-6 py-2 whitespace-nowrap">{packet.protocol}</td>
                          <td className="px-6 py-2 whitespace-nowrap">{packet.length}</td>
                          <td className="px-6 py-2 whitespace-nowrap truncate max-w-xs">{packet.info}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              {selectedPacket && renderPacketDetails(selectedPacket)}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Capture Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-700">Total Packets</h4>
                  <p className="text-2xl font-bold">{stats.packetCount}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-700">Protocols</h4>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(stats.protocols || {}).map(([proto, count]) => (
                      <li key={proto} className="flex justify-between">
                        <span>{proto}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-700">Top Sources</h4>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(stats.sourceIps || {})
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([ip, count]) => (
                        <li key={ip} className="flex justify-between">
                          <span>{ip}</span>
                          <span className="font-medium">{count}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bandwidth' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Bandwidth Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-700">Current</h4>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">In:</span>
                      <span className="ml-2 font-medium">
                        {bandwidth.current?.in ? (bandwidth.current.in / 1024).toFixed(2) : '0.00'} KB/s
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Out:</span>
                      <span className="ml-2 font-medium">
                        {bandwidth.current?.out ? (bandwidth.current.out / 1024).toFixed(2) : '0.00'} KB/s
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-700">Total</h4>
                  <div className="mt-2 space-y-2">
                    <div>
                      <span className="text-sm text-gray-600">In:</span>
                      <span className="ml-2 font-medium">
                        {bandwidth.total?.in ? (bandwidth.total.in / (1024 * 1024)).toFixed(2) : '0.00'} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Out:</span>
                      <span className="ml-2 font-medium">
                        {bandwidth.total?.out ? (bandwidth.total.out / (1024 * 1024)).toFixed(2) : '0.00'} MB
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkMonitor;
