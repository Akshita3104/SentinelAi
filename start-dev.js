const { spawn } = require('child_process');
const path = require('path');

// Paths
const backendPath = path.join(__dirname, 'backend');
const frontendPath = path.join(__dirname, 'frontend');

// Start backend server
console.log('Starting backend server...');
const backend = spawn('node', ['server.js'], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: 8080,
    NODE_ENV: 'development'
  }
});

// Start frontend development server
console.log('Starting frontend development server...');
const frontend = spawn('npm', ['start'], {
  cwd: frontendPath,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    REACT_APP_WS_URL: 'ws://localhost:8080',
    REACT_APP_MODEL_WS_URL: 'ws://localhost:8080/model',
    PORT: 3000
  }
});

// Handle process exit
const handleExit = (signal) => {
  console.log(`Received ${signal}. Shutting down...`);
  
  if (backend) {
    backend.kill();
    console.log('Backend server stopped');
  }
  
  if (frontend) {
    frontend.kill();
    console.log('Frontend server stopped');
  }
  
  process.exit(0);
};

// Handle different termination signals
process.on('SIGINT', () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));

// Log errors
backend.on('error', (err) => {
  console.error('Backend error:', err);
});

frontend.on('error', (err) => {
  console.error('Frontend error:', err);
});

// Log exit codes
backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);  
  if (code !== 0) {
    console.error('Backend server crashed. Please check the logs.');
  }
});

frontend.on('close', (code) => {
  console.log(`Frontend process exited with code ${code}`);
  if (code !== 0) {
    console.error('Frontend development server crashed. Please check the logs.');
  }
});

console.log('Development environment started. Press Ctrl+C to stop.');
