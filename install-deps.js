const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Setting up Sentinel AI dependencies...');

// Check if Node.js is installed
try {
  const nodeVersion = execSync('node --version').toString().trim();
  console.log(`✅ Node.js ${nodeVersion} is installed`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js v16 or higher from https://nodejs.org/');
  process.exit(1);
}

// Function to run commands with error handling
function runCommand(command, cwd) {
  console.log(`\n📦 Running: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', cwd });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    return false;
  }
}

// Install backend dependencies
console.log('\n🔧 Installing backend dependencies...');
const backendPath = path.join(__dirname, 'backend');
if (!fs.existsSync(path.join(backendPath, 'package.json'))) {
  console.error('❌ Backend directory not found or package.json is missing');
  process.exit(1);
}

if (!runCommand('npm install', backendPath)) {
  console.error('❌ Failed to install backend dependencies');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n🎨 Installing frontend dependencies...');
const frontendPath = path.join(__dirname, 'frontend');
if (!fs.existsSync(path.join(frontendPath, 'package.json'))) {
  console.error('❌ Frontend directory not found or package.json is missing');
  process.exit(1);
}

if (!runCommand('npm install', frontendPath)) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Install Python dependencies if model directory exists
const modelPath = path.join(__dirname, 'model');
if (fs.existsSync(path.join(modelPath, 'requirements.txt'))) {
  console.log('\n🤖 Installing Python dependencies for ML model...');
  try {
    execSync('python --version', { stdio: 'inherit' });
    if (runCommand('pip install -r requirements.txt', modelPath)) {
      console.log('✅ Python dependencies installed successfully');
    } else {
      console.warn('⚠️  Failed to install Python dependencies. Continuing without ML model...');
    }
  } catch (error) {
    console.warn('⚠️  Python is not installed or not in PATH. Skipping ML model setup...');
  }
}

console.log('\n✨ Setup completed successfully!');
console.log('\nTo start the application, run:');
console.log('  node start-dev.js');
console.log('\nThen open http://localhost:3000 in your browser');
