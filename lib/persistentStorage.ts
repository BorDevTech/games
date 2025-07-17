// Persistent Storage System for Game Data
// Simple file-based storage for development/demo purposes
// In production, this would be replaced with Redis or PostgreSQL

import fs from 'fs/promises';
import path from 'path';

interface StorageData {
  rooms: Map<string, Record<string, unknown>>;
  gameSessions: Map<string, Record<string, unknown>>;
  playerSessions: Map<string, Record<string, unknown>>;
  lastUpdated: string;
}

class PersistentStorage {
  private dataPath: string;
  private memoryCache: StorageData;
  private saveInterval: NodeJS.Timeout | null = null;
  private isDirty = false;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'game-storage.json');
    this.memoryCache = {
      rooms: new Map(),
      gameSessions: new Map(),
      playerSessions: new Map(),
      lastUpdated: new Date().toISOString()
    };
    
    // Auto-save every 10 seconds if data has changed
    this.startAutoSave();
    this.loadFromDisk();
  }

  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.dataPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private startAutoSave(): void {
    this.saveInterval = setInterval(async () => {
      if (this.isDirty) {
        await this.saveToDisk();
      }
    }, 10000); // Save every 10 seconds
  }

  private async loadFromDisk(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.dataPath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert arrays back to Maps
      this.memoryCache = {
        rooms: new Map(parsed.rooms || []),
        gameSessions: new Map(parsed.gameSessions || []),
        playerSessions: new Map(parsed.playerSessions || []),
        lastUpdated: parsed.lastUpdated || new Date().toISOString()
      };
      
      console.log('Loaded game data from disk:', {
        rooms: this.memoryCache.rooms.size,
        gameSessions: this.memoryCache.gameSessions.size,
        playerSessions: this.memoryCache.playerSessions.size
      });
    } catch {
      console.log('No existing storage file found, starting fresh');
      // Keep default empty cache
    }
  }

  private async saveToDisk(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      
      // Convert Maps to arrays for JSON serialization
      const serializable = {
        rooms: Array.from(this.memoryCache.rooms.entries()),
        gameSessions: Array.from(this.memoryCache.gameSessions.entries()),
        playerSessions: Array.from(this.memoryCache.playerSessions.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(this.dataPath, JSON.stringify(serializable, null, 2));
      this.isDirty = false;
      console.log('Game data saved to disk');
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  }

  // Room operations
  setRoom(roomId: string, roomData: Record<string, unknown>): void {
    this.memoryCache.rooms.set(roomId.toUpperCase(), {
      ...roomData,
      lastUpdated: new Date().toISOString()
    });
    this.isDirty = true;
  }

  getRoom(roomId: string): Record<string, unknown> | null {
    return this.memoryCache.rooms.get(roomId.toUpperCase()) || null;
  }

  deleteRoom(roomId: string): boolean {
    const deleted = this.memoryCache.rooms.delete(roomId.toUpperCase());
    if (deleted) this.isDirty = true;
    return deleted;
  }

  getAllRooms(): Array<{ id: string; data: Record<string, unknown> }> {
    return Array.from(this.memoryCache.rooms.entries()).map(([id, data]) => ({
      id,
      data
    }));
  }

  // Game session operations
  setGameSession(roomId: string, gameData: Record<string, unknown>): void {
    this.memoryCache.gameSessions.set(roomId.toUpperCase(), {
      ...gameData,
      lastUpdated: new Date().toISOString()
    });
    this.isDirty = true;
  }

  getGameSession(roomId: string): Record<string, unknown> | null {
    return this.memoryCache.gameSessions.get(roomId.toUpperCase()) || null;
  }

  deleteGameSession(roomId: string): boolean {
    const deleted = this.memoryCache.gameSessions.delete(roomId.toUpperCase());
    if (deleted) this.isDirty = true;
    return deleted;
  }

  // Player session operations
  setPlayerSession(sessionId: string, sessionData: Record<string, unknown>): void {
    this.memoryCache.playerSessions.set(sessionId, {
      ...sessionData,
      lastUpdated: new Date().toISOString()
    });
    this.isDirty = true;
  }

  getPlayerSession(sessionId: string): Record<string, unknown> | null {
    return this.memoryCache.playerSessions.get(sessionId) || null;
  }

  deletePlayerSession(sessionId: string): boolean {
    const deleted = this.memoryCache.playerSessions.delete(sessionId);
    if (deleted) this.isDirty = true;
    return deleted;
  }

  // Cleanup expired sessions (older than 24 hours)
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiration = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [sessionId, session] of this.memoryCache.playerSessions.entries()) {
      const lastActivity = new Date((session.lastActivity || session.lastUpdated) as string);
      if (now - lastActivity.getTime() > expiration) {
        this.memoryCache.playerSessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
      this.isDirty = true;
    }
  }

  // Force immediate save
  async forceSave(): Promise<void> {
    await this.saveToDisk();
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    await this.saveToDisk();
  }
}

// Singleton instance
const persistentStorage = new PersistentStorage();

// Cleanup expired sessions every hour
setInterval(() => {
  persistentStorage.cleanupExpiredSessions();
}, 60 * 60 * 1000);

// Graceful shutdown handling
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    await persistentStorage.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await persistentStorage.shutdown();
    process.exit(0);
  });
}

export default persistentStorage;