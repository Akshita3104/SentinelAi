#!/usr/bin/env python3
"""
Automated test scripts for 5G DDoS Detection System
"""

import requests
import json
import time

# Configuration
BACKEND_URL = "http://localhost:3000/api"
FLASK_URL = "http://localhost:5001"

def test_flask_server():
    """Test Flask server directly"""
    print("🧪 Testing Flask Server...")
    
    test_cases = [
        {
            "name": "Normal Traffic",
            "data": {
                "traffic": [100, 150, 120, 180, 95, 110, 140, 130],
                "ip_address": "192.168.1.100",
                "packet_data": {
                    "packet_rate": 200,
                    "avg_packet_size": 1500
                }
            }
        },
        {
            "name": "DDoS Attack",
            "data": {
                "traffic": [1200, 1500, 1800, 2000, 1600, 1400, 1700, 1900],
                "ip_address": "203.0.113.45",
                "packet_data": {
                    "packet_rate": 2500,
                    "avg_packet_size": 64
                }
            }
        }
    ]
    
    for test in test_cases:
        try:
            response = requests.post(f"{FLASK_URL}/predict", json=test["data"], timeout=10)
            print(f"✅ {test['name']}: {response.status_code}")
            result = response.json()
            print(f"   Prediction: {result.get('prediction')}")
            print(f"   Threat Level: {result.get('threat_level')}")
            print(f"   Slice Action: {result.get('slice_recommendation', {}).get('action')}")
            print()
        except Exception as e:
            print(f"❌ {test['name']}: {e}")

def test_backend_local_model():
    """Test Node.js backend with local model"""
    print("🧪 Testing Backend (Local Model)...")
    
    test_data = {
        "traffic": [800, 900, 1100, 1300, 950, 1050, 1200, 1150],
        "ip": "192.168.1.200",
        "packet_data": {
            "packet_rate": 1800,
            "avg_packet_size": 256
        },
        "network_slice": "eMBB",
        "model_type": "local"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/detect", json=test_data, timeout=15)
        print(f"✅ Local Model: {response.status_code}")
        result = response.json()
        print(f"   Prediction: {result.get('prediction')}")
        print(f"   AbuseIPDB Score: {result.get('abuseScore')}")
        print(f"   Message: {result.get('message')}")
        print()
    except Exception as e:
        print(f"❌ Local Model: {e}")

def test_backend_api_model():
    """Test Node.js backend with API model"""
    print("🧪 Testing Backend (API Model)...")
    
    test_data = {
        "traffic": [400, 500, 600, 1400, 800, 900, 1000, 1100],
        "ip": "198.51.100.100",
        "packet_data": {
            "packet_rate": 1200,
            "avg_packet_size": 512
        },
        "network_slice": "URLLC",
        "model_type": "api"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/detect-api", json=test_data, timeout=15)
        print(f"✅ API Model: {response.status_code}")
        result = response.json()
        print(f"   Prediction: {result.get('prediction')}")
        print(f"   Fallback: {result.get('fallback', False)}")
        print(f"   Message: {result.get('message')}")
        print()
    except Exception as e:
        print(f"❌ API Model: {e}")

def test_error_cases():
    """Test error handling"""
    print("🧪 Testing Error Cases...")
    
    error_tests = [
        {
            "name": "Empty Traffic",
            "data": {"traffic": [], "ip": "192.168.1.1"}
        },
        {
            "name": "Invalid IP",
            "data": {"traffic": [100, 200], "ip": "999.999.999.999"}
        },
        {
            "name": "Missing Data",
            "data": {"ip": "192.168.1.1"}
        }
    ]
    
    for test in error_tests:
        try:
            response = requests.post(f"{BACKEND_URL}/detect", json=test["data"], timeout=10)
            print(f"✅ {test['name']}: {response.status_code} - {response.json().get('error', 'No error')}")
        except Exception as e:
            print(f"❌ {test['name']}: {e}")

def main():
    """Run all tests"""
    print("🚀 Starting 5G DDoS Detection System Tests\n")
    
    # Test Flask server
    test_flask_server()
    
    # Wait a bit between tests
    time.sleep(2)
    
    # Test backend endpoints
    test_backend_local_model()
    test_backend_api_model()
    
    # Test error cases
    test_error_cases()
    
    print("✅ All tests completed!")

if __name__ == "__main__":
    main()
