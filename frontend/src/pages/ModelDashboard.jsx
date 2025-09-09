import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  startTraining, 
  connectToModelService, 
  selectModelStatus,
  selectTrainingStatus,
  selectTrainingProgress
} from '../features/model/modelSlice';
import ModelOutputPanel from '../features/model/ModelOutputPanel';

const ModelDashboard = () => {
  const dispatch = useDispatch();
  const modelStatus = useSelector(selectModelStatus);
  const trainingStatus = useSelector(selectTrainingStatus);
  const trainingProgress = useSelector(selectTrainingProgress);
  
  const [trainingConfig, setTrainingConfig] = useState({
    epochs: 50,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
    useDataAugmentation: true
  });

  // Connect to model service on mount
  useEffect(() => {
    if (modelStatus === 'disconnected') {
      dispatch(connectToModelService())
        .unwrap()
        .catch(error => {
          console.error('Failed to connect to model service:', error);
          toast.error(`Failed to connect to model service: ${error.message}`);
        });
    }

    return () => {
      // Cleanup if needed
    };
  }, [dispatch, modelStatus]);

  const handleStartTraining = () => {
    dispatch(startTraining(trainingConfig))
      .unwrap()
      .then(() => {
        toast.success('Training started successfully');
      })
      .catch(error => {
        console.error('Failed to start training:', error);
        toast.error(`Failed to start training: ${error.message || 'Unknown error'}`);
      });
  };

  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTrainingConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const isTraining = trainingStatus === 'training' || trainingStatus === 'loading';

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Model Dashboard</h1>
        <p className="text-gray-600">
          Monitor model training and view real-time predictions
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Model Service</h2>
            <p className="text-sm text-gray-600">
              Status: <span className={`font-medium ${
                modelStatus === 'connected' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {modelStatus === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </p>
            {isTraining && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Training: {trainingStatus} ({trainingProgress}%)
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${trainingProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="space-x-2">
            <button
              onClick={handleStartTraining}
              disabled={isTraining || modelStatus !== 'connected'}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                isTraining || modelStatus !== 'connected'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isTraining ? 'Training...' : 'Start Training'}
            </button>
            
            <button
              onClick={() => dispatch(connectToModelService())}
              disabled={modelStatus === 'connecting'}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md font-medium"
            >
              {modelStatus === 'connecting' ? 'Connecting...' : 'Reconnect'}
            </button>
          </div>
        </div>
      </div>

      {/* Training Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Epochs</label>
          <input
            type="number"
            name="epochs"
            value={trainingConfig.epochs}
            onChange={handleConfigChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={isTraining}
            min="1"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size</label>
          <input
            type="number"
            name="batchSize"
            value={trainingConfig.batchSize}
            onChange={handleConfigChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={isTraining}
            min="1"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Learning Rate</label>
          <input
            type="number"
            step="0.0001"
            name="learningRate"
            value={trainingConfig.learningRate}
            onChange={handleConfigChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={isTraining}
            min="0.0001"
          />
        </div>
        
        <div className="bg-white rounded-lg shadow p-4 flex items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useDataAugmentation"
              name="useDataAugmentation"
              checked={trainingConfig.useDataAugmentation}
              onChange={handleConfigChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={isTraining}
            />
            <label htmlFor="useDataAugmentation" className="ml-2 block text-sm text-gray-700">
              Use Data Augmentation
            </label>
          </div>
        </div>
      </div>

      {/* Model Output Panel */}
      <ModelOutputPanel />
    </div>
  );
};

export default ModelDashboard;
