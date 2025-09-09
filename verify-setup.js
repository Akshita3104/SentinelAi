const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

console.log('🔍 Verifying Sentinel AI setup...');

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.versions.node;
  const [major] = nodeVersion.split('.').map(Number);
  if (major < 16) {
    console.error(`❌ Node.js v16 or higher is required (current: v${nodeVersion})`);
    return false;
  }
  console.log(`✅ Node.js v${nodeVersion} is compatible`);
  return true;
}

// Check if directory exists and has package.json
function checkProjectStructure() {
  const requiredDirs = [
    { name: 'root', path: '.' },
    { name: 'backend', path: 'backend' },
    { name: 'frontend', path: 'frontend' },
    { name: 'model', path: 'model', optional: true }
  ];

  let allValid = true;
  
  for (const dir of requiredDirs) {
    const fullPath = path.join(__dirname, dir.path);
    const packageJson = path.join(fullPath, 'package.json');
    
    if (!fs.existsSync(fullPath)) {
      if (!dir.optional) {
        console.error(`❌ Directory not found: ${dir.name}`);
        allValid = false;
      }
      continue;
    }
    
    if (dir.name !== 'root' && !fs.existsSync(packageJson)) {
      console.error(`❌ package.json not found in ${dir.name}`);
      allValid = false;
      continue;
    }
    
    console.log(`✅ Found ${dir.name} directory`);
  }
  
  return allValid;
}

// Check if required ports are available
async function checkPorts() {
  const ports = [3000, 8080]; // Frontend and backend ports
  const results = await Promise.all(ports.map(checkPort));
  return results.every(Boolean);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer()
      .listen(port, () => {
        server.close();
        console.log(`✅ Port ${port} is available`);
        resolve(true);
      })
      .on('error', (err) => {
        console.error(`❌ Port ${port} is in use: ${err.message}`);
        resolve(false);
      });
  });
}

// Test WebSocket connection
async function testWebSocket() {
  return new Promise((resolve) => {
    console.log('\n🔌 Testing WebSocket connection...');
    const ws = new WebSocket('ws://localhost:8080/model');
    
    const timeout = setTimeout(() => {
      console.log('❌ WebSocket connection timeout');
      ws.terminate();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connected successfully');
      ws.close();
      resolve(true);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.error(`❌ WebSocket error: ${error.message}`);
      resolve(false);
    });
  });
}

// Main verification function
async function verifySetup() {
  console.log('\n=== Verifying System Requirements ===');
  const requirements = {
    nodeVersion: checkNodeVersion(),
    projectStructure: checkProjectStructure(),
  };
  
  console.log('\n=== Checking Port Availability ===');
  requirements.portsAvailable = await checkPorts();
  
  console.log('\n=== Testing WebSocket Server ===');
  requirements.websocketWorking = await testWebSocket();
  
  const allPassed = Object.values(requirements).every(Boolean);
  
  console.log('\n=== Verification Summary ===');
  console.log(`✅ Node.js version: ${process.versions.node}`);
  console.log(`✅ Project structure: ${requirements.projectStructure ? 'Valid' : 'Invalid'}`);
  console.log(`✅ Ports available: ${requirements.portsAvailable ? 'Yes' : 'No'}`);
  console.log(`✅ WebSocket test: ${requirements.websocketWorking ? 'Passed' : 'Failed'}`);
  
  if (allPassed) {
    console.log('\n✨ All checks passed! You can now start the application with:');
    console.log('   node start-dev.js');
  } else {
    console.log('\n❌ Some checks failed. Please fix the issues above before proceeding.');
  }
  
  return allPassed;
}

// Run verification
verifySetup().then(success => {
  process.exit(success ? 0 : 1);
});
