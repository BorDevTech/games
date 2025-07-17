// Game State Manager for UNO-Like Game
// Handles synchronized game state across devices

export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';

export interface UnoCard {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // For number cards (0-9)
}

export interface GameState {
  roomId: string;
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 for clockwise, -1 for counterclockwise
  topCard: UnoCard;
  deck: UnoCard[];
  playerHands: { [playerId: string]: UnoCard[] };
  playerOrder: string[]; // Array of player IDs in turn order
  hasDrawn: boolean;
  gameEnded: boolean;
  winner?: string;
  lastAction?: {
    type: 'play_card' | 'draw_card' | 'pass_turn' | 'start_game' | 'end_game';
    playerId: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  };
  syncedAt?: Date;
}

class GameStateManager {
  private gameStates: Map<string, GameState> = new Map();
  private readonly API_SYNC_INTERVAL = 3000; // Sync every 3 seconds (increased from 2s)
  private readonly STORAGE_KEY_PREFIX = 'unolike_game_';
  private syncEnabled = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.syncEnabled = true;
      // Start periodic API sync
      setInterval(() => this.syncWithAPI(), this.API_SYNC_INTERVAL);
    }
  }

  // Create a new game state
  createGameState(roomId: string, playerIds: string[]): GameState {
    const deck = this.createDeck();
    const shuffledDeck = this.shuffleDeck(deck);
    
    // Deal initial hands (7 cards each)
    const playerHands: { [playerId: string]: UnoCard[] } = {};
    let deckIndex = 0;
    
    playerIds.forEach(playerId => {
      playerHands[playerId] = shuffledDeck.slice(deckIndex, deckIndex + 7);
      deckIndex += 7;
    });
    
    // Set starting card (skip action cards for simplicity)
    let topCardIndex = deckIndex;
    let topCard = shuffledDeck[topCardIndex];
    while (topCard.type !== 'number' && topCardIndex < shuffledDeck.length - 1) {
      topCardIndex++;
      topCard = shuffledDeck[topCardIndex];
    }
    
    const gameState: GameState = {
      roomId,
      currentPlayerIndex: 0,
      direction: 1,
      topCard,
      deck: shuffledDeck.slice(topCardIndex + 1),
      playerHands,
      playerOrder: [...playerIds],
      hasDrawn: false,
      gameEnded: false,
      lastAction: {
        type: 'start_game',
        playerId: 'system',
        timestamp: new Date(),
        data: { playerCount: playerIds.length }
      },
      syncedAt: new Date()
    };
    
    this.gameStates.set(roomId, gameState);
    this.saveGameState(roomId, gameState);
    return gameState;
  }

  // Get game state
  getGameState(roomId: string, forceSync: boolean = false): GameState | null {
    if (forceSync && this.syncEnabled) {
      // Force sync from API first
      this.syncGameStateFromAPI(roomId);
    }
    
    return this.gameStates.get(roomId) || this.loadGameState(roomId);
  }

  // Update game state
  updateGameState(roomId: string, updates: Partial<GameState>, action?: {
    type: 'play_card' | 'draw_card' | 'pass_turn' | 'start_game' | 'end_game';
    playerId: string;
    data?: Record<string, unknown>;
  }): GameState | null {
    const currentState = this.getGameState(roomId);
    if (!currentState) return null;
    
    const updatedState: GameState = {
      ...currentState,
      ...updates,
      lastAction: action ? {
        ...action,
        timestamp: new Date()
      } : currentState.lastAction,
      syncedAt: new Date()
    };
    
    this.gameStates.set(roomId, updatedState);
    this.saveGameState(roomId, updatedState);
    
    return updatedState;
  }

  // Delete game state
  deleteGameState(roomId: string): void {
    this.gameStates.delete(roomId);
    
    // Remove from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY_PREFIX + roomId);
    }
    
    // Remove from API
    if (this.syncEnabled) {
      fetch(`/api/game-state?roomId=${roomId}`, { method: 'DELETE' })
        .catch(error => console.warn('Failed to delete game state from API:', error));
    }
  }

  // Save game state to localStorage and API
  private saveGameState(roomId: string, gameState: GameState): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Save to localStorage
      localStorage.setItem(this.STORAGE_KEY_PREFIX + roomId, JSON.stringify(gameState));
      
      // Sync to API
      if (this.syncEnabled) {
        this.syncGameStateToAPI(roomId, gameState);
      }
    } catch (error) {
      console.warn('Failed to save game state:', error);
    }
  }

  // Load game state from localStorage
  private loadGameState(roomId: string): GameState | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_PREFIX + roomId);
      if (stored) {
        const gameState = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (gameState.lastAction) {
          gameState.lastAction.timestamp = new Date(gameState.lastAction.timestamp);
        }
        if (gameState.syncedAt) {
          gameState.syncedAt = new Date(gameState.syncedAt);
        }
        this.gameStates.set(roomId, gameState);
        return gameState;
      }
    } catch (error) {
      console.warn('Failed to load game state from localStorage:', error);
    }
    
    return null;
  }

  // Sync game state to API
  private async syncGameStateToAPI(roomId: string, gameState: GameState): Promise<void> {
    if (!this.syncEnabled) return;
    
    try {
      await fetch('/api/game-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          gameState,
          playerId: gameState.lastAction?.playerId,
          action: gameState.lastAction?.type
        })
      });
    } catch (error) {
      console.warn('Failed to sync game state to API:', error);
    }
  }

  // Sync game state from API
  private async syncGameStateFromAPI(roomId: string): Promise<void> {
    if (!this.syncEnabled) return;
    
    try {
      const response = await fetch(`/api/game-state?roomId=${roomId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.gameState) {
          const apiGameState = data.gameState;
          const localGameState = this.gameStates.get(roomId);
          
          // Check if API has newer data
          const apiSyncTime = new Date(apiGameState.syncedAt || apiGameState.lastUpdated);
          const localSyncTime = localGameState?.syncedAt || new Date(0);
          
          if (!localGameState || apiSyncTime > localSyncTime) {
            // Convert date strings back to Date objects
            if (apiGameState.lastAction) {
              apiGameState.lastAction.timestamp = new Date(apiGameState.lastAction.timestamp);
            }
            apiGameState.syncedAt = new Date(apiGameState.syncedAt || apiGameState.lastUpdated);
            
            // Validate the game state before applying it
            if (this.validateGameState(apiGameState)) {
              this.gameStates.set(roomId, apiGameState);
              // Save to localStorage without triggering another API sync
              localStorage.setItem(this.STORAGE_KEY_PREFIX + roomId, JSON.stringify(apiGameState));
            } else {
              console.warn('Received invalid game state from API, ignoring');
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to sync game state from API:', error);
    }
  }
  
  // Validate game state for consistency
  private validateGameState(gameState: GameState): boolean {
    if (!gameState) return false;
    
    // Check basic structure
    if (!gameState.playerOrder || !Array.isArray(gameState.playerOrder)) return false;
    if (typeof gameState.currentPlayerIndex !== 'number') return false;
    if (!gameState.topCard || !gameState.topCard.id) return false;
    if (!gameState.playerHands || typeof gameState.playerHands !== 'object') return false;
    
    // Check player index bounds
    if (gameState.currentPlayerIndex < 0 || gameState.currentPlayerIndex >= gameState.playerOrder.length) return false;
    
    // Check that all players in order have hands
    for (const playerId of gameState.playerOrder) {
      if (!Array.isArray(gameState.playerHands[playerId])) return false;
    }
    
    return true;
  }

  // Sync all game states with API
  private async syncWithAPI(): Promise<void> {
    if (!this.syncEnabled) return;
    
    // Sync each active game state
    for (const roomId of this.gameStates.keys()) {
      await this.syncGameStateFromAPI(roomId);
    }
  }

  // Create a standard UNO deck
  private createDeck(): UnoCard[] {
    const cards: UnoCard[] = [];
    const colors: CardColor[] = ['red', 'yellow', 'green', 'blue'];
    
    // Number cards (0-9)
    colors.forEach(color => {
      // One 0 card per color
      cards.push({ id: `${color}-0`, color, type: 'number', value: 0 });
      
      // Two of each number 1-9 per color
      for (let i = 1; i <= 9; i++) {
        cards.push({ id: `${color}-${i}-1`, color, type: 'number', value: i });
        cards.push({ id: `${color}-${i}-2`, color, type: 'number', value: i });
      }
      
      // Action cards (2 of each per color)
      cards.push({ id: `${color}-skip-1`, color, type: 'skip' });
      cards.push({ id: `${color}-skip-2`, color, type: 'skip' });
      cards.push({ id: `${color}-reverse-1`, color, type: 'reverse' });
      cards.push({ id: `${color}-reverse-2`, color, type: 'reverse' });
      cards.push({ id: `${color}-draw2-1`, color, type: 'draw2' });
      cards.push({ id: `${color}-draw2-2`, color, type: 'draw2' });
    });
    
    // Wild cards (4 of each)
    for (let i = 1; i <= 4; i++) {
      cards.push({ id: `wild-${i}`, color: 'wild', type: 'wild' });
      cards.push({ id: `wild_draw4-${i}`, color: 'wild', type: 'wild_draw4' });
    }
    
    return cards;
  }

  // Shuffle deck
  private shuffleDeck(deck: UnoCard[]): UnoCard[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Singleton instance
const gameStateManager = new GameStateManager();
export default gameStateManager;