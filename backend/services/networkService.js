import { networkInterfaces } from 'os';
import EventEmitter from 'events';
import dns from 'dns';
import logger from '../utils/logger.js';

class NetworkService extends EventEmitter {
  constructor() {
    super();
    this.isMonitoring = false;
    this.interface = null;
    this.stats = {
      connections: 0,
      bytes: 0,
      startTime: null,
      lastActivity: null,
      activeConnections: new Map()
    };
  }

  listInterfaces() {
    try {
      const interfaces = networkInterfaces();
      const result = [];

      Object.entries(interfaces).forEach(([name, iface]) => {
        const ipv4 = iface.find(i => i.family === 'IPv4' && !i.internal);
        if (ipv4) {
          result.push({
            name,
            description: name,
            ip: ipv4.address,
            mac: iface[0].mac || '00:00:00:00:00:00',
            type: this.getInterfaceType(name)
          });
        }
      });

      return result;
    } catch (error) {
      logger.error('Error listing network interfaces:', error);
      throw new Error('Failed to list network interfaces');
    }
  }

  getInterfaceType(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('ethernet') || lowerName.startsWith('eth')) return 'Ethernet';
    if (lowerName.includes('wi-fi') || lowerName.startsWith('wlan') || lowerName.startsWith('wi')) return 'WiFi';
    if (lowerName.includes('loopback') || name === 'lo') return 'Loopback';
    return 'Other';
  }

  async startMonitoring(interfaceName) {
    if (this.isMonitoring) {
      await this.stopMonitoring();
    }

    try {
      const interfaces = this.listInterfaces();
      const iface = interfaces.find(i => i.name === interfaceName || i.ip === interfaceName);
      
      if (!iface) {
        throw new Error(`Interface ${interfaceName} not found`);
      }

      this.interface = iface.name;
      this.isMonitoring = true;
      this.stats = {
        connections: 0,
        bytes: 0,
        startTime: new Date(),
        lastActivity: new Date(),
        activeConnections: new Map()
      };

      logger.info(`Started monitoring network traffic on ${iface.name} (${iface.ip})`);
      
      // Simulate network activity for demo purposes
      this.simulateNetworkActivity(iface);
      
      return true;
    } catch (error) {
      this.stopMonitoring();
      logger.error('Error starting network monitoring:', error);
      throw error;
    }
  }

  simulateNetworkActivity(iface) {
    // Simulate network activity with random data
    this.simulator = setInterval(() => {
      if (!this.isMonitoring) return;
      
      const now = new Date();
      const remoteIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const port = Math.floor(Math.random() * 65535);
      const bytes = Math.floor(Math.random() * 1000) + 100;
      
      const connectionId = `${remoteIp}:${port}`;
      
      if (!this.stats.activeConnections.has(connectionId)) {
        this.stats.connections++;
        this.stats.activeConnections.set(connectionId, {
          remoteIp,
          port,
          startTime: now,
          bytesTransferred: 0
        });
      }
      
      const connection = this.stats.activeConnections.get(connectionId);
      connection.bytesTransferred += bytes;
      connection.lastActivity = now;
      
      // Remove inactive connections (older than 5 minutes)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      for (const [id, conn] of this.stats.activeConnections.entries()) {
        if (conn.lastActivity < fiveMinutesAgo) {
          this.stats.activeConnections.delete(id);
        }
      }
      
      this.stats.bytes += bytes;
      this.stats.lastActivity = now;
      
      // Emit network activity event
      this.emit('activity', {
        timestamp: now.toISOString(),
        interface: this.interface,
        localIp: iface.ip,
        remoteIp,
        port,
        bytes,
        connectionId
      });
      
      // Update status every 10 events
      if (this.stats.connections % 10 === 0) {
        this.emit('status', {
          isMonitoring: true,
          interface: this.interface,
          ...this.stats,
          activeConnections: this.stats.activeConnections.size
        });
      }
    }, 500); // Simulate activity every 500ms
  }

  async stopMonitoring() {
    if (!this.isMonitoring) return false;
    
    this.isMonitoring = false;
    
    if (this.simulator) {
      clearInterval(this.simulator);
      this.simulator = null;
    }
    
    this.emit('status', {
      isMonitoring: false,
      interface: this.interface,
      ...this.stats,
      activeConnections: this.stats.activeConnections.size
    });
    
    logger.info('Network monitoring stopped');
    return true;
  }

  async resolveHostname(ip) {
    return new Promise((resolve) => {
      dns.reverse(ip, (err, hostnames) => {
        if (err || !hostnames || hostnames.length === 0) {
          resolve(ip);
        } else {
          resolve(hostnames[0]);
        }
      });
    });
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      interface: this.interface,
      ...this.stats,
      activeConnections: this.stats.activeConnections.size
    };
  }
}

export default new NetworkService();
