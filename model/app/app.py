from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import numpy as np
import random
from datetime import datetime
import threading
import time
import asyncio

# Import autonomous framework
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from autonomous_security_framework import AutonomousSecurityFramework
from network_slice_manager import NetworkSliceManager
from sdn_controller import SDNController

# Create a Flask application instance
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(filename='logs/server.log', level=logging.DEBUG,
                    format='%(asctime)s %(levelname)s: %(message)s')

# Initialize autonomous framework
autonomous_framework = AutonomousSecurityFramework()
slice_manager = NetworkSliceManager(autonomous_framework.sdn_controller)

# Start autonomous operation
autonomous_thread = None

@app.route('/', methods=['GET'])
def index():
    app.logger.info("Received request at '/' route")
    status = autonomous_framework.get_autonomous_status()
    return jsonify({
        'message': 'AI-Driven Self-Healing Security Framework Active',
        'autonomous_status': status,
        'slice_status': slice_manager.get_slice_status(),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON input
        data = request.get_json(force=True)
        app.logger.debug(f"Received request data: {data}")

        # Validate input
        if not data or "traffic" not in data:
            app.logger.error("Invalid input: 'traffic' field missing")
            return jsonify({"error": "Invalid input, expected 'traffic' array"}), 400

        traffic = data["traffic"]
        if not isinstance(traffic, list) or not all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in traffic):
            app.logger.error(f"Invalid traffic data: {traffic}, must be an array of numbers")
            return jsonify({"error": "Invalid traffic data: must be an array of numbers"}), 400

        # Extract additional data
        ip_address = data.get('ip_address', '0.0.0.0')
        packet_data = data.get('packet_data', {})
        network_slice = data.get('network_slice', 'eMBB')
        
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
        
        # Enhanced response with SDN integration
        response = {
            'prediction': detection_result['prediction'],
            'confidence': detection_result['confidence'],
            'threat_level': detection_result['threat_level'],
            'ddos_indicators': len([f for f in detection_result.get('confidence_factors', []) if 'detected' in f.lower()]),
            'confidence_factors': detection_result.get('confidence_factors', []),
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

def start_autonomous_framework():
    """Start autonomous security framework"""
    global autonomous_thread
    
    def run_autonomous():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Start all autonomous processes
        tasks = [
            autonomous_framework.start_autonomous_operation(),
            slice_manager.autonomous_slice_monitoring(),
            slice_manager.dynamic_service_restoration()
        ]
        
        loop.run_until_complete(asyncio.gather(*tasks))
    
    if not autonomous_thread or not autonomous_thread.is_alive():
        autonomous_thread = threading.Thread(target=run_autonomous, daemon=True)
        autonomous_thread.start()
        app.logger.info("🚀 Autonomous Security Framework started")

if __name__ == '__main__':
    app.logger.info("🚀 Starting AI-Driven Self-Healing Security Framework")
    
    # Start autonomous framework
    start_autonomous_framework()
    
    app.logger.info("Starting Flask API server on port 5001")
    app.run(host='127.0.0.1', port=5001, debug=False)
    app.logger.info("Flask server has stopped")