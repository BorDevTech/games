// Modern Multiplayer Client - Direct connection to game server
// Implements client-side networking for modern multiplayer games
// Features: Direct connections, optimistic updates, lag compensation

import { EventEmitter } from 'events';

export interface ClientNetworkMessage {
  type: 'connect' | 'disconnect' | 'join_lobby' | 'leave_lobby' | 'start_game' | 
        'game_action' | 'player_input' | 'state_sync' | 'heartbeat' | 'error' |
        'lobby_update' | 'lobby_closed' | 'player_joined' | 'player_left';
  messageId: string;
  timestamp: number;
  playerId: string;
  lobbyId?: string;
  data?: Record<string, unknown>;
  sequenceNumber?: number;
}

export interface LobbyInfo {
  id: string;
  hostId: string;
  gameType: 'uno' | 'tetris' | 'tictactoe';
  gameState: 'waiting' | 'starting' | 'playing' | 'ended';
  maxPlayers: number;
  settings: GameSettings;
  players: PlayerInfo[];
}

export interface PlayerInfo {
  id: string;
  username: string;
  ready: boolean;
  latency: number;
  isHost?: boolean;
}

export interface GameSettings {
  maxPlayers: number;
  gameMode: 'classic' | 'speed' | 'custom';
  enablePowerCards?: boolean;
  timeLimit?: number;
  customRules?: string[];
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  reconnectAttempts: number;
  lastError?: string;
}

export interface MatchmakingPreferences {
  gameType: 'uno' | 'tetris' | 'tictactoe';
  gameMode?: 'classic' | 'speed' | 'custom';
  maxLatency?: number;
  preferredRegion?: string;
}

/**
 * Modern Multiplayer Client for direct game server connections
 * Implements optimistic updates, lag compensation, and modern networking patterns
 */
export class MultiplayerClient extends EventEmitter {
  private socket: WebSocket | null = null;
  private playerId: string | null = null;
  private username: string | null = null;
  private sessionId: string | null = null;
  
  // Connection management
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private connectionTimeout: NodeJS.Timeout | null = null;
  
  // Network optimization
  private sequenceNumber: number = 0;
  private pendingInputs: Map<number, ClientNetworkMessage> = new Map();
  private lastServerSequence: number = 0;
  private serverTimeOffset: number = 0;
  
  // Performance monitoring
  private latency: number = 0;
  private lastPingTime: number = 0;
  private connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Game state
  private currentLobby: LobbyInfo | null = null;
  private gameState: Record<string, unknown> = {};
  private localState: Record<string, unknown> = {}; // For optimistic updates
  
  // Message queuing for offline support
  private messageQueue: ClientNetworkMessage[] = [];
  private readonly MAX_QUEUE_SIZE = 100;

