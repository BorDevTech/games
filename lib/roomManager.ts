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
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private readonly ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    // Start cleanup timer
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupInactiveRooms(), this.CLEANUP_INTERVAL);
    }
  }

  // Create a new room
  createRoom(hostPlayer: Omit<Player, 'isHost' | 'joinedAt' | 'lastActivity'>, settings: GameSettings, type: 'public' | 'private' = 'public'): Room {
    const roomId = this.generateRoomCode();
    
    const room: Room = {
      id: roomId,
      name: `${hostPlayer.username}'s Room`,
      type,
      hostId: hostPlayer.id,
      players: [{
        ...hostPlayer,
        isHost: true,
        joinedAt: new Date(),
        lastActivity: new Date()
      }],
      maxPlayers: settings.maxPlayers,
      inGame: false,
      settings: { ...settings },
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    this.rooms.set(roomId, room);
    return room;
  }

  // Get a room by ID
  getRoom(roomId: string): Room | null {
    const room = this.rooms.get(roomId.toUpperCase());
    if (room) {
      room.lastActivity = new Date();
    }
    return room || null;
  }

  // Check if a room exists and is accessible
  isRoomAccessible(roomId: string): boolean {
    const room = this.getRoom(roomId);
    return room !== null;
  }

  // Join a room
  joinRoom(roomId: string, player: Omit<Player, 'isHost' | 'joinedAt' | 'lastActivity'>): { success: boolean; room?: Room; error?: string } {
    const room = this.getRoom(roomId);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.players.some(p => p.username === player.username)) {
      return { success: false, error: 'Username already taken in this room' };
    }

    const newPlayer: Player = {
      ...player,
      isHost: false,
      joinedAt: new Date(),
      lastActivity: new Date()
    };

    room.players.push(newPlayer);
    room.lastActivity = new Date();
    
    return { success: true, room };
  }

  // Leave a room
  leaveRoom(roomId: string, playerId: string): { success: boolean; room?: Room; roomDeleted?: boolean } {
    const room = this.getRoom(roomId);
    
    if (!room) {
      return { success: false };
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false };
    }

    const leavingPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);
    room.lastActivity = new Date();

    // If no players left, delete the room
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return { success: true, roomDeleted: true };
    }

    // If the host left, assign new host
    if (leavingPlayer.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
    }

    return { success: true, room };
  }

  // Update player activity
  updatePlayerActivity(roomId: string, playerId: string): void {
    const room = this.getRoom(roomId);
    if (room) {
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.lastActivity = new Date();
        room.lastActivity = new Date();
      }
    }
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

    if (room.players.filter(p => p.status === 'waiting').length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }

    room.inGame = true;
    room.gameStartedAt = new Date();
    room.lastActivity = new Date();
    
    // Set all waiting players to playing
    room.players.forEach(player => {
      if (player.status === 'waiting') {
        player.status = 'playing';
      }
    });

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

  // Get all public rooms (for quick play)
  getPublicRooms(): Room[] {
    return Array.from(this.rooms.values())
      .filter(room => room.type === 'public' && !room.inGame && room.players.length < room.maxPlayers)
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
}

// Singleton instance
const roomManager = new RoomManager();
export default roomManager;