import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { 
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  selectTrainingMetrics, 
  selectEvaluationMetrics, 
  selectRecentPredictions,
  selectAnomalyRate
} from './modelSlice';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const ModelOutputPanel = () => {
  const trainingMetrics = useSelector(selectTrainingMetrics);
  const evaluationMetrics = useSelector(selectEvaluationMetrics);
  // Removed unused predictionStats
  const recentPredictions = useSelector(selectRecentPredictions);
  const anomalyRate = useSelector(selectAnomalyRate);

  // Format training data for charts
  const trainingData = useMemo(() => {
    if (!trainingMetrics?.loss?.length) return [];
    
    return trainingMetrics.loss.map((_, index) => ({
      epoch: index + 1,
      loss: trainingMetrics.loss[index] || 0,
      accuracy: (trainingMetrics.accuracy?.[index] || 0) * 100, // Convert to percentage
      val_loss: trainingMetrics.val_loss?.[index] || 0,
      val_accuracy: (trainingMetrics.val_accuracy?.[index] || 0) * 100, // Convert to percentage
    }));
  }, [trainingMetrics]);

  // Format confusion matrix data
  const confusionMatrixData = useMemo(() => {
    const { confusionMatrix = {} } = evaluationMetrics;
    return [
      { name: 'True Positives', value: confusionMatrix.truePositives || 0 },
      { name: 'False Positives', value: confusionMatrix.falsePositives || 0 },
      { name: 'True Negatives', value: confusionMatrix.trueNegatives || 0 },
      { name: 'False Negatives', value: confusionMatrix.falseNegatives || 0 },
    ];
  }, [evaluationMetrics]);

  // Format recent predictions for display
  const formattedPredictions = useMemo(() => {
    return (recentPredictions || []).map(pred => ({
      ...pred,
      timestamp: new Date(pred.timestamp).toLocaleTimeString(),
      confidence: `${(pred.confidence * 100).toFixed(2)}%`,
      isAnomaly: pred.isAnomaly ? '🚨 Anomaly' : '✅ Normal',
      traffic: formatBytes(pred.bytes || 0)
    }));
  }, [recentPredictions]);

  return (
    <div className="space-y-6 p-4">
      {/* Training Progress */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Training Progress</h3>
        {trainingData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="epoch" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="loss" 
                  name="Training Loss" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="accuracy" 
                  name="Training Accuracy %" 
                  stroke="#82ca9d" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No training data available. Start training to see metrics.
          </p>
        )}
      </div>

      {/* Model Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Confusion Matrix</h3>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Accuracy:</span>
              <span className="font-mono">
                {(evaluationMetrics.accuracy * 100 || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Precision:</span>
              <span className="font-mono">
                {(evaluationMetrics.precision * 100 || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Recall:</span>
              <span className="font-mono">
                {(evaluationMetrics.recall * 100 || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>F1 Score:</span>
              <span className="font-mono">
                {(evaluationMetrics.f1Score * 100 || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Anomaly Rate:</span>
              <span className="font-mono">
                {anomalyRate.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Predictions */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-4">Recent Predictions</h3>
        {formattedPredictions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Traffic
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formattedPredictions.map((pred, idx) => (
                  <tr key={idx} className={pred.isAnomaly.includes('Anomaly') ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pred.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${pred.isAnomaly.includes('Anomaly') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {pred.isAnomaly}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pred.confidence}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pred.traffic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No prediction data available. Model predictions will appear here.
          </p>
        )}
      </div>
    </div>
  );
};

export default ModelOutputPanel;
