import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  selectPredictionStats,
  selectAnomalyRate,
  selectTrainingMetrics,
  selectEvaluationMetrics,
  selectRecentPredictions
} from './modelSlice';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ModelOutput = () => {
  const predictionStats = useSelector(selectPredictionStats);
  const anomalyRate = useSelector(selectAnomalyRate);
  const trainingMetrics = useSelector(selectTrainingMetrics);
  const evaluationMetrics = useSelector(selectEvaluationMetrics);
  const recentPredictions = useSelector(state => selectRecentPredictions(state, 5));

  // Format training data for charts
  const trainingData = useMemo(() => {
    if (!trainingMetrics || !trainingMetrics.loss) return [];
    
    return trainingMetrics.loss.map((_, index) => ({
      epoch: index + 1,
      loss: trainingMetrics.loss[index] || 0,
      accuracy: (trainingMetrics.accuracy && trainingMetrics.accuracy[index]) || 0,
      val_loss: (trainingMetrics.val_loss && trainingMetrics.val_loss[index]) || 0,
      val_accuracy: (trainingMetrics.val_accuracy && trainingMetrics.val_accuracy[index]) || 0,
    }));
  }, [trainingMetrics]);

  // Format confusion matrix for display
  const confusionMatrixData = useMemo(() => {
    const { truePositives, trueNegatives, falsePositives, falseNegatives } = 
      evaluationMetrics.confusionMatrix || {};
    
    return [
      { name: 'True Positives', value: truePositives || 0 },
      { name: 'False Positives', value: falsePositives || 0 },
      { name: 'True Negatives', value: trueNegatives || 0 },
      { name: 'False Negatives', value: falseNegatives || 0 },
    ];
  }, [evaluationMetrics.confusionMatrix]);

  return (
    <div className="space-y-6 p-4">
      {/* Training Status */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Training Status</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium">{trainingStatus}</span>
          </div>
          {trainingStatus === 'training' && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${trainingProgress}%` }}
              ></div>
            </div>
          )}
          <div className="text-sm text-gray-500">
            Epoch {trainingMetrics.currentEpoch} of {trainingMetrics.totalEpochs}
          </div>
        </div>
      </div>

      {/* Training Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Loss Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="loss" 
                  name="Training Loss" 
                  stroke="#FF6384" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="val_loss" 
                  name="Validation Loss" 
                  stroke="#36A2EB" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Accuracy Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="accuracy" 
                  name="Training Accuracy" 
                  stroke="#4BC0C0" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="val_accuracy" 
                  name="Validation Accuracy" 
                  stroke="#FF9F40" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-time Predictions */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Real-time Predictions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium mb-2">Anomaly Detection</h3>
            <div className="text-4xl font-bold">
              {anomalyRate.toFixed(1)}%
              <span className="text-sm font-normal text-gray-500 ml-2">anomaly rate</span>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Predictions</h3>
            <div className="space-y-1">
              <div>Total: {predictionStats.total}</div>
              <div className="text-green-600">Normal: {predictionStats.normal}</div>
              <div className="text-red-600">Anomalies: {predictionStats.anomalies}</div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Last Prediction</h3>
            {lastPrediction ? (
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-24">Status:</span>
                  <span className={`font-medium ${lastPrediction.isAnomaly ? 'text-red-600' : 'text-green-600'}`}>
                    {lastPrediction.isAnomaly ? 'Anomaly Detected' : 'Normal'}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-24">Confidence:</span>
                  <span>{(lastPrediction.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(lastPrediction.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div>No predictions yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Model Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Confusion Matrix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={confusionMatrixData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => 
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {confusionMatrixData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Model Metrics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Accuracy:</span>
              <span className="font-medium">
                {(evaluationMetrics.accuracy * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Precision:</span>
              <span className="font-medium">
                {(evaluationMetrics.precision * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Recall:</span>
              <span className="font-medium">
                {(evaluationMetrics.recall * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>F1 Score:</span>
              <span className="font-medium">
                {(evaluationMetrics.f1Score * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>ROC AUC:</span>
              <span className="font-medium">
                {(evaluationMetrics.rocAuc * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>PR AUC:</span>
              <span className="font-medium">
                {(evaluationMetrics.prAuc * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelOutput;
