// Real-time Client Manager for WebSocket Communication
// Handles WebSocket connections, message handling, and real-time updates on the client side

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

class RealTimeClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isConnected = false;
  private eventListeners: Map<string, Set<RealTimeEventListener>> = new Map();
  private messageQueue: GameMessage[] = [];

  private playerId: string | null = null;
  private username: string | null = null;
  private sessionId: string | null = null;

  constructor() {
    // Auto-reconnect on page visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !this.isConnected && !this.isConnecting) {
          this.reconnect();
        }
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
      console.log('Connecting to WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        const connectionTimeout = setTimeout(() => {
          console.error('WebSocket connection timeout');
          this.handleConnectionFailure();
          resolve(false);
        }, 10000); // 10 second timeout

        this.ws!.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected successfully');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000; // Reset delay
          this.startHeartbeat();
          this.processMessageQueue();
          resolve(true);
        };

        this.ws!.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws!.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.handleDisconnection();
          resolve(false);
        };

        this.ws!.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          this.handleConnectionFailure();
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleConnectionFailure();
      return false;
    }
  }

  private getWebSocketUrl(): string {
    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? '8080' : window.location.port;
    
    const params = new URLSearchParams({
      playerId: this.playerId!,
      username: this.username!,
      sessionId: this.sessionId!
    });

    return `${protocol}//${host}:${port}/api/websocket?${params}`;
  }

  // Handle incoming messages
  private handleMessage(event: MessageEvent): void {
    try {
      const message: GameMessage = JSON.parse(event.data);
      console.log('Received WebSocket message:', message);

      // Emit to specific event listeners
      this.emit(message.type, message);
      
      // Emit to general message listeners
      this.emit('message', message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  // Handle disconnection
  private handleDisconnection(): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    // Attempt reconnection if not intentional
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnect();
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts', {
        type: 'error',
        data: { message: 'Failed to reconnect after multiple attempts' },
        timestamp: new Date().toISOString(),
        messageId: `error_${Date.now()}`
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

  // Send message to server
  send(message: Omit<GameMessage, 'timestamp' | 'messageId'>): void {
    const fullMessage: GameMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(fullMessage);
      console.log('WebSocket not connected, message queued');
    }
  }

  // Process queued messages
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      } else {
        // Re-queue if connection lost
        this.messageQueue.unshift(message);
        break;
      }
    }
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

  // Heartbeat system
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          playerId: this.playerId!
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Disconnect
  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnection
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.messageQueue = [];
  }

  // Get connection status
  getConnectionStatus(): { connected: boolean; connecting: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Singleton instance
const realTimeClient = new RealTimeClient();

export default realTimeClient;