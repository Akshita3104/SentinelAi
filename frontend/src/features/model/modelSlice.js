import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// WebSocket server URL for model updates
const MODEL_WS_URL = process.env.REACT_APP_MODEL_WS_URL || 'ws://localhost:8081';

const initialState = {
  // Connection status
  status: 'disconnected', // 'disconnected', 'connecting', 'connected', 'error'
  error: null,
  lastUpdated: null,
  
  // Model training state
  trainingStatus: 'idle', // 'idle', 'loading', 'training', 'evaluating', 'completed', 'failed'
  trainingProgress: 0,
  trainingMetrics: {
    loss: [],
    accuracy: [],
    val_loss: [],
    val_accuracy: [],
    currentEpoch: 0,
    totalEpochs: 0,
    batchSize: 32,
    learningRate: 0.001,
  },
  
  // Model inference state
  predictions: [],
  lastPrediction: null,
  predictionStats: {
    total: 0,
    anomalies: 0,
    normal: 0,
    lastUpdated: null,
  },
  
  // Model metadata
  currentModel: {
    name: 'ddos_detection_model',
    version: '1.0.0',
    lastTrained: null,
    inputShape: null,
    classes: ['normal', 'ddos_attack'],
  },
  
  // Evaluation metrics
  evaluationMetrics: {
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
    confusionMatrix: {
      truePositives: 0,
      trueNegatives: 0,
      falsePositives: 0,
      falseNegatives: 0,
    },
    rocAuc: 0,
    prAuc: 0,
  },
  
  // System resources
  systemMetrics: {
    gpuAvailable: false,
    memoryUsage: 0,
    inferenceTime: 0,
  },
};

// WebSocket connection for real-time model updates
let modelWs = null;

export const connectToModelService = createAsyncThunk(
  'model/connect',
  async (_, { dispatch, rejectWithValue }) => {
    return new Promise((resolve, reject) => {
      if (modelWs) {
        modelWs.close();
      }
      
      modelWs = new WebSocket(MODEL_WS_URL);
      
      modelWs.onopen = () => {
        console.log('Connected to model service');
        dispatch(setStatus('connected'));
        resolve({ status: 'connected' });
      };
      
      modelWs.onerror = (error) => {
        console.error('Model WebSocket error:', error);
        dispatch(setStatus('error'));
        reject(rejectWithValue('Failed to connect to model service'));
      };
      
      modelWs.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Model message:', message);
          
          switch (message.type) {
            case 'training_update':
              dispatch(updateTrainingProgress(message.data));
              break;
              
            case 'prediction':
              dispatch(addPrediction(message.data));
              break;
              
            case 'evaluation':
              dispatch(updateEvaluationMetrics(message.data));
              break;
              
            case 'model_metadata':
              dispatch(updateModelMetadata(message.data));
              break;
              
            case 'error':
              console.error('Model service error:', message.error);
              dispatch(setError(message.error));
              break;
              
            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error processing model message:', error);
        }
      };
      
      modelWs.onclose = () => {
        console.log('Disconnected from model service');
        dispatch(setStatus('disconnected'));
      };
    });
  }
);

export const startTraining = createAsyncThunk(
  'model/startTraining',
  async (trainingConfig, { getState, rejectWithValue }) => {
    const { model } = getState();
    if (model.status !== 'connected') {
      return rejectWithValue('Not connected to model service');
    }
    
    return new Promise((resolve) => {
      modelWs.send(JSON.stringify({
        type: 'start_training',
        data: trainingConfig
      }));
      
      // Set up a one-time message handler for training start confirmation
      const handleMessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'training_started') {
          modelWs.removeEventListener('message', handleMessage);
          resolve({ status: 'training_started' });
        }
      };
      
      modelWs.addEventListener('message', handleMessage);
    });
  }
);

