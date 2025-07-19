// Modern UNO Game Implementation for Multiplayer Server
// Implements authoritative game logic with real-time synchronization

import { GameAction } from './GameServer';

export type UnoCardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
export type UnoCardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';

export interface UnoCard {
  readonly id: string;
  readonly color: UnoCardColor;
  readonly type: UnoCardType;
  readonly value?: number; // For number cards (0-9)
}

export interface UnoGameState {
  readonly deck: UnoCard[];
  readonly discardPile: UnoCard[];
  readonly topCard: UnoCard;
  readonly playerHands: Record<string, UnoCard[]>;
  readonly playerOrder: string[];
  readonly currentPlayerIndex: number;
  readonly direction: 1 | -1; // 1 for clockwise, -1 for counterclockwise
  readonly drawCount: number; // Cards to draw for next player (stacking +2/+4)
  readonly mustDraw: boolean; // Player must draw before playing
  readonly wildColor?: UnoCardColor | undefined; // Color chosen for wild cards
  readonly gamePhase: 'dealing' | 'playing' | 'ended';
  readonly winner?: string | undefined;
  readonly unoCallouts: Record<string, boolean>; // Track UNO callouts
  readonly lastAction?: {
    readonly type: string;
    readonly playerId: string;
    readonly timestamp: number;
    readonly data: Record<string, unknown>;
  } | undefined;
}

export interface UnoGameAction extends GameAction {
  type: 'play_card' | 'draw_card' | 'call_uno' | 'challenge_uno' | 'pass_turn' | 'choose_color';
  data: {
    cardId?: string;
    chosenColor?: UnoCardColor;
    targetPlayer?: string;
    [key: string]: unknown;
  };
}

/**
 * Modern UNO Game Engine with server authority
 * Implements all UNO rules with anti-cheat validation
 */
export class UnoGameEngine {
  
  /**
   * Initialize a new UNO game
   */
  static createGame(playerIds: string[]): UnoGameState {
    if (playerIds.length < 2 || playerIds.length > 8) {
      throw new Error('UNO requires 2-8 players');
    }

    // Create and shuffle deck
    const deck = this.createDeck();
    const shuffledDeck = this.shuffleDeck([...deck]);

    // Deal initial hands (7 cards each)
    const playerHands: Record<string, UnoCard[]> = {};
    let deckIndex = 0;

    for (const playerId of playerIds) {
      playerHands[playerId] = shuffledDeck.slice(deckIndex, deckIndex + 7);
      deckIndex += 7;
    }

    // Find starting card (must be a number card)
    let topCardIndex = deckIndex;
    let topCard: UnoCard | undefined;
    
    while (topCardIndex < shuffledDeck.length) {
      const candidate = shuffledDeck[topCardIndex];
      if (candidate && candidate.type === 'number' && candidate.color !== 'wild') {
        topCard = candidate;
        break;
      }
      topCardIndex++;
    }

    if (!topCard) {
      // If no valid starting card found, use first card and reset deck
      topCardIndex = deckIndex;
      topCard = shuffledDeck[topCardIndex];
    }

    if (!topCard) {
      // Fallback - create a basic red 1 card
      topCard = { id: 'red-1-fallback', color: 'red', type: 'number', value: 1 };
    }
    const remainingDeck = [
      ...shuffledDeck.slice(0, topCardIndex),
      ...shuffledDeck.slice(topCardIndex + 1)
    ];

    return {
      deck: remainingDeck,
      discardPile: [topCard],
      topCard,
      playerHands,
      playerOrder: [...playerIds],
      currentPlayerIndex: 0,
      direction: 1,
      drawCount: 0,
      mustDraw: false,
      gamePhase: 'playing',
      unoCallouts: playerIds.reduce((acc, id) => ({ ...acc, [id]: false }), {})
    };
  }

