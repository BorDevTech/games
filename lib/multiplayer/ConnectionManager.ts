// Modern Connection Manager - Direct multiplayer connections
// Implements WebSocket connections with modern gaming patterns
// Features: Direct connections, optimized protocol, connection quality management

import { IncomingMessage } from 'http';
import { ConnectionManager, NetworkMessage } from './GameServer';

export interface ConnectionInfo {
  id: string;
  playerId: string;
  username: string;
  socket: WebSocket;
  isAlive: boolean;
  lastPing: number;
  latency: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  connectedAt: number;
  currentLobby?: string | undefined;
}

export interface ConnectionQuality {
  latency: number;
  packetLoss: number;
  jitter: number;
  bandwidth: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Modern Connection Manager implementing direct multiplayer connections
 * Server-side implementation for Node.js WebSocket handling
 */
export class ModernConnectionManager implements ConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private playerToConnection: Map<string, string> = new Map();
  private lobbyConnections: Map<string, Set<string>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private qualityMonitorInterval: NodeJS.Timeout | null = null;
  
  // Performance optimization
  private messageQueue: Map<string, NetworkMessage[]> = new Map();
  private batchInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 16; // 60 FPS target
  
  // Connection quality tracking
  private connectionQualities: Map<string, ConnectionQuality> = new Map();
  
  constructor() {
    this.startHeartbeat();
    this.startQualityMonitoring();
    this.startMessageBatching();
  }

