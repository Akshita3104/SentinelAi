"""
Machine Learning DDoS Detection Engine
Advanced ML models for real-time DDoS detection
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import logging
from datetime import datetime
import os

class MLDetectionEngine:
    def __init__(self, model_path='models/'):
        self.model_path = model_path
        self.rf_model = None
        self.isolation_forest = None
        self.scaler = StandardScaler()
        self.feature_columns = [
            'duration', 'total_packets', 'total_bytes', 'packets_per_second',
            'bytes_per_second', 'avg_packet_size', 'std_packet_size',
            'min_packet_size', 'max_packet_size', 'avg_iat', 'std_iat',
            'unique_src_ports', 'unique_dst_ports', 'unique_protocols',
            'is_tcp', 'is_udp', 'is_icmp'
        ]
        self.logger = logging.getLogger(__name__)
        self.load_models()
    
    def load_models(self):
        """Load pre-trained models"""
        try:
            rf_path = os.path.join(self.model_path, 'random_forest_model.pkl')
            scaler_path = os.path.join(self.model_path, 'scaler.pkl')
            
            if os.path.exists(rf_path):
                self.rf_model = joblib.load(rf_path)
                self.logger.info("Random Forest model loaded successfully")
            
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
                self.logger.info("Scaler loaded successfully")
            
            # Initialize Isolation Forest for anomaly detection
            self.isolation_forest = IsolationForest(
                contamination=0.1,
                random_state=42,
                n_estimators=100
            )
            
        except Exception as e:
            self.logger.error(f"Error loading models: {e}")
            self.initialize_default_models()
    
    def initialize_default_models(self):
        """Initialize default models if pre-trained models not available"""
        self.logger.info("Initializing default models")
        
        # Create synthetic training data
        np.random.seed(42)
        n_samples = 1000
        
        # Generate realistic network traffic features
        normal_data = np.random.normal([60, 100, 150000, 1.67, 2500, 1500, 200, 64, 1518, 0.1, 0.05, 1, 1, 1, 1, 0, 0], 
                                     [30, 50, 75000, 0.5, 1000, 300, 100, 32, 500, 0.05, 0.02, 0, 0, 0, 0, 0, 0], 
                                     (n_samples//2, len(self.feature_columns)))
        normal_labels = np.zeros(n_samples//2)
        
        # Attack traffic (higher rates, larger packets)
        attack_data = np.random.normal([30, 5000, 7500000, 166.67, 250000, 1500, 0, 1500, 1500, 0.006, 0, 1, 10, 1, 1, 0, 0],
                                     [15, 2000, 3000000, 50, 100000, 0, 0, 0, 0, 0.002, 0, 0, 5, 0, 0, 0, 0],
                                     (n_samples//2, len(self.feature_columns)))
        attack_labels = np.ones(n_samples//2)
        
        # Ensure non-negative values
        normal_data = np.abs(normal_data)
        attack_data = np.abs(attack_data)
        
        X = np.vstack([normal_data, attack_data])
        y = np.hstack([normal_labels, attack_labels])
        
        # Fit scaler and transform data
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        
        # Train Random Forest
        self.rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.rf_model.fit(X_scaled, y)
        
        # Train Isolation Forest
        normal_indices = y == 0
        self.isolation_forest.fit(X_scaled[normal_indices])
        
        self.logger.info("Default models initialized with fitted scaler")
    
    def preprocess_features(self, flow_features):
        """Preprocess flow features for ML prediction"""
        try:
            # Convert to DataFrame
            if isinstance(flow_features, dict):
                df = pd.DataFrame([flow_features])
            else:
                df = pd.DataFrame(flow_features)
            
            # Ensure all required columns exist with defaults
            defaults = {
                'duration': 60, 'total_packets': 100, 'total_bytes': 150000,
                'packets_per_second': 1.67, 'bytes_per_second': 2500, 'avg_packet_size': 1500,
                'std_packet_size': 200, 'min_packet_size': 64, 'max_packet_size': 1518,
                'avg_iat': 0.1, 'std_iat': 0.05, 'unique_src_ports': 1,
                'unique_dst_ports': 1, 'unique_protocols': 1, 'is_tcp': 1, 'is_udp': 0, 'is_icmp': 0
            }
            
            for col in self.feature_columns:
                if col not in df.columns:
                    df[col] = defaults.get(col, 0)
            
            # Select and order features
            df = df[self.feature_columns]
            df = df.fillna(0)
            
            # Convert boolean columns to int
            bool_cols = ['is_tcp', 'is_udp', 'is_icmp']
            for col in bool_cols:
                df[col] = df[col].astype(int)
            
            return df.values
            
        except Exception as e:
            self.logger.error(f"Error preprocessing features: {e}")
            return None
    
    def detect_ddos(self, flow_features):
        """Detect DDoS attacks using ensemble of ML models"""
        try:
            # Ensure models are initialized
            if self.rf_model is None:
                self.initialize_default_models()
            
            # Preprocess features
            X = self.preprocess_features(flow_features)
            if X is None:
                return self.create_default_response("preprocessing_error")
            
            # Scale features (with fallback)
            try:
                X_scaled = self.scaler.transform(X)
            except Exception:
                # If scaler not fitted, reinitialize models
                self.initialize_default_models()
                X_scaled = self.scaler.transform(X)
            
            # Random Forest prediction
            rf_prediction = None
            rf_confidence = 0.5
            if self.rf_model:
                rf_pred = self.rf_model.predict(X_scaled)[0]
                rf_proba = self.rf_model.predict_proba(X_scaled)[0]
                rf_prediction = 'ddos' if rf_pred == 1 else 'normal'
                rf_confidence = max(rf_proba)
            
            # Isolation Forest anomaly detection
            if_prediction = None
            if_score = 0
            if self.isolation_forest:
                if_pred = self.isolation_forest.predict(X_scaled)[0]
                if_score = self.isolation_forest.decision_function(X_scaled)[0]
                if_prediction = 'anomaly' if if_pred == -1 else 'normal'
            
            # Ensemble decision
            final_prediction, confidence, threat_level = self.ensemble_decision(
                rf_prediction, rf_confidence, if_prediction, if_score, flow_features
            )
            
            # Generate confidence factors
            confidence_factors = []
            if rf_prediction == 'ddos':
                confidence_factors.append(f"Random Forest detected DDoS with {rf_confidence:.2f} confidence")
            if if_prediction == 'anomaly':
                confidence_factors.append(f"Isolation Forest detected anomaly (score: {if_score:.3f})")
            
            # Add flow-based indicators
            if isinstance(flow_features, dict):
                if flow_features.get('packets_per_second', 0) > 1000:
                    confidence_factors.append("High packet rate detected")
                if flow_features.get('bytes_per_second', 0) > 1000000:
                    confidence_factors.append("High bandwidth utilization detected")
            
            # Create detailed response
            response = {
                'prediction': final_prediction,
                'confidence': confidence,
                'threat_level': threat_level,
                'confidence_factors': confidence_factors,
                'model_predictions': {
                    'random_forest': {
                        'prediction': rf_prediction,
                        'confidence': rf_confidence
                    },
                    'isolation_forest': {
                        'prediction': if_prediction,
                        'anomaly_score': if_score
                    }
                },
                'flow_analysis': self.analyze_flow_characteristics(flow_features),
                'timestamp': datetime.now().isoformat(),
                'model_version': '2.0.0'
            }
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error in DDoS detection: {e}")
            return self.create_default_response("detection_error")
    
    def ensemble_decision(self, rf_pred, rf_conf, if_pred, if_score, flow_features):
        """Make ensemble decision from multiple models"""
        
        # Calculate threat indicators
        threat_score = 0
        
        # Random Forest contribution
        if rf_pred == 'ddos':
            threat_score += rf_conf * 0.6
        
        # Isolation Forest contribution
        if if_pred == 'anomaly':
            threat_score += abs(if_score) * 0.4
        
        # Flow-based heuristics
        if isinstance(flow_features, dict):
            # High packet rate indicator
            if flow_features.get('packets_per_second', 0) > 1000:
                threat_score += 0.2
            
            # High byte rate indicator
            if flow_features.get('bytes_per_second', 0) > 1000000:  # 1MB/s
                threat_score += 0.2
            
            # Unusual packet size patterns
            if flow_features.get('std_packet_size', 0) > 500:
                threat_score += 0.1
        
        # Determine final prediction
        if threat_score > 0.7:
            return 'ddos', min(0.95, threat_score), 'HIGH'
        elif threat_score > 0.4:
            return 'suspicious', threat_score, 'MEDIUM'
        else:
            return 'normal', 1 - threat_score, 'LOW'
    
    def analyze_flow_characteristics(self, flow_features):
        """Analyze flow characteristics for detailed insights"""
        if not isinstance(flow_features, dict):
            return {}
        
        analysis = {
            'flow_duration': flow_features.get('duration', 0),
            'packet_rate': flow_features.get('packets_per_second', 0),
            'byte_rate': flow_features.get('bytes_per_second', 0),
            'avg_packet_size': flow_features.get('avg_packet_size', 0),
            'protocol_diversity': flow_features.get('unique_protocols', 0),
            'port_scanning_indicator': flow_features.get('unique_dst_ports', 0) > 10,
            'bulk_transfer_indicator': flow_features.get('avg_packet_size', 0) > 1200,
            'flood_indicator': flow_features.get('packets_per_second', 0) > 500
        }
        
        return analysis
    
    def create_default_response(self, error_type):
        """Create default response for error cases"""
        return {
            'prediction': 'unknown',
            'confidence': 0.0,
            'threat_level': 'UNKNOWN',
            'error': error_type,
            'timestamp': datetime.now().isoformat(),
            'model_version': '2.0.0'
        }
    
    def save_models(self):
        """Save trained models"""
        try:
            os.makedirs(self.model_path, exist_ok=True)
            
            if self.rf_model:
                joblib.dump(self.rf_model, os.path.join(self.model_path, 'random_forest_model.pkl'))
            
            joblib.dump(self.scaler, os.path.join(self.model_path, 'scaler.pkl'))
            
            self.logger.info("Models saved successfully")
            
        except Exception as e:
            self.logger.error(f"Error saving models: {e}")