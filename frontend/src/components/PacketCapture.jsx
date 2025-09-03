import React, { useState, useCallback } from 'react';
import usePacketCapture from '../hooks/usePacketCapture';

const PacketCapture = () => {
  const [selectedInterface, setSelectedInterface] = useState('Wi-Fi');
  const [availableInterfaces, setAvailableInterfaces] = useState(['Wi-Fi', 'Ethernet']);
  
  const {
    isConnected,
    isCapturing,
    error,
    packets,
    startCapture,
    stopCapture,
    clearPackets,
    setInterface
  } = usePacketCapture();

  const handleStart = useCallback(() => {
    startCapture(selectedInterface);
  }, [startCapture, selectedInterface]);

  const handleInterfaceChange = (e) => {
    const newInterface = e.target.value;
    setSelectedInterface(newInterface);
    if (isCapturing) {
      stopCapture();
      startCapture(newInterface);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Network Interface
          </label>
          <select
            value={selectedInterface}
            onChange={handleInterfaceChange}
            disabled={isCapturing}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {availableInterfaces.map((iface) => (
              <option key={iface} value={iface}>
                {iface}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-end gap-2">
          {!isCapturing ? (
            <button
              onClick={handleStart}
              disabled={!isConnected}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              Start Capture
            </button>
          ) : (
            <button
              onClick={stopCapture}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Stop Capture
            </button>
          )}
          
          <button
            onClick={clearPackets}
            disabled={packets.length === 0}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Destination
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Protocol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Length
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Info
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packets.map((packet, index) => (
              <tr key={`${packet.number}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {packet.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(packet.time).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {packet.source}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {packet.destination}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {packet.protocol}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {packet.length}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 break-all">
                  {packet.info}
                </td>
              </tr>
            ))}
            {packets.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                  {isCapturing ? 'Waiting for packets...' : 'No packets captured yet. Click Start Capture to begin.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PacketCapture;
