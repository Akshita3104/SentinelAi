from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import numpy as np
import random
from datetime import datetime
import threading
import time
import asyncio
import json

# Import modules
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml_detection import MLDetectionEngine
from mitigation_engine import MitigationEngine
from sdn_controller import SDNController
from flow_capture import FlowCapture
from performance_cache import performance_cache, performance_monitor, cache_result

# Create optimized Flask app
app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'])

# Optimize JSON responses and Flask performance
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
app.config['JSON_SORT_KEYS'] = False
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Configure logging
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('logs/server.log'),
        logging.StreamHandler()
    ]
)

# Initialize components
sdn_controller = SDNController()
ml_engine = MLDetectionEngine()
mitigation_engine = MitigationEngine(sdn_controller)
flow_capture = FlowCapture()

@app.route('/', methods=['GET'])
def index():
    app.logger.info("Received request at '/' route")
    return jsonify({
        'message': 'AI-Driven DDoS Detection ML Model Active',
        'status': 'running',
        'ml_engine': 'loaded',
        'sdn_controller': 'connected',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
@performance_monitor
def predict():
    start_time = time.time()
    try:
        # Ultra-fast JSON parsing with minimal validation
        data = request.get_json(force=True, cache=False)
        
        # Minimal validation for speed
        traffic = data.get("traffic")
        if not traffic or not isinstance(traffic, list):
            return jsonify({"error": "Invalid input, expected 'traffic' array"}), 400

        # Extract additional data
        ip_address = data.get('ip_address', '0.0.0.0')
        packet_data = data.get('packet_data', {})
        network_slice = data.get('network_slice', 'eMBB')
        flow_features_data = data.get('flow_features', {})
        
        # Create flow features from traffic data
        flow_features = {
            'duration': 60,  # Default 1 minute window
            'total_packets': len(traffic),
            'total_bytes': sum(traffic) * packet_data.get('avg_packet_size', 1500),
            'packets_per_second': len(traffic) / 60,
            'bytes_per_second': sum(traffic) * packet_data.get('avg_packet_size', 1500) / 60,
            'avg_packet_size': packet_data.get('avg_packet_size', 1500),
            'std_packet_size': np.std(traffic) if len(traffic) > 1 else 0,
            'min_packet_size': min(traffic) if traffic else 0,
            'max_packet_size': max(traffic) if traffic else 0,
            'avg_iat': 1.0,  # Default inter-arrival time
            'std_iat': 0.1,
            'unique_src_ports': packet_data.get('unique_src_ports', 1),
            'unique_dst_ports': packet_data.get('unique_dst_ports', 1),
            'unique_protocols': packet_data.get('unique_protocols', 1),
            'is_tcp': packet_data.get('protocol', 'TCP') == 'TCP',
            'is_udp': packet_data.get('protocol', 'TCP') == 'UDP',
            'is_icmp': packet_data.get('protocol', 'TCP') == 'ICMP',
            'src_ip': ip_address,
            'network_slice': network_slice
        }
        
        # Use ML detection engine
        detection_result = ml_engine.detect_ddos(flow_features)
        
        # Execute mitigation if threat detected
        mitigation_result = None
        if detection_result['prediction'] in ['ddos', 'suspicious']:
            mitigation_result = mitigation_engine.execute_mitigation(detection_result, flow_features)
        
        # Enhanced response with SDN integration and flow details
        response = {
            'prediction': detection_result['prediction'],
            'confidence': detection_result['confidence'],
            'threat_level': detection_result['threat_level'],
            'ddos_indicators': len([f for f in detection_result.get('confidence_factors', []) if 'detected' in f.lower()]),
            'confidence_factors': detection_result.get('confidence_factors', []),
            'flow_analysis': {
                'flows': flow_features_data.get('flows', [])
            },
            'network_analysis': {
                'max_traffic': max(traffic) if traffic else 0,
                'avg_traffic': sum(traffic) / len(traffic) if traffic else 0,
                'traffic_variance': float(np.var(traffic)) if traffic else 0,
                'bandwidth_utilization_mbps': flow_features['bytes_per_second'] / (1000 * 1000),
                'burst_ratio': max(traffic) / (sum(traffic) / len(traffic)) if traffic and sum(traffic) > 0 else 1,
                'packet_rate': flow_features['packets_per_second']
            },
            'slice_recommendation': {
                'action': 'ISOLATE' if detection_result['prediction'] == 'ddos' else 
                         'MONITOR' if detection_result['prediction'] == 'suspicious' else 'NORMAL',
                'priority': detection_result['threat_level']
            },
            'ip_address': ip_address,
            'network_slice': network_slice,
            'timestamp': detection_result['timestamp'],
            'model_version': detection_result['model_version'],
            'sdn_integration': {
                'mitigation_applied': mitigation_result['mitigation_applied'] if mitigation_result else False,
                'mitigation_actions': mitigation_result['actions'] if mitigation_result else [],
                'flow_rules_installed': mitigation_result['mitigation_applied'] if mitigation_result else False
            },
            'ml_analysis': detection_result.get('model_predictions', {}),
            'flow_analysis': detection_result.get('flow_analysis', {})
        }
        
        app.logger.info(f"Enhanced ML Prediction - IP: {ip_address}, Result: {detection_result['prediction']} ({detection_result['confidence']:.2f})")
        if mitigation_result and mitigation_result['mitigation_applied']:
            app.logger.info(f"Mitigation applied: {mitigation_result['actions']}")
            
        return jsonify(response), 200

    except Exception as e:
        app.logger.error(f"Error in /predict: {str(e)}", exc_info=True)
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/flow-stats', methods=['GET'])
def get_flow_stats():
    """Get real-time flow statistics"""
    try:
        flow_stats = flow_capture.get_flow_statistics()
        return jsonify({
            'active_flows': len(flow_stats),
            'flows': flow_stats[:10],  # Return top 10 flows
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        app.logger.error(f"Error getting flow stats: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/mitigation-stats', methods=['GET'])
def get_mitigation_stats():
    """Get mitigation statistics"""
    try:
        stats = mitigation_engine.get_mitigation_statistics()
        active_mitigations = mitigation_engine.get_active_mitigations()
        
        return jsonify({
            'statistics': stats,
            'active_mitigations': active_mitigations,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        app.logger.error(f"Error getting mitigation stats: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/sdn-status', methods=['GET'])
def get_sdn_status():
    """Get SDN controller status"""
    try:
        flow_stats = sdn_controller.get_flow_stats()
        return jsonify({
            'controller_status': 'connected' if flow_stats else 'disconnected',
            'flow_count': len(flow_stats) if isinstance(flow_stats, list) else 0,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        app.logger.error(f"Error getting SDN status: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'ml_engine': 'loaded',
        'timestamp': datetime.now().isoformat(),
        'version': '3.0.0'
    }), 200

@app.route('/models', methods=['GET'])
def get_model_info():
    """Get information about loaded ML models"""
    try:
        model_info = ml_engine.get_model_info()
        return jsonify({
            'model_info': model_info,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        app.logger.error(f"Error getting model info: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.logger.info("🚀 Starting AI-Driven DDoS Detection ML Model")
    app.logger.info("ML Engine initialized successfully")
    app.logger.info("Starting Flask API server on port 5001")
    app.run(host='127.0.0.1', port=5001, debug=False)
    app.logger.info("Flask server has stopped")