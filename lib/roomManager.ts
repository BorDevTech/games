// Room Management Service for UNO-Like Game
// Handles room state, cleanup, and route accessibility

export interface Player {
  id: string;
  username: string;
  handCount: number;
  isHost: boolean;
  status: 'waiting' | 'playing' | 'spectating' | 'in_queue';
  avatar?: string;
  ready: boolean;
  joinedAt: Date;
  lastActivity: Date;
}

export interface GameSettings {
  maxPlayers: number;
  enablePowerCards: boolean;
  fastMode: boolean;
  customRules: string[];
}

export interface Room {
  id: string;
  name: string;
  type: 'public' | 'private';
  hostId: string;
  players: Player[];
  maxPlayers: number;
  inGame: boolean;
  settings: GameSettings;
  createdAt: Date;
  lastActivity: Date;
  gameStartedAt?: Date;
  gameEndedAt?: Date;
  waitingQueue: Player[]; // Queue for players waiting to join when room is full
}

// Types for localStorage serialization
interface SerializedPlayer {
  id: string;
  username: string;
  handCount: number;
  isHost: boolean;
  status: 'waiting' | 'playing' | 'spectating' | 'in_queue';
  avatar?: string;
  ready: boolean;
  joinedAt: string;
  lastActivity: string;
}

interface SerializedRoom {
  id: string;
  name: string;
  type: 'public' | 'private';
  hostId: string;
  players: SerializedPlayer[];
  maxPlayers: number;
  inGame: boolean;
  settings: GameSettings;
  createdAt: string;
  lastActivity: string;
  gameStartedAt?: string;
  gameEndedAt?: string;
  waitingQueue: SerializedPlayer[];
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private readonly ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_KEY = 'unolike_rooms';
  private readonly AI_DEALER_ID = 'ai-dealer-bot';
  private readonly AUTO_START_CHECK_INTERVAL = 2000; // Check every 2 seconds for auto-start
  
  constructor() {
    // Load rooms from localStorage
    this.loadRooms();
    
    // Start cleanup timer
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupInactiveRooms(), this.CLEANUP_INTERVAL);
      setInterval(() => this.checkAutoStart(), this.AUTO_START_CHECK_INTERVAL);
      
