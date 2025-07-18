"use client";

import React, { useState, useEffect } from 'react';
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
import gameStateManager, { GameState, UnoCard } from '@/lib/gameStateManager';

interface UnoGameplayProps {
  roomId: string;
  players: Player[];
  currentPlayer: Player;
  onEndGame: () => void;
}

const UnoGameplay: React.FC<UnoGameplayProps> = ({ roomId, players, currentPlayer, onEndGame }) => {
  const toast = useToast();
  
  // Filter out AI dealer for game players - this should be consistent everywhere
  const gamePlayers = players.filter(p => p.id !== 'ai-dealer-bot' && p.status === 'playing');
  
  // Initialize or load game state
  const [gameState, setGameState] = useState<GameState | null>(() => {
    const existingState = gameStateManager.getGameState(roomId);
    if (existingState) {
      // Ensure the game state player order matches our current game players
      const currentPlayerIds = gamePlayers.map(p => p.id);
      if (existingState.playerOrder.length !== currentPlayerIds.length || 
          !existingState.playerOrder.every(id => currentPlayerIds.includes(id))) {
        console.log('Player order mismatch detected, recreating game state');
        return gameStateManager.createGameState(roomId, currentPlayerIds);
      }
      return existingState;
    }
    
    // Create new game state if none exists
    const playerIds = gamePlayers.map(p => p.id);
    if (playerIds.length >= 2) {
      return gameStateManager.createGameState(roomId, playerIds);
    }
    return null; // Not enough players to start
  });

  // Periodic sync with other devices
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const syncedState = gameStateManager.getGameState(roomId, true); // Force sync
      if (syncedState && gameState) {
        // Check if the state has changed significantly
        if (syncedState.syncedAt && gameState.syncedAt && syncedState.syncedAt > gameState.syncedAt) {
          // Additional validation to prevent invalid states
          const currentPlayerIds = gamePlayers.map(p => p.id);
          if (syncedState.playerOrder.length === currentPlayerIds.length && 
              syncedState.playerOrder.every(id => currentPlayerIds.includes(id)) &&
              syncedState.currentPlayerIndex >= 0 && 
              syncedState.currentPlayerIndex < syncedState.playerOrder.length) {
            console.log('Syncing updated game state from API');
            setGameState(syncedState);
          } else {
            console.warn('Received invalid game state from sync, ignoring');
          }
        }
      }
    }, 3000); // Reduce sync frequency to 3 seconds to avoid conflicts

    return () => clearInterval(syncInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, gameState?.syncedAt, gamePlayers.length]);

  if (!gameState) {
    return (
      <VStack spacing={4}>
        <Text>Loading game...</Text>
      </VStack>
    );
  }

  // Check if a card can be played
  function canPlayCard(card: UnoCard, topCard: UnoCard): boolean {
    if (card.color === 'wild') return true;
    if (card.color === topCard.color) return true;
    if (card.type === topCard.type) return true;
    if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
    return false;
  }

  // Get card background color
  function getCardColor(card: UnoCard): string {
    switch (card.color) {
      case 'red': return 'red.500';
      case 'yellow': return 'yellow.500';
      case 'green': return 'green.500';
      case 'blue': return 'blue.500';
      case 'wild': return 'gray.800';
      default: return 'gray.400';
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
    if (!gameState || gameState.gameEnded) return;
    
    // Force fresh state check before making any moves
    const freshState = gameStateManager.getGameState(roomId, true);
    if (!freshState || freshState.gameEnded) {
      toast({
        title: "Game state error",
        description: "Unable to get current game state",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }
    
    // Use fresh state for validation
    const currentGamePlayer = gamePlayers[freshState.currentPlayerIndex];
    if (!currentGamePlayer || currentGamePlayer.id !== currentPlayer.id) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to play",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (!canPlayCard(card, freshState.topCard)) {
      toast({
        title: "Invalid move",
        description: "That card cannot be played",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }
    
    // Verify player has this card in their hand
    const playerHand = freshState.playerHands[currentPlayer.id] || [];
    if (!playerHand.find(c => c.id === card.id)) {
      toast({
        title: "Invalid card",
        description: "You don't have this card in your hand",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    // Remove card from player's hand
    const newPlayerHands = { ...freshState.playerHands };
    newPlayerHands[currentPlayer.id] = newPlayerHands[currentPlayer.id].filter(c => c.id !== card.id);
    
    // Check if player won
    if (newPlayerHands[currentPlayer.id].length === 0) {
      const updatedState = gameStateManager.updateGameState(roomId, {
        gameEnded: true,
        winner: currentPlayer.id,
        playerHands: newPlayerHands,
        topCard: card
      }, {
        type: 'play_card',
        playerId: currentPlayer.id,
        data: { cardId: card.id, gameWon: true }
      });
      
      if (updatedState) {
        setGameState(updatedState);
      }
      
      toast({
        title: "Game Over!",
        description: `${currentPlayer.username} wins!`,
        status: "success",
        duration: 5000,
        isClosable: true
      });
      return;
    }

    let newDirection = freshState.direction;
    let nextPlayerIndex = freshState.currentPlayerIndex;

    // Handle action cards
    if (card.type === 'reverse') {
      newDirection = freshState.direction * -1 as 1 | -1;
    } else if (card.type === 'skip') {
      // Skip next player
      nextPlayerIndex = (nextPlayerIndex + newDirection + gamePlayers.length) % gamePlayers.length;
    } else if (card.type === 'draw2') {
      // Next player draws 2 and is skipped
      const nextPlayerId = gamePlayers[(nextPlayerIndex + newDirection + gamePlayers.length) % gamePlayers.length].id;
      const drawnCards = freshState.deck.slice(0, 2);
      newPlayerHands[nextPlayerId] = [...newPlayerHands[nextPlayerId], ...drawnCards];
      nextPlayerIndex = (nextPlayerIndex + newDirection + gamePlayers.length) % gamePlayers.length;
    }

    // Move to next player
    nextPlayerIndex = (nextPlayerIndex + newDirection + gamePlayers.length) % gamePlayers.length;

    const updatedState = gameStateManager.updateGameState(roomId, {
      currentPlayerIndex: nextPlayerIndex,
      direction: newDirection,
      topCard: card,
      playerHands: newPlayerHands,
      hasDrawn: false
    }, {
      type: 'play_card',
      playerId: currentPlayer.id,
      data: { cardId: card.id, cardType: card.type }
    });
    
    if (updatedState) {
      setGameState(updatedState);
    }
  }

  // Draw a card
  function drawCard() {
    if (!gameState || gameState.gameEnded) return;
    
    // Force fresh state check before making any moves
    const freshState = gameStateManager.getGameState(roomId, true);
    if (!freshState || freshState.gameEnded) {
      toast({
        title: "Game state error",
        description: "Unable to get current game state",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }
    
    const currentGamePlayer = gamePlayers[freshState.currentPlayerIndex];
    if (!currentGamePlayer || currentGamePlayer.id !== currentPlayer.id) {
      toast({
        title: "Not your turn",
        description: "Wait for your turn to draw",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (freshState.hasDrawn) {
      toast({
        title: "Already drawn",
        description: "You can only draw one card per turn",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    if (freshState.deck.length === 0) {
      toast({
        title: "Deck empty",
        description: "No more cards to draw",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    const drawnCard = freshState.deck[0];
    const newPlayerHands = { ...freshState.playerHands };
    newPlayerHands[currentPlayer.id] = [...newPlayerHands[currentPlayer.id], drawnCard];

    const updatedState = gameStateManager.updateGameState(roomId, {
      deck: freshState.deck.slice(1),
      playerHands: newPlayerHands,
      hasDrawn: true
    }, {
      type: 'draw_card',
      playerId: currentPlayer.id,
      data: { cardId: drawnCard.id }
    });
    
    if (updatedState) {
      setGameState(updatedState);
    }
  }

  // Pass turn
  function passTurn() {
    if (!gameState || gameState.gameEnded) return;
    
    // Force fresh state check before making any moves
    const freshState = gameStateManager.getGameState(roomId, true);
    if (!freshState || freshState.gameEnded) {
      toast({
        title: "Game state error",
        description: "Unable to get current game state",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }
    
    const currentGamePlayer = gamePlayers[freshState.currentPlayerIndex];
    if (!currentGamePlayer || currentGamePlayer.id !== currentPlayer.id) {
      toast({
        title: "Not your turn",
        description: "It's not your turn to pass",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }
    
    if (!freshState.hasDrawn) {
      toast({
        title: "Must draw first",
        description: "You must draw a card before passing",
        status: "warning",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    const nextPlayerIndex = (freshState.currentPlayerIndex + freshState.direction + gamePlayers.length) % gamePlayers.length;
    
    const updatedState = gameStateManager.updateGameState(roomId, {
      currentPlayerIndex: nextPlayerIndex,
      hasDrawn: false
    }, {
      type: 'pass_turn',
      playerId: currentPlayer.id
    });
    
    if (updatedState) {
      setGameState(updatedState);
    }
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