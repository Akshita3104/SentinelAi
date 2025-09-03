# SentinelAI Network Monitor Backend

This is the backend service for the SentinelAI Network Monitor, responsible for capturing network traffic and providing real-time updates to the frontend via WebSockets.

## Features

- Real-time network packet capture using Scapy
- WebSocket server for real-time communication with the frontend
- Packet filtering and statistics
- Bandwidth monitoring
- Support for multiple network interfaces

## Prerequisites

- Python 3.8+
- Administrator/root privileges (for packet capture)
- Windows: [Npcap](https://nmap.org/npcap/) (required for Scapy on Windows)
- Linux: `libpcap` development files (usually `libpcap-dev`)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sentinel-ai/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   
   # Linux/macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

Edit the `.env` file to configure the server:

```ini
# WebSocket server configuration
WS_HOST=0.0.0.0
WS_PORT=8080

# Network interface to capture from (use 'None' to auto-detect)
NETWORK_INTERFACE=None

# Filter for packet capture (BPF syntax)
PACKET_FILTER="tcp or udp or icmp"

# Max packets to keep in memory
MAX_PACKETS=1000

# Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO
```

## Running the Server

1. Start the server:
   ```bash
   python server.py
   ```

2. The WebSocket server will start on `ws://localhost:8080` by default.

3. The frontend can now connect to the WebSocket endpoint to receive real-time updates.

## WebSocket API

### Messages from Client to Server

- `{"type": "start_capture", "interface": "eth0"}` - Start packet capture on the specified interface
- `{"type": "stop_capture"}` - Stop packet capture
- `{"type": "get_interfaces"}` - Get list of available network interfaces
- `{"type": "get_packets", "limit": 100, "filters": {...}}` - Get captured packets with optional filters
- `{"type": "get_stats"}` - Get current statistics
- `{"type": "get_bandwidth"}` - Get bandwidth usage
- `{"type": "set_filter", "filter": "tcp port 80"}` - Set packet capture filter

### Messages from Server to Client

- `{"type": "interfaces", "data": [...], "current": "eth0"}` - List of available interfaces
- `{"type": "packets", "data": [...], "count": 50, "total": 1234}` - Captured packets
- `{"type": "stats", "data": {...}}` - Current statistics
- `{"type": "bandwidth", "data": {...}}` - Bandwidth usage
- `{"type": "status", "data": {"is_capturing": true, "interface": "eth0", "filter": "tcp"}}` - Capture status

## Development

### Testing

Run the server in development mode:
```bash
LOG_LEVEL=DEBUG python server.py
```

### Debugging

To debug packet capture issues, you can use Wireshark or tcpdump to verify that packets are being captured on the selected interface.

## License

[Your License Here]
