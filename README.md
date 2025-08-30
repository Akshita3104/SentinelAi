# Sentinel AI - AI-Driven DDoS Detection System for 5G Networks

An intelligent, real-time DDoS detection and mitigation system powered by machine learning and SDN (Software Defined Networking) for 5G network slices. This system provides autonomous threat detection, network slice management, and self-healing capabilities.

## Features

- **Real-time Network Monitoring**: Automatic traffic capture and analysis
- **AI-Powered Detection**: Machine learning models for DDoS attack detection
- **5G Network Slice Management**: Support for eMBB, URLLC, and mMTC slices
- **Autonomous Mitigation**: Automatic threat response and network healing
- **Web Dashboard**: Real-time monitoring interface with live charts and alerts
- **API Integration**: AbuseIPDB integration for IP reputation checking
- **SDN Integration**: Software Defined Networking for dynamic flow control
- **Self-Healing Framework**: Automated recovery and isolation mechanisms

## Research Background

This project is part of advanced research in cybersecurity, focusing on developing innovative approaches for DDoS detection in 5G networks using machine learning and big data analytics techniques.

- [Research Paper](https://sol.sbc.org.br/index.php/wgrs/article/view/35631/35418)

## Project Architecture

The system consists of three main components:

```
SentinelAi/
│
├── backend/                    # Node.js API Server (Port 3000)
│   ├── controllers/            # API request handlers
│   ├── routes/                 # API route definitions
│   ├── services/               # External service integrations
│   ├── utils/                  # Utility functions
│   ├── .env                    # Environment configuration
│   ├── index.js                # Main server file
│   └── package.json            # Node.js dependencies
│
├── frontend/                   # React Web Dashboard (Port 5173/5174)
│   ├── src/
│   │   ├── services/           # API communication
│   │   ├── App.tsx             # Main React component
│   │   └── main.tsx            # React entry point
│   ├── index.html              # HTML template
│   ├── package.json            # React dependencies
│   └── vite.config.ts          # Vite build configuration
│
├── model/                      # Python ML Engine (Port 5001)
│   ├── app/                    # Core ML application
│   │   ├── app.py              # Flask ML API server
│   │   ├── autonomous_security_framework.py  # AI framework
│   │   ├── ml_detection.py     # ML detection engine
│   │   ├── mitigation_engine.py # Threat mitigation
│   │   ├── network_slice_manager.py # 5G slice management
│   │   ├── sdn_controller.py   # SDN integration
│   │   ├── flow_capture.py     # Network traffic capture
│   │   └── feature_extraction.py # Traffic feature extraction
│   ├── models/                 # Pre-trained ML models
│   │   ├── random_forest_min-max_scaling_model.pkl
│   │   └── random_forest_min-max_scaling_scaler.pkl
│   ├── logs/                   # Application logs
│   └── requirements.txt        # Python dependencies
│
├── README.md                   # Main project documentation
├── LICENSE                     # Project license
├── plan.md                     # Project planning document
└── todo.md                     # Task tracking
```

## Prerequisites

Before running the project, ensure you have the following installed:

### Required Software
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://python.org/)
- **Git** - [Download](https://git-scm.com/)
- **Wireshark/tshark** - [Download](https://wireshark.org/download.html)

### Verify Installation
```bash
node --version
python --version
git --version
tshark --version
```

## Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd 5GNetwork
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Install Python ML Dependencies
```bash
cd ../model
pip install -r requirements.txt
```

### 5. Configure Environment Variables

The backend `.env` file is already configured with default settings:
```
PORT=3000
ML_MODEL_URL=http://localhost:5001/predict
ABUSEIPDB_URL=https://api.abuseipdb.com/api/v2/check
ABUSEIPDB_API_KEY=your_abuseipdb_api_key_here
ABUSE_SCORE_THRESHOLD=25
```

**Optional**: Get a free AbuseIPDB API key:
1. Sign up at [AbuseIPDB](https://abuseipdb.com/register)
2. Get your API key from the dashboard
3. Replace `your_abuseipdb_api_key_here` in `backend/.env`

## How to Run This Project

### Step 1: Install Dependencies (Run Once)
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd frontend
npm install

# Install Python dependencies
cd model
pip install -r requirements.txt
```

### Step 2: Start the Project (3 Terminals)

**Terminal 1: Start ML Model**
```bash
cd model
cd app
python app.py
```

**Terminal 2: Start Backend**
```bash
cd backend
npm start
```

**Terminal 3: Start Frontend**
```bash
cd frontend
npm run dev
```

### Step 3: Open Browser
Go to: **http://localhost:5173**

---

## Detailed Setup Guide

## Running the System

The system requires 3 components running simultaneously. Open 3 separate terminals:

### Terminal 1: ML Model Server (Port 5001)
```bash
cd 5GNetwork/model/app
python app.py
```
**Expected output**: 
```
* Serving Flask app 'app'
* Debug mode: off
* Running on http://127.0.0.1:5001
```

### Terminal 2: Backend API Server (Port 3000)
```bash
cd 5GNetwork/backend
npm start
```
**Expected output**: 
```
Server running on port 3000
```

### Terminal 3: Frontend Dashboard (Port 5173)
```bash
cd 5GNetwork/frontend
npm run dev
```
**Expected output**: 
```
  Local:   http://localhost:5173/
  Network: use --host to expose
```

### 4. Access the Dashboard

Once all 3 terminals show successful startup:
1. Open your browser
2. Navigate to: **http://localhost:5173**
3. You should see the DDoS Detection Dashboard

### 5. Startup Checklist

✅ **All 3 services running**:
- [ ] ML Model: `http://127.0.0.1:5001` (Terminal 1)
- [ ] Backend API: `http://localhost:3000` (Terminal 2)  
- [ ] Frontend: `http://localhost:5173` (Terminal 3)

✅ **Dashboard shows**:
- [ ] "Connected" status (green indicator)
- [ ] No error messages
- [ ] All charts and metrics visible

## Alternative Startup (Windows)

For Windows users, use these commands:

### Terminal 1: ML Model
```cmd
cd 5GNetwork\model\app
python app.py
```

### Terminal 2: Backend
```cmd
cd 5GNetwork\backend
npm start
```

### Terminal 3: Frontend
```cmd
cd 5GNetwork\frontend
npm run dev
```

## Using the System

### Automatic Network Monitoring
1. Click **"Start Auto Monitor"** to begin live traffic capture
2. The system will automatically:
   - Detect your IP address
   - Capture network traffic patterns
   - Run DDoS detection on suspicious activity
   - Update all metrics in real-time

### Manual Detection
1. Enter traffic data manually (comma-separated values)
2. Specify IP address to analyze
3. Click **"Run Detection"** to analyze

### Features Available
- **Real-time Traffic Monitoring**: Live network activity capture
- **AI-Powered Detection**: Machine learning threat analysis
- **5G Network Slices**: eMBB, URLLC, mMTC slice management
- **Automatic Mitigation**: Threat response and network healing
- **Live Dashboard**: Real-time charts, alerts, and metrics

## Troubleshooting

### Common Startup Issues

**❌ "npm: command not found"**
```bash
# Install Node.js first
# Download from: https://nodejs.org/
node --version  # Verify installation
```

**❌ "python: command not found"**
```bash
# Try python3 instead
python3 app.py
# Or install Python from: https://python.org/
```

**❌ "Port 3000 already in use"**
```bash
# Kill the process using the port
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

**❌ "Module not found" (Python)**
```bash
# Reinstall Python dependencies
cd model
pip install -r requirements.txt
# Or try:
pip3 install -r requirements.txt
```

**❌ "Cannot resolve dependency" (npm)**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**❌ CORS/Connection Errors**
- Ensure all 3 services are running
- Check backend shows "Server running on port 3000"
- Restart backend if needed: `Ctrl+C` then `npm start`

**❌ "Backend: Disconnected" in Dashboard**
- Verify backend is running on port 3000
- Check for error messages in backend terminal
- Ensure `.env` file exists in backend folder

### Performance Notes
- The system simulates network traffic for demonstration
- Real packet capture requires appropriate network permissions
- ML models are pre-trained for immediate use

## System Architecture

### Data Flow
1. **Network Traffic** → Captured by monitoring system
2. **Feature Extraction** → Traffic patterns analyzed
3. **ML Detection** → AI models classify threats
4. **API Integration** → AbuseIPDB reputation check
5. **Mitigation Engine** → Automatic threat response
6. **Dashboard** → Real-time visualization

### Network Slices
- **eMBB**: Enhanced Mobile Broadband
- **URLLC**: Ultra-Reliable Low Latency Communications  
- **mMTC**: Massive Machine Type Communications

### ML Models
- Random Forest classifier for DDoS detection
- Min-Max scaling for feature normalization
- Ensemble approach for improved accuracy

## Contributing

This project is part of ongoing cybersecurity research. For questions or contributions, please refer to the research documentation or contact the project maintainers.

## License

This project is developed for research purposes. Please refer to the license file for usage terms.
