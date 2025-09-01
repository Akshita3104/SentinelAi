const EventEmitter = require('events');

class PacketCapture extends EventEmitter {
  constructor() {
    super();
    this.isCapturing = false;
    this.flowWindow = [];
    this.windowDuration = 60000; // 60 seconds
    this.simulationInterval = null;
  }

  startCapture(targetIP, interfaceName) {
    if (this.isCapturing) return;
    
    console.log('⚠️  Real packet capture not available. Switching to simulation mode.');
    this.emit('simulationMode', 'Real packet capture requires additional system dependencies. Using simulation mode instead.');
    
    this.isCapturing = true;
    this.flowWindow = [];
    
    // Start simulation mode
    this.startSimulation(targetIP);
  }

  startSimulation(targetIP) {
    // Generate simulated network traffic
    this.simulationInterval = setInterval(() => {
      this.generateSimulatedPackets(targetIP);
      this.processFlows(targetIP);
    }, 2000);
  }

  generateSimulatedPackets(targetIP) {
    const timestamp = Date.now();
    const packetCount = Math.floor(Math.random() * 50) + 10;
    
    for (let i = 0; i < packetCount; i++) {
      const packet = {
        timestamp: timestamp + (i * 10),
        srcIP: this.generateRandomIP(),
        dstIP: targetIP,
        srcPort: Math.floor(Math.random() * 65535),
        dstPort: [80, 443, 22, 21, 25][Math.floor(Math.random() * 5)],
        protocol: [6, 17, 1][Math.floor(Math.random() * 3)], // TCP, UDP, ICMP
        size: Math.floor(Math.random() * 1500) + 64
      };
      
      this.flowWindow.push(packet);
    }
    
    // Remove old packets
    const cutoff = timestamp - this.windowDuration;
    this.flowWindow = this.flowWindow.filter(p => p.timestamp > cutoff);
  }

  generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
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
        protocol: f.protocol,
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
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }
}

module.exports = PacketCapture;