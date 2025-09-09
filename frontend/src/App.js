import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ModelTraining from './pages/ModelTraining';
import Detection from './pages/Detection';
import Mitigation from './pages/Mitigation';
import SystemStatus from './pages/SystemStatus';
import NetworkMonitorPage from './pages/NetworkMonitorPage';
import ModelDashboard from './pages/ModelDashboard';

// Wrap the app with the Redux provider
function AppContent() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/models" element={<ModelTraining />} />
          <Route path="/detection" element={<Detection />} />
          <Route path="/mitigation" element={<Mitigation />} />
          <Route path="/system" element={<SystemStatus />} />
          <Route path="/network" element={<NetworkMonitorPage />} />
        </Routes>
      </Layout>
    </div>
  );
}

// Main App component with Redux Provider
function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
