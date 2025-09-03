#!/usr/bin/env python3
"""
SentinelAI Network Monitor Backend

Handles packet capture, WebSocket communication with the frontend,
and integration with the DDoS detection model service.
"""
import asyncio
import json
import logging
import os
import signal
import socket
import sys
import time
from collections import deque, defaultdict
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple, Any

import aiohttp
try:
    import netifaces
except ImportError:
    netifaces = None
    import socket
    import psutil
    import platform
from dotenv import load_dotenv
from scapy.arch import get_if_list, get_working_if
from scapy.config import conf
from scapy.layers.inet import IP, TCP, UDP, ICMP
from scapy.layers.l2 import Ether
from scapy.packet import Packet, Raw
from scapy.sendrecv import sniff

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('sentinelai_backend.log')
    ]
)
logger = logging.getLogger('sentinelai.backend')

# Load environment variables
load_dotenv()

# Configuration
CONFIG = {
    'WS_HOST': os.getenv('WS_HOST', '0.0.0.0'),
    'WS_PORT': int(os.getenv('WS_PORT', '8080')),
    'MODEL_SERVICE_URL': os.getenv('MODEL_SERVICE_URL', 'http://localhost:8000'),
    'PACKET_FILTER': os.getenv('PACKET_FILTER', 'tcp or udp or icmp'),
    'MAX_PACKETS': int(os.getenv('MAX_PACKETS', '1000')),
    'UPDATE_INTERVAL': 1.0,  # seconds between updates to clients
    'BANDWIDTH_WINDOW': 60,  # seconds for bandwidth calculation
}

# Global state
class AppState:
    """Application state shared across WebSocket connections."""
    
    def __init__(self):
        self.clients: Set[WebSocket] = set()
        self.packets = deque(maxlen=CONFIG['MAX_PACKETS'])
        self.stats = {
            'packet_count': 0,
            'protocols': defaultdict(int),
            'source_ips': defaultdict(int),
            'destination_ips': defaultdict(int),
            'start_time': datetime.utcnow().isoformat(),
            'last_update': datetime.utcnow().isoformat(),
        }
        self.bandwidth = {
            'timestamps': deque(maxlen=CONFIG['BANDWIDTH_WINDOW']),
            'bytes_sent': deque(maxlen=CONFIG['BANDWIDTH_WINDOW']),
            'bytes_received': deque(maxlen=CONFIG['BANDWIDTH_WINDOW']),
        }
        self.detected_attacks = []
        self.active_mitigations = {}
        self.is_capturing = False
        self.interface = None

# Initialize global state
state = AppState()
from websockets import serve, WebSocketServerProtocol
from websockets.exceptions import ConnectionClosed

# Import model client
from model_client import ModelClient

# Initialize model client
model_client = ModelClient(CONFIG['MODEL_SERVICE_URL'])

# Utility Functions
def get_network_interfaces() -> List[Dict[str, str]]:
    """Get list of available network interfaces."""
    interfaces = []
    
    if netifaces is not None:
        # Linux/Unix/MacOS with netifaces
        for iface in get_if_list():
            try:
                if_addrs = netifaces.ifaddresses(iface)
                ipv4 = if_addrs.get(netifaces.AF_INET)
                if ipv4 and not iface.startswith(('lo', 'Loopback')):
                    interfaces.append({
                    'name': iface,
                    'ip': ipv4[0]['addr'] if ipv4 else 'N/A',
                    'mac': if_addrs.get(netifaces.AF_LINK, [{}])[0].get('addr', 'N/A')
                })
            except (ValueError, KeyError):
                continue
    else:
        # Windows or other platforms without netifaces
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            
            # Get network interfaces using psutil
            addrs = psutil.net_if_addrs()
            stats = psutil.net_if_stats()
            
            for iface, addrs in addrs.items():
                if iface not in stats or not stats[iface].isup:
                    continue
                    
                ip = next((addr.address for addr in addrs if addr.family == socket.AF_INET), 'N/A')
                mac = next((addr.address for addr in addrs if addr.family == psutil.AF_LINK), 'N/A')
                
                interfaces.append({
                    'name': iface,
                    'ip': ip if ip != 'N/A' else local_ip,
                    'mac': mac
                })
        except Exception as e:
            print(f"Error getting network interfaces: {e}")
            # Fallback to a default interface
            interfaces.append({
                'name': 'eth0',
                'ip': '127.0.0.1',
                'mac': '00:00:00:00:00:00'
            })
    
    return interfaces

