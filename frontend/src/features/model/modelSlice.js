import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock API calls
const fetchModelStatus = async () => {
  // In a real app, this would be an API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'trained',
        accuracy: 0.98,
        precision: 0.97,
        recall: 0.96,
        f1Score: 0.965,
        lastTrained: '2023-08-01T10:30:00Z',
      });
    }, 500);
  });
};

const initialState = {
  status: 'idle',
  trainingStatus: 'idle',
  error: null,
  currentModel: null,
  availableModels: [],
  metrics: {
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
  },
  trainingHistory: [],
  datasets: [],
  selectedDataset: null,
  trainingProgress: 0,
};

export const fetchModelStatusAsync = createAsyncThunk(
  'model/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const status = await fetchModelStatus();
      return status;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const modelSlice = createSlice({
  name: 'model',
  initialState,
  reducers: {
    startTraining(state) {
      state.trainingStatus = 'training';
      state.trainingProgress = 0;
    },
    updateTrainingProgress(state, action) {
      state.trainingProgress = action.payload;
    },
    trainingComplete(state, action) {
      state.trainingStatus = 'succeeded';
      state.metrics = action.payload.metrics;
      state.currentModel = action.payload.model;
      state.trainingHistory.unshift({
        timestamp: new Date().toISOString(),
        metrics: action.payload.metrics,
      });
    },
    trainingFailed(state, action) {
      state.trainingStatus = 'failed';
      state.error = action.payload;
    },
    selectModel(state, action) {
      state.currentModel = action.payload;
    },
    selectDataset(state, action) {
      state.selectedDataset = action.payload;
    },
    resetTrainingState(state) {
      state.trainingStatus = 'idle';
      state.error = null;
      state.trainingProgress = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModelStatusAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchModelStatusAsync.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.metrics = {
          ...state.metrics,
          accuracy: action.payload.accuracy,
          precision: action.payload.precision,
          recall: action.payload.recall,
          f1Score: action.payload.f1Score,
        };
        state.currentModel = {
          ...state.currentModel,
          lastTrained: action.payload.lastTrained,
          status: action.payload.status,
        };
      })
      .addCase(fetchModelStatusAsync.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const {
  startTraining,
  updateTrainingProgress,
  trainingComplete,
  trainingFailed,
  selectModel,
  selectDataset,
  resetTrainingState,
} = modelSlice.actions;

export default modelSlice.reducer;

// Selectors
export const selectModelStatus = (state) => state.model.status;
export const selectTrainingStatus = (state) => state.model.trainingStatus;
export const selectModelMetrics = (state) => state.model.metrics;
export const selectCurrentModel = (state) => state.model.currentModel;
export const selectTrainingProgress = (state) => state.model.trainingProgress;
export const selectSelectedDataset = (state) => state.model.selectedDataset;
export const selectAvailableDatasets = (state) => state.model.datasets;