      // Listen for storage changes from other tabs
      window.addEventListener('storage', (event) => {
        if (event.key === this.STORAGE_KEY && event.newValue) {
          // Reload rooms when storage changes from another tab
          this.loadRooms();
          // Also trigger auto-start check in case ready status changed
          setTimeout(() => this.checkAutoStart(), 100);
        }
      });
    }
  }

  // Create AI Dealer player
  private createAIDealer(): Player {
    return {
      id: this.AI_DEALER_ID,
      username: 'Dealer',
      handCount: 0,
      isHost: true,
      status: 'waiting',
      ready: true,
      joinedAt: new Date(),
      lastActivity: new Date()
    };
  }

  // Create a new room with AI Dealer as host
  createRoom(firstPlayer: Omit<Player, 'isHost' | 'joinedAt' | 'lastActivity'>, settings: GameSettings, type: 'public' | 'private' = 'public'): Room {
    const roomId = this.generateRoomCode();
    
    // Create AI Dealer as the host
    const dealer = this.createAIDealer();
    
    // Create the first human player (not as host)
    const humanPlayer: Player = {
      ...firstPlayer,
      isHost: false,
      joinedAt: new Date(),
      lastActivity: new Date()
    };
    
    const room: Room = {
      id: roomId,
      name: `Dealer's Room`,
      type,
      hostId: dealer.id,
      players: [dealer, humanPlayer], // Dealer first, then human player
      maxPlayers: settings.maxPlayers,
      inGame: false,
      settings: { ...settings },
      createdAt: new Date(),
      lastActivity: new Date(),
      waitingQueue: []
    };
    
    this.rooms.set(roomId, room);
    this.saveRooms();
    return room;
  }

  // Force reload rooms from localStorage (useful for cross-tab synchronization)
  reloadFromStorage(): void {
    this.loadRooms();
  }

  // Get a room by ID
  getRoom(roomId: string, forceReload: boolean = false): Room | null {
    // Only force reload from storage when explicitly requested
    if (forceReload) {
      this.loadRooms();
    }
    
    const room = this.rooms.get(roomId.toUpperCase());
    if (room && forceReload) {
      room.lastActivity = new Date();
      this.saveRooms();
    }
    return room || null;
  }

  // Check if a room exists and is accessible
  isRoomAccessible(roomId: string): boolean {
    const room = this.getRoom(roomId, true);
    return room !== null;
  }

  // Join a room
  joinRoom(roomId: string, player: Omit<Player, 'isHost' | 'joinedAt' | 'lastActivity'>): { success: boolean; room?: Room; error?: string; inQueue?: boolean } {
    const room = this.getRoom(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Check for duplicate usernames (excluding AI Dealer)
    if (room.players.some(p => p.id !== this.AI_DEALER_ID && p.username === player.username)) {
      return { success: false, error: 'Username already taken in this room' };
    }

    // Also check waiting queue for duplicate names
    if (room.waitingQueue.some(p => p.username === player.username)) {
      return { success: false, error: 'Username already taken in this room' };
    }

    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      // Check if player is already in queue
      if (room.waitingQueue.some(p => p.username === player.username)) {
        return { success: false, error: 'Already in waiting queue' };
      }
      
      // Add to waiting queue
      const queuePlayer: Player = {
        ...player,
        isHost: false,
        joinedAt: new Date(),
        lastActivity: new Date(),
        status: 'in_queue'
      };
      
      room.waitingQueue.push(queuePlayer);
      room.lastActivity = new Date();
      this.saveRooms();
      
      return { success: true, room, inQueue: true };
    }

    const newPlayer: Player = {
      ...player,
      isHost: false,
      joinedAt: new Date(),
      lastActivity: new Date()
    };

    room.players.push(newPlayer);
    room.lastActivity = new Date();
    this.saveRooms();
    
    return { success: true, room };
  }

  // Leave a room
  leaveRoom(roomId: string, playerId: string): { success: boolean; room?: Room; roomDeleted?: boolean } {
    const room = this.getRoom(roomId);
    
    if (!room) {
      return { success: false };
    }

    // Prevent AI Dealer from leaving
    if (playerId === this.AI_DEALER_ID) {
      return { success: false };
    }

    // Check if player is in main room
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      room.lastActivity = new Date();

      // If only AI Dealer is left and no queue, delete the room
      const humanPlayers = room.players.filter(p => p.id !== this.AI_DEALER_ID);
      if (humanPlayers.length === 0 && room.waitingQueue.length === 0) {
        this.rooms.delete(roomId);
        this.saveRooms();
        return { success: true, roomDeleted: true };
      }

      // Move next queued player to main room if there's space
      if (room.waitingQueue.length > 0 && room.players.length < room.maxPlayers) {
        const nextPlayer = room.waitingQueue.shift()!;
        nextPlayer.status = 'waiting';
        room.players.push(nextPlayer);
      }

      this.saveRooms();
      return { success: true, room };
    }
    
    // Check if player is in queue
    const queueIndex = room.waitingQueue.findIndex(p => p.id === playerId);
    if (queueIndex !== -1) {
      room.waitingQueue.splice(queueIndex, 1);
      room.lastActivity = new Date();
      
      // If only AI Dealer is left and no queue, delete the room
      const humanPlayers = room.players.filter(p => p.id !== this.AI_DEALER_ID);
      if (humanPlayers.length === 0 && room.waitingQueue.length === 0) {
        this.rooms.delete(roomId);
        this.saveRooms();
        return { success: true, roomDeleted: true };
      }
      
      this.saveRooms();
      return { success: true, room };
    }

    return { success: false };
  }

  // Check if player exists in room (either in main room or queue)
  isPlayerInRoom(roomId: string, playerId: string): { inRoom: boolean; inQueue: boolean; player?: Player } {
    const room = this.getRoom(roomId);
    
    if (!room) {
      return { inRoom: false, inQueue: false };
    }

    // Check main room
    const mainPlayer = room.players.find(p => p.id === playerId);
    if (mainPlayer) {
      return { inRoom: true, inQueue: false, player: mainPlayer };
    }

    // Check waiting queue
    const queuedPlayer = room.waitingQueue.find(p => p.id === playerId);
    if (queuedPlayer) {
      return { inRoom: false, inQueue: true, player: queuedPlayer };
    }

    return { inRoom: false, inQueue: false };
  }

  // Update player activity
  updatePlayerActivity(roomId: string, playerId: string): void {
    const room = this.getRoom(roomId);
    if (room) {
      // Check main players first
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.lastActivity = new Date();
        room.lastActivity = new Date();
        this.saveRooms();
        return;
      }
      
      // Check waiting queue
      const queuedPlayer = room.waitingQueue.find(p => p.id === playerId);
      if (queuedPlayer) {
        queuedPlayer.lastActivity = new Date();
        room.lastActivity = new Date();
        this.saveRooms();
      }
    }
  }

  // Auto-start checker for AI Dealer
  private checkAutoStart(): void {
    // Always reload from localStorage to get the latest data across tabs
    this.loadRooms();
    
    this.rooms.forEach((room) => {
      // Only check rooms with AI Dealer as host and not in game
      if (room.hostId === this.AI_DEALER_ID && !room.inGame) {
        const readyHumanPlayers = room.players.filter(p => 
          p.id !== this.AI_DEALER_ID && p.ready && p.status === 'waiting'
        );
        
        // Auto-start if we have at least 2 ready human players
        if (readyHumanPlayers.length >= 2) {
          console.log(`AI Dealer auto-starting game in room ${room.id} with ${readyHumanPlayers.length} ready players`);
          this.startGame(room.id, this.AI_DEALER_ID);
        }
      }
    });
  }
  updatePlayerReady(roomId: string, playerId: string, ready: boolean): { success: boolean; room?: Room; error?: string } {
    // Load fresh data from localStorage to ensure we have the latest state
    this.loadRooms();
    
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    player.ready = ready;
    player.lastActivity = new Date();
    room.lastActivity = new Date();
    
    // Save immediately to prevent other tabs from overwriting
    this.saveRooms();
    
    // Immediately trigger auto-start check after ready status change
    setTimeout(() => this.checkAutoStart(), 100);
    
    return { success: true, room };
  }

  // Start game
  startGame(roomId: string, hostId: string): { success: boolean; error?: string } {
    const room = this.getRoom(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== hostId) {
      return { success: false, error: 'Only host can start the game' };
    }

    // Count human players only (exclude AI Dealer)
    const humanPlayers = room.players.filter(p => p.id !== this.AI_DEALER_ID && p.status === 'waiting');
    if (humanPlayers.length < 2) {
      return { success: false, error: 'Need at least 2 human players to start' };
    }

    room.inGame = true;
    room.gameStartedAt = new Date();
    room.lastActivity = new Date();
    
    // Set all waiting players to playing (including AI Dealer)
    room.players.forEach(player => {
      if (player.status === 'waiting') {
        player.status = 'playing';
      }
    });

    this.saveRooms();
    return { success: true };
  }

  // End game
  endGame(roomId: string): { success: boolean; roomDeleted?: boolean } {
    const room = this.getRoom(roomId);
    
    if (!room) {
      return { success: false };
    }

    room.inGame = false;
    room.gameEndedAt = new Date();
    room.lastActivity = new Date();

    // Reset all players to waiting status
    room.players.forEach(player => {
      player.status = 'waiting';
      player.ready = false;
    });

    // If configured for auto-cleanup after game ends, we could delete room
    // For now, we'll keep the room alive for players to potentially start another game

    this.saveRooms();
    return { success: true };
  }

  // Clean up inactive rooms
  private cleanupInactiveRooms(): void {
    const now = new Date();
    const roomsToDelete: string[] = [];

    this.rooms.forEach((room, roomId) => {
      const timeSinceActivity = now.getTime() - room.lastActivity.getTime();
      
      // Delete rooms that have been inactive for too long
      if (timeSinceActivity > this.ROOM_TIMEOUT) {
        roomsToDelete.push(roomId);
      }
    });

    roomsToDelete.forEach(roomId => {
      this.rooms.delete(roomId);
    });

    if (roomsToDelete.length > 0) {
      console.log(`Cleaned up ${roomsToDelete.length} inactive rooms`);
      this.saveRooms();
    }
  }

  // Generate room code
  private generateRoomCode(): string {
    let code: string;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.rooms.has(code));
    return code;
  }

  // Get all public rooms (for quick play) - exclude AI Dealer from player count
  getPublicRooms(): Room[] {
    return Array.from(this.rooms.values())
      .filter(room => {
        const humanPlayerCount = room.players.filter(p => p.id !== this.AI_DEALER_ID).length;
        return room.type === 'public' && !room.inGame && humanPlayerCount < (room.maxPlayers - 1); // -1 for AI Dealer slot
      })
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  // Update room settings (host only)
  updateRoomSettings(roomId: string, hostId: string, settings: Partial<GameSettings>): { success: boolean; error?: string } {
    const room = this.getRoom(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.hostId !== hostId) {
      return { success: false, error: 'Only host can update settings' };
    }

    if (room.inGame) {
      return { success: false, error: 'Cannot update settings during game' };
    }

    room.settings = { ...room.settings, ...settings };
    room.lastActivity = new Date();
    this.saveRooms();

    return { success: true };
  }

  // Get room statistics
  getRoomStats(): { totalRooms: number; publicRooms: number; privateRooms: number; activeGames: number } {
    const rooms = Array.from(this.rooms.values());
    
    return {
      totalRooms: rooms.length,
      publicRooms: rooms.filter(r => r.type === 'public').length,
      privateRooms: rooms.filter(r => r.type === 'private').length,
      activeGames: rooms.filter(r => r.inGame).length
    };
  }

  // Save rooms to localStorage
  private saveRooms(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const roomsArray = Array.from(this.rooms.entries()).map(([id, room]) => [id, room]);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(roomsArray));
    } catch (error) {
      console.warn('Failed to save rooms to localStorage:', error);
    }
  }

  // Load rooms from localStorage
  private loadRooms(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const roomsArray: [string, SerializedRoom][] = JSON.parse(stored);
        this.rooms = new Map(roomsArray.map(([id, room]) => {
          // Convert date strings back to Date objects
          const convertedRoom: Room = {
            ...room,
            createdAt: new Date(room.createdAt),
            lastActivity: new Date(room.lastActivity),
            gameStartedAt: room.gameStartedAt ? new Date(room.gameStartedAt) : undefined,
            gameEndedAt: room.gameEndedAt ? new Date(room.gameEndedAt) : undefined,
            players: room.players.map((player: SerializedPlayer): Player => ({
              ...player,
              joinedAt: new Date(player.joinedAt),
              lastActivity: new Date(player.lastActivity)
            })),
            waitingQueue: (room.waitingQueue || []).map((player: SerializedPlayer): Player => ({
              ...player,
              joinedAt: new Date(player.joinedAt),
              lastActivity: new Date(player.lastActivity)
            }))
          };
          return [id, convertedRoom];
        }));
      }
    } catch (error) {
      console.warn('Failed to load rooms from localStorage:', error);
      this.rooms = new Map();
    }
  }
}

// Singleton instance
const roomManager = new RoomManager();
export default roomManager;