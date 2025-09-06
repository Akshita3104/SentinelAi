const { spawn } = require('child_process');
const EventEmitter = require('events');

class PacketCapture extends EventEmitter {
  constructor() {
    super();
    this.isCapturing = false;
    this.tsharkProcess = null;
    this.flowWindow = [];
    this.windowDuration = 60000; // 60 seconds
    this.tsharkPath = 'C:\\Program Files\\Wireshark\\tshark.exe';
  }

  startCapture(targetIP, interfaceName) {
    if (this.isCapturing) return;
    
    this.isCapturing = true;
    this.flowWindow = [];
    this.captureStartTime = Date.now();
    
    const fields = [
      '-e', 'frame.time_epoch',
      '-e', 'ip.src',
      '-e', 'ip.dst',
      '-e', 'tcp.srcport',
      '-e', 'tcp.dstport', 
      '-e', 'udp.srcport',
      '-e', 'udp.dstport',
      '-e', 'ip.proto',
      '-e', 'frame.len'
    ];
    
    // Handle Windows interface names - use interface number or name
    let interfaceArg = interfaceName;
    if (interfaceName === 'auto') {
      interfaceArg = 'any'; // Let tshark auto-select
    }
    
    const args = [
      '-i', interfaceArg,
      '-f', `host ${targetIP}`,
      '-l',
      '-T', 'fields',
      '-e', 'frame.time_epoch',
      '-e', 'ip.src',
      '-e', 'ip.dst',
      '-e', '_ws.col.Protocol',
      '-e', 'tcp.srcport',
      '-e', 'tcp.dstport',
      '-e', 'udp.srcport',
      '-e', 'udp.dstport',
      '-e', 'frame.len'
    ];
    
    console.log(`Starting tshark capture: ${this.tsharkPath} ${args.join(' ')}`);
    
    try {
      this.tsharkProcess = spawn(this.tsharkPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true // Hide console window on Windows
      });
      
      this.tsharkProcess.stdout.on('data', (data) => {
        console.log('Raw tshark output:', data.toString());
        const lines = data.toString().split('\n');
        lines.forEach(line => {
          if (line.trim()) {
            console.log('Raw packet line fields:', line.split('\t'));
            this.processPacketLine(line.trim(), targetIP);
          }
        });
      });
      
      this.tsharkProcess.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        console.error('tshark stderr:', errorMsg);
        
        // Check for common errors
        if (errorMsg.includes('No such device exists') || 
            errorMsg.includes('interface') || 
            errorMsg.includes('permission')) {
          this.emit('error', new Error(`Interface error: ${errorMsg}`));
        }
      });
      
      this.tsharkProcess.on('error', (error) => {
        console.error('tshark process error:', error);
        this.isCapturing = false;
        this.emit('error', error);
      });
      
      this.tsharkProcess.on('exit', (code) => {
        console.log(`tshark process exited with code ${code}`);
        this.isCapturing = false;
      });
      
      // Process flows every 200ms for ultra-fast real-time updates
      this.flowInterval = setInterval(() => {
        this.processFlows(targetIP);
      }, 200);
      
      console.log(`Real packet capture started for ${targetIP} on interface ${interfaceArg}`);
      
    } catch (error) {
      console.error('Capture start error:', error);
      this.isCapturing = false;
      this.emit('error', error);
    }
  }

  processPacketLine(line, targetIP) {
    const fields = line.split('\t');
    if (fields.length < 6) return;
    
    const packet = {
      timestamp: parseFloat(fields[0]) * 1000 || Date.now(),
      srcIP: fields[1]?.trim() || '',
      dstIP: fields[2]?.trim() || '',
      protocol: fields[3]?.trim() || 'TCP',
      srcPort: parseInt(fields[4] || fields[6] || '0'),
      dstPort: parseInt(fields[5] || fields[7] || '0'),
      size: parseInt(fields[8] || '64')
    };
    
    console.log('Packet:', packet.srcIP, '->', packet.dstIP, packet.protocol, 'Ports:', packet.srcPort, '->', packet.dstPort);
    
    this.flowWindow.push(packet);
    console.log('Added packet to flow:', packet.srcIP, '->', packet.dstIP, packet.protocol);
    this.emit('packetCount', this.flowWindow.length);
    
    // Remove old packets
    const cutoff = Date.now() - this.windowDuration;
    this.flowWindow = this.flowWindow.filter(p => p.timestamp > cutoff);
  }

  processFlows(targetIP) {
    if (this.flowWindow.length === 0) return;

    const flows = this.aggregatePackets(targetIP);
    const flowFeatures = this.computeFlowFeatures(flows, targetIP);
    
    this.emit('flowReady', flowFeatures);
  }

  aggregatePackets(targetIP) {
    const flows = {};
    
    this.flowWindow.forEach(packet => {
      const flowKey = `${packet.srcIP}-${packet.dstIP}-${packet.protocol}`;
      
      if (!flows[flowKey]) {
        flows[flowKey] = {
          srcIP: packet.srcIP,
          dstIP: packet.dstIP,
          protocol: packet.protocol,
          packets: [],
          srcPorts: new Set(),
          dstPorts: new Set(),
          totalBytes: 0,
          startTime: packet.timestamp,
          endTime: packet.timestamp
        };
      }
      
      const flow = flows[flowKey];
      flow.packets.push(packet);
      flow.srcPorts.add(packet.srcPort);
      flow.dstPorts.add(packet.dstPort);
      flow.totalBytes += packet.size;
      flow.endTime = Math.max(flow.endTime, packet.timestamp);
    });
    
    return Object.values(flows);
  }

  computeFlowFeatures(flows, targetIP) {
    const allPackets = this.flowWindow;
    const duration = allPackets.length > 0 ? 
      (Math.max(...allPackets.map(p => p.timestamp)) - Math.min(...allPackets.map(p => p.timestamp))) / 1000 : 60;
    
    const packetSizes = allPackets.map(p => p.size);
    const protocols = new Set(allPackets.map(p => p.protocol));
    const srcPorts = new Set(allPackets.map(p => p.srcPort));
    const dstPorts = new Set(allPackets.map(p => p.dstPort));
    
    // Calculate inter-arrival times
    const sortedPackets = allPackets.sort((a, b) => a.timestamp - b.timestamp);
    const interArrivalTimes = [];
    for (let i = 1; i < sortedPackets.length; i++) {
      interArrivalTimes.push((sortedPackets[i].timestamp - sortedPackets[i-1].timestamp) / 1000);
    }

    return {
      duration: Math.max(duration, 1),
      total_packets: allPackets.length,
      total_bytes: packetSizes.reduce((a, b) => a + b, 0),
      packets_per_second: allPackets.length / Math.max(duration, 1),
      bytes_per_second: packetSizes.reduce((a, b) => a + b, 0) / Math.max(duration, 1),
      avg_packet_size: packetSizes.length > 0 ? packetSizes.reduce((a, b) => a + b, 0) / packetSizes.length : 0,
      std_packet_size: this.calculateStd(packetSizes),
      min_packet_size: packetSizes.length > 0 ? Math.min(...packetSizes) : 0,
      max_packet_size: packetSizes.length > 0 ? Math.max(...packetSizes) : 0,
      avg_iat: interArrivalTimes.length > 0 ? interArrivalTimes.reduce((a, b) => a + b, 0) / interArrivalTimes.length : 0,
      std_iat: this.calculateStd(interArrivalTimes),
      unique_src_ports: srcPorts.size,
      unique_dst_ports: dstPorts.size,
      unique_protocols: protocols.size,
      is_tcp: protocols.has(6),
      is_udp: protocols.has(17),
      is_icmp: protocols.has(1),
      src_ip: targetIP,
      flows: flows.map(f => ({
        src_ip: f.srcIP,
        dst_ip: f.dstIP,
        srcIP: f.srcIP,
        dstIP: f.dstIP,
        protocol: f.protocol === 6 ? 'TCP' : f.protocol === 17 ? 'UDP' : f.protocol === 1 ? 'ICMP' : (typeof f.protocol === 'string' ? f.protocol : 'TCP'),
        packets: f.packets.length,
        bytes: f.totalBytes
      }))
    };
  }

  calculateStd(values) {
    if (values.length <= 1) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  stopCapture() {
    this.isCapturing = false;
    
    if (this.tsharkProcess) {
      // Gracefully terminate tshark
      this.tsharkProcess.kill('SIGTERM');
      
      // Force kill if not terminated within 3 seconds
      setTimeout(() => {
        if (this.tsharkProcess && !this.tsharkProcess.killed) {
          this.tsharkProcess.kill('SIGKILL');
        }
      }, 3000);
      
      this.tsharkProcess = null;
    }
    
    if (this.flowInterval) {
      clearInterval(this.flowInterval);
      this.flowInterval = null;
    }
    
    // Clear flow window
    this.flowWindow = [];
    
    console.log('Packet capture stopped');
  }
}

module.exports = PacketCapture;