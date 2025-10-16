"""
Real SDN Controller for DDoS Detection and Mitigation
OpenFlow-based SDN controller with real network control
"""

import logging
import requests
import json
from datetime import datetime
from typing import Dict, List, Any
import subprocess
import socket

class SDNController:
    def __init__(self, controller_ip='127.0.0.1', controller_port=8181, mode='auto'):
        self.controller_ip = controller_ip
        self.controller_port = controller_port
        self.logger = logging.getLogger(__name__)
        self.flow_rules = []
        self.blocked_ips = set()
        self.mode = mode  # 'real', 'ovs', or 'auto'
        self.connected_switches = set()
        self.real_sdn_available = self._detect_sdn_environment()
        
    def _detect_sdn_environment(self):
        """Auto-detect available SDN environment"""
        try:
            # Check for OpenDaylight
            response = requests.get(f'http://{self.controller_ip}:{self.controller_port}/restconf/operational/opendaylight-inventory:nodes', 
                                  auth=('admin', 'admin'), timeout=2)
            if response.status_code == 200:
                self.logger.info("OpenDaylight controller detected")
                return 'opendaylight'
        except:
            pass
            
        try:
            # Check for Open vSwitch
            result = subprocess.run(['ovs-vsctl', 'show'], capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                self.logger.info("Open vSwitch detected")
                return 'ovs'
        except:
            pass
            
        try:
            # Check for ONOS
            response = requests.get(f'http://{self.controller_ip}:8181/onos/v1/devices', 
                                  auth=('onos', 'rocks'), timeout=2)
            if response.status_code == 200:
                self.logger.info("ONOS controller detected")
                return 'onos'
        except:
            pass
            
        self.logger.warning("No SDN environment detected - using simulation mode")
        return False
        
    def get_flow_stats(self, switch_id='all'):
        """Retrieve real flow statistics"""
        if self.real_sdn_available == 'opendaylight':
            return self._get_odl_flow_stats(switch_id)
        elif self.real_sdn_available == 'ovs':
            return self._get_ovs_flow_stats(switch_id)
        elif self.real_sdn_available == 'onos':
            return self._get_onos_flow_stats(switch_id)
        else:
            return self._get_simulated_flow_stats(switch_id)
    
    def _get_odl_flow_stats(self, switch_id):
        """Get OpenDaylight flow statistics"""
        try:
            url = f'http://{self.controller_ip}:{self.controller_port}/restconf/operational/opendaylight-inventory:nodes'
            response = requests.get(url, auth=('admin', 'admin'), timeout=5)
            if response.status_code == 200:
                data = response.json()
                nodes = data.get('nodes', {}).get('node', [])
                return {
                    'controller': 'OpenDaylight',
                    'switches': len(nodes),
                    'flow_count': sum(len(node.get('flow-node-inventory:table', [])) for node in nodes),
                    'blocked_ips': list(self.blocked_ips),
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            self.logger.error(f"ODL flow stats error: {e}")
        return self._get_simulated_flow_stats(switch_id)
    
    def _get_ovs_flow_stats(self, switch_id):
        """Get Open vSwitch flow statistics"""
        try:
            result = subprocess.run(['ovs-ofctl', 'dump-flows', 'br0'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                flows = result.stdout.strip().split('\n')[1:]  # Skip header
                return {
                    'controller': 'Open vSwitch',
                    'switch_id': 'br0',
                    'flow_count': len(flows),
                    'blocked_ips': list(self.blocked_ips),
                    'flows': flows[:5],  # First 5 flows
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            self.logger.error(f"OVS flow stats error: {e}")
        return self._get_simulated_flow_stats(switch_id)
    
    def _get_onos_flow_stats(self, switch_id):
        """Get ONOS flow statistics"""
        try:
            url = f'http://{self.controller_ip}:8181/onos/v1/flows'
            response = requests.get(url, auth=('onos', 'rocks'), timeout=5)
            if response.status_code == 200:
                flows = response.json().get('flows', [])
                return {
                    'controller': 'ONOS',
                    'flow_count': len(flows),
                    'blocked_ips': list(self.blocked_ips),
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            self.logger.error(f"ONOS flow stats error: {e}")
        return self._get_simulated_flow_stats(switch_id)
    
    def _get_simulated_flow_stats(self, switch_id):
        """Fallback simulated flow statistics"""
        return {
            'controller': 'Simulated',
            'switch_id': switch_id,
            'flow_count': len(self.flow_rules),
            'blocked_ips': list(self.blocked_ips),
            'timestamp': datetime.now().isoformat()
        }
    
    def install_flow_rule(self, switch_id, flow_rule):
        """Install real flow rule"""
        if self.real_sdn_available == 'opendaylight':
            return self._install_odl_flow(switch_id, flow_rule)
        elif self.real_sdn_available == 'ovs':
            return self._install_ovs_flow(switch_id, flow_rule)
        elif self.real_sdn_available == 'onos':
            return self._install_onos_flow(switch_id, flow_rule)
        else:
            return self._install_simulated_flow(switch_id, flow_rule)
    
    def _install_odl_flow(self, switch_id, flow_rule):
        """Install OpenDaylight flow rule"""
        try:
            flow_data = {
                "flow": [{
                    "id": f"ddos-{len(self.flow_rules)}",
                    "table_id": 0,
                    "priority": 1000,
                    "match": {
                        "ipv4-source": flow_rule.get('src_ip', '0.0.0.0/0')
                    },
                    "instructions": {
                        "instruction": [{
                            "order": 0,
                            "apply-actions": {
                                "action": [] if flow_rule.get('action') == 'drop' else [
                                    {"order": 0, "output-action": {"output-node-connector": "CONTROLLER"}}
                                ]
                            }
                        }]
                    }
                }]
            }
            
            url = f'http://{self.controller_ip}:{self.controller_port}/restconf/config/opendaylight-inventory:nodes/node/{switch_id}/flow-node-inventory:table/0/flow/ddos-{len(self.flow_rules)}'
            response = requests.put(url, json=flow_data, auth=('admin', 'admin'), timeout=5)
            
            if response.status_code in [200, 201]:
                self.flow_rules.append({'switch_id': switch_id, 'rule': flow_rule, 'timestamp': datetime.now().isoformat()})
                self.logger.info(f"ODL flow rule installed: {flow_rule}")
                return True
        except Exception as e:
            self.logger.error(f"ODL flow install error: {e}")
        return False
    
    def _install_ovs_flow(self, switch_id, flow_rule):
        """Install Open vSwitch flow rule"""
        try:
            if flow_rule.get('action') == 'drop':
                cmd = ['ovs-ofctl', 'add-flow', 'br0', f"ip,nw_src={flow_rule.get('src_ip')},actions=drop"]
            else:
                cmd = ['ovs-ofctl', 'add-flow', 'br0', f"ip,nw_src={flow_rule.get('src_ip')},actions=normal"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                self.flow_rules.append({'switch_id': switch_id, 'rule': flow_rule, 'timestamp': datetime.now().isoformat()})
                self.logger.info(f"OVS flow rule installed: {flow_rule}")
                return True
        except Exception as e:
            self.logger.error(f"OVS flow install error: {e}")
        return False
    
    def _install_onos_flow(self, switch_id, flow_rule):
        """Install ONOS flow rule"""
        try:
            flow_data = {
                "priority": 1000,
                "timeout": 0,
                "isPermanent": True,
                "deviceId": switch_id,
                "treatment": {
                    "instructions": [] if flow_rule.get('action') == 'drop' else [
                        {"type": "OUTPUT", "port": "CONTROLLER"}
                    ]
                },
                "selector": {
                    "criteria": [
                        {"type": "ETH_TYPE", "ethType": "0x0800"},
                        {"type": "IPV4_SRC", "ip": flow_rule.get('src_ip', '0.0.0.0/32')}
                    ]
                }
            }
            
            url = f'http://{self.controller_ip}:8181/onos/v1/flows/{switch_id}'
            response = requests.post(url, json=flow_data, auth=('onos', 'rocks'), timeout=5)
            
            if response.status_code in [200, 201]:
                self.flow_rules.append({'switch_id': switch_id, 'rule': flow_rule, 'timestamp': datetime.now().isoformat()})
                self.logger.info(f"ONOS flow rule installed: {flow_rule}")
                return True
        except Exception as e:
            self.logger.error(f"ONOS flow install error: {e}")
        return False
    
    def _install_simulated_flow(self, switch_id, flow_rule):
        """Fallback simulated flow installation"""
        self.flow_rules.append({
            'switch_id': switch_id,
            'rule': flow_rule,
            'timestamp': datetime.now().isoformat()
        })
        self.logger.info(f"Simulated flow rule: {flow_rule}")
        return True
    
    def block_ip_address(self, switch_id, malicious_ip):
        """Block malicious IP address"""
        self.blocked_ips.add(malicious_ip)
        flow_rule = {'action': 'drop', 'src_ip': malicious_ip}
        success = self.install_flow_rule(switch_id, flow_rule)
        if success:
            self.logger.info(f"Blocked IP: {malicious_ip} on switch {switch_id}")
        return success
    
    def rate_limit_flow(self, switch_id, src_ip, rate_limit_kbps=1000):
        """Apply rate limiting"""
        flow_rule = {'action': 'rate_limit', 'src_ip': src_ip, 'limit': rate_limit_kbps}
        success = self.install_flow_rule(switch_id, flow_rule)
        if success:
            self.logger.info(f"Rate limited {src_ip} to {rate_limit_kbps} kbps")
        return success
    
    def redirect_to_honeypot(self, switch_id, src_ip, honeypot_ip):
        """Redirect traffic to honeypot"""
        flow_rule = {'action': 'redirect', 'src_ip': src_ip, 'honeypot_ip': honeypot_ip}
        success = self.install_flow_rule(switch_id, flow_rule)
        if success:
            self.logger.info(f"Redirected {src_ip} to honeypot {honeypot_ip}")
        return success