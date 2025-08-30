"""
Network Flow Capture and Analysis
Real-time packet capture and flow feature extraction
"""

import pyshark
import threading
import time
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
import numpy as np

class FlowCapture:
    def __init__(self, interface='eth0', capture_duration=60):
        self.interface = interface
        self.capture_duration = capture_duration
        self.flows = defaultdict(lambda: {
            'packets': 0,
            'bytes': 0,
            'start_time': None,
            'last_seen': None,
            'src_ports': set(),
            'dst_ports': set(),
            'protocols': set(),
            'packet_sizes': [],
            'inter_arrival_times': []
        })
        self.flow_window = deque(maxlen=1000)  # Keep last 1000 flows
        self.logger = logging.getLogger(__name__)
        self.capture_active = False
        
    def extract_flow_features(self, flow_data):
        """Extract ML features from flow data"""
        if not flow_data['packets']:
            return None
            
        duration = (flow_data['last_seen'] - flow_data['start_time']).total_seconds()
        if duration <= 0:
            duration = 0.001
            
        features = {
            # Basic flow features
            'duration': duration,
            'total_packets': flow_data['packets'],
            'total_bytes': flow_data['bytes'],
            'packets_per_second': flow_data['packets'] / duration,
            'bytes_per_second': flow_data['bytes'] / duration,
            
            # Packet size statistics
            'avg_packet_size': np.mean(flow_data['packet_sizes']) if flow_data['packet_sizes'] else 0,
            'std_packet_size': np.std(flow_data['packet_sizes']) if len(flow_data['packet_sizes']) > 1 else 0,
            'min_packet_size': min(flow_data['packet_sizes']) if flow_data['packet_sizes'] else 0,
            'max_packet_size': max(flow_data['packet_sizes']) if flow_data['packet_sizes'] else 0,
            
            # Inter-arrival time statistics
            'avg_iat': np.mean(flow_data['inter_arrival_times']) if flow_data['inter_arrival_times'] else 0,
            'std_iat': np.std(flow_data['inter_arrival_times']) if len(flow_data['inter_arrival_times']) > 1 else 0,
            
            # Port and protocol diversity
            'unique_src_ports': len(flow_data['src_ports']),
            'unique_dst_ports': len(flow_data['dst_ports']),
            'unique_protocols': len(flow_data['protocols']),
            
            # Flow flags
            'is_tcp': 'TCP' in flow_data['protocols'],
            'is_udp': 'UDP' in flow_data['protocols'],
            'is_icmp': 'ICMP' in flow_data['protocols']
        }
        
        return features
    
    def packet_callback(self, packet):
        """Process captured packets"""
        try:
            if not hasattr(packet, 'ip'):
                return
                
            src_ip = packet.ip.src
            dst_ip = packet.ip.dst
            flow_key = f"{src_ip}->{dst_ip}"
            
            current_time = datetime.now()
            packet_size = int(packet.length)
            
            # Initialize flow if new
            if self.flows[flow_key]['start_time'] is None:
                self.flows[flow_key]['start_time'] = current_time
                self.flows[flow_key]['last_packet_time'] = current_time
            else:
                # Calculate inter-arrival time
                iat = (current_time - self.flows[flow_key]['last_packet_time']).total_seconds()
                self.flows[flow_key]['inter_arrival_times'].append(iat)
                self.flows[flow_key]['last_packet_time'] = current_time
            
            # Update flow statistics
            self.flows[flow_key]['packets'] += 1
            self.flows[flow_key]['bytes'] += packet_size
            self.flows[flow_key]['last_seen'] = current_time
            self.flows[flow_key]['packet_sizes'].append(packet_size)
            
            # Extract port and protocol information
            if hasattr(packet, 'tcp'):
                self.flows[flow_key]['protocols'].add('TCP')
                self.flows[flow_key]['src_ports'].add(packet.tcp.srcport)
                self.flows[flow_key]['dst_ports'].add(packet.tcp.dstport)
            elif hasattr(packet, 'udp'):
                self.flows[flow_key]['protocols'].add('UDP')
                self.flows[flow_key]['src_ports'].add(packet.udp.srcport)
                self.flows[flow_key]['dst_ports'].add(packet.udp.dstport)
            elif hasattr(packet, 'icmp'):
                self.flows[flow_key]['protocols'].add('ICMP')
                
        except Exception as e:
            self.logger.error(f"Error processing packet: {e}")
    
    def start_capture(self):
        """Start packet capture"""
        try:
            self.capture_active = True
            self.logger.info(f"Starting packet capture on interface {self.interface}")
            
            capture = pyshark.LiveCapture(interface=self.interface)
            capture.apply_on_packets(self.packet_callback)
            
        except Exception as e:
            self.logger.error(f"Packet capture failed: {e}")
            self.capture_active = False
    
    def get_flow_statistics(self):
        """Get current flow statistics"""
        current_time = datetime.now()
        active_flows = []
        
        for flow_key, flow_data in self.flows.items():
            if flow_data['last_seen'] and (current_time - flow_data['last_seen']).seconds < 300:  # Active in last 5 minutes
                features = self.extract_flow_features(flow_data)
                if features:
                    features['flow_key'] = flow_key
                    features['src_ip'] = flow_key.split('->')[0]
                    features['dst_ip'] = flow_key.split('->')[1]
                    active_flows.append(features)
        
        return active_flows
    
    def cleanup_old_flows(self):
        """Remove old inactive flows"""
        current_time = datetime.now()
        cutoff_time = current_time - timedelta(minutes=10)
        
        flows_to_remove = []
        for flow_key, flow_data in self.flows.items():
            if flow_data['last_seen'] and flow_data['last_seen'] < cutoff_time:
                flows_to_remove.append(flow_key)
        
        for flow_key in flows_to_remove:
            del self.flows[flow_key]
        
        self.logger.info(f"Cleaned up {len(flows_to_remove)} old flows")
    
    def stop_capture(self):
        """Stop packet capture"""
        self.capture_active = False
        self.logger.info("Packet capture stopped")