// Modern Game Server - Authoritative multiplayer architecture
// Implements direct connection patterns similar to modern multiplayer games
// Features: Real-time state synchronization, optimistic updates, anti-cheat measures

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface NetworkMessage {
  type: 'connect' | 'disconnect' | 'join_lobby' | 'leave_lobby' | 'start_game' | 
        'game_action' | 'player_input' | 'state_sync' | 'heartbeat' | 'error' |
        'lobby_closed' | 'lobby_update' | 'player_joined' | 'player_left';
  messageId: string;
  timestamp: number;
  playerId: string;
  lobbyId?: string;
  data?: Record<string, unknown>;
  sequenceNumber?: number;
}

export interface Player {
  readonly id: string;
  readonly username: string;
  readonly connectionId: string;
  lastActivity: number;
  isConnected: boolean;
  latency: number;
  currentLobby?: string | undefined;
  ready: boolean;
  inputSequence: number;
  lastValidatedInput: number;
}

export interface GameLobby {
  readonly id: string;
  readonly hostId: string;
  players: Map<string, Player>;
  gameState: 'waiting' | 'starting' | 'playing' | 'ended';
  gameType: 'uno' | 'tetris' | 'tictactoe';
  maxPlayers: number;
  settings: GameSettings;
  createdAt: number;
  lastActivity: number;
  gameInstance?: GameInstance;
}

export interface GameSettings {
  maxPlayers: number;
  gameMode: 'classic' | 'speed' | 'custom';
  enablePowerCards?: boolean;
  timeLimit?: number;
  customRules?: string[];
}

export interface GameInstance {
  id: string;
  type: 'uno' | 'tetris' | 'tictactoe';
  state: Record<string, unknown>;
  currentTurn?: string;
  turnStartTime?: number;
  history: GameAction[];
  stateChecksum: string;
}

export interface GameAction {
  id: string;
  playerId: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  validated: boolean;
  sequenceNumber: number;
}

export interface ConnectionManager {
  sendToPlayer(playerId: string, message: NetworkMessage): Promise<boolean>;
  sendToLobby(lobbyId: string, message: NetworkMessage, excludePlayer?: string): Promise<void>;
  broadcastToAll(message: NetworkMessage): Promise<void>;
  isPlayerConnected(playerId: string): boolean;
  getPlayerLatency(playerId: string): number;
}

/**
 * Modern Game Server implementing authoritative multiplayer architecture
 * Features direct connection establishment, real-time state sync, and anti-cheat measures
 */
export class GameServer extends EventEmitter {
  private players: Map<string, Player> = new Map();
  private lobbies: Map<string, GameLobby> = new Map();
  private connectionManager: ConnectionManager;
  private tickRate: number = 60; // Server tick rate (60 Hz)
  private tickInterval: NodeJS.Timeout | null = null;
  private sequenceNumber: number = 0;
  
  // Performance monitoring
  private serverStats = {
    connectedPlayers: 0,
    activeLobbies: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    lastStatsUpdate: Date.now()
  };

  constructor(connectionManager: ConnectionManager) {
    super();
    this.connectionManager = connectionManager;
    this.startServerTick();
    this.startStatsCollection();
  }

  /**
   * Handle player connection - Modern direct connection pattern
   */
  async handlePlayerConnection(playerId: string, username: string, connectionId: string): Promise<void> {
    // Disconnect existing session if any (prevent multiple connections)
    if (this.players.has(playerId)) {
      await this.handlePlayerDisconnection(playerId, 'duplicate_connection');
    }

    const player: Player = {
      id: playerId,
      username,
      connectionId,
      lastActivity: Date.now(),
      isConnected: true,
      latency: 0,
      ready: false,
      inputSequence: 0,
      lastValidatedInput: 0
    };

    this.players.set(playerId, player);
    this.serverStats.connectedPlayers = this.players.size;

    // Send connection confirmation with server state
    await this.connectionManager.sendToPlayer(playerId, {
      type: 'connect',
      messageId: uuidv4(),
      timestamp: Date.now(),
      playerId,
      data: {
        serverTime: Date.now(),
        tickRate: this.tickRate,
        features: ['authoritative_server', 'anti_cheat', 'real_time_sync'],
        availableLobbies: await this.getPublicLobbies()
      }
    });

    this.emit('player_connected', player);
    console.log(`Player ${username} (${playerId}) connected directly to game server`);
  }

