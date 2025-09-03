import React, { useState } from 'react';

const Mitigation = () => {
  const [autoMitigation, setAutoMitigation] = useState(true);
  const [threshold, setThreshold] = useState(80);
  const [newIp, setNewIp] = useState('');
  const [ipType, setIpType] = useState('blacklist');
  const [ipList, setIpList] = useState([
    { id: 1, ip: '192.168.1.100', type: 'blacklist', reason: 'SYN Flood', added: '2023-08-15' },
    { id: 2, ip: '10.0.0.5', type: 'blacklist', reason: 'UDP Flood', added: '2023-08-14' },
    { id: 3, ip: '172.16.0.10', type: 'blacklist', reason: 'ICMP Flood', added: '2023-08-13' },
    { id: 4, ip: '192.168.1.50', type: 'whitelist', reason: 'Trusted Server', added: '2023-08-10' },
  ]);

  const handleAddIp = (e) => {
    e.preventDefault();
    if (!newIp.trim()) return;
    
    const newEntry = {
      id: Date.now(),
      ip: newIp.trim(),
      type: ipType,
      reason: ipType === 'blacklist' ? 'Manual Entry' : 'Trusted Source',
      added: new Date().toISOString().split('T')[0]
    };
    
    setIpList([...ipList, newEntry]);
    setNewIp('');
  };

  const handleRemoveIp = (id) => {
    setIpList(ipList.filter(item => item.id !== id));
  };

  const getTypeBadge = (type) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      type === 'blacklist' 
        ? 'bg-red-100 text-red-800' 
        : 'bg-green-100 text-green-800'
    }`}>
      {type}
    </span>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mitigation Controls</h1>
      
      {/* Auto Mitigation Toggle */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-medium leading-7 text-gray-900 sm:text-xl sm:truncate">
              Automatic Mitigation
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Enable or disable automatic DDoS attack mitigation
            </p>
          </div>
          <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4
          ">
            <button
              type="button"
              className={`${
                autoMitigation ? 'bg-indigo-600' : 'bg-gray-200'
              } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              role="switch"
              aria-checked={autoMitigation}
              onClick={() => setAutoMitigation(!autoMitigation)}
            >
              <span className="sr-only">Use setting</span>
              <span
                className={`${
                  autoMitigation ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
              >
                <span
                  className={`${
                    autoMitigation ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'
                  } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                  aria-hidden="true"
                >
                  <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                    <path d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span
                  className={`${
                    autoMitigation ? 'opacity-100 duration-200 ease-in' : 'opacity-0 ease-out duration-100'
                  } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                  aria-hidden="true"
                >
                  <svg className="h-3 w-3 text-indigo-600" fill="currentColor" viewBox="0 0 12 12">
                    <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                  </svg>
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Threshold Slider */}
        {autoMitigation && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
                Confidence Threshold: {threshold}%
              </label>
              <span className="text-sm text-gray-500">
                {threshold < 50 ? 'Low' : threshold < 80 ? 'Medium' : 'High'} confidence
              </span>
            </div>
            <input
              type="range"
              id="threshold"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              className="mt-2 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        )}
      </div>

      {/* IP Management */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">IP Management</h3>
        </div>
        
        {/* Add IP Form */}
        <div className="px-6 py-4 bg-gray-50">
          <form onSubmit={handleAddIp} className="sm:flex">
            <div className="flex-grow max-w-xs">
              <label htmlFor="ip-address" className="sr-only">IP Address</label>
              <input
                type="text"
                id="ip-address"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="192.168.1.1"
              />
            </div>
            <div className="mt-2 sm:mt-0 sm:ml-2">
              <select
                value={ipType}
                onChange={(e) => setIpType(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="blacklist">Blacklist</option>
                <option value="whitelist">Whitelist</option>
              </select>
            </div>
            <button
              type="submit"
              className="mt-2 sm:mt-0 sm:ml-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add IP
            </button>
          </form>
        </div>

        {/* IP List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ipList.map((ip) => (
                <tr key={ip.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ip.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getTypeBadge(ip.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ip.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ip.added}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveIp(ip.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate Limiting Rules */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Rate Limiting Rules</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 mb-4">
            Configure rate limiting rules to prevent abuse and DDoS attacks.
          </p>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add New Rule
          </button>
        </div>
      </div>
    </div>
  );
};

export default Mitigation;
