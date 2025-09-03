import React, { useState, useEffect } from 'react';

// Mock data
const systemMetrics = {
  cpu: {
    current: 45,
    max: 100,
    history: [30, 35, 40, 42, 45, 48, 45, 43, 45],
    status: 'normal', // normal, warning, critical
  },
  memory: {
    current: 65,
    max: 100,
    history: [50, 55, 58, 60, 62, 65, 63, 65],
    status: 'warning',
  },
  disk: {
    current: 25,
    max: 100,
    history: [20, 21, 22, 23, 24, 25, 25, 25],
    status: 'normal',
  },
  network: {
    in: 45,
    out: 28,
    history: [
      { in: 40, out: 25 },
      { in: 42, out: 26 },
      { in: 43, out: 27 },
      { in: 44, out: 27 },
      { in: 45, out: 28 },
    ],
    status: 'normal',
  },
};

const logs = [
  { id: 1, timestamp: '2023-08-15 14:30:22', level: 'INFO', message: 'System check completed', service: 'system' },
  { id: 2, timestamp: '2023-08-15 14:28:15', level: 'WARNING', message: 'High memory usage detected', service: 'monitor' },
  { id: 3, timestamp: '2023-08-15 14:25:10', level: 'INFO', message: 'New model version loaded', service: 'ml-engine' },
  { id: 4, timestamp: '2023-08-15 14:22:05', level: 'ERROR', message: 'Failed to connect to database', service: 'database' },
  { id: 5, timestamp: '2023-08-15 14:20:30', level: 'INFO', message: 'API server started on port 8000', service: 'api' },
];

const services = [
  { name: 'API Server', status: 'running', uptime: '5d 3h 12m', version: '1.2.3' },
  { name: 'Database', status: 'degraded', uptime: '2d 8h 45m', version: '5.7.32' },
  { name: 'ML Engine', status: 'running', uptime: '1d 12h 30m', version: '0.8.1' },
  { name: 'Monitoring', status: 'running', uptime: '5d 3h 12m', version: '2.1.0' },
  { name: 'Alerting', status: 'running', uptime: '5d 3h 10m', version: '1.5.2' },
];

