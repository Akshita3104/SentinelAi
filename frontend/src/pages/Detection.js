import React, { useState } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const Detection = () => {
  const [timeRange, setTimeRange] = useState('24h');

  // Mock data - replace with actual API calls
  const attackTimelineData = {
    labels: Array(24).fill().map((_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Attack Traffic',
        data: Array(24).fill().map(() => Math.floor(Math.random() * 100)),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      },
      {
        label: 'Normal Traffic',
        data: Array(24).fill().map(() => Math.floor(Math.random() * 30)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
    ],
  };

  const attackTypesData = {
    labels: ['SYN Flood', 'UDP Flood', 'ICMP Flood', 'HTTP Flood', 'DNS Amplification'],
    datasets: [
      {
        data: [35, 25, 20, 15, 5],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(99, 102, 241, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(99, 102, 241, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const recentAttacks = [
    { id: 1, type: 'SYN Flood', source: '192.168.1.45', target: '10.0.0.1', severity: 'High', time: '2 mins ago' },
    { id: 2, type: 'UDP Flood', source: '172.16.0.23', target: '10.0.0.2', severity: 'Medium', time: '15 mins ago' },
    { id: 3, type: 'ICMP Flood', source: '10.0.0.5', target: '10.0.0.3', severity: 'Low', time: '1 hour ago' },
    { id: 4, type: 'HTTP Flood', source: '192.168.1.67', target: '10.0.0.1', severity: 'High', time: '3 hours ago' },
    { id: 5, type: 'DNS Amplification', source: '8.8.8.8', target: '10.0.0.4', severity: 'Critical', time: '5 hours ago' },
  ];

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Attack Detection</h1>
        <div className="flex space-x-2">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md ${
                timeRange === range
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Total Attacks', value: '1,248', change: '+12.5%', changeType: 'increase' },
          { name: 'Attack Types', value: '5', change: '0%', changeType: 'neutral' },
          { name: 'Blocked Attacks', value: '1,198', change: '+8.3%', changeType: 'increase' },
          { name: 'False Positives', value: '12', change: '-2.1%', changeType: 'decrease' },
        ].map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                  <div className="h-6 w-6 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                      {stat.changeType !== 'neutral' && (
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.change}
                        </div>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attack Timeline */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Attack Timeline</h2>
        <div className="h-80">
          <Line 
            data={attackTimelineData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Requests per second'
                  }
                },
                x: {
                  title: {
                    display: true,
                    text: 'Time'
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: false,
                },
              },
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attack Types */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Attack Types</h2>
          <div className="h-64">
            <Pie 
              data={attackTypesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Recent Attacks */}
        <div className="bg-white shadow rounded-lg overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Attacks</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentAttacks.map((attack) => (
                  <tr key={attack.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{attack.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attack.source}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attack.target}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(attack.severity)}`}>
                        {attack.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attack.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detection;
