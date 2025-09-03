import React, { useState } from 'react';

const ModelTraining = () => {
  const [selectedModel, setSelectedModel] = useState('random_forest');
  const [trainingStatus, setTrainingStatus] = useState('idle');

  // Mock data - replace with actual API calls
  const models = [
    { id: 'random_forest', name: 'Random Forest' },
    { id: 'svm', name: 'Support Vector Machine' },
    { id: 'ann', name: 'Neural Network' },
  ];

  const startTraining = async () => {
    setTrainingStatus('training');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTrainingStatus('completed');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Model Training</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {/* Model Selection */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700">
              Select Model
            </label>
            <select
              id="model"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dataset Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload Dataset</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV or PCAP up to 10MB</p>
              </div>
            </div>
          </div>

          {/* Training Controls */}
          <div className="pt-4">
            <button
              type="button"
              onClick={startTraining}
              disabled={trainingStatus === 'training'}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                trainingStatus === 'training' 
                  ? 'bg-indigo-300' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {trainingStatus === 'training' ? 'Training...' : 'Start Training'}
            </button>
          </div>

          {/* Training Progress */}
          {trainingStatus === 'training' && (
            <div className="pt-4">
              <div className="relative pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                      Training in progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-indigo-600">
                      50%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                  <div
                    style={{ width: '50%' }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Model Metrics */}
          {trainingStatus === 'completed' && (
            <div className="pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Model Performance</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: 'Accuracy', value: '95.2%' },
                  { name: 'Precision', value: '96.1%' },
                  { name: 'Recall', value: '94.8%' },
                  { name: 'F1-Score', value: '95.4%' },
                ].map((metric) => (
                  <div key={metric.name} className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">{metric.name}</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">{metric.value}</dd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelTraining;