const modelSlice = createSlice({
  name: 'model',
  initialState,
  reducers: {
    setStatus(state, action) {
      state.status = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setError(state, action) {
      state.error = action.payload;
      state.status = 'error';
      state.lastUpdated = new Date().toISOString();
    },
    updateTrainingProgress(state, action) {
      const { epoch, epochs, loss, accuracy, val_loss, val_accuracy, metrics } = action.payload;
      
      // Update training metrics
      if (loss !== undefined) state.trainingMetrics.loss.push(parseFloat(loss));
      if (accuracy !== undefined) state.trainingMetrics.accuracy.push(parseFloat(accuracy));
      if (val_loss !== undefined) state.trainingMetrics.val_loss.push(parseFloat(val_loss));
      if (val_accuracy !== undefined) state.trainingMetrics.val_accuracy.push(parseFloat(val_accuracy));
      
      // Update epoch information
      if (epoch) state.trainingMetrics.currentEpoch = parseInt(epoch);
      if (epochs) state.trainingMetrics.totalEpochs = parseInt(epochs);
      
      // Update progress
      if (epoch && epochs) {
        state.trainingProgress = Math.min(100, Math.round((epoch / epochs) * 100));
      }
      
      // Update training status
      if (metrics) {
        state.trainingMetrics = { ...state.trainingMetrics, ...metrics };
      }
      
      state.lastUpdated = new Date().toISOString();
    },
    addPrediction(state, action) {
      const prediction = {
        ...action.payload,
        timestamp: action.payload.timestamp || new Date().toISOString(),
        id: action.payload.id || Date.now().toString(),
        confidence: parseFloat(action.payload.confidence || 0),
        isAnomaly: Boolean(action.payload.isAnomaly)
      };
      
      // Add prediction to the beginning of the array (most recent first)
      state.predictions.unshift(prediction);
      
      // Keep only the last 100 predictions to prevent memory issues
      if (state.predictions.length > 100) {
        state.predictions = state.predictions.slice(0, 100);
      }
      
      state.lastPrediction = prediction;
      state.predictionStats.total++;
      
      if (prediction.isAnomaly) {
        state.predictionStats.anomalies++;
      } else {
        state.predictionStats.normal++;
      }
      
      state.predictionStats.lastUpdated = new Date().toISOString();
      state.lastUpdated = new Date().toISOString();
    },
    updateEvaluationMetrics(state, action) {
      const { confusionMatrix, ...otherMetrics } = action.payload;
      
      state.evaluationMetrics = {
        ...state.evaluationMetrics,
        ...otherMetrics,
        confusionMatrix: {
          ...state.evaluationMetrics.confusionMatrix,
          ...confusionMatrix
        },
        lastUpdated: new Date().toISOString()
      };
      state.lastUpdated = new Date().toISOString();
    },
    updateModelMetadata(state, action) {
      state.currentModel = {
        ...state.currentModel,
        ...action.payload,
        lastTrained: action.payload.lastTrained || new Date().toISOString()
      };
      state.lastUpdated = new Date().toISOString();
    },
    resetModelState(state) {
      return { 
        ...initialState,
        currentModel: { ...state.currentModel } // Keep model metadata
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectToModelService.pending, (state) => {
        state.status = 'connecting';
        state.error = null;
      })
      .addCase(connectToModelService.fulfilled, (state) => {
        state.status = 'connected';
      })
      .addCase(connectToModelService.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || 'Failed to connect to model service';
      })
      .addCase(startTraining.pending, (state) => {
        state.trainingStatus = 'loading';
        state.error = null;
      })
      .addCase(startTraining.fulfilled, (state) => {
        state.trainingStatus = 'training';
        state.trainingProgress = 0;
        state.trainingMetrics = {
          loss: [],
          accuracy: [],
          val_loss: [],
          val_accuracy: [],
          currentEpoch: 0,
          totalEpochs: 0,
        };
      })
      .addCase(startTraining.rejected, (state, action) => {
        state.trainingStatus = 'failed';
        state.error = action.payload;
      });
  },
});

export const {
  setStatus,
  setError,
  updateTrainingProgress,
  addPrediction,
  updateEvaluationMetrics,
  updateModelMetadata,
  resetModelState,
} = modelSlice.actions;

export default modelSlice.reducer;

// Selectors
export const selectModelStatus = (state) => state.model.status;
export const selectTrainingStatus = (state) => state.model.trainingStatus;
export const selectTrainingProgress = (state) => state.model.trainingProgress;
export const selectTrainingMetrics = (state) => state.model.trainingMetrics;
export const selectCurrentModel = (state) => state.model.currentModel;
export const selectPredictions = (state) => state.model.predictions;
export const selectLastPrediction = (state) => state.model.lastPrediction;
export const selectPredictionStats = (state) => state.model.predictionStats;
export const selectEvaluationMetrics = (state) => state.model.evaluationMetrics;
export const selectSystemMetrics = (state) => state.model.systemMetrics;

// Memoized selectors for performance
export const selectRecentPredictions = (count = 10) => 
  (state) => state.model.predictions.slice(0, count);

export const selectAnomalyRate = (state) => {
  const { anomalies, total } = state.model.predictionStats;
  return total > 0 ? (anomalies / total) * 100 : 0;
};

export const selectIsAnomalyDetected = (state) => {
  const last = state.model.lastPrediction;
  return last ? last.isAnomaly : false;
};
