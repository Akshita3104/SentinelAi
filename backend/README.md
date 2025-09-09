# SentinelAI Network Monitor Backend

This is the backend service for the SentinelAI Network Monitor, built with Node.js, providing real-time network traffic analysis and DDoS detection capabilities.

## Features

- 🚀 Real-time packet capture using TShark (Wireshark CLI)
- 🔌 WebSocket server for real-time communication
- 📊 Advanced packet filtering and traffic statistics
- 🌐 Support for multiple network interfaces
- 🛡️ Built-in rate limiting and security features
- 📈 Performance monitoring and logging
- 🔍 API endpoints for network analysis

## Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn package manager
- TShark (Wireshark CLI) installed and in system PATH
- Administrator/root privileges (for packet capture)

### Installing TShark

#### Windows
1. Download and install Wireshark from [wireshark.org](https://www.wireshark.org/download.html)
2. During installation, make sure to select "Install TShark"
3. Add TShark to your system PATH

#### Linux (Debian/Ubuntu)
```bash
sudo apt-get update
sudo apt-get install tshark
# Allow non-root users to capture packets
sudo usermod -a -G wireshark $USER
# Log out and log back in for the group changes to take effect
```

#### macOS (using Homebrew)
```bash
brew install wireshark
# Add TShark to PATH if not already added
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sentinel-ai.git
   cd sentinel-ai/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit the .env file with your configuration
   ```

## Configuration

Edit the `.env` file to configure the server. See `.env.example` for all available options.

Key configuration options:

```ini
# Server Configuration
NODE_ENV=development
PORT=8080
HOST=0.0.0.0

# WebSocket Configuration
WEBSOCKET_PATH=/ws
WEBSOCKET_PING_INTERVAL=30000

# Packet Capture
TSHARK_PATH=  # Auto-detect if empty
CAPTURE_INTERFACE=eth0  # Default interface
CAPTURE_FILTER=  # BPF filter
CAPTURE_SNAPLEN=65535
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
