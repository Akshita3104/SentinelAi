"""
Machine Learning DDoS Detection Engine
Advanced ML models for real-time DDoS detection with multiple model support
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import logging
from datetime import datetime
import os
import json
import pickle
try:
    import xgboost as xgb
except ImportError:
    xgb = None
try:
    import lightgbm as lgb
except ImportError:
    lgb = None
try:
    from tensorflow import keras
except ImportError:
    keras = None

class MLDetectionEngine:
    def __init__(self, model_path='../models/'):
        self.model_path = model_path
        self.models = {}
        self.scaler = None
        self.label_encoder = None
        self.feature_columns = None
        self.isolation_forest = None
        self.logger = logging.getLogger(__name__)
        self.load_enhanced_models()
    
    def load_enhanced_models(self):
        """Load all enhanced pre-trained models"""
        try:
            # Load feature columns
            feature_path = os.path.join(self.model_path, 'feature_columns.pkl')
            if os.path.exists(feature_path):
                with open(feature_path, 'rb') as f:
                    self.feature_columns = pickle.load(f)
                self.logger.info(f"Loaded {len(self.feature_columns)} feature columns")
            
            # Load scaler
            scaler_path = os.path.join(self.model_path, 'scaler_enhanced.pkl')
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
                self.logger.info("Enhanced scaler loaded")
            
            # Load label encoder
            encoder_path = os.path.join(self.model_path, 'label_encoder_enhanced.pkl')
            if os.path.exists(encoder_path):
                self.label_encoder = joblib.load(encoder_path)
                self.logger.info("Label encoder loaded")
            
            # Load all enhanced models
            model_files = {
                'random_forest': 'randomforest_enhanced.pkl',
                'gradient_boosting': 'gradient_boosting_enhanced.pkl',
                'logistic_regression': 'logistic_regression_enhanced.pkl',
                'svm': 'svm_enhanced.pkl',
                'knn': 'knn_enhanced.pkl',
                'xgboost': 'xgboost_enhanced.json',
                'lightgbm': 'lightgbm_enhanced.txt',
                'lstm': 'lstm_model_enhanced.keras'
            }
            
            for model_name, filename in model_files.items():
                model_path = os.path.join(self.model_path, filename)
                if os.path.exists(model_path):
                    try:
                        if model_name == 'xgboost' and xgb:
                            self.models[model_name] = xgb.XGBClassifier()
                            self.models[model_name].load_model(model_path)
                        elif model_name == 'lightgbm' and lgb:
                            self.models[model_name] = lgb.Booster(model_file=model_path)
                        elif model_name == 'lstm' and keras:
                            self.models[model_name] = keras.models.load_model(model_path)
                        else:
                            self.models[model_name] = joblib.load(model_path)
                        self.logger.info(f"Loaded {model_name} model")
                    except Exception as e:
                        self.logger.warning(f"Failed to load {model_name}: {e}")
            
            # Initialize Isolation Forest for anomaly detection
            self.isolation_forest = IsolationForest(
                contamination=0.1,
                random_state=42,
                n_estimators=100
            )
            
            self.logger.info(f"Loaded {len(self.models)} enhanced models")
            
        except Exception as e:
            self.logger.error(f"Error loading enhanced models: {e}")
            self.initialize_fallback_models()
    
    def initialize_fallback_models(self):
        """Initialize fallback models if enhanced models not available"""
        self.logger.info("Initializing fallback models")
        
        # Default feature columns
        self.feature_columns = [
            'duration', 'total_packets', 'total_bytes', 'packets_per_second',
            'bytes_per_second', 'avg_packet_size', 'std_packet_size',
            'min_packet_size', 'max_packet_size', 'avg_iat', 'std_iat',
            'unique_src_ports', 'unique_dst_ports', 'unique_protocols',
            'is_tcp', 'is_udp', 'is_icmp'
        ]
        
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
        self.scaler = StandardScaler()
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        
        # Train fallback Random Forest
        self.models['random_forest'] = RandomForestClassifier(n_estimators=100, random_state=42)
        self.models['random_forest'].fit(X_scaled, y)
        
        # Train Isolation Forest
        normal_indices = y == 0
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
        self.isolation_forest.fit(X_scaled[normal_indices])
        
        self.logger.info("Fallback models initialized")
    
    def preprocess_features(self, flow_features):
        """Preprocess flow features for ML prediction"""
        try:
            # Convert to DataFrame
            if isinstance(flow_features, dict):
                df = pd.DataFrame([flow_features])
            else:
                df = pd.DataFrame(flow_features)
            
            # Use loaded feature columns or fallback
            if self.feature_columns is None:
                self.feature_columns = [
                    'duration', 'total_packets', 'total_bytes', 'packets_per_second',
                    'bytes_per_second', 'avg_packet_size', 'std_packet_size',
                    'min_packet_size', 'max_packet_size', 'avg_iat', 'std_iat',
                    'unique_src_ports', 'unique_dst_ports', 'unique_protocols',
                    'is_tcp', 'is_udp', 'is_icmp'
                ]
            
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
                if col in df.columns:
                    df[col] = df[col].astype(int)
            
            return df.values
            
        except Exception as e:
            self.logger.error(f"Error preprocessing features: {e}")
            return None
    
    def detect_ddos(self, flow_features):
        """Detect DDoS attacks using ensemble of enhanced ML models"""
        try:
            # Ensure models are initialized
            if not self.models:
                self.initialize_fallback_models()
            
            # Preprocess features
            X = self.preprocess_features(flow_features)
            if X is None:
                return self.create_default_response("preprocessing_error")
            
            # Scale features
            try:
                if self.scaler:
                    X_scaled = self.scaler.transform(X)
                else:
                    X_scaled = X
            except Exception:
                self.initialize_fallback_models()
                X_scaled = self.scaler.transform(X)
            
            # Get predictions from all available models
            model_predictions = {}
            prediction_scores = []
            
            for model_name, model in self.models.items():
                try:
                    if model_name == 'lightgbm' and lgb:
                        pred_proba = model.predict(X_scaled)
                        pred = 1 if pred_proba[0] > 0.5 else 0
                        confidence = abs(pred_proba[0] - 0.5) * 2
                    elif model_name == 'lstm' and keras:
                        pred_proba = model.predict(X_scaled, verbose=0)[0][0]
                        pred = 1 if pred_proba > 0.5 else 0
                        confidence = abs(pred_proba - 0.5) * 2
                    else:
                        pred = model.predict(X_scaled)[0]
                        if hasattr(model, 'predict_proba'):
                            proba = model.predict_proba(X_scaled)[0]
                            confidence = max(proba)
                        else:
                            confidence = 0.7  # Default confidence for models without probability
                    
                    prediction = 'ddos' if pred == 1 else 'normal'
                    model_predictions[model_name] = {
                        'prediction': prediction,
                        'confidence': float(confidence)
                    }
                    
                    # Weight predictions for ensemble
                    weight = self.get_model_weight(model_name)
                    if prediction == 'ddos':
                        prediction_scores.append(confidence * weight)
                    else:
                        prediction_scores.append((1 - confidence) * weight * -1)
                        
                except Exception as e:
                    self.logger.warning(f"Error with {model_name}: {e}")
            
            # Isolation Forest anomaly detection
            if_prediction = None
            if_score = 0
            if self.isolation_forest:
                try:
                    if_pred = self.isolation_forest.predict(X_scaled)[0]
                    if_score = self.isolation_forest.decision_function(X_scaled)[0]
                    if_prediction = 'anomaly' if if_pred == -1 else 'normal'
                    model_predictions['isolation_forest'] = {
                        'prediction': if_prediction,
                        'anomaly_score': float(if_score)
                    }
                except Exception as e:
                    self.logger.warning(f"Isolation Forest error: {e}")
            
            # Enhanced ensemble decision
            final_prediction, confidence, threat_level = self.enhanced_ensemble_decision(
                model_predictions, prediction_scores, flow_features
            )
            
            # Generate confidence factors
            confidence_factors = self.generate_confidence_factors(
                model_predictions, flow_features
            )
            
            # Create detailed response
            response = {
                'prediction': final_prediction,
                'confidence': confidence,
                'threat_level': threat_level,
                'confidence_factors': confidence_factors,
                'model_predictions': model_predictions,
                'ensemble_score': float(np.mean(prediction_scores)) if prediction_scores else 0.0,
                'models_used': list(self.models.keys()),
                'flow_analysis': self.analyze_flow_characteristics(flow_features),
                'timestamp': datetime.now().isoformat(),
                'model_version': '3.0.0'
            }
            
            return response
            
        except Exception as e:
            self.logger.error(f"Error in DDoS detection: {e}")
            return self.create_default_response("detection_error")
    
    def get_model_weight(self, model_name):
        """Get weight for each model in ensemble"""
        weights = {
            'random_forest': 0.2,
            'gradient_boosting': 0.18,
            'xgboost': 0.17,
            'lightgbm': 0.15,
            'svm': 0.12,
            'logistic_regression': 0.1,
            'knn': 0.05,
            'lstm': 0.03
        }
        return weights.get(model_name, 0.1)
    
    def enhanced_ensemble_decision(self, model_predictions, prediction_scores, flow_features):
        """Enhanced ensemble decision from multiple models"""
        
        # Calculate weighted ensemble score
        if prediction_scores:
            ensemble_score = np.mean(prediction_scores)
        else:
            ensemble_score = 0
        
        # Count DDoS predictions
        ddos_count = sum(1 for pred in model_predictions.values() 
                        if pred.get('prediction') == 'ddos')
        total_models = len(model_predictions)
        
        # Flow-based heuristics
        flow_threat_score = 0
        if isinstance(flow_features, dict):
            if flow_features.get('packets_per_second', 0) > 1000:
                flow_threat_score += 0.3
            if flow_features.get('bytes_per_second', 0) > 1000000:
                flow_threat_score += 0.3
            if flow_features.get('std_packet_size', 0) > 500:
                flow_threat_score += 0.2
            if flow_features.get('unique_dst_ports', 0) > 10:
                flow_threat_score += 0.2
        
        # Combine scores
        final_score = (ensemble_score + flow_threat_score) / 2
        consensus_ratio = ddos_count / total_models if total_models > 0 else 0
        
        # Decision logic
        if final_score > 0.7 or consensus_ratio > 0.6:
            confidence = min(0.95, max(final_score, consensus_ratio))
            return 'ddos', confidence, 'HIGH'
        elif final_score > 0.4 or consensus_ratio > 0.3:
            confidence = max(final_score, consensus_ratio)
            return 'suspicious', confidence, 'MEDIUM'
        else:
            confidence = 1 - max(final_score, consensus_ratio)
            return 'normal', confidence, 'LOW'
    
    def generate_confidence_factors(self, model_predictions, flow_features):
        """Generate detailed confidence factors"""
        factors = []
        
        # Model-based factors
        for model_name, pred in model_predictions.items():
            if pred.get('prediction') == 'ddos':
                conf = pred.get('confidence', 0)
                factors.append(f"{model_name.replace('_', ' ').title()} detected DDoS with {conf:.2f} confidence")
            elif pred.get('prediction') == 'anomaly':
                score = pred.get('anomaly_score', 0)
                factors.append(f"Anomaly detected by Isolation Forest (score: {score:.3f})")
        
        # Flow-based factors
        if isinstance(flow_features, dict):
            if flow_features.get('packets_per_second', 0) > 1000:
                factors.append(f"High packet rate: {flow_features['packets_per_second']:.1f} pps")
            if flow_features.get('bytes_per_second', 0) > 1000000:
                factors.append(f"High bandwidth: {flow_features['bytes_per_second']/1000000:.1f} MB/s")
            if flow_features.get('unique_dst_ports', 0) > 10:
                factors.append(f"Port scanning detected: {flow_features['unique_dst_ports']} unique ports")
        
        return factors
    
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
            'models_used': list(self.models.keys()) if self.models else [],
            'timestamp': datetime.now().isoformat(),
            'model_version': '3.0.0'
        }
    
    def get_model_info(self):
        """Get information about loaded models"""
        return {
            'total_models': len(self.models),
            'available_models': list(self.models.keys()),
            'feature_count': len(self.feature_columns) if self.feature_columns else 0,
            'scaler_loaded': self.scaler is not None,
            'isolation_forest_loaded': self.isolation_forest is not None
        }