  /**
   * Validate and apply a game action
   */
  static processAction(gameState: UnoGameState, action: UnoGameAction): UnoGameState {
    // Validate it's the current player's turn
    const currentPlayerId = gameState.playerOrder[gameState.currentPlayerIndex];
    if (action.playerId !== currentPlayerId && action.type !== 'call_uno' && action.type !== 'challenge_uno') {
      throw new Error('Not your turn');
    }

    // Validate game phase
    if (gameState.gamePhase !== 'playing') {
      throw new Error('Game not in playing phase');
    }

    switch (action.type) {
      case 'play_card':
        return this.playCard(gameState, action);
      
      case 'draw_card':
        return this.drawCard(gameState, action);
      
      case 'call_uno':
        return this.callUno(gameState, action);
      
      case 'challenge_uno':
        return this.challengeUno(gameState, action);
      
      case 'choose_color':
        return this.chooseColor(gameState, action);
      
      case 'pass_turn':
        return this.passTurn(gameState, action);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Play a card action
   */
  private static playCard(gameState: UnoGameState, action: UnoGameAction): UnoGameState {
    const { cardId } = action.data;
    if (!cardId) throw new Error('Card ID required');

    const playerId = action.playerId;
    const playerHand = gameState.playerHands[playerId];
    if (!playerHand) throw new Error('Player not found');

    // Find the card in player's hand
    const cardIndex = playerHand.findIndex(card => card.id === cardId);
    if (cardIndex === -1) throw new Error('Card not in hand');

    const card = playerHand[cardIndex];
    if (!card) throw new Error('Card not found');

    // Validate the card can be played
    if (!this.canPlayCard(card, gameState.topCard, gameState.wildColor, gameState.drawCount)) {
      throw new Error('Invalid card play');
    }

    // Remove card from player's hand
    const newPlayerHands = {
      ...gameState.playerHands,
      [playerId]: playerHand.filter((_, index) => index !== cardIndex)
    };

    // Add card to discard pile
    const newDiscardPile = [...gameState.discardPile, card];
    
    let newGameState: UnoGameState = {
      ...gameState,
      playerHands: newPlayerHands,
      discardPile: newDiscardPile,
      topCard: card,
      drawCount: 0,
      mustDraw: false,
      wildColor: card.color === 'wild' ? undefined : card.color,
      lastAction: {
        type: action.type,
        playerId: action.playerId,
        timestamp: action.timestamp,
        data: action.data
      }
    };

    // Check for win condition
    const updatedPlayerHand = newPlayerHands[playerId];
    if (updatedPlayerHand && updatedPlayerHand.length === 0) {
      newGameState = {
        ...newGameState,
        gamePhase: 'ended',
        winner: playerId
      };
      return newGameState;
    }

    // Auto-call UNO if player has 1 card
    if (updatedPlayerHand && updatedPlayerHand.length === 1) {
      newGameState = {
        ...newGameState,
        unoCallouts: {
          ...newGameState.unoCallouts,
          [playerId]: true
        }
      };
    }

    // Apply card effects
    newGameState = this.applyCardEffect(newGameState, card, playerId);

    return newGameState;
  }

  /**
   * Draw card action
   */
  private static drawCard(gameState: UnoGameState, action: UnoGameAction): UnoGameState {
    const playerId = action.playerId;
    const playerHand = gameState.playerHands[playerId];
    if (!playerHand) throw new Error('Player not found');

    // Check if deck needs reshuffling
    let { deck, discardPile } = gameState;
    if (deck.length === 0 && discardPile.length > 1) {
      // Reshuffle discard pile (keep top card)
      const [topCard, ...cardsToShuffle] = discardPile;
      if (topCard) {
        deck = this.shuffleDeck(cardsToShuffle);
        discardPile = [topCard];
      }
    }

    if (deck.length === 0) {
      throw new Error('No cards available to draw');
    }

    // Draw required number of cards
    const cardsToDraw = Math.max(1, gameState.drawCount);
    const drawnCards = deck.slice(0, cardsToDraw);
    const remainingDeck = deck.slice(cardsToDraw);

    const newPlayerHands = {
      ...gameState.playerHands,
      [playerId]: [...playerHand, ...drawnCards]
    };

    let newGameState: UnoGameState = {
      ...gameState,
      deck: remainingDeck,
      discardPile,
      playerHands: newPlayerHands,
      drawCount: 0,
      mustDraw: false,
      lastAction: {
        type: action.type,
        playerId: action.playerId,
        timestamp: action.timestamp,
        data: { ...action.data, cardsDrawn: drawnCards.length }
      }
    };

    // Advance to next player if they drew penalty cards
    if (gameState.drawCount > 0) {
      newGameState = this.advanceToNextPlayer(newGameState);
    }

    return newGameState;
  }

  /**
   * Call UNO action
   */
  private static callUno(gameState: UnoGameState, action: UnoGameAction): UnoGameState {
    const playerId = action.playerId;
    const playerHand = gameState.playerHands[playerId];
    
    if (!playerHand || playerHand.length !== 1) {
      throw new Error('Can only call UNO with exactly 1 card');
    }

    return {
      ...gameState,
      unoCallouts: {
        ...gameState.unoCallouts,
        [playerId]: true
      },
      lastAction: {
        type: action.type,
        playerId: action.playerId,
        timestamp: action.timestamp,
        data: action.data
      }
    };
  }

  /**
   * Challenge UNO action
   */
  private static challengeUno(gameState: UnoGameState, action: UnoGameAction): UnoGameState {
    const { targetPlayer } = action.data;
    if (!targetPlayer) throw new Error('Target player required for UNO challenge');

    const targetHand = gameState.playerHands[targetPlayer as string];
    const hasCalledUno = gameState.unoCallouts[targetPlayer as string];

    // If target has 1 card and hasn't called UNO, they must draw 2 cards
    if (targetHand && targetHand.length === 1 && !hasCalledUno) {
      // Force target to draw 2 cards
      let { deck, discardPile } = gameState;
      if (deck.length < 2 && discardPile.length > 1) {
        // Reshuffle if needed
        const [topCard, ...cardsToShuffle] = discardPile;
        if (topCard) {
          deck = [...deck, ...this.shuffleDeck(cardsToShuffle)];
          discardPile = [topCard];
        }
      }

      const penaltyCards = deck.slice(0, 2);
      const remainingDeck = deck.slice(2);

      const newPlayerHands = {
        ...gameState.playerHands,
        [targetPlayer as string]: [...targetHand, ...penaltyCards]
      };

      return {
        ...gameState,
        deck: remainingDeck,
        discardPile,
        playerHands: newPlayerHands,
        lastAction: {
          type: action.type,
          playerId: action.playerId,
          timestamp: action.timestamp,
          data: { ...action.data, successful: true, penaltyCards: 2 }
        }
      };
    }

    // Challenge failed
    return {
      ...gameState,
      lastAction: {
        type: action.type,
        playerId: action.playerId,
        timestamp: action.timestamp,
        data: { ...action.data, successful: false }
      }
    };
  }

  /**
   * Choose color for wild cards
   */
  private static chooseColor(gameState: UnoGameState, action: UnoGameAction): UnoGameState {
    const { chosenColor } = action.data;
    if (!chosenColor || chosenColor === 'wild') {
      throw new Error('Must choose a valid color (red, yellow, green, blue)');
    }

    // Validate that the top card is a wild card and it's the player's turn
    if (gameState.topCard.color !== 'wild') {
      throw new Error('Can only choose color after playing a wild card');
    }

    const newGameState: UnoGameState = {
      ...gameState,
      wildColor: chosenColor as UnoCardColor,
      lastAction: {
        type: action.type,
        playerId: action.playerId,
        timestamp: action.timestamp,
        data: action.data
      }
    };

    // Advance to next player after choosing color
    return this.advanceToNextPlayer(newGameState);
  }

  /**
   * Pass turn action
   */
  private static passTurn(gameState: UnoGameState, action: UnoGameAction): UnoGameState {
    // Can only pass if player has drawn and cannot play
    if (!gameState.mustDraw) {
      throw new Error('Must draw a card before passing');
    }

    const newGameState: UnoGameState = {
      ...gameState,
      mustDraw: false,
      lastAction: {
        type: action.type,
        playerId: action.playerId,
        timestamp: action.timestamp,
        data: action.data
      }
    };

    return this.advanceToNextPlayer(newGameState);
  }

  /**
   * Check if a card can be played
   */
  private static canPlayCard(card: UnoCard, topCard: UnoCard, wildColor?: UnoCardColor, drawCount: number = 0): boolean {
    // If there are stacked draw cards, can only play matching draw cards
    if (drawCount > 0) {
      return (topCard.type === 'draw2' && card.type === 'draw2') ||
             (topCard.type === 'wild_draw4' && card.type === 'wild_draw4');
    }

    // Wild cards can always be played
    if (card.color === 'wild') return true;

    // Check color match (including wild color)
    const targetColor = wildColor || topCard.color;
    if (card.color === targetColor) return true;

    // Check type match
    if (card.type === topCard.type) return true;

    // Check value match for number cards
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) {
      return true;
    }

    return false;
  }

  /**
   * Apply card effects
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private static applyCardEffect(gameState: UnoGameState, card: UnoCard, _playerId: string): UnoGameState {
    let newGameState = { ...gameState };

    switch (card.type) {
      case 'skip':
        // Skip next player
        newGameState = this.advanceToNextPlayer(newGameState);
        newGameState = this.advanceToNextPlayer(newGameState);
        break;

      case 'reverse':
        // Reverse direction
        newGameState = {
          ...newGameState,
          direction: gameState.direction === 1 ? -1 : 1
        };
        newGameState = this.advanceToNextPlayer(newGameState);
        break;

      case 'draw2':
        // Next player draws 2 cards
        newGameState = {
          ...newGameState,
          drawCount: gameState.drawCount + 2,
          mustDraw: true
        };
        newGameState = this.advanceToNextPlayer(newGameState);
        break;

      case 'wild_draw4':
        // Next player draws 4 cards
        newGameState = {
          ...newGameState,
          drawCount: gameState.drawCount + 4,
          mustDraw: true
        };
        newGameState = this.advanceToNextPlayer(newGameState);
        break;

      case 'wild':
        // Player must choose color (handled separately)
        break;

      default:
        // Regular number card
        newGameState = this.advanceToNextPlayer(newGameState);
        break;
    }

    return newGameState;
  }

  /**
   * Advance to next player
   */
  private static advanceToNextPlayer(gameState: UnoGameState): UnoGameState {
    const playerCount = gameState.playerOrder.length;
    const nextIndex = (gameState.currentPlayerIndex + gameState.direction + playerCount) % playerCount;
    const nextPlayerId = gameState.playerOrder[nextIndex];
    
    if (!nextPlayerId) {
      return gameState; // Safety check
    }

    const newUnoCallouts = { ...gameState.unoCallouts };
    // Reset UNO callout for next player if they have more than 1 card
    newUnoCallouts[nextPlayerId] = 
      gameState.playerHands[nextPlayerId]?.length === 1 
        ? gameState.unoCallouts[nextPlayerId] || false
        : false;

    return {
      ...gameState,
      currentPlayerIndex: nextIndex,
      unoCallouts: newUnoCallouts
    };
  }

  /**
   * Create a standard UNO deck
   */
  private static createDeck(): UnoCard[] {
    const cards: UnoCard[] = [];
    const colors: UnoCardColor[] = ['red', 'yellow', 'green', 'blue'];
    
    // Number cards
    colors.forEach(color => {
      // One 0 card per color
      cards.push({
        id: `${color}-0`,
        color,
        type: 'number',
        value: 0
      });
      
      // Two of each number 1-9 per color
      for (let i = 1; i <= 9; i++) {
        cards.push({
          id: `${color}-${i}-1`,
          color,
          type: 'number',
          value: i
        });
        cards.push({
          id: `${color}-${i}-2`,
          color,
          type: 'number',
          value: i
        });
      }
      
      // Action cards (2 of each per color)
      ['skip', 'reverse', 'draw2'].forEach(type => {
        cards.push({
          id: `${color}-${type}-1`,
          color,
          type: type as UnoCardType
        });
        cards.push({
          id: `${color}-${type}-2`,
          color,
          type: type as UnoCardType
        });
      });
    });
    
    // Wild cards (4 of each)
    for (let i = 1; i <= 4; i++) {
      cards.push({
        id: `wild-${i}`,
        color: 'wild',
        type: 'wild'
      });
      cards.push({
        id: `wild_draw4-${i}`,
        color: 'wild',
        type: 'wild_draw4'
      });
    }
    
    return cards;
  }

  /**
   * Shuffle deck using Fisher-Yates algorithm
   */
  private static shuffleDeck(deck: UnoCard[]): UnoCard[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      const swapCard = shuffled[j];
      if (temp && swapCard) {
        shuffled[i] = swapCard;
        shuffled[j] = temp;
      }
    }
    return shuffled;
  }

