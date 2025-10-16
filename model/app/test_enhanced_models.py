"""
Test script for enhanced ML models
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ml_detection import MLDetectionEngine
import json

def test_enhanced_models():
    print("🧪 Testing Enhanced ML Models")
    print("=" * 50)
    
    # Initialize ML engine
    ml_engine = MLDetectionEngine()
    
    # Get model info
    model_info = ml_engine.get_model_info()
    print(f"📊 Total Models Loaded: {model_info['total_models']}")
    print(f"🔧 Available Models: {', '.join(model_info['available_models'])}")
    print(f"📈 Feature Count: {model_info['feature_count']}")
    print(f"⚖️ Scaler Loaded: {model_info['scaler_loaded']}")
    print(f"🔍 Isolation Forest: {model_info['isolation_forest_loaded']}")
    print()
    
    # Test with normal traffic
    print("🟢 Testing Normal Traffic:")
    normal_features = {
        'duration': 60,
        'total_packets': 100,
        'total_bytes': 150000,
        'packets_per_second': 1.67,
        'bytes_per_second': 2500,
        'avg_packet_size': 1500,
        'std_packet_size': 200,
        'min_packet_size': 64,
        'max_packet_size': 1518,
        'avg_iat': 0.1,
        'std_iat': 0.05,
        'unique_src_ports': 1,
        'unique_dst_ports': 1,
        'unique_protocols': 1,
        'is_tcp': 1,
        'is_udp': 0,
        'is_icmp': 0
    }
    
    result = ml_engine.detect_ddos(normal_features)
    print(f"   Prediction: {result['prediction']}")
    print(f"   Confidence: {result['confidence']:.3f}")
    print(f"   Threat Level: {result['threat_level']}")
    print(f"   Models Used: {len(result['models_used'])}")
    print()
    
    # Test with suspicious traffic
    print("🟡 Testing Suspicious Traffic:")
    suspicious_features = {
        'duration': 30,
        'total_packets': 2000,
        'total_bytes': 3000000,
        'packets_per_second': 66.67,
        'bytes_per_second': 100000,
        'avg_packet_size': 1500,
        'std_packet_size': 300,
        'min_packet_size': 64,
        'max_packet_size': 1518,
        'avg_iat': 0.015,
        'std_iat': 0.01,
        'unique_src_ports': 5,
        'unique_dst_ports': 15,
        'unique_protocols': 2,
        'is_tcp': 1,
        'is_udp': 1,
        'is_icmp': 0
    }
    
    result = ml_engine.detect_ddos(suspicious_features)
    print(f"   Prediction: {result['prediction']}")
    print(f"   Confidence: {result['confidence']:.3f}")
    print(f"   Threat Level: {result['threat_level']}")
    print(f"   Confidence Factors: {len(result['confidence_factors'])}")
    print()
    
    # Test with DDoS traffic
    print("🔴 Testing DDoS Traffic:")
    ddos_features = {
        'duration': 10,
        'total_packets': 10000,
        'total_bytes': 15000000,
        'packets_per_second': 1000,
        'bytes_per_second': 1500000,
        'avg_packet_size': 1500,
        'std_packet_size': 0,
        'min_packet_size': 1500,
        'max_packet_size': 1500,
        'avg_iat': 0.001,
        'std_iat': 0,
        'unique_src_ports': 1,
        'unique_dst_ports': 50,
        'unique_protocols': 1,
        'is_tcp': 1,
        'is_udp': 0,
        'is_icmp': 0
    }
    
    result = ml_engine.detect_ddos(ddos_features)
    print(f"   Prediction: {result['prediction']}")
    print(f"   Confidence: {result['confidence']:.3f}")
    print(f"   Threat Level: {result['threat_level']}")
    print(f"   Ensemble Score: {result['ensemble_score']:.3f}")
    print(f"   Confidence Factors:")
    for factor in result['confidence_factors']:
        print(f"     - {factor}")
    print()
    
    # Show model predictions breakdown
    if result['model_predictions']:
        print("🤖 Individual Model Predictions:")
        for model_name, pred in result['model_predictions'].items():
            if 'confidence' in pred:
                print(f"   {model_name}: {pred['prediction']} ({pred['confidence']:.3f})")
            else:
                print(f"   {model_name}: {pred['prediction']}")
    
    print("\n✅ Enhanced ML Models Test Complete!")

if __name__ == "__main__":
    test_enhanced_models()