  constructor() {
    super();
    
    // Handle page visibility for connection management
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !this.isConnected && !this.isConnecting) {
          this.reconnect();
        }
      });
    }

    // Handle beforeunload for graceful disconnect
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }

  /**
   * Connect to game server with modern authentication
   */
  async connect(playerId: string, username: string, sessionId: string): Promise<boolean> {
    if (this.isConnecting || this.isConnected) {
      console.log('Already connected or connecting');
      return this.isConnected;
    }

    this.playerId = playerId;
    this.username = username;
    this.sessionId = sessionId;

    return this.attemptConnection();
  }

  /**
   * Attempt WebSocket connection with modern patterns
   */
  private async attemptConnection(): Promise<boolean> {
    if (!this.playerId || !this.username || !this.sessionId) {
      console.error('Missing connection credentials');
      return false;
    }

    this.isConnecting = true;
    this.emit('connecting');

    try {
      const wsUrl = this.buildWebSocketUrl();
      console.log('Connecting to game server:', wsUrl);

      this.socket = new WebSocket(wsUrl);

      return new Promise((resolve) => {
        // Connection timeout
        this.connectionTimeout = setTimeout(() => {
          console.warn('Connection timeout');
          this.handleConnectionFailure();
          resolve(false);
        }, 10000); // 10 second timeout

        this.socket!.onopen = () => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          console.log('Connected to game server');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          
          this.startHeartbeat();
          this.flushMessageQueue();
          
          this.emit('connected');
          resolve(true);
        };

        this.socket!.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.socket!.onclose = (event) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          console.log(`Connection closed: ${event.code} - ${event.reason}`);
          this.handleDisconnection(event.code, event.reason);
          resolve(false);
        };

        this.socket!.onerror = (error) => {
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          console.error('Connection error:', error);
          this.handleConnectionFailure();
          resolve(false);
        };
      });
    } catch (error) {
      console.error('Failed to create connection:', error);
      this.handleConnectionFailure();
      return false;
    }
  }

  /**
   * Build WebSocket URL with parameters
   */
  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    const params = new URLSearchParams({
      playerId: this.playerId!,
      username: this.username!,
      sessionId: this.sessionId!
    });

    return `${protocol}//${host}/api/websocket?${params}`;
  }

  /**
   * Handle incoming messages with modern parsing
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: ClientNetworkMessage = JSON.parse(event.data);
      
      // Handle heartbeat responses for latency calculation
      if (message.type === 'heartbeat') {
        if (this.lastPingTime > 0) {
          this.latency = Date.now() - this.lastPingTime;
          this.updateConnectionQuality();
        }
        
        // Calculate server time offset for synchronization
        if (message.data?.serverTime && message.data?.clientTime) {
          const serverTime = message.data.serverTime as number;
          const clientTime = message.data.clientTime as number;
          const roundTripTime = Date.now() - clientTime;
          this.serverTimeOffset = serverTime - clientTime - (roundTripTime / 2);
        }
        return;
      }

      // Handle sequence validation for anti-cheat
      if (message.sequenceNumber) {
        this.lastServerSequence = Math.max(this.lastServerSequence, message.sequenceNumber);
      }

      console.log('Received message:', message.type);
      
      // Route message to appropriate handler
      this.routeMessage(message);
      
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Route messages to appropriate handlers
   */
  private routeMessage(message: ClientNetworkMessage): void {
    switch (message.type) {
      case 'connect':
        this.handleConnectionConfirmation(message);
        break;
      
      case 'join_lobby':
        this.handleLobbyJoined(message);
        break;
      
      case 'leave_lobby':
        this.handleLobbyLeft(message);
        break;
      
      case 'lobby_update':
      case 'player_joined':
      case 'player_left':
        this.handleLobbyUpdate(message);
        break;
      
      case 'start_game':
        this.handleGameStart(message);
        break;
      
      case 'state_sync':
        this.handleStateSync(message);
        break;
      
      case 'lobby_closed':
        this.handleLobbyClosed(message);
        break;
      
      case 'error':
        this.handleError(message);
        break;
      
      default:
        this.emit('message', message);
    }
  }

  /**
   * Modern matchmaking - Find or create game
   */
  async findMatch(preferences: MatchmakingPreferences): Promise<string | null> {
    if (!this.isConnected) {
      console.error('Not connected to server');
      return null;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.off('lobby_joined', handler);
        resolve(null);
      }, 30000); // 30 second timeout

      const handler = (lobbyInfo: LobbyInfo) => {
        clearTimeout(timeoutId);
        resolve(lobbyInfo.id);
      };

      this.once('lobby_joined', handler);

      this.send({
        type: 'game_action',
        data: {
          action: 'find_match',
          preferences
        }
      });
    });
  }

  /**
   * Create custom lobby
   */
  async createLobby(gameType: 'uno' | 'tetris' | 'tictactoe', settings?: Partial<GameSettings>): Promise<string | null> {
    if (!this.isConnected) {
      console.error('Not connected to server');
      return null;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.off('lobby_created', handler);
        resolve(null);
      }, 10000);

      const handler = (lobbyInfo: LobbyInfo) => {
        clearTimeout(timeoutId);
        resolve(lobbyInfo.id);
      };

      this.once('lobby_created', handler);

      this.send({
        type: 'game_action',
        data: {
          action: 'create_lobby',
          gameType,
          settings
        }
      });
    });
  }

  /**
   * Join specific lobby by ID
   */
  async joinLobby(lobbyId: string): Promise<boolean> {
    if (!this.isConnected) {
      console.error('Not connected to server');
      return false;
    }

    this.send({
      type: 'join_lobby',
      lobbyId,
      data: {}
    });

    return true;
  }

  /**
   * Leave current lobby
   */
  async leaveLobby(): Promise<boolean> {
    if (!this.isConnected || !this.currentLobby) {
      return false;
    }

    this.send({
      type: 'leave_lobby',
      lobbyId: this.currentLobby.id,
      data: {}
    });

    return true;
  }

  /**
   * Set ready status in lobby
   */
  setReady(ready: boolean): void {
    if (!this.currentLobby) return;

    this.send({
      type: 'game_action',
      lobbyId: this.currentLobby.id,
      data: {
        action: 'set_ready',
        ready
      }
    });
  }

  /**
   * Start game (host only)
   */
  startGame(): void {
    if (!this.currentLobby) return;

    this.send({
      type: 'start_game',
      lobbyId: this.currentLobby.id,
      data: {}
    });
  }

  /**
   * Send game action with optimistic updates
   */
  sendGameAction(action: string, data: Record<string, unknown>, optimistic: boolean = true): void {
    if (!this.currentLobby) return;

    const inputSequence = ++this.sequenceNumber;
    
    const message: ClientNetworkMessage = {
      type: 'player_input',
      messageId: `input_${inputSequence}`,
      timestamp: this.getServerTime(),
      playerId: this.playerId!,
      lobbyId: this.currentLobby.id,
      sequenceNumber: inputSequence,
      data: { action, ...data }
    };

    // Store pending input for rollback if needed
    this.pendingInputs.set(inputSequence, message);

    // Apply optimistic update locally
    if (optimistic) {
      this.applyOptimisticUpdate(action, data);
    }

    this.send(message);
  }

  /**
   * Send message with queuing support
   */
  private send(message: Omit<ClientNetworkMessage, 'messageId' | 'timestamp' | 'playerId'>): void {
    const fullMessage: ClientNetworkMessage = {
      ...message,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      playerId: this.playerId!
    };

    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(fullMessage));
      } catch (error) {
        console.error('Error sending message:', error);
        this.queueMessage(fullMessage);
      }
    } else {
      this.queueMessage(fullMessage);
    }
  }

  /**
   * Queue messages for when connection is restored
   */
  private queueMessage(message: ClientNetworkMessage): void {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      this.messageQueue.shift(); // Remove oldest message
    }
    
    this.messageQueue.push(message);
  }

  /**
   * Flush queued messages when connection restored
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error flushing queued message:', error);
        this.messageQueue.unshift(message); // Put it back
        break;
      }
    }
  }

  /**
   * Message handlers
   */
  private handleConnectionConfirmation(message: ClientNetworkMessage): void {
    if (message.data?.availableLobbies) {
      this.emit('lobbies_updated', message.data.availableLobbies);
    }
    this.emit('server_features', message.data?.features || []);
  }

  private handleLobbyJoined(message: ClientNetworkMessage): void {
    if (message.data?.lobbyState) {
      this.currentLobby = message.data.lobbyState as LobbyInfo;
      this.emit('lobby_joined', this.currentLobby);
    }
  }

  private handleLobbyLeft(message: ClientNetworkMessage): void {
    if (message.data?.lobbyState) {
      this.currentLobby = message.data.lobbyState as LobbyInfo;
      this.emit('lobby_updated', this.currentLobby);
    }
  }

  private handleLobbyUpdate(message: ClientNetworkMessage): void {
    if (message.data?.lobbyState) {
      this.currentLobby = message.data.lobbyState as LobbyInfo;
      this.emit('lobby_updated', this.currentLobby);
    }
  }

  private handleGameStart(message: ClientNetworkMessage): void {
    if (message.data?.gameInstance) {
      this.gameState = {};
      this.localState = {};
      this.pendingInputs.clear();
      this.emit('game_started', message.data);
    }
  }

  private handleStateSync(message: ClientNetworkMessage): void {
    if (message.data?.gameState && message.sequenceNumber) {
      // Validate and apply server state
      this.gameState = message.data.gameState as Record<string, unknown>;
      
      // Remove confirmed inputs
      for (const [seq] of this.pendingInputs) {
        if (seq <= message.sequenceNumber) {
          this.pendingInputs.delete(seq);
        }
      }
      
      // Apply any remaining pending inputs (for lag compensation)
      this.reapplyPendingInputs();
      
      this.emit('game_state_updated', this.gameState);
    }
  }

  private handleLobbyClosed(message: ClientNetworkMessage): void {
    this.currentLobby = null;
    this.emit('lobby_closed', message.data?.reason || 'unknown');
  }

  private handleError(message: ClientNetworkMessage): void {
    console.error('Server error:', message.data?.message);
    this.emit('error', message.data);
  }

  /**
   * Optimistic updates and lag compensation
   */
  private applyOptimisticUpdate(action: string, data: Record<string, unknown>): void {
    // Apply update to local state immediately
    // This would be game-specific logic
    this.localState = { ...this.localState, lastOptimisticAction: { action, data, timestamp: Date.now() } };
    this.emit('local_state_updated', this.localState);
  }

  private reapplyPendingInputs(): void {
    // Reapply any pending inputs that haven't been confirmed by server
    // This ensures smooth gameplay despite network lag
    for (const [, input] of this.pendingInputs) {
      if (input.data?.action) {
        this.applyOptimisticUpdate(input.data.action as string, input.data);
      }
    }
  }

  /**
   * Utility methods
   */
  private getServerTime(): number {
    return Date.now() + this.serverTimeOffset;
  }

  private updateConnectionQuality(): void {
    if (this.latency < 50) {
      this.connectionQuality = 'excellent';
    } else if (this.latency < 100) {
      this.connectionQuality = 'good';
    } else if (this.latency < 200) {
      this.connectionQuality = 'fair';
    } else {
      this.connectionQuality = 'poor';
    }
  }

  /**
   * Heartbeat system
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send({
          type: 'heartbeat',
          data: { clientTime: Date.now() }
        });
      }
    }, 5000); // Every 5 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Connection management
   */
  private handleDisconnection(code: number, reason: string): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    this.emit('disconnected', { code, reason });

    // Auto-reconnect logic
    if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
      
      setTimeout(() => {
        this.reconnect();
      }, delay);
    }
  }

  private handleConnectionFailure(): void {
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts++;
  }

  private async reconnect(): Promise<void> {
    if (this.isConnecting || this.isConnected) return;
    
    if (this.playerId && this.username && this.sessionId) {
      await this.attemptConnection();
    }
  }

  /**
   * Public API
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      latency: this.latency,
      quality: this.connectionQuality,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  getCurrentLobby(): LobbyInfo | null {
    return this.currentLobby;
  }

  getGameState(): Record<string, unknown> {
    return { ...this.gameState };
  }

  getLocalState(): Record<string, unknown> {
    return { ...this.localState };
  }

  disconnect(): void {
    console.log('Disconnecting from game server');
    
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnection
    this.stopHeartbeat();
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.currentLobby = null;
    this.gameState = {};
    this.localState = {};
    this.pendingInputs.clear();
    this.messageQueue.length = 0;
  }
}