  /**
   * Handle new WebSocket connection with modern authentication
   * This is a server-side method that works with Node.js ws library
   */
  handleConnection(socket: unknown, request: IncomingMessage, connectionId: string): Promise<{ success: boolean; playerId?: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        // This method should only be called server-side with Node.js WebSocket
        if (typeof window !== 'undefined') {
          resolve({ success: false, error: 'Server-side method called in browser' });
          return;
        }

        const url = new URL(request.url || '', `http://${request.headers.host}`);
        const playerId = url.searchParams.get('playerId');
        const username = url.searchParams.get('username');
        const sessionId = url.searchParams.get('sessionId');

        if (!playerId || !username || !sessionId) {
          resolve({ success: false, error: 'Invalid authentication' });
          return;
        }

        // Close existing connection for this player
        this.disconnectPlayer(playerId);

        // Cast to browser WebSocket for compatibility
        const webSocket = socket as WebSocket;

        const connection: ConnectionInfo = {
          id: connectionId,
          playerId,
          username,
          socket: webSocket,
          isAlive: true,
          lastPing: Date.now(),
          latency: 0,
          messagesSent: 0,
          messagesReceived: 0,
          bytesTransferred: 0,
          connectedAt: Date.now()
        };

        this.connections.set(connectionId, connection);
        this.playerToConnection.set(playerId, connectionId);

        // Set up socket event handlers (browser-compatible)
        this.setupSocketHandlers(connection);

        // Initialize connection quality monitoring
        this.connectionQualities.set(connectionId, {
          latency: 0,
          packetLoss: 0,
          jitter: 0,
          bandwidth: 0,
          quality: 'excellent'
        });

        console.log(`Direct connection established: ${username} (${playerId}) -> ${connectionId}`);
        resolve({ success: true, playerId });

      } catch (error) {
        console.error('Connection setup error:', error);
        resolve({ success: false, error: 'Setup failed' });
      }
    });
  }

  /**
   * Setup WebSocket event handlers compatible with both browser and Node.js
   */
  private setupSocketHandlers(connection: ConnectionInfo): void {
    const { socket, id: connectionId, playerId } = connection;

    // Message handler (browser-compatible)
    socket.onmessage = (event: MessageEvent) => {
      try {
        connection.messagesReceived++;
        
        let data: string;
        if (typeof event.data === 'string') {
          data = event.data;
          connection.bytesTransferred += data.length;
        } else if (event.data instanceof ArrayBuffer) {
          data = new TextDecoder().decode(event.data);
          connection.bytesTransferred += event.data.byteLength;
        } else {
          console.error('Unsupported message data type');
          return;
        }

        const message: NetworkMessage = JSON.parse(data);
        
        // Update activity
        connection.isAlive = true;
        
        // Handle ping/pong for latency measurement
        if (message.type === 'heartbeat') {
          const now = Date.now();
          connection.latency = now - connection.lastPing;
          this.updateConnectionQuality(connectionId, connection.latency);
          
          // Send pong immediately
          this.sendToConnection(connectionId, {
            type: 'heartbeat',
            messageId: message.messageId,
            timestamp: now,
            playerId: 'server',
            data: { serverTime: now, clientTime: message.timestamp }
          });
          return;
        }

        // Emit message for game server processing
        this.emit('message', { connectionId, playerId, message });

      } catch (error) {
        console.error(`Message parsing error from ${playerId}:`, error);
        this.sendToConnection(connectionId, {
          type: 'error',
          messageId: `error_${Date.now()}`,
          timestamp: Date.now(),
          playerId: 'server',
          data: { message: 'Invalid message format' }
        });
      }
    };

    // Handle disconnection
    socket.onclose = (event: CloseEvent) => {
      console.log(`Player ${connection.username} disconnected: ${event.code} - ${event.reason}`);
      this.cleanupConnection(connectionId);
      this.emit('disconnect', { connectionId, playerId, code: event.code, reason: event.reason });
    };

    // Handle errors
    socket.onerror = (event: Event) => {
      console.error(`Socket error for ${connection.username}:`, event);
      this.cleanupConnection(connectionId);
      this.emit('disconnect', { connectionId, playerId, error: 'Socket error' });
    };
  }

  /**
   * Send message to specific player with optimization
   */
  async sendToPlayer(playerId: string, message: NetworkMessage): Promise<boolean> {
    const connectionId = this.playerToConnection.get(playerId);
    if (!connectionId) return false;

    return this.sendToConnection(connectionId, message);
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connectionId: string, message: NetworkMessage): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const data = JSON.stringify(message);
      
      // Browser WebSocket doesn't have bufferedAmount, so we'll send immediately
      connection.socket.send(data);
      connection.messagesSent++;
      connection.bytesTransferred += data.length;
      
      return true;
    } catch (error) {
      console.error(`Error sending to ${connectionId}:`, error);
      this.queueMessage(connectionId, message);
      return false;
    }
  }

  /**
   * Send message to all players in lobby with batching optimization
   */
  async sendToLobby(lobbyId: string, message: NetworkMessage, excludePlayer?: string): Promise<void> {
    const lobbyConnections = this.lobbyConnections.get(lobbyId);
    if (!lobbyConnections) return;
    
    for (const connectionId of lobbyConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.playerId !== excludePlayer) {
        // Use batching for lobby broadcasts
        this.queueMessage(connectionId, message);
      }
    }
  }

  /**
   * Broadcast message to all connected players
   */
  async broadcastToAll(message: NetworkMessage): Promise<void> {
    for (const connectionId of this.connections.keys()) {
      this.queueMessage(connectionId, message);
    }
  }

  /**
   * Add player to lobby for targeted messaging
   */
  addPlayerToLobby(playerId: string, lobbyId: string): void {
    const connectionId = this.playerToConnection.get(playerId);
    if (!connectionId) return;

    if (!this.lobbyConnections.has(lobbyId)) {
      this.lobbyConnections.set(lobbyId, new Set());
    }

    this.lobbyConnections.get(lobbyId)!.add(connectionId);
    
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.currentLobby = lobbyId;
    }
  }

  /**
   * Remove player from lobby
   */
  removePlayerFromLobby(playerId: string, lobbyId: string): void {
    const connectionId = this.playerToConnection.get(playerId);
    if (!connectionId) return;

    const lobbyConnections = this.lobbyConnections.get(lobbyId);
    if (lobbyConnections) {
      lobbyConnections.delete(connectionId);
      
      if (lobbyConnections.size === 0) {
        this.lobbyConnections.delete(lobbyId);
      }
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      delete connection.currentLobby;
    }
  }

  /**
   * Check if player is connected
   */
  isPlayerConnected(playerId: string): boolean {
    const connectionId = this.playerToConnection.get(playerId);
    if (!connectionId) return false;

    const connection = this.connections.get(connectionId);
    return connection !== undefined && connection.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get player latency
   */
  getPlayerLatency(playerId: string): number {
    const connectionId = this.playerToConnection.get(playerId);
    if (!connectionId) return -1;

    const connection = this.connections.get(connectionId);
    return connection?.latency || -1;
  }

  /**
   * Get connection quality for player
   */
  getConnectionQuality(playerId: string): ConnectionQuality | null {
    const connectionId = this.playerToConnection.get(playerId);
    if (!connectionId) return null;

    return this.connectionQualities.get(connectionId) || null;
  }

  /**
   * Disconnect specific player
   */
  disconnectPlayer(playerId: string): void {
    const connectionId = this.playerToConnection.get(playerId);
    if (!connectionId) return;

    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.socket.close(1000, 'Server disconnect');
      this.cleanupConnection(connectionId);
    }
  }

  /**
   * Message queuing system for batching
   */
  private queueMessage(connectionId: string, message: NetworkMessage): void {
    if (!this.messageQueue.has(connectionId)) {
      this.messageQueue.set(connectionId, []);
    }
    
    this.messageQueue.get(connectionId)!.push(message);
  }

  /**
   * Process message queue with batching
   */
  private processBatchedMessages(): void {
    for (const [connectionId, messages] of this.messageQueue.entries()) {
      if (messages.length === 0) continue;

      const connection = this.connections.get(connectionId);
      if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
        this.messageQueue.delete(connectionId);
        continue;
      }

      // Send all queued messages
      const batch = messages.splice(0, this.BATCH_SIZE);
      for (const message of batch) {
        this.sendToConnection(connectionId, message);
      }

      // Clear empty queues
      if (messages.length === 0) {
        this.messageQueue.delete(connectionId);
      }
    }
  }

  /**
   * Update connection quality metrics
   */
  private updateConnectionQuality(connectionId: string, latency: number): void {
    const quality = this.connectionQualities.get(connectionId);
    if (!quality) return;

    // Calculate jitter (latency variation)
    const jitter = Math.abs(latency - quality.latency);
    quality.jitter = (quality.jitter * 0.9) + (jitter * 0.1); // Smooth jitter

    quality.latency = latency;

    // Determine overall quality
    if (latency < 50 && quality.jitter < 10) {
      quality.quality = 'excellent';
    } else if (latency < 100 && quality.jitter < 20) {
      quality.quality = 'good';
    } else if (latency < 200 && quality.jitter < 50) {
      quality.quality = 'fair';
    } else {
      quality.quality = 'poor';
    }
  }

  /**
   * Heartbeat system for connection monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [connectionId, connection] of this.connections.entries()) {
        if (!connection.isAlive) {
          console.log(`Heartbeat failed for ${connection.username}, terminating connection`);
          connection.socket.close();
          this.cleanupConnection(connectionId);
          continue;
        }

        connection.isAlive = false;
        connection.lastPing = now;
        
        if (connection.socket.readyState === WebSocket.OPEN) {
          try {
            // Send heartbeat message (browser WebSocket doesn't have ping method)
            this.sendToConnection(connectionId, {
              type: 'heartbeat',
              messageId: `ping_${now}`,
              timestamp: now,
              playerId: 'server'
            });
          } catch (error) {
            console.error(`Ping error for ${connectionId}:`, error);
            this.cleanupConnection(connectionId);
          }
        }
      }
    }, 30000); // 30 second intervals
  }

  /**
   * Connection quality monitoring
   */
  private startQualityMonitoring(): void {
    this.qualityMonitorInterval = setInterval(() => {
      for (const [connectionId, quality] of this.connectionQualities.entries()) {
        const connection = this.connections.get(connectionId);
        if (!connection) continue;

        // Log poor connections
        if (quality.quality === 'poor') {
          console.warn(`Poor connection quality for ${connection.username}: ${quality.latency}ms, jitter: ${quality.jitter}ms`);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Message batching system
   */
  private startMessageBatching(): void {
    this.batchInterval = setInterval(() => {
      this.processBatchedMessages();
    }, this.BATCH_TIMEOUT);
  }

  /**
   * Cleanup connection
   */
  private cleanupConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from player mapping
    this.playerToConnection.delete(connection.playerId);
    
    // Remove from lobby
    if (connection.currentLobby) {
      this.removePlayerFromLobby(connection.playerId, connection.currentLobby);
    }
    
    // Remove connection tracking
    this.connections.delete(connectionId);
    this.connectionQualities.delete(connectionId);
    this.messageQueue.delete(connectionId);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const totalConnections = this.connections.size;
    const totalLobbies = this.lobbyConnections.size;
    
    let totalMessages = 0;
    let totalBytes = 0;
    let totalLatency = 0;
    
    for (const connection of this.connections.values()) {
      totalMessages += connection.messagesSent + connection.messagesReceived;
      totalBytes += connection.bytesTransferred;
      totalLatency += connection.latency;
    }

    return {
      totalConnections,
      totalLobbies,
      totalMessages,
      totalBytes,
      averageLatency: totalConnections > 0 ? totalLatency / totalConnections : 0,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0)
    };
  }

  /**
   * Event emitter functionality
   */
  private eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Event handler error for ${event}:`, error);
        }
      }
    }
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    console.log('Shutting down connection manager...');
    
    // Clear intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.qualityMonitorInterval) clearInterval(this.qualityMonitorInterval);
    if (this.batchInterval) clearInterval(this.batchInterval);
    
    // Close all connections
    for (const connection of this.connections.values()) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.close(1000, 'Server shutdown');
      }
    }
    
    // Clear all maps
    this.connections.clear();
    this.playerToConnection.clear();
    this.lobbyConnections.clear();
    this.connectionQualities.clear();
    this.messageQueue.clear();
  }
}