const SystemStatus = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1h');
  const [searchQuery, setSearchQuery] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  
  // Simulate real-time updates
  const [currentMetrics, setCurrentMetrics] = useState(systemMetrics);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate small fluctuations in metrics
      setCurrentMetrics(prev => ({
        ...prev,
        cpu: {
          ...prev.cpu,
          current: Math.max(10, Math.min(90, prev.cpu.current + (Math.random() * 6 - 3))),
          history: [...prev.cpu.history.slice(1), Math.max(10, Math.min(90, prev.cpu.current + (Math.random() * 6 - 3)))],
        },
        memory: {
          ...prev.memory,
          current: Math.max(40, Math.min(95, prev.memory.current + (Math.random() * 4 - 2))),
          history: [...prev.memory.history.slice(1), Math.max(40, Math.min(95, prev.memory.current + (Math.random() * 4 - 2)))],
          status: prev.memory.current > 80 ? 'critical' : prev.memory.current > 60 ? 'warning' : 'normal',
        },
        network: {
          ...prev.network,
          in: Math.max(10, Math.min(90, prev.network.in + (Math.random() * 10 - 5))),
          out: Math.max(5, Math.min(60, prev.network.out + (Math.random() * 6 - 3))),
          history: [
            ...prev.network.history.slice(1),
            {
              in: Math.max(10, Math.min(90, prev.network.in + (Math.random() * 10 - 5))),
              out: Math.max(5, Math.min(60, prev.network.out + (Math.random() * 6 - 3))),
            },
          ],
        },
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'stopped': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getMetricColor = (value, type) => {
    if (type === 'network') return 'text-blue-600';
    if (value > 80) return 'text-red-600';
    if (value > 60) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = logLevel === 'all' || log.level === logLevel.toUpperCase();
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Status</h1>
        <div className="mt-2 sm:mt-0 flex items-center space-x-2">
          <span className="text-sm text-gray-500">Time Range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'metrics', 'services', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Health Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(currentMetrics).map(([key, metric]) => (
              <div key={key} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                      <div className="h-6 w-6 text-white">
                        {key === 'cpu' && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6h2m7-12h2m2 3h2m-2 6h2m-2 3h2m-7-3a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                        {key === 'memory' && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
                          </svg>
                        )}
                        {key === 'disk' && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7M4 7l4-4m0 0h8m-8 0l4 4m-4 4h16" />
                          </svg>
                        )}
                        {key === 'network' && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h2m14 0h2M12 3v2m0 14v2m-9-9l2 2m10-2l2 2m-2-9l-2 2m-2 10l-2 2" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </dt>
                        <dd>
                          <div className="text-lg font-medium text-gray-900">
                            {key === 'network' ? (
                              <>
                                <span className={getMetricColor(metric.in, 'network')}>
                                  {metric.in} Mbps in
                                </span>
                                <span className="mx-1">/</span>
                                <span className={getMetricColor(metric.out, 'network')}>
                                  {metric.out} Mbps out
                                </span>
                              </>
                            ) : (
                              <span className={getMetricColor(metric.current)}>
                                {metric.current}%
                              </span>
                            )}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <button type="button" className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none">
                      View details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Recent Alerts */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Alerts</h3>
              <p className="mt-1 text-sm text-gray-500">System alerts and notifications from the last 24 hours</p>
            </div>
            <div className="bg-white overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {filteredLogs.slice(0, 5).map((log) => (
                  <li key={log.id} className="px-6 py-4">
                    <div className="flex items-center
                    ">
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                        log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {log.level.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{log.message}</p>
                        <p className="text-sm text-gray-500">
                          {log.timestamp} • {log.service}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 px-6 py-3 text-right text-sm font-medium">
              <button type="button" className="text-indigo-600 hover:text-indigo-900 focus:outline-none">
                View all alerts
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Resource Usage</h3>
              <p className="mt-1 text-sm text-gray-500">CPU, memory, disk, and network metrics over time</p>
            </div>
            <div className="px-6 py-5">
              <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
                <p className="text-gray-500">Metrics visualization will appear here</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">CPU Usage</h3>
              </div>
              <div className="px-6 py-5 h-64">
                <div className="h-full bg-gray-50 rounded-md flex items-center justify-center">
                  <p className="text-gray-500">CPU usage chart</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Memory Usage</h3>
              </div>
              <div className="px-6 py-5 h-64">
                <div className="h-full bg-gray-50 rounded-md flex items-center justify-center">
                  <p className="text-gray-500">Memory usage chart</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">System Services</h3>
            <p className="mt-1 text-sm text-gray-500">Status of all system components and services</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{service.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(service.status)}`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.uptime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900">Restart</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">System Logs</h3>
                <p className="mt-1 text-sm text-gray-500">Real-time logs from all system components</p>
              </div>
              <div className="mt-3 sm:mt-0 flex space-x-2">
                <div className="relative">
                  <select
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Levels</option>
                    <option value="error">Errors</option>
                    <option value="warning">Warnings</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-3 pr-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search logs..."
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2">Time</div>
              <div className="col-span-1">Level</div>
              <div className="col-span-2">Service</div>
              <div className="col-span-7">Message</div>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
            {filteredLogs.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <li key={log.id} className="px-6 py-3 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 text-sm">
                      <div className="col-span-2 text-gray-500">{log.timestamp}</div>
                      <div className="col-span-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.level === 'ERROR' ? 'bg-red-100 text-red-800' :
                          log.level === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.level}
                        </span>
                      </div>
                      <div className="col-span-2 font-medium text-gray-900">{log.service}</div>
                      <div className="col-span-7 text-gray-600 font-mono text-sm">{log.message}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
              </div>
            )}
          </div>
          <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Previous
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of{' '}
                  <span className="font-medium">20</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button type="button" className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button type="button" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-indigo-600 hover:bg-gray-50">
                    1
                  </button>
                  <button type="button" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    2
                  </button>
                  <button type="button" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    3
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                  </span>
                  <button type="button" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                    8
                  </button>
                  <button type="button" className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500">
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus;