# Packet Processing
def process_packet(packet: Packet) -> Optional[Dict[str, Any]]:
    """Process a single network packet."""
    try:
        if not packet.haslayer(IP):
            return None
            
        # Extract basic packet info
        packet_info = {
            'timestamp': datetime.utcnow().isoformat(),
            'src': packet[IP].src,
            'dst': packet[IP].dst,
            'protocol': 'unknown',
            'length': len(packet),
            'info': {}
        }
        
        # Determine protocol
        if packet.haslayer(TCP):
            packet_info['protocol'] = 'tcp'
            packet_info['info'].update({
                'sport': packet[TCP].sport,
                'dport': packet[TCP].dport,
                'flags': str(packet[TCP].flags)
            })
        elif packet.haslayer(UDP):
            packet_info['protocol'] = 'udp'
            packet_info['info'].update({
                'sport': packet[UDP].sport,
                'dport': packet[UDP].dport
            })
        elif packet.haslayer(ICMP):
            packet_info['protocol'] = 'icmp'
            packet_info['info'].update({
                'type': packet[ICMP].type,
                'code': packet[ICMP].code
            })
            
        # Extract payload if available
        if packet.haslayer(Raw):
            payload = bytes(packet[Raw]).hex()
            packet_info['info']['payload'] = payload[:100]  # First 100 bytes
            
        return packet_info
        
    except Exception as e:
        logger.error(f"Error processing packet: {e}")
        return None

