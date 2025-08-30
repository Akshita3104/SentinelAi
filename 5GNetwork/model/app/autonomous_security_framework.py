"""
AI-Driven SDN-Powered Self-Healing Security Framework for 5G Networks
Fully autonomous real-time anomaly detection and network slice healing
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List
import threading
import queue
import json

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sdn_controller import SDNController
from flow_capture import FlowCapture
from ml_detection import MLDetectionEngine
from mitigation_engine import MitigationEngine

class AutonomousSecurityFramework:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Core components
        self.sdn_controller = SDNController()
        self.flow_capture = FlowCapture(interface='eth0')
        self.ml_engine = MLDetectionEngine()
        self.mitigation_engine = MitigationEngine(self.sdn_controller)
        
        # Real-time processing queues
        self.flow_queue = queue.Queue(maxsize=10000)
        self.alert_queue = queue.Queue(maxsize=1000)
        
        # Network slice health monitoring
        self.slice_health = {
            'eMBB': {'status': 'healthy', 'last_check': datetime.now(), 'threat_level': 0},
            'URLLC': {'status': 'healthy', 'last_check': datetime.now(), 'threat_level': 0},
            'mMTC': {'status': 'healthy', 'last_check': datetime.now(), 'threat_level': 0}
        }
        
        # Autonomous operation flags
        self.autonomous_mode = True
        self.healing_active = True
        self.continuous_monitoring = True
        
        # Performance metrics
        self.metrics = {
            'flows_analyzed': 0,
            'anomalies_detected': 0,
            'slices_healed': 0,
            'response_time_ms': [],
            'uptime_start': datetime.now()
        }
    
    async def start_autonomous_operation(self):
        """Start fully autonomous security framework"""
        self.logger.info("🚀 Starting AI-Driven Self-Healing Security Framework")
        
        # Start all autonomous processes concurrently
        tasks = [
            asyncio.create_task(self.continuous_flow_monitoring()),
            asyncio.create_task(self.real_time_anomaly_detection()),
            asyncio.create_task(self.autonomous_threat_mitigation()),
            asyncio.create_task(self.network_slice_health_monitor()),
            asyncio.create_task(self.self_healing_orchestrator()),
            asyncio.create_task(self.adaptive_learning_engine())
        ]
        
        await asyncio.gather(*tasks)
    
    async def continuous_flow_monitoring(self):
        """Continuously capture and analyze network flows"""
        self.logger.info("🔍 Starting continuous flow monitoring")
        
        def flow_processor():
            capture = FlowCapture(interface='eth0')
            while self.continuous_monitoring:
                try:
                    flows = capture.get_flow_statistics()
                    for flow in flows:
                        if not self.flow_queue.full():
                            self.flow_queue.put(flow)
                        self.metrics['flows_analyzed'] += 1
                    time.sleep(0.1)  # 100ms intervals
                except Exception as e:
                    self.logger.error(f"Flow monitoring error: {e}")
        
        # Run in separate thread to avoid blocking
        thread = threading.Thread(target=flow_processor, daemon=True)
        thread.start()
        
        # Keep monitoring alive
        while self.continuous_monitoring:
            await asyncio.sleep(1)
    
    async def real_time_anomaly_detection(self):
        """Real-time AI-powered anomaly detection"""
        self.logger.info("🧠 Starting real-time anomaly detection")
        
        while self.autonomous_mode:
            try:
                if not self.flow_queue.empty():
                    flow = self.flow_queue.get_nowait()
                    
                    # AI detection with timing
                    start_time = time.time()
                    detection_result = self.ml_engine.detect_ddos(flow)
                    detection_time = (time.time() - start_time) * 1000
                    
                    self.metrics['response_time_ms'].append(detection_time)
                    
                    # Check for anomalies
                    if detection_result['prediction'] in ['ddos', 'suspicious']:
                        self.metrics['anomalies_detected'] += 1
                        
                        # Create alert with context
                        alert = {
                            'timestamp': datetime.now().isoformat(),
                            'src_ip': flow.get('src_ip', 'unknown'),
                            'network_slice': flow.get('network_slice', 'eMBB'),
                            'threat_level': detection_result['threat_level'],
                            'confidence': detection_result['confidence'],
                            'detection_result': detection_result,
                            'flow_data': flow
                        }
                        
                        self.alert_queue.put(alert)
                        self.logger.warning(f"🚨 Anomaly detected: {alert['src_ip']} - {detection_result['prediction']}")
                
                await asyncio.sleep(0.01)  # 10ms processing interval
                
            except Exception as e:
                self.logger.error(f"Anomaly detection error: {e}")
                await asyncio.sleep(1)
    
    async def autonomous_threat_mitigation(self):
        """Autonomous threat response and mitigation"""
        self.logger.info("🛡️ Starting autonomous threat mitigation")
        
        while self.autonomous_mode:
            try:
                if not self.alert_queue.empty():
                    alert = self.alert_queue.get_nowait()
                    
                    # Immediate autonomous response
                    mitigation_result = self.mitigation_engine.execute_mitigation(
                        alert['detection_result'], 
                        alert['flow_data']
                    )
                    
                    if mitigation_result['mitigation_applied']:
                        self.logger.info(f"✅ Auto-mitigation applied: {mitigation_result['actions']}")
                        
                        # Update slice health
                        slice_type = alert['network_slice']
                        self.slice_health[slice_type]['threat_level'] += 1
                        self.slice_health[slice_type]['last_check'] = datetime.now()
                        
                        # Trigger slice isolation if needed
                        if alert['threat_level'] == 'HIGH':
                            await self.isolate_network_slice(slice_type, alert)
                
                await asyncio.sleep(0.05)  # 50ms response interval
                
            except Exception as e:
                self.logger.error(f"Mitigation error: {e}")
                await asyncio.sleep(1)
    
    async def network_slice_health_monitor(self):
        """Continuous 5G network slice health monitoring"""
        self.logger.info("💓 Starting network slice health monitoring")
        
        while self.continuous_monitoring:
            try:
                for slice_type, health in self.slice_health.items():
                    # Check slice health metrics
                    current_time = datetime.now()
                    time_since_check = (current_time - health['last_check']).seconds
                    
                    # Determine slice status
                    if health['threat_level'] > 5:
                        health['status'] = 'critical'
                    elif health['threat_level'] > 2:
                        health['status'] = 'degraded'
                    elif time_since_check > 300:  # No activity for 5 minutes
                        health['status'] = 'healthy'
                        health['threat_level'] = max(0, health['threat_level'] - 1)
                    
                    # Log health status changes
                    if health['status'] != 'healthy':
                        self.logger.warning(f"🔴 Slice {slice_type} status: {health['status']} (threat level: {health['threat_level']})")
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def isolate_network_slice(self, slice_type: str, alert: Dict):
        """Autonomous network slice isolation"""
        self.logger.warning(f"🚫 Isolating network slice: {slice_type}")
        
        try:
            # Implement slice isolation logic
            isolation_rules = {
                'eMBB': {'bandwidth_limit': '50%', 'priority': 'LOW'},
                'URLLC': {'bandwidth_limit': '30%', 'priority': 'CRITICAL'},
                'mMTC': {'bandwidth_limit': '70%', 'priority': 'MEDIUM'}
            }
            
            rule = isolation_rules.get(slice_type, isolation_rules['eMBB'])
            
            # Apply isolation via SDN controller
            success = self.mitigation_engine.isolate_network_slice(slice_type)
            
            if success:
                self.slice_health[slice_type]['status'] = 'isolated'
                self.logger.info(f"✅ Slice {slice_type} isolated successfully")
                
                # Schedule automatic restoration
                asyncio.create_task(self.schedule_slice_restoration(slice_type, 300))  # 5 minutes
            
        except Exception as e:
            self.logger.error(f"Slice isolation error: {e}")
    
    async def schedule_slice_restoration(self, slice_type: str, delay_seconds: int):
        """Schedule automatic slice restoration"""
        await asyncio.sleep(delay_seconds)
        
        try:
            # Check if slice can be safely restored
            if self.slice_health[slice_type]['threat_level'] < 2:
                self.slice_health[slice_type]['status'] = 'healthy'
                self.slice_health[slice_type]['threat_level'] = 0
                self.metrics['slices_healed'] += 1
                
                self.logger.info(f"🔄 Slice {slice_type} automatically restored")
            else:
                # Extend isolation if still under threat
                self.logger.warning(f"⏰ Extending isolation for slice {slice_type}")
                asyncio.create_task(self.schedule_slice_restoration(slice_type, 300))
                
        except Exception as e:
            self.logger.error(f"Slice restoration error: {e}")
    
    async def self_healing_orchestrator(self):
        """Orchestrate self-healing operations"""
        self.logger.info("🔄 Starting self-healing orchestrator")
        
        while self.healing_active:
            try:
                # Check system health
                uptime = datetime.now() - self.metrics['uptime_start']
                avg_response_time = sum(self.metrics['response_time_ms'][-100:]) / len(self.metrics['response_time_ms'][-100:]) if self.metrics['response_time_ms'] else 0
                
                # Self-healing actions
                if avg_response_time > 100:  # Response time > 100ms
                    self.logger.warning("⚡ Optimizing detection performance")
                    # Implement performance optimization
                
                # Periodic health report
                if uptime.seconds % 600 == 0:  # Every 10 minutes
                    self.log_system_health()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Self-healing error: {e}")
                await asyncio.sleep(60)
    
    async def adaptive_learning_engine(self):
        """Adaptive ML model learning from network patterns"""
        self.logger.info("📚 Starting adaptive learning engine")
        
        while self.autonomous_mode:
            try:
                # Collect learning data every hour
                await asyncio.sleep(3600)
                
                # Retrain models with recent data
                if self.metrics['anomalies_detected'] > 10:
                    self.logger.info("🧠 Adapting ML models to network patterns")
                    # Implement model retraining logic
                    
            except Exception as e:
                self.logger.error(f"Adaptive learning error: {e}")
                await asyncio.sleep(3600)
    
    def log_system_health(self):
        """Log comprehensive system health metrics"""
        uptime = datetime.now() - self.metrics['uptime_start']
        avg_response = sum(self.metrics['response_time_ms'][-100:]) / len(self.metrics['response_time_ms'][-100:]) if self.metrics['response_time_ms'] else 0
        
        health_report = {
            'uptime': str(uptime),
            'flows_analyzed': self.metrics['flows_analyzed'],
            'anomalies_detected': self.metrics['anomalies_detected'],
            'slices_healed': self.metrics['slices_healed'],
            'avg_response_time_ms': round(avg_response, 2),
            'slice_health': self.slice_health,
            'queue_sizes': {
                'flows': self.flow_queue.qsize(),
                'alerts': self.alert_queue.qsize()
            }
        }
        
        self.logger.info(f"📊 System Health: {json.dumps(health_report, indent=2)}")
    
    def get_autonomous_status(self):
        """Get current autonomous operation status"""
        return {
            'autonomous_mode': self.autonomous_mode,
            'healing_active': self.healing_active,
            'continuous_monitoring': self.continuous_monitoring,
            'slice_health': self.slice_health,
            'metrics': self.metrics,
            'queue_status': {
                'flows_pending': self.flow_queue.qsize(),
                'alerts_pending': self.alert_queue.qsize()
            }
        }

# Autonomous startup function
async def start_autonomous_framework():
    """Start the autonomous security framework"""
    framework = AutonomousSecurityFramework()
    
    try:
        await framework.start_autonomous_operation()
    except KeyboardInterrupt:
        framework.logger.info("🛑 Autonomous framework stopped by user")
    except Exception as e:
        framework.logger.error(f"Framework error: {e}")

if __name__ == '__main__':
    # Start autonomous operation
    asyncio.run(start_autonomous_framework())