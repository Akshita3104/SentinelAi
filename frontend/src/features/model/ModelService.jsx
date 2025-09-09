import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  connectToModelService, 
  selectModelStatus,
  startTraining,
  updateTrainingProgress,
  addPrediction,
  updateEvaluationMetrics,
  updateModelMetadata,
  setError,
  selectTrainingStatus
} from './modelSlice';
import modelWebSocket from '../../services/modelWebSocket';
import { toast } from 'react-toastify';

const ModelService = () => {
  const dispatch = useDispatch();
  const status = useSelector(selectModelStatus);

  // Connect to model service on component mount
  useEffect(() => {
    if (status === 'disconnected') {
      dispatch(connectToModelService())
        .unwrap()
        .catch(error => {
          console.error('Failed to connect to model service:', error);
          toast.error(`Failed to connect to model service: ${error.message}`);
        });
    }

    // Clean up on unmount
    return () => {
      if (modelWebSocket.isConnected()) {
        modelWebSocket.disconnect();
      }
    };
  }, [dispatch, status]);

  // Set up message handlers
  const handleTrainingUpdate = useCallback((data) => {
    dispatch(updateTrainingProgress(data));
    
    // Show toast for important training events
    if (data.epoch && data.epoch % 5 === 0) {
      toast.info(`Training - Epoch ${data.epoch} of ${data.epochs || '?'}`, {
        autoClose: 2000,
        hideProgressBar: true,
      });
    }
  }, [dispatch]);

  const handlePrediction = useCallback((data) => {
    dispatch(addPrediction(data));
    
    // Show toast for anomaly detection
    if (data.isAnomaly) {
      toast.warn('🚨 Anomaly Detected!', {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  }, [dispatch]);

  const handleEvaluation = useCallback((data) => {
    dispatch(updateEvaluationMetrics(data));
    
    // Show toast for evaluation completion
    if (data.accuracy !== undefined) {
      toast.success(`Model evaluation complete - Accuracy: ${(data.accuracy * 100).toFixed(2)}%`);
    }
  }, [dispatch]);

  const handleModelMetadata = useCallback((data) => {
    dispatch(updateModelMetadata(data));
  }, [dispatch]);

  const handleError = useCallback((error) => {
    console.error('Model service error:', error);
    dispatch(setError(error.message || 'An error occurred'));
    toast.error(`Model Error: ${error.message || 'An error occurred'}`);
  }, [dispatch]);

  // Set up WebSocket message handlers
  useEffect(() => {
    if (status !== 'connected') return;

    const cleanupTraining = modelWebSocket.onMessage('training_update', handleTrainingUpdate);
    const cleanupPrediction = modelWebSocket.onMessage('prediction', handlePrediction);
    const cleanupEvaluation = modelWebSocket.onMessage('evaluation', handleEvaluation);
    const cleanupMetadata = modelWebSocket.onMessage('model_metadata', handleModelMetadata);
    const cleanupError = modelWebSocket.onMessage('error', handleError);

    // Set up periodic status check
    const statusInterval = setInterval(() => {
      if (modelWebSocket.isConnected()) {
        modelWebSocket.send({ type: 'status' });
      }
    }, 30000);

    // Clean up on unmount
    return () => {
      cleanupTraining();
      cleanupPrediction();
      cleanupEvaluation();
      cleanupMetadata();
      cleanupError();
      clearInterval(statusInterval);
    };
  }, [status, handleTrainingUpdate, handlePrediction, handleEvaluation, handleModelMetadata, handleError]);

  // Handle training status changes
  const trainingStatus = useSelector(selectTrainingStatus);
  useEffect(() => {
    if (trainingStatus === 'completed') {
      toast.success('🎉 Training completed successfully!');
    } else if (trainingStatus === 'failed') {
      toast.error('❌ Training failed');
    }
  }, [trainingStatus]);

  // Start training function
  const handleStartTraining = () => {
    const trainingConfig = {
      epochs: 50,
      batchSize: 32,
      learningRate: 0.001,
      validationSplit: 0.2,
      // Add any other training parameters here
    };
    dispatch(startTraining(trainingConfig));
  };

  // Connection status indicator
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Model Service:</span>
        <div className="flex items-center">
          <span className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2`}></span>
          <span className="text-sm capitalize">
            {status === 'connected' ? 'Connected' : status}
          </span>
        </div>
        {status === 'connected' && (
          <button
            onClick={handleStartTraining}
            className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Start Training
          </button>
        )}
      </div>
    </div>
  );
};

export default ModelService;
