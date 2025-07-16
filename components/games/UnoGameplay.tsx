"use client";

import React, { useState } from 'react';
import {
  Grid,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  useToast,
  Avatar,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { Player } from '@/lib/roomManager';

// UNO Card types
type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';

interface UnoCard {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number; // For number cards (0-9)
}

interface GameState {
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 for clockwise, -1 for counterclockwise
  topCard: UnoCard;
  deck: UnoCard[];
  playerHands: { [playerId: string]: UnoCard[] };
  hasDrawn: boolean;
  gameEnded: boolean;
  winner?: string;
}

interface UnoGameplayProps {
  players: Player[];
  currentPlayer: Player;
  onEndGame: () => void;
}

const UnoGameplay: React.FC<UnoGameplayProps> = ({ players, currentPlayer, onEndGame }) => {
  const toast = useToast();
  
  // Filter out AI dealer for game players
  const gamePlayers = players.filter(p => p.id !== 'ai-dealer-bot' && p.status === 'playing');
  
  // Initialize game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const deck = createDeck();
    const shuffledDeck = shuffleDeck(deck);
    
    // Deal initial hands (7 cards each)
    const playerHands: { [playerId: string]: UnoCard[] } = {};
    let deckIndex = 0;
    
    gamePlayers.forEach(player => {
      playerHands[player.id] = shuffledDeck.slice(deckIndex, deckIndex + 7);
      deckIndex += 7;
    });
    
    // Set starting card (skip action cards for simplicity)
    let topCardIndex = deckIndex;
    let topCard = shuffledDeck[topCardIndex];
    while (topCard.type !== 'number') {
      topCardIndex++;
      topCard = shuffledDeck[topCardIndex];
    }
    
    return {
      currentPlayerIndex: 0,
      direction: 1,
      topCard,
      deck: shuffledDeck.slice(topCardIndex + 1),
      playerHands,
      hasDrawn: false,
      gameEnded: false
    };
  });

  // Create a standard UNO deck
  function createDeck(): UnoCard[] {
    const cards: UnoCard[] = [];
    const colors: CardColor[] = ['red', 'yellow', 'green', 'blue'];
    
    // Number cards (0-9)
    colors.forEach(color => {
      // One 0 card per color
      cards.push({ id: `${color}-0`, color, type: 'number', value: 0 });
      
      // Two of each 1-9 per color
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
    
    // Wild cards
    for (let i = 1; i <= 4; i++) {
      cards.push({ id: `wild-${i}`, color: 'wild', type: 'wild' });
      cards.push({ id: `wild_draw4-${i}`, color: 'wild', type: 'wild_draw4' });
    }
    
    return cards;
  }

  // Shuffle deck
  function shuffleDeck(deck: UnoCard[]): UnoCard[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Check if a card can be played
  function canPlayCard(card: UnoCard, topCard: UnoCard): boolean {
    if (card.color === 'wild') return true;
    if (card.color === topCard.color) return true;
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    if (card.type === topCard.type && card.type !== 'number') return true;
    return false;
  }

  // Get card color for display
  function getCardColor(card: UnoCard): string {
    switch (card.color) {
      case 'red': return 'red.500';
      case 'yellow': return 'yellow.500';
      case 'green': return 'green.500';
      case 'blue': return 'blue.500';
      case 'wild': return 'purple.500';
      default: return 'gray.500';
    }
  }

  // Get card display text
  function getCardText(card: UnoCard): string {
    if (card.type === 'number') return card.value?.toString() || '0';
    if (card.type === 'skip') return 'Skip';
    if (card.type === 'reverse') return 'Rev';
    if (card.type === 'draw2') return '+2';
    if (card.type === 'wild') return 'Wild';
    if (card.type === 'wild_draw4') return '+4';
    return '';
  }

  // Play a card
  function playCard(card: UnoCard) {
    if (gameState.gameEnded) return;
    
    const currentGamePlayer = gamePlayers[gameState.currentPlayerIndex];
    if (currentGamePlayer.id !== currentPlayer.id) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to play",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (!canPlayCard(card, gameState.topCard)) {
      toast({
        title: "Invalid move",
        description: "That card cannot be played",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    // Remove card from player's hand
    const newPlayerHands = { ...gameState.playerHands };
    newPlayerHands[currentPlayer.id] = newPlayerHands[currentPlayer.id].filter(c => c.id !== card.id);
    
    // Check if player won
    if (newPlayerHands[currentPlayer.id].length === 0) {
      setGameState(prev => ({
        ...prev,
        gameEnded: true,
        winner: currentPlayer.id,
        playerHands: newPlayerHands,
        topCard: card
      }));
      
      toast({
        title: "Game Over!",
        description: `${currentPlayer.username} wins!`,
        status: "success",
        duration: 5000,
        isClosable: true
      });
      return;
    }

    let newDirection = gameState.direction;
    let nextPlayerIndex = gameState.currentPlayerIndex;

    // Handle action cards
    if (card.type === 'reverse') {
      newDirection = gameState.direction * -1 as 1 | -1;
    } else if (card.type === 'skip') {
      // Skip next player
      nextPlayerIndex = (nextPlayerIndex + newDirection + gamePlayers.length) % gamePlayers.length;
    } else if (card.type === 'draw2') {
      // Next player draws 2 and is skipped
      const nextPlayerId = gamePlayers[(nextPlayerIndex + newDirection + gamePlayers.length) % gamePlayers.length].id;
      const drawnCards = gameState.deck.slice(0, 2);
      newPlayerHands[nextPlayerId] = [...newPlayerHands[nextPlayerId], ...drawnCards];
      nextPlayerIndex = (nextPlayerIndex + newDirection + gamePlayers.length) % gamePlayers.length;
    }

    // Move to next player
    nextPlayerIndex = (nextPlayerIndex + newDirection + gamePlayers.length) % gamePlayers.length;

    setGameState(prev => ({
      ...prev,
      currentPlayerIndex: nextPlayerIndex,
      direction: newDirection,
      topCard: card,
      playerHands: newPlayerHands,
      hasDrawn: false
    }));
  }

  // Draw a card
  function drawCard() {
    if (gameState.gameEnded) return;
    
    const currentGamePlayer = gamePlayers[gameState.currentPlayerIndex];
    if (currentGamePlayer.id !== currentPlayer.id) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to draw",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (gameState.hasDrawn) {
      toast({
        title: "Already drawn",
        description: "You can only draw one card per turn",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (gameState.deck.length === 0) {
      toast({
        title: "Deck empty",
        description: "No more cards to draw",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    const drawnCard = gameState.deck[0];
    const newPlayerHands = { ...gameState.playerHands };
    newPlayerHands[currentPlayer.id] = [...newPlayerHands[currentPlayer.id], drawnCard];

    setGameState(prev => ({
      ...prev,
      deck: prev.deck.slice(1),
      playerHands: newPlayerHands,
      hasDrawn: true
    }));
  }

  // Pass turn
  function passTurn() {
    if (gameState.gameEnded) return;
    
    const currentGamePlayer = gamePlayers[gameState.currentPlayerIndex];
    if (currentGamePlayer.id !== currentPlayer.id) return;
    
    if (!gameState.hasDrawn) {
      toast({
        title: "Must draw first",
        description: "You must draw a card before passing",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    const nextPlayerIndex = (gameState.currentPlayerIndex + gameState.direction + gamePlayers.length) % gamePlayers.length;
    
    setGameState(prev => ({
      ...prev,
      currentPlayerIndex: nextPlayerIndex,
      hasDrawn: false
    }));
  }

  const currentGamePlayer = gamePlayers[gameState.currentPlayerIndex];
  const myHand = gameState.playerHands[currentPlayer.id] || [];
  
  return (
    <VStack spacing={6} maxW="1200px" mx="auto">
      {/* Game Header */}
      <VStack spacing={2} textAlign="center">
        <Heading size="lg">UNO Game</Heading>
        <HStack spacing={4}>
          <Badge colorScheme="blue">
            Current: {currentGamePlayer?.username}
          </Badge>
          <Badge colorScheme={gameState.direction === 1 ? 'green' : 'orange'}>
            {gameState.direction === 1 ? 'Clockwise' : 'Counter-clockwise'}
          </Badge>
          {gameState.direction === 1 ? <FaArrowRight /> : <FaArrowLeft />}
        </HStack>
      </VStack>

      {/* Game Over */}
      {gameState.gameEnded && (
        <Card bg="green.50" borderColor="green.200" border="2px">
          <CardBody textAlign="center">
            <VStack spacing={3}>
              <Heading size="md" color="green.600">
                🎉 Game Over! 🎉
              </Heading>
              <Text>
                {gamePlayers.find(p => p.id === gameState.winner)?.username} wins!
              </Text>
              <Button colorScheme="blue" onClick={onEndGame}>
                Return to Lobby
              </Button>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Game Board */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 300px 1fr' }} gap={6} w="full">
        {/* Other Players */}
        <Card>
          <CardHeader>
            <Heading size="md">Other Players</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3}>
              {gamePlayers
                .filter(p => p.id !== currentPlayer.id)
                .map((player) => (
                  <Box
                    key={player.id}
                    p={3}
                    borderRadius="md"
                    bg={player.id === currentGamePlayer?.id ? 'blue.50' : 'gray.50'}
                    border="2px"
                    borderColor={player.id === currentGamePlayer?.id ? 'blue.200' : 'gray.200'}
                    w="full"
                  >
                    <HStack justify="space-between">
                      <HStack>
                        <Avatar size="sm" name={player.username} />
                        <Text fontWeight="medium">{player.username}</Text>
                      </HStack>
                      <Badge>
                        {gameState.playerHands[player.id]?.length || 0} cards
                      </Badge>
                    </HStack>
                  </Box>
                ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Center Area - Current Card & Actions */}
        <VStack spacing={4}>
          <Card>
            <CardBody textAlign="center">
              <VStack spacing={3}>
                <Text fontSize="sm" color="gray.600">Current Card</Text>
                <Box
                  w="80px"
                  h="120px"
                  bg={getCardColor(gameState.topCard)}
                  color="white"
                  borderRadius="lg"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="lg"
                  fontWeight="bold"
                  boxShadow="lg"
                >
                  {getCardText(gameState.topCard)}
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Game Actions */}
          {!gameState.gameEnded && currentGamePlayer?.id === currentPlayer.id && (
            <VStack spacing={2}>
              <Button
                colorScheme="green"
                onClick={drawCard}
                disabled={gameState.hasDrawn || gameState.deck.length === 0}
                size="sm"
              >
                Draw Card ({gameState.deck.length} left)
              </Button>
              {gameState.hasDrawn && (
                <Button
                  colorScheme="orange"
                  onClick={passTurn}
                  size="sm"
                >
                  Pass Turn
                </Button>
              )}
            </VStack>
          )}
        </VStack>

        {/* Game Info */}
        <Card>
          <CardHeader>
            <Heading size="md">Game Info</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm">
                <strong>Cards in deck:</strong> {gameState.deck.length}
              </Text>
              <Text fontSize="sm">
                <strong>Your turn:</strong> {currentGamePlayer?.id === currentPlayer.id ? 'Yes' : 'No'}
              </Text>
              {!gameState.gameEnded && (
                <Button
                  variant="outline"
                  colorScheme="red"
                  onClick={onEndGame}
                  size="sm"
                >
                  End Game
                </Button>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Grid>

      {/* Your Hand */}
      <Card w="full">
        <CardHeader>
          <Heading size="md">Your Hand ({myHand.length} cards)</Heading>
        </CardHeader>
        <CardBody>
          <Wrap spacing={2} justify="center">
            {myHand.map((card) => {
              const canPlay = canPlayCard(card, gameState.topCard);
              const isMyTurn = currentGamePlayer?.id === currentPlayer.id;
              
              return (
                <WrapItem key={card.id}>
                  <Box
                    w="60px"
                    h="90px"
                    bg={getCardColor(card)}
                    color="white"
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="sm"
                    fontWeight="bold"
                    cursor={canPlay && isMyTurn && !gameState.gameEnded ? 'pointer' : 'not-allowed'}
                    opacity={canPlay && isMyTurn && !gameState.gameEnded ? 1 : 0.6}
                    boxShadow="md"
                    border={canPlay && isMyTurn && !gameState.gameEnded ? '2px solid' : '1px solid'}
                    borderColor={canPlay && isMyTurn && !gameState.gameEnded ? 'yellow.300' : 'gray.300'}
                    _hover={canPlay && isMyTurn && !gameState.gameEnded ? {
                      transform: 'translateY(-4px)',
                      boxShadow: 'lg'
                    } : {}}
                    transition="all 0.2s"
                    onClick={() => {
                      if (canPlay && isMyTurn && !gameState.gameEnded) {
                        playCard(card);
                      }
                    }}
                  >
                    {getCardText(card)}
                  </Box>
                </WrapItem>
              );
            })}
          </Wrap>
          {myHand.length === 0 && (
            <Text textAlign="center" color="gray.500">
              No cards in hand
            </Text>
          )}
        </CardBody>
      </Card>
    </VStack>
  );
};

export default UnoGameplay;