async def analyze_traffic(packet_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Send packet to model service for DDoS analysis."""
    try:
        async with model_client as client:
            return await client.detect_ddos(packet_info)
    except Exception as e:
        logger.error(f"Error in traffic analysis: {e}")
        return None

async def start_packet_capture(interface: str = None):
    """Start packet capture on the specified interface."""
    if state.is_capturing:
        logger.warning("Packet capture is already running")
        return
        
    if not interface:
        interfaces = get_network_interfaces()
        if not interfaces:
            raise ValueError("No network interfaces found")
        interface = interfaces[0]['name']
        
    state.interface = interface
    state.is_capturing = True
    logger.info(f"Starting packet capture on interface {interface}")
    
    def packet_callback(packet):
        if not state.is_capturing:
            return
            
        packet_info = process_packet(packet)
        if not packet_info:
            return
            
        # Update statistics
        state.stats['packet_count'] += 1
        state.stats['protocols'][packet_info['protocol']] += 1
        state.stats['source_ips'][packet_info['src']] += 1
        state.stats['destination_ips'][packet_info['dst']] += 1
        state.stats['last_update'] = datetime.utcnow().isoformat()
        
        # Update bandwidth
        now = time.time()
        state.bandwidth['timestamps'].append(now)
        state.bandwidth['bytes_sent'].append(packet_info['length'])
        state.bandwidth['bytes_received'].append(0)  # Simplified for now
        
        # Add to packet history
        state.packets.append(packet_info)
        
        # Analyze for DDoS (in background)
        asyncio.create_task(analyze_traffic(packet_info))
    
    # Start packet capture in a separate thread
    def start_sniffing():
        try:
            sniff(iface=interface, prn=packet_callback, store=False)
        except Exception as e:
            logger.error(f"Packet capture error: {e}")
            state.is_capturing = False
    
    # Run sniff in a separate thread
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, start_sniffing)

async def stop_packet_capture():
    """Stop the running packet capture."""
    state.is_capturing = False
    logger.info("Packet capture stopped")

async def get_bandwidth_usage() -> Dict[str, Any]:
    """Calculate current bandwidth usage."""
    if not state.bandwidth['timestamps']:
        return {
            'bps_sent': 0,
            'bps_received': 0,
            'total_sent': 0,
            'total_received': 0
        }
    
    now = time.time()
    window_start = now - CONFIG['BANDWIDTH_WINDOW']
    
    # Filter data points within the time window
    timestamps = list(state.bandwidth['timestamps'])
    bytes_sent = list(state.bandwidth['bytes_sent'])
    bytes_received = list(state.bandwidth['bytes_received'])
    
    # Calculate total bytes in the window
    total_sent = sum(bytes_sent)
    total_received = sum(bytes_received)
    
    # Calculate bytes per second
    if len(timestamps) > 1:
        time_span = timestamps[-1] - timestamps[0]
        if time_span > 0:
            bps_sent = total_sent / time_span
            bps_received = total_received / time_span
        else:
            bps_sent = bps_received = 0
    else:
        bps_sent = bps_received = 0
    
    return {
        'bps_sent': bps_sent,
        'bps_received': bps_received,
        'total_sent': total_sent,
        'total_received': total_received,
        'window_seconds': CONFIG['BANDWIDTH_WINDOW']
    }

# WebSocket Handlers
async def handle_websocket(websocket, path='/'):
    """Handle WebSocket connections from frontend."""
    client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"[WebSocket] New connection attempt from {client_id} on path: {path}")
    
    # Add CORS headers and initial handshake
    try:
        # Send initial ping to verify connection
        await websocket.ping()
        logger.debug(f"[WebSocket] Initial ping sent to {client_id}")
    except Exception as e:
        logger.error(f"[WebSocket] Initial handshake failed for {client_id}: {str(e)}")
        await websocket.close(1011, "Handshake failed")
        return
    
    # Register client
    state.clients.add(websocket)
    logger.info(f"[WebSocket] Client {client_id} connected. Total clients: {len(state.clients)}")
    
    try:
        # Send initial state
        init_message = {
            'type': 'init',
            'timestamp': datetime.utcnow().isoformat(),
            'server': 'sentinel-ai-backend',
            'version': '1.0.0',
            'data': {
                'interfaces': get_network_interfaces(),
                'is_capturing': state.is_capturing,
                'current_interface': state.interface,
                'stats': state.stats,
                'bandwidth': await get_bandwidth_usage()
            }
        }
        
        try:
            await websocket.send(json.dumps(init_message))
            logger.debug(f"[WebSocket] Sent init message to {client_id}")
        except Exception as e:
            logger.error(f"[WebSocket] Failed to send init message to {client_id}: {str(e)}")
            raise
        
        # Handle incoming messages
        while True:
            try:
                message = await websocket.recv()
                logger.debug(f"[WebSocket] Received message from {client_id}: {message[:200]}..." if len(str(message)) > 200 else f"[WebSocket] Received message from {client_id}: {message}")
                
                try:
                    data = json.loads(message)
                    logger.debug(f"[WebSocket] Parsed message from {client_id}: {data}")
                    await handle_websocket_message(websocket, data)
                except json.JSONDecodeError as je:
                    logger.error(f"[WebSocket] Invalid JSON from {client_id}: {message}")
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': 'Invalid JSON format',
                        'timestamp': datetime.utcnow().isoformat()
                    }))
                except Exception as e:
                    logger.error(f"[WebSocket] Error handling message from {client_id}: {str(e)}", exc_info=True)
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': f'Error processing message: {str(e)}',
                        'timestamp': datetime.utcnow().isoformat()
                    }))
                        
            except ConnectionClosed as cc:
                logger.info(f"[WebSocket] Connection closed by {client_id}: code={cc.code}, reason={cc.reason}")
                break
            except Exception as e:
                logger.error(f"[WebSocket] Error in message loop for {client_id}: {str(e)}", exc_info=True)
                break
                
    except Exception as e:
        logger.error(f"[WebSocket] Unexpected error with {client_id}: {str(e)}", exc_info=True)
    finally:
        # Unregister client
        if websocket in state.clients:
            state.clients.remove(websocket)
            logger.info(f"[WebSocket] Client {client_id} disconnected. Remaining clients: {len(state.clients)}")
        else:
            logger.warning(f"[WebSocket] Client {client_id} not found in clients during cleanup")

async def handle_websocket_message(websocket, data: Dict[str, Any]):
    """Handle incoming WebSocket messages."""
    message_type = data.get('type')
    
    if message_type == 'start_capture':
        interface = data.get('interface')
        await start_packet_capture(interface)
        await broadcast_status()
        
    elif message_type == 'stop_capture':
        await stop_packet_capture()
        await broadcast_status()
        
    elif message_type == 'get_interfaces':
        await websocket.send(json.dumps({
            'type': 'interfaces',
            'interfaces': get_network_interfaces()
        }))
        
    elif message_type == 'get_stats':
        await websocket.send(json.dumps({
            'type': 'stats',
            'stats': state.stats,
            'bandwidth': await get_bandwidth_usage(),
            'is_capturing': state.is_capturing,
            'current_interface': state.interface
        }))
        
    elif message_type == 'mitigate':
        target = data.get('target')
        action = data.get('action')
        await handle_mitigation(target, action)
        
    else:
        logger.warning(f"Unknown message type: {message_type}")

async def handle_mitigation(target: str, action: str):
    """Handle mitigation requests."""
    try:
        async with model_client as client:
            result = await client.mitigate_attack(
                target_ip=target,
                action=action,
                duration=300  # 5 minutes
            )
            
            if result.get('success'):
                state.active_mitigations[target] = {
                    'action': action,
                    'timestamp': datetime.utcnow().isoformat(),
                    'expires': (datetime.utcnow() + timedelta(seconds=300)).isoformat()
                }
                
                # Broadcast mitigation status
                await broadcast_mitigation_update()
                
            return result
            
    except Exception as e:
        logger.error(f"Error in mitigation: {e}")
        return {'success': False, 'error': str(e)}

async def broadcast_status():
    """Broadcast current status to all connected clients."""
    if not state.clients:
        return
        
    message = json.dumps({
        'type': 'status',
        'is_capturing': state.is_capturing,
        'current_interface': state.interface,
        'stats': state.stats,
        'bandwidth': await get_bandwidth_usage(),
        'active_mitigations': state.active_mitigations
    })
    
    await broadcast(message)

async def broadcast_mitigation_update():
    """Broadcast mitigation updates to all connected clients."""
    if not state.clients:
        return
        
    message = json.dumps({
        'type': 'mitigation_update',
        'active_mitigations': state.active_mitigations
    })
    
    await broadcast(message)

async def broadcast(message: str):
    """Broadcast a message to all connected clients."""
    if not state.clients:
        return
        
    for client in list(state.clients):
        try:
            await client.send(message)
        except Exception as e:
            logger.error(f"Error broadcasting to client: {e}")
            state.clients.remove(client)

async def periodic_updates():
    """Send periodic updates to all connected clients."""
    while True:
        try:
            if state.clients:
                await broadcast_status()
        except Exception as e:
            logger.error(f"Error in periodic updates: {e}")
            
        await asyncio.sleep(CONFIG['UPDATE_INTERVAL'])

# Main Entry Point
async def main():
    """Main entry point for the application."""
    # Handle graceful shutdown
    def signal_handler(sig, frame):
        """Handle shutdown signals."""
        logger.info("Shutting down...")
        sys.exit(0)

    # Windows compatibility - don't use signal handlers that aren't supported
    if hasattr(signal, 'SIGINT') and hasattr(signal, 'SIGTERM'):
        try:
            for sig in (signal.SIGINT, signal.SIGTERM):
                if hasattr(signal, 'SIGINT'):
                    signal.signal(sig, signal_handler)
        except (ValueError, RuntimeError) as e:
            logger.warning(f"Could not set up signal handlers: {e}")

    # Configure WebSocket server
    logger.info(f"Starting WebSocket server on {CONFIG['WS_HOST']}:{CONFIG['WS_PORT']}")
    
    # Create server with proper configuration
    server = await serve(
        handle_websocket,
        host=CONFIG['WS_HOST'],
        port=CONFIG['WS_PORT'],
        ping_interval=30,
        ping_timeout=10,
        # Enable compression for better performance
        compression=None,
        # Set a maximum message size (10MB)
        max_size=10 * 1024 * 1024,
        # Allow serving on all interfaces
        reuse_address=True
    )
    
    # Log server information
    for sock in server.sockets:
        logger.info(f"Serving on {sock.getsockname()}")
    
    # Start periodic updates
    asyncio.create_task(periodic_updates())
    
    logger.info("Available network interfaces:")
    for iface in get_network_interfaces():
        logger.info(f"  - {iface['name']}: {iface['ip']}")
    
    # Keep the server running
    try:
        await asyncio.Future()
    except asyncio.CancelledError:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
    finally:
        logger.info("Shutting down WebSocket server...")
        server.close()
        await server.wait_closed()
        logger.info("Server stopped")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.critical(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
    def __init__(self):
        """Initialize the network monitor."""
        self.interface = os.getenv('NETWORK_INTERFACE', 'None')
        if self.interface.lower() == 'none':
            self.interface = None
            
        self.packet_filter = os.getenv('PACKET_FILTER', 'tcp or udp or icmp')
        self.max_packets = int(os.getenv('MAX_PACKETS', '1000'))
        
        self.packets = deque(maxlen=self.max_packets)
        self.stats = {
            'total': 0,
            'tcp': 0,
            'udp': 0,
            'http': 0,
            'https': 0,
            'dns': 0,
            'icmp': 0,
            'other': 0,
            'dropped': 0,
            'start_time': time.time(),
            'last_update': time.time()
        }
        self.bandwidth = {
            'in': 0,
            'out': 0,
            'history': [],
            'last_update': time.time()
        }
        self.interfaces = self._get_network_interfaces()
        self.capturing = False
        self._stop_event = asyncio.Event()
        
    def _get_network_interfaces(self) -> List[Dict]:
        """Get a list of available network interfaces."""
        interfaces = []
        for iface in get_if_list():
            try:
                addrs = netifaces.ifaddresses(iface)
                ipv4 = addrs.get(netifaces.AF_INET, [{}])[0].get('addr', '')
                netmask = addrs.get(netifaces.AF_INET, [{}])[0].get('netmask', '')
                mac = addrs.get(netifaces.AF_LINK, [{}])[0].get('addr', '')
                
                interfaces.append({
                    'name': iface,
                    'ip': ipv4,
                    'netmask': netmask,
                    'mac': mac,
                    'description': f"{iface} ({ipv4})" if ipv4 else iface
                })
            except (ValueError, IndexError) as e:
                logger.warning(f"Could not get info for interface {iface}: {e}")
                
        return interfaces
    
    def _get_packet_info(self, packet: Packet) -> dict:
        """Extract relevant information from a packet."""
        packet_info = {
            'timestamp': datetime.now().isoformat(),
            'length': len(packet),
            'protocol': 'other',
            'source': '',
            'destination': '',
            'source_port': None,
            'destination_port': None,
            'info': ''
        }
        
        # Get IP layer if available
        if IP in packet:
            packet_info['source'] = packet[IP].src
            packet_info['destination'] = packet[IP].dst
            
            # Check for TCP
            if TCP in packet:
                packet_info['protocol'] = 'tcp'
                packet_info['source_port'] = packet[TCP].sport
                packet_info['destination_port'] = packet[TCP].dport
                
                # Check for HTTP/HTTPS
                if packet[TCP].dport == 80:
                    packet_info['protocol'] = 'http'
                    packet_info['info'] = f'HTTP {packet[TCP].dport}'
                elif packet[TCP].dport == 443 or packet[TCP].sport == 443:
                    packet_info['protocol'] = 'https'
                    packet_info['info'] = 'HTTPS'
                
            # Check for UDP
            elif UDP in packet:
                packet_info['protocol'] = 'udp'
                packet_info['source_port'] = packet[UDP].sport
                packet_info['destination_port'] = packet[UDP].dport
                
                # Check for DNS
                if packet[UDP].dport == 53 or packet[UDP].sport == 53:
                    packet_info['protocol'] = 'dns'
                    packet_info['info'] = 'DNS Query/Response'
            
            # Check for ICMP
            elif ICMP in packet:
                packet_info['protocol'] = 'icmp'
                packet_info['info'] = f'ICMP Type: {packet[ICMP].type}'
        
        return packet_info
    
    def _packet_callback(self, packet: Packet):
        """Callback function for each captured packet."""
        try:
            packet_info = self._get_packet_info(packet)
            
            # Update packet list
            self.packets.appendleft(packet_info)
            
            # Update statistics
            self.stats['total'] += 1
            protocol = packet_info['protocol']
            if protocol in self.stats:
                self.stats[protocol] += 1
            else:
                self.stats['other'] += 1
                
            # Update bandwidth (in bytes)
            packet_size = packet_info['length']
            self.bandwidth['in'] += packet_size
            
            # Update last update time
            current_time = time.time()
            self.stats['last_update'] = current_time
            
            # Update bandwidth history (every second)
            if current_time - self.bandwidth['last_update'] >= 1.0:
                self.bandwidth['history'].append({
                    'timestamp': datetime.now().isoformat(),
                    'in': self.bandwidth['in'],
                    'out': self.bandwidth['out']
                })
                # Keep only the last 60 data points (1 minute at 1s intervals)
                if len(self.bandwidth['history']) > 60:
                    self.bandwidth['history'].pop(0)
                
                # Reset counters
                self.bandwidth['in'] = 0
                self.bandwidth['out'] = 0
                self.bandwidth['last_update'] = current_time
                
        except Exception as e:
            logger.error(f"Error processing packet: {e}", exc_info=True)
            self.stats['dropped'] += 1
    
    async def start_capture(self):
        """Start the packet capture in a separate thread."""
        if self.capturing:
            logger.warning("Capture is already running")
            return False
            
        if not self.interface and self.interfaces:
            self.interface = self.interfaces[0]['name']
            logger.info(f"Auto-selected interface: {self.interface}")
        
        if not self.interface:
            logger.error("No network interface available for capture")
            return False
            
        logger.info(f"Starting capture on interface {self.interface} with filter: {self.packet_filter}")
        self.capturing = True
        self._stop_event.clear()
        
        # Start packet capture in a separate thread
        loop = asyncio.get_event_loop()
        self.capture_thread = loop.run_in_executor(
            None,
            self._run_capture
        )
        
        return True
    
    def _run_capture(self):
        """Run the packet capture in a blocking manner."""
        try:
            sniff(
                iface=self.interface,
                filter=self.packet_filter,
                prn=self._packet_callback,
                stop_filter=lambda _: self._stop_event.is_set(),
                store=0
            )
        except Exception as e:
            logger.error(f"Error in packet capture: {e}", exc_info=True)
            self.capturing = False
    
    async def stop_capture(self):
        """Stop the packet capture."""
        if not self.capturing:
            return False
            
        logger.info("Stopping packet capture")
        self._stop_event.set()
        self.capturing = False
        return True
    
    def get_packets(self, limit: int = 100, filters: Optional[dict] = None) -> List[dict]:
        """Get captured packets with optional filtering."""
        if not filters:
            return list(self.packets)[:limit]
            
        filtered = []
        for packet in self.packets:
            if self._filter_packet(packet, filters):
                filtered.append(packet)
                if len(filtered) >= limit:
                    break
                    
        return filtered
    
    def _filter_packet(self, packet: dict, filters: dict) -> bool:
        """Check if a packet matches the given filters."""
        # Filter by protocol
        if 'protocol' in filters and filters['protocol'] != 'all':
            if packet.get('protocol') != filters['protocol']:
                return False
                
        # Filter by source IP
        if 'sourceIp' in filters and filters['sourceIp']:
            if filters['sourceIp'] not in packet.get('source', ''):
                return False
                
        # Filter by destination IP
        if 'destinationIp' in filters and filters['destinationIp']:
            if filters['destinationIp'] not in packet.get('destination', ''):
                return False
                
        # Filter by port
        if 'port' in filters and filters['port']:
            port = str(filters['port'])
            source_port = str(packet.get('source_port', ''))
            dest_port = str(packet.get('destination_port', ''))
            
            if port not in source_port and port not in dest_port:
                return False
                
        return True
    
    def get_stats(self) -> dict:
        """Get current statistics."""
        return self.stats
    
    def get_bandwidth(self) -> dict:
        """Get current bandwidth usage."""
        return self.bandwidth
    
    def get_interfaces(self) -> List[dict]:
        """Get list of available network interfaces."""
        return self.interfaces
    
    def set_interface(self, interface: str) -> bool:
        """Set the network interface for capture."""
        if interface in [iface['name'] for iface in self.interfaces]:
            self.interface = interface
            return True
        return False
    
    def set_filter(self, packet_filter: str) -> None:
        """Set the packet capture filter."""
        self.packet_filter = packet_filter


class WebSocketServer:
    """WebSocket server for real-time communication with the frontend."""
    
    def __init__(self, host: str, port: int):
        """Initialize the WebSocket server."""
        self.host = host
        self.port = port
        self.monitor = NetworkMonitor()
        self.clients: Set = set()
        self.update_interval = 1.0  # seconds
        
    async def start(self):
        """Start the WebSocket server."""
        logger.info(f"Starting WebSocket server on {self.host}:{self.port}")
        async with serve(
            self.handle_connection,
            self.host,
            self.port,
            ping_interval=30,
            ping_timeout=10,
            close_timeout=10
        ):
            logger.info("WebSocket server started successfully")
            await asyncio.Future()  # Run forever
    
    async def handle_connection(self, websocket, path):
        """Handle a new WebSocket connection."""
        client_id = id(websocket)
        logger.info(f"New WebSocket connection: {client_id}")
        self.clients.add(websocket)
        
        try:
            # Send initial data
            await self.send_interfaces(websocket)
            
            # Keep the connection alive and process messages
            async for message in websocket:
                await self.handle_message(websocket, message)
                
        except ConnectionClosed:
            logger.info(f"WebSocket connection closed: {client_id}")
        except Exception as e:
            logger.error(f"Error in WebSocket connection {client_id}: {e}", exc_info=True)
        finally:
            self.clients.discard(websocket)
    
    async def handle_message(self, websocket, message: str):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'start_capture':
                interface = data.get('interface')
                if interface:
                    self.monitor.set_interface(interface)
                await self.monitor.start_capture()
                await self.send_status(websocket)
                
            elif message_type == 'stop_capture':
                await self.monitor.stop_capture()
                await self.send_status(websocket)
                
            elif message_type == 'get_interfaces':
                await self.send_interfaces(websocket)
                
            elif message_type == 'get_packets':
                filters = data.get('filters', {})
                limit = data.get('limit', 100)
                packets = self.monitor.get_packets(limit, filters)
                await self.send_packets(websocket, packets)
                
            elif message_type == 'get_stats':
                await self.send_stats(websocket)
                
            elif message_type == 'get_bandwidth':
                await self.send_bandwidth(websocket)
                
            elif message_type == 'set_filter':
                packet_filter = data.get('filter', '')
                self.monitor.set_filter(packet_filter)
                await self.send_status(websocket)
                
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON message: {message}")
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
    
    async def send_interfaces(self, websocket):
        """Send available network interfaces to the client."""
        interfaces = self.monitor.get_interfaces()
        await websocket.send(json.dumps({
            'type': 'interfaces',
            'data': interfaces,
            'current': self.monitor.interface
        }))
    
    async def send_packets(self, websocket, packets):
        """Send captured packets to the client."""
        await websocket.send(json.dumps({
            'type': 'packets',
            'data': packets,
            'count': len(packets),
            'total': len(self.monitor.packets)
        }))
    
    async def send_stats(self, websocket):
        """Send statistics to the client."""
        await websocket.send(json.dumps({
            'type': 'stats',
            'data': self.monitor.get_stats()
        }))
    
    async def send_bandwidth(self, websocket):
        """Send bandwidth usage to the client."""
        await websocket.send(json.dumps({
            'type': 'bandwidth',
            'data': self.monitor.get_bandwidth()
        }))
    
    async def send_status(self, websocket):
        """Send current capture status to the client."""
        await websocket.send(json.dumps({
            'type': 'status',
            'data': {
                'is_capturing': self.monitor.capturing,
                'interface': self.monitor.interface,
                'filter': self.monitor.packet_filter
            }
        }))
    
    async def broadcast_updates(self):
        """Broadcast updates to all connected clients at regular intervals."""
        while True:
            try:
                if not self.clients:
                    await asyncio.sleep(self.update_interval)
                    continue
                
                # Get current packets and stats
                packets = self.monitor.get_packets(limit=50)
                stats = self.monitor.get_stats()
                bandwidth = self.monitor.get_bandwidth()
                
                # Create update messages
                messages = [
                    json.dumps({'type': 'packets', 'data': packets, 'count': len(packets), 'total': stats['total']}),
                    json.dumps({'type': 'stats', 'data': stats}),
                    json.dumps({'type': 'bandwidth', 'data': bandwidth})
                ]
                
                # Send updates to all connected clients
                for websocket in list(self.clients):
                    try:
                        for message in messages:
                            await websocket.send(message)
                    except ConnectionClosed:
                        self.clients.discard(websocket)
                    except Exception as e:
                        logger.error(f"Error sending update to client: {e}")
                        self.clients.discard(websocket)
                
                await asyncio.sleep(self.update_interval)
                
            except Exception as e:
                logger.error(f"Error in broadcast loop: {e}", exc_info=True)
                await asyncio.sleep(1)  # Prevent tight loop on error


def signal_handler(sig, frame):
    """Handle shutdown signals."""
    logger.info("Shutting down...")
    sys.exit(0)


async def main():
    """Main entry point for the application."""
    # Configure signal handlers (only on Unix-like systems)
    if hasattr(signal, 'SIGINT'):
        try:
            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)
        except (ValueError, RuntimeError) as e:
            logger.warning(f"Could not set up signal handlers: {e}")
    
    # Load configuration
    host = os.getenv('WS_HOST', '0.0.0.0')
    port = int(os.getenv('WS_PORT', '8080'))
    
    # Create and start the WebSocket server
    server = WebSocketServer(host, port)
    
    try:
        # Start the update broadcast task
        asyncio.create_task(server.broadcast_updates())
        
        # Start the WebSocket server
        logger.info(f"Starting WebSocket server on {host}:{port}")
        await server.start()
    except asyncio.CancelledError:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
    finally:
        logger.info("Shutting down...")


if __name__ == "__main__":
    # Set up logging
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    logger.setLevel(log_level)
    
    # Run the application
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.critical(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)