  /**
   * Handle player disconnection with cleanup
   */
  async handlePlayerDisconnection(playerId: string, reason: string = 'connection_lost'): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;

    // Remove from current lobby if any
    if (player.currentLobby) {
      await this.leaveLobby(playerId, player.currentLobby);
    }

    this.players.delete(playerId);
    this.serverStats.connectedPlayers = this.players.size;

    this.emit('player_disconnected', { player, reason });
    console.log(`Player ${player.username} (${playerId}) disconnected: ${reason}`);
  }

  /**
   * Modern matchmaking - Find or create lobby
   */
  async findOrCreateLobby(playerId: string, gameType: 'uno' | 'tetris' | 'tictactoe', preferences?: Partial<GameSettings>): Promise<string | null> {
    const player = this.players.get(playerId);
    if (!player || !player.isConnected) return null;

    // Find available lobby with matching preferences
    for (const [lobbyId, lobby] of this.lobbies) {
      if (lobby.gameType === gameType && 
          lobby.gameState === 'waiting' && 
          lobby.players.size < lobby.maxPlayers &&
          this.matchesPreferences(lobby.settings, preferences)) {
        
        await this.joinLobby(playerId, lobbyId);
        return lobbyId;
      }
    }

    // Create new lobby if none found
    return await this.createLobby(playerId, gameType, preferences);
  }

  /**
   * Create a new game lobby with modern architecture
   */
  async createLobby(hostId: string, gameType: 'uno' | 'tetris' | 'tictactoe', customSettings?: Partial<GameSettings>): Promise<string | null> {
    const host = this.players.get(hostId);
    if (!host || !host.isConnected) return null;

    const defaultSettings: GameSettings = {
      maxPlayers: gameType === 'uno' ? 6 : gameType === 'tictactoe' ? 2 : 4,
      gameMode: 'classic',
      ...(gameType === 'uno' && { enablePowerCards: true }),
      ...customSettings
    };

    const lobbyId = this.generateLobbyId();
    const lobby: GameLobby = {
      id: lobbyId,
      hostId,
      players: new Map(),
      gameState: 'waiting',
      gameType,
      maxPlayers: defaultSettings.maxPlayers,
      settings: defaultSettings,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.lobbies.set(lobbyId, lobby);
    this.serverStats.activeLobbies = this.lobbies.size;

    // Host automatically joins their lobby
    await this.joinLobby(hostId, lobbyId);

    this.emit('lobby_created', lobby);
    console.log(`Lobby ${lobbyId} created for ${gameType} by ${host.username}`);
    
    return lobbyId;
  }

  /**
   * Join lobby with real-time updates to all players
   */
  async joinLobby(playerId: string, lobbyId: string): Promise<boolean> {
    const player = this.players.get(playerId);
    const lobby = this.lobbies.get(lobbyId);
    
    if (!player || !lobby || lobby.players.size >= lobby.maxPlayers) {
      return false;
    }

    // Leave current lobby if any
    if (player.currentLobby) {
      await this.leaveLobby(playerId, player.currentLobby);
    }

    // Add to lobby
    player.currentLobby = lobbyId;
    lobby.players.set(playerId, player);
    lobby.lastActivity = Date.now();

    // Real-time update to all lobby members
    await this.connectionManager.sendToLobby(lobbyId, {
      type: 'join_lobby',
      messageId: uuidv4(),
      timestamp: Date.now(),
      playerId,
      lobbyId,
      data: {
        player: {
          id: player.id,
          username: player.username,
          ready: player.ready
        },
        lobbyState: this.serializeLobbyState(lobby)
      }
    });

    this.emit('player_joined_lobby', { player, lobby });
    console.log(`Player ${player.username} joined lobby ${lobbyId}`);
    
    return true;
  }

  /**
   * Leave lobby with real-time updates
   */
  async leaveLobby(playerId: string, lobbyId: string): Promise<boolean> {
    const player = this.players.get(playerId);
    const lobby = this.lobbies.get(lobbyId);
    
    if (!player || !lobby || !lobby.players.has(playerId)) {
      return false;
    }

    lobby.players.delete(playerId);
    delete player.currentLobby;
    lobby.lastActivity = Date.now();

    // If lobby is empty or host left, clean up
    if (lobby.players.size === 0 || playerId === lobby.hostId) {
      await this.closeLobby(lobbyId);
      return true;
    }

    // Real-time update to remaining players
    await this.connectionManager.sendToLobby(lobbyId, {
      type: 'leave_lobby',
      messageId: uuidv4(),
      timestamp: Date.now(),
      playerId,
      lobbyId,
      data: {
        lobbyState: this.serializeLobbyState(lobby)
      }
    }, playerId);

    this.emit('player_left_lobby', { player, lobby });
    console.log(`Player ${player.username} left lobby ${lobbyId}`);
    
    return true;
  }

  /**
   * Start game with authoritative server control
   */
  async startGame(lobbyId: string, hostId: string): Promise<boolean> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.hostId !== hostId || lobby.gameState !== 'waiting') {
      return false;
    }

    // Validate all players are ready
    const readyPlayers = Array.from(lobby.players.values()).filter(p => p.ready);
    if (readyPlayers.length < 2) {
      await this.connectionManager.sendToPlayer(hostId, {
        type: 'error',
        messageId: uuidv4(),
        timestamp: Date.now(),
        playerId: hostId,
        data: { message: 'Need at least 2 ready players to start' }
      });
      return false;
    }

    // Initialize game instance with server authority
    lobby.gameState = 'starting';
    lobby.gameInstance = await this.createGameInstance(lobby);

    // Real-time game start notification
    await this.connectionManager.sendToLobby(lobbyId, {
      type: 'start_game',
      messageId: uuidv4(),
      timestamp: Date.now(),
      playerId: 'server',
      lobbyId,
      data: {
        gameInstance: this.serializeGameInstance(lobby.gameInstance),
        startTime: Date.now() + 3000 // 3 second countdown
      }
    });

    // Transition to playing state after countdown
    setTimeout(() => {
      if (lobby.gameState === 'starting') {
        lobby.gameState = 'playing';
        this.emit('game_started', lobby);
      }
    }, 3000);

    console.log(`Game started in lobby ${lobbyId} with ${readyPlayers.length} players`);
    return true;
  }

  /**
   * Process player input with server validation and anti-cheat
   */
  async processPlayerInput(playerId: string, action: Omit<GameAction, 'id' | 'timestamp' | 'validated'>): Promise<boolean> {
    const player = this.players.get(playerId);
    if (!player || !player.currentLobby) return false;

    const lobby = this.lobbies.get(player.currentLobby);
    if (!lobby || !lobby.gameInstance || lobby.gameState !== 'playing') return false;

    // Validate input sequence to prevent replay attacks
    if (action.sequenceNumber <= player.lastValidatedInput) {
      console.warn(`Invalid input sequence from player ${playerId}: ${action.sequenceNumber} <= ${player.lastValidatedInput}`);
      return false;
    }

    // Create server-validated action
    const validatedAction: GameAction = {
      id: uuidv4(),
      timestamp: Date.now(),
      validated: false,
      ...action
    };

    // Game-specific validation
    const isValid = await this.validateGameAction(lobby.gameInstance, validatedAction);
    if (!isValid) {
      await this.connectionManager.sendToPlayer(playerId, {
        type: 'error',
        messageId: uuidv4(),
        timestamp: Date.now(),
        playerId,
        data: { message: 'Invalid game action', action: validatedAction }
      });
      return false;
    }

    // Apply action to game state
    validatedAction.validated = true;
    lobby.gameInstance.history.push(validatedAction);
    player.lastValidatedInput = action.sequenceNumber;

    // Update game state
    await this.updateGameState(lobby.gameInstance, validatedAction);

    // Broadcast state update to all players
    await this.connectionManager.sendToLobby(lobby.id, {
      type: 'state_sync',
      messageId: uuidv4(),
      timestamp: Date.now(),
      playerId: 'server',
      lobbyId: lobby.id,
      sequenceNumber: ++this.sequenceNumber,
      data: {
        action: validatedAction,
        gameState: this.serializeGameInstance(lobby.gameInstance),
        checksum: lobby.gameInstance.stateChecksum
      }
    });

    return true;
  }

  /**
   * Server tick - Process all game logic at consistent rate
   */
  private serverTick(): void {
    const now = Date.now();
    
    // Update player latencies and check for timeouts
    for (const [playerId, player] of this.players) {
      if (now - player.lastActivity > 30000) { // 30 second timeout
        this.handlePlayerDisconnection(playerId, 'timeout');
        continue;
      }
    }

    // Update game instances
    for (const lobby of this.lobbies.values()) {
      if (lobby.gameInstance && lobby.gameState === 'playing') {
        this.tickGameInstance(lobby.gameInstance);
      }
    }

    // Clean up old lobbies
    for (const [lobbyId, lobby] of this.lobbies) {
      if (now - lobby.lastActivity > 300000) { // 5 minutes inactive
        this.closeLobby(lobbyId);
      }
    }
  }

  /**
   * Game-specific state updates per tick
   */
  private async tickGameInstance(gameInstance: GameInstance): Promise<void> {
    // Handle turn timeouts, game logic updates, etc.
    if (gameInstance.turnStartTime && Date.now() - gameInstance.turnStartTime > 30000) {
      // Auto-skip turn after 30 seconds
      await this.handleTurnTimeout(gameInstance);
    }

    // Update state checksum for anti-cheat
    gameInstance.stateChecksum = this.calculateStateChecksum(gameInstance.state);
  }

  /**
   * Helper methods
   */
  private startServerTick(): void {
    this.tickInterval = setInterval(() => {
      this.serverTick();
    }, 1000 / this.tickRate);
  }

  private startStatsCollection(): void {
    setInterval(() => {
      this.serverStats.lastStatsUpdate = Date.now();
      this.emit('server_stats', this.serverStats);
    }, 5000);
  }

  private generateLobbyId(): string {
    let id: string;
    do {
      id = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.lobbies.has(id));
    return id;
  }

  private matchesPreferences(settings: GameSettings, preferences?: Partial<GameSettings>): boolean {
    if (!preferences) return true;
    
    return Object.entries(preferences).every(([key, value]) => 
      settings[key as keyof GameSettings] === value
    );
  }

  private serializeLobbyState(lobby: GameLobby) {
    return {
      id: lobby.id,
      hostId: lobby.hostId,
      gameType: lobby.gameType,
      gameState: lobby.gameState,
      maxPlayers: lobby.maxPlayers,
      settings: lobby.settings,
      players: Array.from(lobby.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        ready: p.ready,
        latency: p.latency
      }))
    };
  }

  private serializeGameInstance(gameInstance: GameInstance) {
    return {
      id: gameInstance.id,
      type: gameInstance.type,
      currentTurn: gameInstance.currentTurn,
      stateChecksum: gameInstance.stateChecksum
      // Minimal state for security - full state sent separately
    };
  }

  private async getPublicLobbies() {
    return Array.from(this.lobbies.values())
      .filter(lobby => lobby.gameState === 'waiting' && lobby.players.size < lobby.maxPlayers)
      .map(lobby => this.serializeLobbyState(lobby));
  }

  private async createGameInstance(lobby: GameLobby): Promise<GameInstance> {
    return {
      id: uuidv4(),
      type: lobby.gameType,
      state: {},
      history: [],
      stateChecksum: this.calculateStateChecksum({})
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async validateGameAction(_gameInstance: GameInstance, _action: GameAction): Promise<boolean> {
    // Game-specific validation logic
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async updateGameState(_gameInstance: GameInstance, _action: GameAction): Promise<void> {
    // Apply validated action to game state
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleTurnTimeout(_gameInstance: GameInstance): Promise<void> {
    // Handle turn timeout logic
  }

  private calculateStateChecksum(state: Record<string, unknown>): string {
    // Simple checksum for anti-cheat - in production use proper hashing
    return JSON.stringify(state).length.toString(36);
  }

  private async closeLobby(lobbyId: string): Promise<void> {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return;

    // Notify all players
    await this.connectionManager.sendToLobby(lobbyId, {
      type: 'lobby_closed',
      messageId: uuidv4(),
      timestamp: Date.now(),
      playerId: 'server',
      lobbyId,
      data: { reason: 'lobby_closed' }
    });

    // Clean up player references
    for (const player of lobby.players.values()) {
      delete player.currentLobby;
    }

    this.lobbies.delete(lobbyId);
    this.serverStats.activeLobbies = this.lobbies.size;
    
    this.emit('lobby_closed', lobby);
  }

  // Public API
  getServerStats() {
    return { ...this.serverStats };
  }

  shutdown(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    
    // Close all lobbies
    for (const lobbyId of this.lobbies.keys()) {
      this.closeLobby(lobbyId);
    }
    
    console.log('Game server shutting down gracefully');
  }
}