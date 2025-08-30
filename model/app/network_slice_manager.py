"""
5G Network Slice Manager
Autonomous slice isolation, healing, and dynamic service restoration
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List
import json

class NetworkSliceManager:
    def __init__(self, sdn_controller):
        self.sdn_controller = sdn_controller
        self.logger = logging.getLogger(__name__)
        
        # 5G Network Slice Definitions
        self.slices = {
            'eMBB': {
                'name': 'Enhanced Mobile Broadband',
                'bandwidth': '1Gbps',
                'latency': '20ms',
                'reliability': '99.9%',
                'priority': 3,
                'current_status': 'active',
                'threat_level': 0,
                'isolated_ips': set(),
                'traffic_patterns': []
            },
            'URLLC': {
                'name': 'Ultra-Reliable Low Latency Communications',
                'bandwidth': '100Mbps',
                'latency': '1ms',
                'reliability': '99.999%',
                'priority': 1,
                'current_status': 'active',
                'threat_level': 0,
                'isolated_ips': set(),
                'traffic_patterns': []
            },
            'mMTC': {
                'name': 'Massive Machine Type Communications',
                'bandwidth': '10Mbps',
                'latency': '100ms',
                'reliability': '99%',
                'priority': 2,
                'current_status': 'active',
                'threat_level': 0,
                'isolated_ips': set(),
                'traffic_patterns': []
            }
        }
        
        # Healing policies
        self.healing_policies = {
            'isolation_threshold': 3,
            'restoration_delay': 300,  # 5 minutes
            'max_isolation_time': 1800,  # 30 minutes
            'threat_decay_rate': 0.1
        }
    
    async def autonomous_slice_monitoring(self):
        """Continuously monitor all network slices"""
        self.logger.info("🔍 Starting autonomous slice monitoring")
        
        while True:
            try:
                for slice_id, slice_info in self.slices.items():
                    await self.monitor_slice_health(slice_id)
                    await self.check_slice_restoration(slice_id)
                
                await asyncio.sleep(10)  # Monitor every 10 seconds
                
            except Exception as e:
                self.logger.error(f"Slice monitoring error: {e}")
                await asyncio.sleep(30)
    
    async def monitor_slice_health(self, slice_id: str):
        """Monitor individual slice health and performance"""
        slice_info = self.slices[slice_id]
        
        # Simulate real-time slice metrics (replace with actual SDN queries)
        current_metrics = {
            'active_flows': len(slice_info['traffic_patterns']),
            'bandwidth_usage': f"{slice_info['threat_level'] * 10}%",
            'latency': slice_info['latency'],
            'packet_loss': f"{slice_info['threat_level'] * 0.1}%"
        }
        
        # Update slice status based on threat level
        if slice_info['threat_level'] >= self.healing_policies['isolation_threshold']:
            if slice_info['current_status'] != 'isolated':
                await self.isolate_slice(slice_id, "High threat level detected")
        
        # Decay threat level over time
        if slice_info['threat_level'] > 0:
            slice_info['threat_level'] = max(0, slice_info['threat_level'] - self.healing_policies['threat_decay_rate'])
    
    async def isolate_slice(self, slice_id: str, reason: str):
        """Autonomously isolate compromised network slice"""
        slice_info = self.slices[slice_id]
        
        self.logger.warning(f"🚫 ISOLATING SLICE {slice_id}: {reason}")
        
        try:
            # Install isolation flow rules via SDN controller
            isolation_rules = self.generate_isolation_rules(slice_id)
            
            for rule in isolation_rules:
                success = self.sdn_controller.install_flow_rule(1, rule)
                if not success:
                    self.logger.error(f"Failed to install isolation rule for {slice_id}")
            
            # Update slice status
            slice_info['current_status'] = 'isolated'
            slice_info['isolation_time'] = datetime.now()
            
            # Log isolation event
            isolation_event = {
                'timestamp': datetime.now().isoformat(),
                'slice_id': slice_id,
                'action': 'ISOLATED',
                'reason': reason,
                'threat_level': slice_info['threat_level'],
                'isolated_ips': list(slice_info['isolated_ips'])
            }
            
            self.logger.info(f"✅ Slice {slice_id} isolated successfully: {json.dumps(isolation_event)}")
            
            # Schedule automatic restoration check
            asyncio.create_task(self.schedule_restoration_check(slice_id))
            
        except Exception as e:
            self.logger.error(f"Slice isolation failed for {slice_id}: {e}")
    
    async def restore_slice(self, slice_id: str):
        """Autonomously restore network slice to normal operation"""
        slice_info = self.slices[slice_id]
        
        self.logger.info(f"🔄 RESTORING SLICE {slice_id}")
        
        try:
            # Remove isolation flow rules
            restoration_rules = self.generate_restoration_rules(slice_id)
            
            for rule in restoration_rules:
                success = self.sdn_controller.install_flow_rule(1, rule)
                if not success:
                    self.logger.error(f"Failed to install restoration rule for {slice_id}")
            
            # Update slice status
            slice_info['current_status'] = 'active'
            slice_info['threat_level'] = 0
            slice_info['isolated_ips'].clear()
            
            # Log restoration event
            restoration_event = {
                'timestamp': datetime.now().isoformat(),
                'slice_id': slice_id,
                'action': 'RESTORED',
                'isolation_duration': str(datetime.now() - slice_info.get('isolation_time', datetime.now()))
            }
            
            self.logger.info(f"✅ Slice {slice_id} restored successfully: {json.dumps(restoration_event)}")
            
        except Exception as e:
            self.logger.error(f"Slice restoration failed for {slice_id}: {e}")
    
    async def schedule_restoration_check(self, slice_id: str):
        """Schedule automatic restoration check"""
        await asyncio.sleep(self.healing_policies['restoration_delay'])
        
        slice_info = self.slices[slice_id]
        
        # Check if slice can be safely restored
        if (slice_info['current_status'] == 'isolated' and 
            slice_info['threat_level'] < 1):
            
            await self.restore_slice(slice_id)
        else:
            # Check for maximum isolation time
            isolation_time = slice_info.get('isolation_time', datetime.now())
            if (datetime.now() - isolation_time).seconds > self.healing_policies['max_isolation_time']:
                self.logger.warning(f"⏰ Force restoring {slice_id} after maximum isolation time")
                await self.restore_slice(slice_id)
            else:
                # Schedule another check
                asyncio.create_task(self.schedule_restoration_check(slice_id))
    
    async def check_slice_restoration(self, slice_id: str):
        """Continuously check if isolated slice can be restored"""
        slice_info = self.slices[slice_id]
        
        if slice_info['current_status'] == 'isolated':
            # Check restoration conditions
            if slice_info['threat_level'] < 1:
                isolation_time = slice_info.get('isolation_time', datetime.now())
                if (datetime.now() - isolation_time).seconds >= self.healing_policies['restoration_delay']:
                    await self.restore_slice(slice_id)
    
    def generate_isolation_rules(self, slice_id: str) -> List[Dict]:
        """Generate SDN flow rules for slice isolation"""
        slice_info = self.slices[slice_id]
        
        # Map slice to VLAN or specific network parameters
        slice_vlan_map = {'eMBB': 100, 'URLLC': 200, 'mMTC': 300}
        vlan_id = slice_vlan_map.get(slice_id, 100)
        
        isolation_rules = [
            {
                'dpid': 1,
                'priority': 30000,
                'match': {'dl_vlan': vlan_id},
                'actions': [
                    {'type': 'SET_FIELD', 'field': 'vlan_pcp', 'value': 0},  # Lower priority
                    {'type': 'OUTPUT', 'port': 'CONTROLLER'}  # Send to controller for inspection
                ]
            },
            {
                'dpid': 1,
                'priority': 25000,
                'match': {'dl_vlan': vlan_id, 'nw_proto': 6},  # TCP traffic
                'actions': [
                    {'type': 'METER', 'meter_id': slice_vlan_map[slice_id]},  # Rate limit
                    {'type': 'OUTPUT', 'port': 'NORMAL'}
                ]
            }
        ]
        
        return isolation_rules
    
    def generate_restoration_rules(self, slice_id: str) -> List[Dict]:
        """Generate SDN flow rules for slice restoration"""
        slice_vlan_map = {'eMBB': 100, 'URLLC': 200, 'mMTC': 300}
        vlan_id = slice_vlan_map.get(slice_id, 100)
        
        restoration_rules = [
            {
                'dpid': 1,
                'priority': 1000,  # Normal priority
                'match': {'dl_vlan': vlan_id},
                'actions': [
                    {'type': 'OUTPUT', 'port': 'NORMAL'}
                ]
            }
        ]
        
        return restoration_rules
    
    async def handle_threat_in_slice(self, slice_id: str, threat_info: Dict):
        """Handle detected threat in specific network slice"""
        slice_info = self.slices[slice_id]
        
        # Increase threat level
        slice_info['threat_level'] += threat_info.get('severity', 1)
        
        # Add malicious IP to isolation list
        if 'src_ip' in threat_info:
            slice_info['isolated_ips'].add(threat_info['src_ip'])
        
        # Record traffic pattern
        slice_info['traffic_patterns'].append({
            'timestamp': datetime.now().isoformat(),
            'threat_type': threat_info.get('threat_type', 'unknown'),
            'confidence': threat_info.get('confidence', 0),
            'src_ip': threat_info.get('src_ip', 'unknown')
        })
        
        self.logger.warning(f"🚨 Threat handled in slice {slice_id}: threat_level={slice_info['threat_level']}")
        
        # Trigger immediate isolation if threshold exceeded
        if slice_info['threat_level'] >= self.healing_policies['isolation_threshold']:
            await self.isolate_slice(slice_id, f"Threat threshold exceeded: {slice_info['threat_level']}")
    
    def get_slice_status(self) -> Dict:
        """Get current status of all network slices"""
        status = {}
        
        for slice_id, slice_info in self.slices.items():
            status[slice_id] = {
                'name': slice_info['name'],
                'status': slice_info['current_status'],
                'threat_level': slice_info['threat_level'],
                'isolated_ips_count': len(slice_info['isolated_ips']),
                'recent_threats': len([p for p in slice_info['traffic_patterns'] 
                                    if (datetime.now() - datetime.fromisoformat(p['timestamp'])).seconds < 300])
            }
        
        return status
    
    async def dynamic_service_restoration(self):
        """Dynamically restore services based on network conditions"""
        self.logger.info("🔄 Starting dynamic service restoration")
        
        while True:
            try:
                for slice_id, slice_info in self.slices.items():
                    if slice_info['current_status'] == 'isolated':
                        # Check if services can be partially restored
                        if slice_info['threat_level'] < 2:
                            await self.partial_service_restoration(slice_id)
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Service restoration error: {e}")
                await asyncio.sleep(60)
    
    async def partial_service_restoration(self, slice_id: str):
        """Partially restore services in isolated slice"""
        slice_info = self.slices[slice_id]
        
        self.logger.info(f"🔄 Partial restoration for slice {slice_id}")
        
        # Allow limited traffic for critical services
        partial_rules = [
            {
                'dpid': 1,
                'priority': 20000,
                'match': {'dl_vlan': {'eMBB': 100, 'URLLC': 200, 'mMTC': 300}[slice_id], 'nw_proto': 6, 'tp_dst': 443},  # HTTPS
                'actions': [{'type': 'OUTPUT', 'port': 'NORMAL'}]
            }
        ]
        
        for rule in partial_rules:
            self.sdn_controller.install_flow_rule(1, rule)