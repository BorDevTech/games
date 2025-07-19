// Real-time WebSocket Manager for Multiplayer Game Communication
// Handles WebSocket connections, room management, and real-time updates

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export interface GameMessage {
  type: 'join_room' | 'leave_room' | 'game_action' | 'room_update' | 'player_update' | 'error' | 'heartbeat';
  roomId?: string;
  playerId?: string;
  data?: Record<string, unknown>;
  timestamp: string;
  messageId: string;
}

export interface ConnectedPlayer {
  id: string;
  username: string;
  sessionId: string;
  websocket: WebSocket;
  roomId?: string;
  lastActivity: Date;
  isAlive: boolean;
}

class WebSocketManager {
  private players: Map<string, ConnectedPlayer> = new Map();
  private rooms: Map<string, Set<string>> = new Map(); // roomId -> Set of playerIds
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  // Add a new player connection
  addPlayer(websocket: WebSocket, playerId: string, username: string, sessionId: string): void {
    // Remove existing connection for this player if any
    this.removePlayer(playerId);

    const player: ConnectedPlayer = {
      id: playerId,
      username,
      sessionId,
      websocket,
      lastActivity: new Date(),
      isAlive: true
    };

    this.players.set(playerId, player);

    // Set up WebSocket event handlers
    websocket.on('message', (data) => {
      this.handleMessage(playerId, data);
    });

    websocket.on('close', () => {
      this.removePlayer(playerId);
    });

    websocket.on('error', (error) => {
      console.error(`WebSocket error for player ${playerId}:`, error);
      this.removePlayer(playerId);
    });

    websocket.on('pong', () => {
      const player = this.players.get(playerId);
      if (player) {
        player.isAlive = true;
        player.lastActivity = new Date();
      }
    });

    console.log(`Player ${username} (${playerId}) connected via WebSocket`);
  }

  // Remove a player connection
  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Remove from any room they're in
    if (player.roomId) {
      this.leaveRoom(playerId, player.roomId);
    }

    // Close WebSocket if still open
    if (player.websocket.readyState === WebSocket.OPEN) {
      player.websocket.close();
    }

    this.players.delete(playerId);
    console.log(`Player ${player.username} (${playerId}) disconnected`);
  }

  // Handle incoming WebSocket messages
  private handleMessage(playerId: string, data: Buffer | ArrayBuffer | Buffer[]): void {
    try {
      const message: GameMessage = JSON.parse(data.toString());
      const player = this.players.get(playerId);
      
      if (!player) {
        console.error(`Message from unknown player: ${playerId}`);
        return;
      }

      player.lastActivity = new Date();

      switch (message.type) {
        case 'join_room':
          if (message.roomId) {
            this.joinRoom(playerId, message.roomId);
          }
          break;

        case 'leave_room':
          if (message.roomId) {
            this.leaveRoom(playerId, message.roomId);
          }
          break;

        case 'game_action':
          if (message.roomId) {
            this.broadcastToRoom(message.roomId, message, playerId);
          }
          break;

        case 'heartbeat':
          this.sendToPlayer(playerId, {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            messageId: uuidv4()
          });
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message from ${playerId}:`, error);
      this.sendToPlayer(playerId, {
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: new Date().toISOString(),
        messageId: uuidv4()
      });
    }
  }

  // Join a room
  joinRoom(playerId: string, roomId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Leave current room if in one
    if (player.roomId) {
      this.leaveRoom(playerId, player.roomId);
    }

    // Join new room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }

    this.rooms.get(roomId)!.add(playerId);
    player.roomId = roomId;

    console.log(`Player ${player.username} joined room ${roomId}`);

    // Notify all players in the room
    this.broadcastToRoom(roomId, {
      type: 'player_update',
      roomId,
      playerId,
      data: {
        action: 'joined',
        playerName: player.username,
        playersInRoom: this.getPlayersInRoom(roomId).map(p => ({
          id: p.id,
          username: p.username
        }))
      },
      timestamp: new Date().toISOString(),
      messageId: uuidv4()
    });
  }

  // Leave a room
  leaveRoom(playerId: string, roomId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(playerId);
      
      // Clean up empty rooms
      if (room.size === 0) {
        this.rooms.delete(roomId);
      } else {
        // Notify remaining players
        this.broadcastToRoom(roomId, {
          type: 'player_update',
          roomId,
          playerId,
          data: {
            action: 'left',
            playerName: player.username,
            playersInRoom: this.getPlayersInRoom(roomId).map(p => ({
              id: p.id,
              username: p.username
            }))
          },
          timestamp: new Date().toISOString(),
          messageId: uuidv4()
        });
      }
    }

    delete player.roomId;
    console.log(`Player ${player.username} left room ${roomId}`);
  }

  // Send message to a specific player
  sendToPlayer(playerId: string, message: GameMessage): void {
    const player = this.players.get(playerId);
    if (!player || player.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      player.websocket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending message to player ${playerId}:`, error);
      this.removePlayer(playerId);
    }
  }

  // Broadcast message to all players in a room
  broadcastToRoom(roomId: string, message: GameMessage, excludePlayerId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const playerId of room) {
      if (playerId !== excludePlayerId) {
        this.sendToPlayer(playerId, message);
      }
    }
  }

  // Broadcast message to all connected players
  broadcastToAll(message: GameMessage): void {
    for (const playerId of this.players.keys()) {
      this.sendToPlayer(playerId, message);
    }
  }

  // Get players in a room
  getPlayersInRoom(roomId: string): ConnectedPlayer[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room)
      .map(playerId => this.players.get(playerId))
      .filter((player): player is ConnectedPlayer => player !== undefined);
  }

  // Get all rooms and their player counts
  getRoomStats(): Array<{ roomId: string; playerCount: number; players: string[] }> {
    return Array.from(this.rooms.entries()).map(([roomId, playerIds]) => ({
      roomId,
      playerCount: playerIds.size,
      players: Array.from(playerIds).map(id => {
        const player = this.players.get(id);
        return player ? player.username : 'Unknown';
      })
    }));
  }

  // Get connected player count
  getPlayerCount(): number {
    return this.players.size;
  }

  // Start heartbeat/ping system to detect disconnected clients
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [playerId, player] of this.players.entries()) {
        if (!player.isAlive) {
          console.log(`Player ${player.username} (${playerId}) failed heartbeat, disconnecting`);
          this.removePlayer(playerId);
          continue;
        }

        player.isAlive = false;
        
        if (player.websocket.readyState === WebSocket.OPEN) {
          try {
            player.websocket.ping();
          } catch (error) {
            console.error(`Error pinging player ${playerId}:`, error);
            this.removePlayer(playerId);
          }
        } else {
          this.removePlayer(playerId);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // Shutdown cleanup
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all WebSocket connections
    for (const player of this.players.values()) {
      if (player.websocket.readyState === WebSocket.OPEN) {
        player.websocket.close();
      }
    }

    this.players.clear();
    this.rooms.clear();
  }
}

// Singleton instance
const webSocketManager = new WebSocketManager();

export default webSocketManager;