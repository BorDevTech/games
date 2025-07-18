// Real-time Client Manager for WebSocket Communication
// Implements MDN WebSocket API standards with proper backpressure handling
// Provides cross-browser compatibility and robust error handling

export interface GameMessage {
  type: 'join_room' | 'leave_room' | 'game_action' | 'room_update' | 'player_update' | 'error' | 'heartbeat' | 'connection_established';
  roomId?: string;
  playerId?: string;
  data?: Record<string, unknown>;
  timestamp: string;
  messageId: string;
}

export interface RealTimeEventListener {
  (message: GameMessage): void;
}

// Message queue with backpressure handling
class ClientMessageQueue {
  private queue: GameMessage[] = [];
  private readonly maxSize: number = 100;
  private processing: boolean = false;

  enqueue(message: GameMessage): boolean {
    if (this.queue.length >= this.maxSize) {
      console.warn('Client message queue full, dropping oldest message');
      this.queue.shift();
    }
    
    this.queue.push(message);
    return true;
  }

  dequeue(): GameMessage | undefined {
    return this.queue.shift();
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }

  setProcessing(processing: boolean): void {
    this.processing = processing;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

class RealTimeClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isConnected = false;
  private eventListeners: Map<string, Set<RealTimeEventListener>> = new Map();
  private messageQueue: ClientMessageQueue = new ClientMessageQueue();

  private playerId: string | null = null;
  private username: string | null = null;
  private sessionId: string | null = null;
  
  // Performance monitoring
  private lastPingTime: number = 0;
  private latency: number = 0;

  constructor() {
    // Auto-reconnect on page visibility change (MDN recommended practice)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !this.isConnected && !this.isConnecting) {
          this.reconnect();
        }
      });
    }

    // Handle beforeunload to gracefully close connections
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }

  // Connect to WebSocket server
  async connect(playerId: string, username: string, sessionId: string): Promise<boolean> {
    if (this.isConnecting || this.isConnected) {
      console.log('Already connected or connecting to WebSocket');
      return this.isConnected;
    }

    this.playerId = playerId;
    this.username = username;
    this.sessionId = sessionId;

    return this.attemptConnection();
  }

  private async attemptConnection(): Promise<boolean> {
    if (!this.playerId || !this.username || !this.sessionId) {
      console.error('Missing connection parameters');
      return false;
    }

    this.isConnecting = true;

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('Attempting WebSocket connection following MDN standards:', wsUrl);

      // Use standard WebSocket constructor as per MDN documentation
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        // Set connection timeout (5 seconds as per best practices)
        this.connectionTimeout = setTimeout(() => {
          console.warn('WebSocket connection timeout - graceful fallback to polling');
          this.handleConnectionFailure();
          resolve(false);
        }, 5000);

        // Standard WebSocket event handlers as per MDN documentation
        this.ws!.onopen = () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          console.log('WebSocket connection established successfully');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000; // Reset delay
          this.startHeartbeat();
          this.processMessageQueue();
          
          // Emit connection established event
          this.emit('connection_established', {
            type: 'connection_established',
            data: { connected: true, latency: this.latency },
            timestamp: new Date().toISOString(),
            messageId: `conn_established_${Date.now()}`
          });
          
          resolve(true);
        };

        this.ws!.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws!.onclose = (event) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
          this.handleDisconnection(event.code, event.reason);
          resolve(false);
        };

        this.ws!.onerror = (error) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          console.warn('WebSocket connection error - graceful fallback available:', error);
          this.handleConnectionFailure();
          resolve(false);
        };
      });
    } catch (error) {
      console.warn('WebSocket connection failed - using fallback synchronization:', error);
      this.handleConnectionFailure();
      return false;
    }
  }

  private getWebSocketUrl(): string {
    // Construct WebSocket URL following MDN best practices
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // Includes port if present
    
    const params = new URLSearchParams({
      playerId: this.playerId!,
      username: this.username!,
      sessionId: this.sessionId!
    });

    // Use dedicated WebSocket endpoint (not Next.js API route)
    return `${protocol}//${host}/api/websocket?${params}`;
  }

  // Handle incoming messages with proper parsing and error handling
  private handleMessage(event: MessageEvent): void {
    try {
      const message: GameMessage = JSON.parse(event.data);
      
      // Update latency for heartbeat responses
      if (message.type === 'heartbeat' && this.lastPingTime > 0) {
        this.latency = Date.now() - this.lastPingTime;
      }
      
      console.log('Received WebSocket message:', message.type, message.messageId);

      // Emit to specific event listeners
      this.emit(message.type, message);
      
      // Emit to general message listeners
      this.emit('message', message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.emit('error', {
        type: 'error',
        data: { 
          message: 'Message parsing error', 
          error: error instanceof Error ? error.message : String(error)
        },
        timestamp: new Date().toISOString(),
        messageId: `parse_error_${Date.now()}`
      });
    }
  }

  // Handle disconnection with proper close code analysis
  private handleDisconnection(code?: number, reason?: string): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    // Analyze close codes as per WebSocket RFC
    const shouldReconnect = !code || (code !== 1000 && code !== 1001 && code !== 1005);
    
    if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnect();
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts', {
        type: 'error',
        data: { 
          message: 'Failed to reconnect after multiple attempts',
          code,
          reason,
          attempts: this.reconnectAttempts
        },
        timestamp: new Date().toISOString(),
        messageId: `max_reconnect_${Date.now()}`
      });
    }
  }

  // Handle connection failure
  private handleConnectionFailure(): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
  }

  // Reconnect to WebSocket
  private async reconnect(): Promise<void> {
    if (this.isConnecting || this.isConnected) return;

    console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
    
    if (this.playerId && this.username && this.sessionId) {
      await this.attemptConnection();
    }
  }

  // Send message with backpressure handling as per MDN recommendations
  send(message: Omit<GameMessage, 'timestamp' | 'messageId'>): void {
    const fullMessage: GameMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        // Check bufferedAmount for backpressure handling
        if (this.ws.bufferedAmount > 1024 * 1024) { // 1MB threshold
          console.warn('WebSocket buffer full, queuing message');
          this.messageQueue.enqueue(fullMessage);
        } else {
          this.ws.send(JSON.stringify(fullMessage));
        }
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.messageQueue.enqueue(fullMessage);
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.enqueue(fullMessage);
      console.log('WebSocket not connected, message queued');
    }
  }

  // Process queued messages with rate limiting
  private processMessageQueue(): void {
    if (this.messageQueue.isProcessing()) return;
    
    this.messageQueue.setProcessing(true);
    
    const processNext = () => {
      const message = this.messageQueue.dequeue();
      if (!message) {
        this.messageQueue.setProcessing(false);
        return;
      }
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          // Check backpressure before sending
          if (this.ws.bufferedAmount < 1024 * 1024) { // 1MB threshold
            this.ws.send(JSON.stringify(message));
            // Process next message with small delay to avoid overwhelming
            setTimeout(processNext, 10);
          } else {
            // Re-queue message and wait for buffer to clear
            this.messageQueue.enqueue(message);
            setTimeout(processNext, 100);
          }
        } catch (error) {
          console.error('Error sending queued message:', error);
          setTimeout(processNext, 10);
        }
      } else {
        // Connection lost, stop processing
        this.messageQueue.enqueue(message);
        this.messageQueue.setProcessing(false);
      }
    };
    
    processNext();
  }

  // Join a room
  joinRoom(roomId: string): void {
    this.send({
      type: 'join_room',
      roomId,
      playerId: this.playerId!,
      data: { username: this.username }
    });
  }

  // Leave a room
  leaveRoom(roomId: string): void {
    this.send({
      type: 'leave_room',
      roomId,
      playerId: this.playerId!,
      data: { username: this.username }
    });
  }

  // Send game action
  sendGameAction(roomId: string, action: string, data: Record<string, unknown>): void {
    this.send({
      type: 'game_action',
      roomId,
      playerId: this.playerId!,
      data: { action, ...data }
    });
  }

  // Event listener management
  on(event: string, listener: RealTimeEventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off(event: string, listener: RealTimeEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.eventListeners.delete(event);
      }
    }
  }

  private emit(event: string, message: GameMessage): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(message);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
    }
  }

  // Heartbeat system with latency measurement
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send({
          type: 'heartbeat',
          playerId: this.playerId!
        });
      }
    }, 30000); // Send heartbeat every 30 seconds as per best practices
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Disconnect with proper cleanup
  disconnect(): void {
    console.log('Disconnecting WebSocket client gracefully');
    
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnection
    this.stopHeartbeat();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.ws) {
      // Send close frame with proper code (normal closure)
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.messageQueue.clear();
  }

  // Get comprehensive connection status
  getConnectionStatus(): { 
    connected: boolean; 
    connecting: boolean; 
    reconnectAttempts: number;
    latency: number;
    queueSize: number;
  } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      latency: this.latency,
      queueSize: this.messageQueue.size()
    };
  }
}

// Singleton instance
const realTimeClient = new RealTimeClient();

export default realTimeClient;