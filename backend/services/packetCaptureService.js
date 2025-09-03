const { spawn } = require('child_process');
const path = require('path');

class PacketCaptureService {
  constructor() {
    this.process = null;
    this.isCapturing = false;
    this.listeners = new Set();
    this.interface = 'Wi-Fi'; // Default interface, can be changed
  }

  startCapture(interfaceName = this.interface) {
    if (this.isCapturing) {
      this.stopCapture();
    }

    this.interface = interfaceName;
    this.isCapturing = true;
    
    const tsharkPath = 'C:\\Program Files\\Wireshark\\tshark.exe';
    const fields = [
      '-e', 'frame.number',
      '-e', 'frame.time',
      '-e', 'ip.src',
      '-e', 'ip.dst',
      '-e', '_ws.col.Protocol',
      '-e', 'frame.len',
      '-e', '_ws.col.Info'
    ];

    const args = [
      '-i', this.interface,
      '-l', // Line buffered output
      '-T', 'fields',
      ...fields,
      '-E', 'separator=,',
      '-E', 'quote=n',
      '-E', 'header=n'
    ];

    try {
      this.process = spawn(`"${tsharkPath}"`, args, { 
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8'
      });

      this.process.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        lines.forEach(line => {
          const [number, time, src, dst, protocol, length, info] = line.split(',');
          const packet = {
            number: parseInt(number),
            time,
            source: src,
            destination: dst,
            protocol,
            length: parseInt(length),
            info
          };
          this.notifyListeners(packet);
        });
      });

      this.process.stderr.on('data', (data) => {
        console.error(`tshark stderr: ${data}`);
      });

      this.process.on('close', (code) => {
        this.isCapturing = false;
        console.log(`tshark process exited with code ${code}`);
      });

      return true;
    } catch (error) {
      console.error('Error starting packet capture:', error);
      this.isCapturing = false;
      return false;
    }
  }

  stopCapture() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isCapturing = false;
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(packet) {
    this.listeners.forEach(callback => callback(packet));
  }

  getStatus() {
    return {
      isCapturing: this.isCapturing,
      interface: this.interface
    };
  }
}

// Export a singleton instance
module.exports = new PacketCaptureService();