  /**
   * Calculate game state checksum for anti-cheat
   */
  static calculateChecksum(gameState: UnoGameState): string {
    // Create a deterministic representation of critical game state
    const criticalState = {
      topCard: gameState.topCard.id,
      currentPlayer: gameState.currentPlayerIndex,
      direction: gameState.direction,
      handSizes: Object.keys(gameState.playerHands).reduce((acc, playerId) => ({
        ...acc,
        [playerId]: gameState.playerHands[playerId]?.length || 0
      }), {}),
      deckSize: gameState.deck.length,
      drawCount: gameState.drawCount,
      wildColor: gameState.wildColor
    };

    // Simple checksum (in production, use crypto.createHash)
    return JSON.stringify(criticalState)
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff, 0)
      .toString(36);
  }

  /**
   * Get public game state (hiding private information)
   */
  static getPublicState(gameState: UnoGameState, requestingPlayerId: string): Record<string, unknown> {
    return {
      topCard: gameState.topCard,
      currentPlayerIndex: gameState.currentPlayerIndex,
      direction: gameState.direction,
      playerOrder: gameState.playerOrder,
      drawCount: gameState.drawCount,
      mustDraw: gameState.mustDraw,
      wildColor: gameState.wildColor,
      gamePhase: gameState.gamePhase,
      winner: gameState.winner,
      handSizes: Object.keys(gameState.playerHands).reduce((acc, playerId) => ({
        ...acc,
        [playerId]: gameState.playerHands[playerId]?.length || 0
      }), {}),
      yourHand: gameState.playerHands[requestingPlayerId] || [],
      unoCallouts: gameState.unoCallouts,
      deckSize: gameState.deck.length,
      lastAction: gameState.lastAction
    };
  }
}