"""
Flow Capture Module
Network flow analysis and statistics
"""

import logging
from datetime import datetime
from typing import Dict, List

class FlowCapture:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.active_flows = {}
        self.flow_statistics = []
        
    def get_flow_statistics(self) -> List[Dict]:
        """Get current flow statistics"""
        return self.flow_statistics[-10:]  # Return last 10 flows
    
    def add_flow(self, flow_data: Dict):
        """Add new flow data"""
        flow_id = f"{flow_data.get('src_ip', 'unknown')}_{datetime.now().timestamp()}"
        self.active_flows[flow_id] = flow_data
        self.flow_statistics.append(flow_data)
        
        # Keep only recent statistics
        if len(self.flow_statistics) > 100:
            self.flow_statistics = self.flow_statistics[-50:]