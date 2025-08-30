# Sentinel AI - Machine Learning Engine

The Python-based ML engine for real-time DDoS detection in 5G networks using machine learning and SDN integration.

## Overview

This component provides the artificial intelligence backbone for the Sentinel AI system, featuring real-time traffic analysis, DDoS detection using machine learning models, and integration with Software Defined Networking (SDN) for automated threat mitigation.

## Key Features

- **Real-time DDoS Detection**: ML-powered anomaly detection on network traffic
- **5G Network Slice Analytics**: Specialized analysis for eMBB, URLLC, and mMTC slices
- **SDN Integration**: Automated flow control through Ryu controller
- **Feature Extraction**: Advanced traffic pattern analysis
- **Self-Healing Framework**: Automated response and recovery mechanisms
- **REST API**: Flask-based API for integration with backend services

## Tech Stack

- **Language**: Python 3.8+
- **Web Framework**: Flask
- **Machine Learning**: scikit-learn, pandas, numpy
- **Network Analysis**: pyshark, scapy, networkx
- **SDN Integration**: Ryu controller
- **Data Processing**: pandas, numpy, scipy

## Project Structure

```
model/
│
├── app/
│   ├── app.py                      # Flask API server main file
│   ├── __init__.py                 # Package initialization
│   ├── autonomous_security_framework.py  # AI security framework
│   ├── ml_detection.py            # Machine learning detection engine
│   ├── mitigation_engine.py       # Threat mitigation logic
│   ├── network_slice_manager.py   # 5G slice management
│   ├── sdn_controller.py          # SDN integration
│   ├── flow_capture.py            # Network traffic capture
│   ├── feature_extraction.py      # Traffic feature extraction
│   └── logs/
│       └── server.log             # Application logs
│
├── models/
│   ├── random_forest_min-max_scaling_model.pkl    # Pre-trained ML model
│   └── random_forest_min-max_scaling_scaler.pkl   # Feature scaler
│
├── logs/
│   ├── app.log                    # Application logs
│   └── server.log                 # Server logs
│
├── requirements.txt               # Python dependencies
└── .gitignore                    # Git ignore rules
```

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Wireshark/tshark for packet capture
- Network permissions for traffic monitoring

## Installation

### 1. Navigate to Model Directory
```bash
cd model
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Verify Installation
```bash
python --version
pip --version
tshark --version
```

## Dependencies

### Core ML Dependencies
- scikit-learn==1.4.2
- pandas>=1.3.0
- numpy==2.3.1
- scipy==1.16.0
- joblib==1.5.1

### Network Analysis
- pyshark==0.6
- scapy>=2.4.5
- networkx>=2.6

### Web Framework & Utilities
- Flask==3.1.1
- Flask-CORS==6.0.1
- requests==2.32.3
- PyYAML==6.0.2

### SDN Integration
- ryu>=4.34
- psutil>=5.8.0

## Configuration

### Environment Setup

The ML engine runs on port 5001 by default. Ensure the backend is configured to connect to this endpoint:

```python
# Default configuration in app.py
PORT = 5001
HOST = '127.0.0.1'
```

### Model Configuration

Pre-trained models are stored in the `models/` directory:
- `random_forest_min-max_scaling_model.pkl`: Trained Random Forest classifier
- `random_forest_min-max_scaling_scaler.pkl`: Feature scaler for normalization

## Running the ML Engine

### Start the Flask Server
```bash
cd model/app
python app.py
```

### Expected Output
```
* Serving Flask app 'app'
* Debug mode: off
* Running on http://127.0.0.1:5001
```

### API Endpoints

**POST /predict**
- Input: Network traffic features in JSON format
- Output: DDoS detection prediction with confidence score

**GET /health**
- Health check endpoint returns server status

**POST /analyze_traffic**
- Real-time traffic analysis with detailed metrics

## Core Components

### ML Detection Engine (`ml_detection.py`)
- Loads pre-trained Random Forest model
- Handles feature scaling and normalization
- Provides prediction interface for DDoS detection
- Supports real-time and batch processing

### Feature Extraction (`feature_extraction.py`)
- Extracts relevant features from network traffic
- Handles packet capture and parsing
- Normalizes features for ML model input
- Supports multiple traffic protocols

### SDN Controller (`sdn_controller.py`)
- Integrates with Ryu SDN controller
- Manages network flow rules
- Implements automated mitigation strategies
- Provides REST API for flow management

### Network Slice Manager (`network_slice_manager.py`)
- Monitors 5G network slices (eMBB, URLLC, mMTC)
- Provides slice-specific analytics
- Handles slice isolation and recovery
- Integrates with SDN for slice management

### Autonomous Security Framework (`autonomous_security_framework.py`)
- Orchestrates detection and mitigation
- Implements self-healing algorithms
- Manages threat response strategies
- Provides audit logging and reporting

## Model Training

### Training Data
The model was trained on network traffic datasets including:
- CICIDS dataset features
- Simulated 5G network traffic
- DDoS attack patterns
- Normal traffic baselines

### Feature Set
- Packet rate statistics
- Protocol distribution
- Flow duration metrics
- Byte and packet size distributions
- Connection patterns
- Temporal features

### Performance Metrics
- Accuracy: >95% on test data
- Precision: >92% for DDoS detection
- Recall: >94% for attack identification
- F1-Score: >93% overall

## Integration Points

### Backend API Integration
- Accepts JSON payloads with traffic features
- Returns prediction results with confidence scores
- Supports batch processing for historical analysis
- Provides real-time streaming capabilities

### SDN Integration
- Communicates with Ryu controller via REST
- Implements flow rule modifications
- Supports automated threat mitigation
- Provides network topology awareness

## Troubleshooting

### Common Issues

**❌ "Module not found" errors**
```bash
# Reinstall dependencies
pip install -r requirements.txt
# Or use pip3 if needed
pip3 install -r requirements.txt
```

**❌ "Port 5001 already in use"**
```bash
# Find and kill process using port 5001
# Linux/Mac:
lsof -ti:5001 | xargs kill -9
# Windows:
netstat -ano | findstr :5001
taskkill /PID <PID> /F
```

**❌ "Permission denied" for packet capture**
- Run with appropriate permissions
- Use sudo (Linux/Mac) or run as administrator (Windows)
- Configure system permissions for network monitoring

**❌ "Model file not found"**
- Ensure model files exist in `models/` directory
- Verify file paths in `ml_detection.py`
- Check file permissions

### Performance Tips

1. **GPU Acceleration**: Consider using CUDA-enabled versions of libraries for faster inference
2. **Batch Processing**: Use batch predictions for better throughput
3. **Caching**: Implement prediction caching for repeated similar inputs
4. **Monitoring**: Use the built-in logging system for performance tracking

## Development

### Adding New Features
1. Follow Python PEP 8 style guidelines
2. Add type hints for better code clarity
3. Implement proper error handling
4. Add unit tests for new functionality
5. Update documentation accordingly

### Testing
```bash
# Run basic functionality tests
python -m pytest tests/
# Or use unittest
python -m unittest discover
```

### Logging
- Logs are stored in `logs/` directory
- Application logs: `logs/app.log`
- Server logs: `logs/server.log`
- Debug mode provides detailed logging

## Contributing

When contributing to the ML engine:
1. Follow the existing code structure and patterns
2. Add comprehensive docstrings for new functions
3. Include type annotations for all function signatures
4. Test with both synthetic and real network data
5. Ensure backward compatibility with existing API

## License

This component is part of the Sentinel AI research project. Refer to the main project LICENSE for usage terms and conditions.
