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
  useColorModeValue,
  useToast,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import { 
  FaCopy, 
  FaCrown, 
  FaPlay,
  FaGamepad,
  FaSync,
  FaRandom
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import roomManager, { Room, Player } from '@/lib/roomManager';

// Types
type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';
type GameState = 'lobby' | 'playing' | 'finished';

interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number;
}

interface UnoLikeRoomProps {
  roomId: string;
  initialRoom: Room;
  onRoomDeleted?: () => void;
}

const UnoLikeRoom: React.FC<UnoLikeRoomProps> = ({ roomId, initialRoom, onRoomDeleted }) => {
  // Color mode values
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Hooks
  const router = useRouter();
  const toast = useToast();
  
  // State
  const [room, setRoom] = useState<Room>(initialRoom);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(0);

  // Join the room if no current player
  useEffect(() => {
    if (!currentPlayer) {
      // For demo purposes, create a demo player
      // In a real app, this would come from user authentication
      const demoPlayer: Omit<Player, 'isHost' | 'joinedAt' | 'lastActivity'> = {
        id: Math.random().toString(36).substring(2, 15),
        username: `Player${Math.floor(Math.random() * 1000)}`,
        handCount: 0,
        status: 'waiting',
        ready: false
      };

      const result = roomManager.joinRoom(roomId, demoPlayer);
      if (result.success && result.room) {
        setRoom(result.room);
        setCurrentPlayer(result.room.players.find(p => p.id === demoPlayer.id) || null);
      } else {
        toast({
          title: "Failed to join room",
          description: result.error || "Could not join the room",
          status: "error",
          duration: 3000,
          isClosable: true
        });
      }
    }
  }, [roomId, currentPlayer, toast]);

  // Periodic room updates (in a real app, this would be WebSocket updates)
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPlayer) {
        roomManager.updatePlayerActivity(roomId, currentPlayer.id);
        const updatedRoom = roomManager.getRoom(roomId);
        if (updatedRoom) {
          setRoom(updatedRoom);
        } else {
          // Room was deleted
          if (onRoomDeleted) {
            onRoomDeleted();
          }
        }
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [roomId, currentPlayer, onRoomDeleted]);

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast({
        title: "Copied!",
        description: "Room code copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true
      });
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  // Share room via URL
  const shareRoom = async () => {
    const roomUrl = `${window.location.origin}/games/04/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(roomUrl);
      toast({
        title: "Room URL copied!",
        description: "Share this URL with others to join the room",
        status: "success",
        duration: 3000,
        isClosable: true
      });
    } catch (err) {
      console.error('Failed to copy room URL:', err);
    }
  };

  // Toggle player ready status
  const toggleReady = () => {
    if (!currentPlayer) return;
    
    const newReady = !currentPlayer.ready;
    setCurrentPlayer(prev => prev ? { ...prev, ready: newReady } : null);
    
    // Update room
    const updatedRoom = { ...room };
    const playerIndex = updatedRoom.players.findIndex(p => p.id === currentPlayer.id);
    if (playerIndex !== -1) {
      updatedRoom.players[playerIndex].ready = newReady;
      setRoom(updatedRoom);
    }
    
    toast({
      title: newReady ? "Ready!" : "Not ready",
      description: newReady ? "You are ready to play" : "You are not ready",
      status: newReady ? "success" : "info",
      duration: 2000,
      isClosable: true
    });
  };

  // Start the game
  const startGame = () => {
    if (!currentPlayer || !room) return;
    
    const result = roomManager.startGame(roomId, currentPlayer.id);
    
    if (!result.success) {
      toast({
        title: "Cannot start game",
        description: result.error || "Failed to start game",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Initialize game
    const deck = createDeck();
    const shuffledDeck = shuffleDeck(deck);
    const startCard = shuffledDeck.find(card => card.type === 'number' && card.color !== 'wild');
    
    if (startCard) {
      setCurrentCard(startCard);
    }
    
    // Deal initial hands (7 cards each)
    const initialHand = shuffledDeck.slice(0, 7);
    setPlayerHand(initialHand);
    
    // Set turn order
    const activePlayers = room.players.filter(p => p.status === 'waiting');
    setTurnOrder(activePlayers.map(p => p.id));
    setCurrentTurn(0);
    
    setGameState('playing');
    
    toast({
      title: "Game started!",
      description: "UNO-like game has begun!",
      status: "success",
      duration: 3000,
      isClosable: true
    });
  };

  // Leave room
  const leaveRoom = () => {
    if (!currentPlayer) return;

    const result = roomManager.leaveRoom(roomId, currentPlayer.id);
    
    if (result.roomDeleted) {
      toast({
        title: "Room deleted",
        description: "The room has been deleted as all players have left",
        status: "info",
        duration: 3000,
        isClosable: true
      });
      
      if (onRoomDeleted) {
        onRoomDeleted();
      }
      return;
    }

    router.push('/games/04');
  };

  // Game helper functions
  const generateCardId = (): string => {
    return Math.random().toString(36).substring(2, 15);
  };

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    
    colors.forEach(color => {
      deck.push({
        id: generateCardId(),
        color,
        type: 'number',
        value: 0
      });
      
      for (let num = 1; num <= 9; num++) {
        for (let i = 0; i < 2; i++) {
          deck.push({
            id: generateCardId(),
            color,
            type: 'number',
            value: num
          });
        }
      }
      
      const actionTypes: CardType[] = ['skip', 'reverse', 'draw2'];
      actionTypes.forEach(actionType => {
        for (let i = 0; i < 2; i++) {
          deck.push({
            id: generateCardId(),
            color,
            type: actionType
          });
        }
      });
    });
    
    for (let i = 0; i < 4; i++) {
      deck.push({
        id: generateCardId(),
        color: 'wild',
        type: 'wild'
      });
      deck.push({
        id: generateCardId(),
        color: 'wild',
        type: 'wild_draw4'
      });
    }
    
    return deck;
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getCardColor = (card: Card): string => {
    switch (card.color) {
      case 'red': return '#E53E3E';
      case 'blue': return '#3182CE';
      case 'green': return '#38A169';
      case 'yellow': return '#D69E2E';
      case 'wild': return '#6B46C1';
      default: return '#4A5568';
    }
  };

  const getCardDisplayText = (card: Card): string => {
    if (card.type === 'number') return card.value?.toString() || '0';
    if (card.type === 'skip') return 'SKIP';
    if (card.type === 'reverse') return '⟲';
    if (card.type === 'draw2') return '+2';
    if (card.type === 'wild') return 'WILD';
    if (card.type === 'wild_draw4') return '+4';
    return '';
  };

  // Render lobby screen
  if (gameState === 'lobby') {
    return (
      <VStack spacing={6} maxW="1000px" mx="auto">
        <VStack spacing={2} textAlign="center">
          <Heading size="lg">
            {room.name || `Room ${roomId}`}
          </Heading>
          <HStack spacing={2}>
            <Badge colorScheme={room.type === 'public' ? 'green' : 'purple'}>
              {room.type === 'public' ? 'Public' : 'Private'}
            </Badge>
            <Badge colorScheme="blue">
              Room Code: {roomId}
            </Badge>
            <Tooltip label="Copy room code">
              <IconButton
                aria-label="Copy room code"
                icon={<FaCopy />}
                size="xs"
                onClick={copyRoomCode}
              />
            </Tooltip>
          </HStack>
          <Button size="sm" variant="outline" onClick={shareRoom}>
            Share Room URL
          </Button>
        </VStack>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6} w="full">
          {/* Players List */}
          <Card>
            <CardHeader>
              <Heading size="md">
                Players ({room.players.length}/{room.maxPlayers})
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {room.players.map((player) => (
                  <Box
                    key={player.id}
                    p={3}
                    borderRadius="md"
                    bg={player.ready ? 'green.50' : 'gray.50'}
                    border="1px"
                    borderColor={player.ready ? 'green.200' : borderColor}
                  >
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Avatar size="sm" name={player.username} />
                        <VStack align="start" spacing={0}>
                          <HStack spacing={1}>
                            <Text fontWeight="medium">{player.username}</Text>
                            {player.isHost && (
                              <Tooltip label="Room Host">
                                <Box color="gold">
                                  <FaCrown />
                                </Box>
                              </Tooltip>
                            )}
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {player.status}
                          </Text>
                        </VStack>
                      </HStack>
                      <Badge colorScheme={player.ready ? 'green' : 'gray'}>
                        {player.ready ? 'Ready' : 'Not Ready'}
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>

          {/* Game Controls */}
          <Card>
            <CardHeader>
              <Heading size="md">Game Controls</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                {currentPlayer?.isHost && (
                  <VStack spacing={3} w="full">
                    <Text fontSize="sm" color="gray.500" textAlign="center">
                      Host Controls
                    </Text>
                    <Button
                      colorScheme="green"
                      size="lg"
                      leftIcon={<FaPlay />}
                      onClick={startGame}
                      w="full"
                      isDisabled={
                        !room.players.some(p => p.id !== currentPlayer.id) ||
                        room.players.filter(p => p.status === 'waiting').length < 2
                      }
                    >
                      Start Game
                    </Button>
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      Need at least 2 players to start
                    </Text>
                  </VStack>
                )}

                <Divider />

                <VStack spacing={3} w="full">
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    Player Controls
                  </Text>
                  <Button
                    colorScheme={currentPlayer?.ready ? 'red' : 'blue'}
                    variant={currentPlayer?.ready ? 'outline' : 'solid'}
                    onClick={toggleReady}
                    w="full"
                  >
                    {currentPlayer?.ready ? 'Not Ready' : 'Ready'}
                  </Button>
                </VStack>

                <Divider />

                <VStack spacing={3} w="full">
                  <Button
                    variant="outline"
                    colorScheme="red"
                    onClick={leaveRoom}
                    w="full"
                  >
                    Leave Room
                  </Button>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </Grid>
      </VStack>
    );
  }

  // Render game screen
  if (gameState === 'playing') {
    return (
      <VStack spacing={6} maxW="1200px" mx="auto">
        <HStack justify="space-between" w="full" flexWrap="wrap">
          <VStack align="start" spacing={1}>
            <Heading size="md">UNO-Like Game</Heading>
            <Text fontSize="sm" color="gray.500">Room: {roomId}</Text>
          </VStack>
          <HStack spacing={2}>
            <Button size="sm" variant="outline" onClick={() => setGameState('lobby')}>
              Back to Lobby
            </Button>
            <Button size="sm" variant="outline" onClick={leaveRoom}>
              Leave Game
            </Button>
          </HStack>
        </HStack>

        {/* Game Board */}
        <Grid templateColumns={{ base: '1fr', lg: '300px 1fr 300px' }} gap={6} w="full">
          {/* Other Players */}
          <Card>
            <CardHeader>
              <Heading size="sm">Other Players</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={2} align="stretch">
                {room.players
                  .filter(p => p.id !== currentPlayer?.id)
                  .map((player) => (
                    <Box
                      key={player.id}
                      p={2}
                      borderRadius="md"
                      bg="gray.50"
                      border="1px"
                      borderColor={borderColor}
                    >
                      <HStack justify="space-between">
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            {player.username}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {player.handCount} cards
                          </Text>
                        </VStack>
                      </HStack>
                    </Box>
                  ))}
              </VStack>
            </CardBody>
          </Card>

          {/* Game Center */}
          <VStack spacing={4}>
            <Card w="full">
              <CardBody textAlign="center">
                <VStack spacing={4}>
                  <Text fontSize="lg" fontWeight="bold">Current Card</Text>
                  
                  {currentCard && (
                    <Box
                      w="120px"
                      h="160px"
                      bg={getCardColor(currentCard)}
                      borderRadius="lg"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      color="white"
                      fontWeight="bold"
                      fontSize="xl"
                      border="3px solid"
                      borderColor="white"
                      boxShadow="lg"
                    >
                      {getCardDisplayText(currentCard)}
                    </Box>
                  )}
                  
                  <HStack spacing={2}>
                    <Badge colorScheme="blue">
                      Direction: Clockwise
                    </Badge>
                    <Badge colorScheme="purple">
                      Cards in deck: 47
                    </Badge>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Action Buttons */}
            <HStack spacing={2}>
              <Button colorScheme="blue" size="sm">
                Draw Card
              </Button>
              <Button colorScheme="red" size="sm">
                UNO!
              </Button>
              <Button colorScheme="purple" size="sm" variant="outline">
                Challenge
              </Button>
            </HStack>
          </VStack>

          {/* Game Info */}
          <Card>
            <CardHeader>
              <Heading size="sm">Game Info</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Turn Order</Text>
                  <Text fontSize="xs" color="gray.500">
                    {turnOrder.map((playerId) => {
                      const player = room.players.find(p => p.id === playerId);
                      return (
                        <Badge
                          key={playerId}
                          colorScheme="gray"
                          mr={1}
                          mb={1}
                        >
                          {player?.username || 'Unknown'}
                        </Badge>
                      );
                    })}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Game Rules</Text>
                  <List spacing={1} fontSize="xs" color="gray.500">
                    <ListItem>
                      <ListIcon as={FaGamepad} color="blue.500" />
                      Match color or number
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaGamepad} color="blue.500" />
                      Use action cards strategically
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaGamepad} color="blue.500" />
                      Call "UNO" with 1 card left
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaGamepad} color="blue.500" />
                      First to empty hand wins
                    </ListItem>
                  </List>
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Special Features</Text>
                  <List spacing={1} fontSize="xs" color="gray.500">
                    <ListItem>
                      <ListIcon as={FaSync} color="purple.500" />
                      Power cards enabled
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaRandom} color="purple.500" />
                      Challenge system
                    </ListItem>
                  </List>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        </Grid>

        {/* Player Hand */}
        <Card w="full">
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="sm">Your Hand ({playerHand.length} cards)</Heading>
              <Badge colorScheme={currentTurn === 0 ? 'green' : 'gray'}>
                {currentTurn === 0 ? 'Your Turn' : 'Waiting'}
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <HStack spacing={2} overflowX="auto" pb={2}>
              {playerHand.map((card) => (
                <Box
                  key={card.id}
                  w="80px"
                  h="100px"
                  bg={getCardColor(card)}
                  borderRadius="md"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontWeight="bold"
                  fontSize="sm"
                  border="2px solid"
                  borderColor="white"
                  cursor="pointer"
                  transition="transform 0.2s"
                  _hover={{ transform: 'translateY(-4px)' }}
                  flexShrink={0}
                >
                  {getCardDisplayText(card)}
                </Box>
              ))}
              
              {playerHand.length === 0 && (
                <Box
                  w="full"
                  h="100px"
                  borderRadius="md"
                  border="2px dashed"
                  borderColor="gray.300"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="gray.500"
                >
                  <Text fontSize="sm">No cards in hand</Text>
                </Box>
              )}
            </HStack>
          </CardBody>
        </Card>
      </VStack>
    );
  }

  return null;
};

export default UnoLikeRoom;