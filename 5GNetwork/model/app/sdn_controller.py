"""
SDN Controller for DDoS Detection and Mitigation
Based on OpenFlow protocol for network flow management
"""

import requests
import json
import logging
from datetime import datetime
from typing import Dict, List, Any

class SDNController:
    def __init__(self, controller_ip='127.0.0.1', controller_port=8080):
        self.controller_ip = controller_ip
        self.controller_port = controller_port
        self.base_url = f"http://{controller_ip}:{controller_port}"
        self.logger = logging.getLogger(__name__)
        
    def get_flow_stats(self, switch_id='all'):
        """Retrieve flow statistics from SDN switches"""
        try:
            url = f"{self.base_url}/stats/flow/{switch_id}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            self.logger.error(f"Failed to get flow stats: {e}")
            return {}
    
    def install_flow_rule(self, switch_id, flow_rule):
        """Install flow rule for traffic mitigation"""
        try:
            url = f"{self.base_url}/stats/flowentry/add"
            response = requests.post(url, json=flow_rule, timeout=5)
            return response.status_code == 200
        except Exception as e:
            self.logger.error(f"Failed to install flow rule: {e}")
            return False
    
    def block_ip_address(self, switch_id, malicious_ip):
        """Block malicious IP address"""
        flow_rule = {
            "dpid": switch_id,
            "cookie": 0,
            "priority": 32768,
            "match": {
                "ipv4_src": malicious_ip
            },
            "actions": []  # Drop action
        }
        return self.install_flow_rule(switch_id, flow_rule)
    
    def rate_limit_flow(self, switch_id, src_ip, rate_limit_kbps=1000):
        """Apply rate limiting to suspicious flows"""
        flow_rule = {
            "dpid": switch_id,
            "cookie": 0,
            "priority": 16384,
            "match": {
                "ipv4_src": src_ip
            },
            "actions": [
                {
                    "type": "METER",
                    "meter_id": 1
                },
                {
                    "type": "OUTPUT",
                    "port": "NORMAL"
                }
            ]
        }
        return self.install_flow_rule(switch_id, flow_rule)
    
    def redirect_to_honeypot(self, switch_id, src_ip, honeypot_ip):
        """Redirect suspicious traffic to honeypot"""
        flow_rule = {
            "dpid": switch_id,
            "cookie": 0,
            "priority": 24576,
            "match": {
                "ipv4_src": src_ip
            },
            "actions": [
                {
                    "type": "SET_FIELD",
                    "field": "ipv4_dst",
                    "value": honeypot_ip
                },
                {
                    "type": "OUTPUT",
                    "port": "NORMAL"
                }
            ]
        }
        return self.install_flow_rule(switch_id, flow_rule)