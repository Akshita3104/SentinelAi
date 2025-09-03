import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ModelTraining from './pages/ModelTraining';
import Detection from './pages/Detection';
import Mitigation from './pages/Mitigation';
import SystemStatus from './pages/SystemStatus';
import NetworkMonitorPage from './pages/NetworkMonitorPage';

function App() {
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

export default App;
