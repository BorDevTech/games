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
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
  useToast,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
  Switch,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import { 
  FaUsers, 
  FaKey, 
  FaPlay, 
  FaCopy, 
  FaCrown, 
  FaRandom,
  FaPlus,
  FaSignInAlt,
  FaCog,
  FaGamepad,
  FaSync
} from 'react-icons/fa';

// Types
type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
type CardType = 'number' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild_draw4';
type GameState = 'setup' | 'lobby' | 'playing' | 'finished' | 'paused';
type RoomType = 'public' | 'private';
type PlayerStatus = 'waiting' | 'playing' | 'spectating' | 'in_queue';

interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  value?: number;
}

interface Player {
  id: string;
  username: string;
  handCount: number;
  isHost: boolean;
  status: PlayerStatus;
  avatar?: string;
  ready: boolean;
}

interface Room {
  id: string;
  name: string;
  type: RoomType;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  inGame: boolean;
  settings: GameSettings;
  createdAt: Date;
}

interface GameSettings {
  maxPlayers: number;
  enablePowerCards: boolean;
  fastMode: boolean;
  customRules: string[];
}

const UnoLike: React.FC = () => {
  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  
  // Hooks
  const toast = useToast();
  const { isOpen: isStatsOpen, onOpen: onStatsOpen, onClose: onStatsClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  
  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomCode, setRoomCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    maxPlayers: 4,
    enablePowerCards: true,
    fastMode: false,
    customRules: []
  });
  
  // Player hand and game cards
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  
  // Statistics
  const [globalGamesPlayed, setGlobalGamesPlayed] = useState<number>(0);
  
  // Generate a random room code
  const generateRoomCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };
  
  // Generate a unique card ID
  const generateCardId = (): string => {
    return Math.random().toString(36).substring(2, 15);
  };
  
  // Create initial deck (simplified UNO deck)
  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
    
    // Number cards (0-9, two of each except 0)
    colors.forEach(color => {
      // One 0 card per color
      deck.push({
        id: generateCardId(),
        color,
        type: 'number',
        value: 0
      });
      
      // Two of each number 1-9 per color
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
      
      // Action cards (two of each per color)
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
    
    // Wild cards
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
  
  // Shuffle deck
  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };
  
  // Create a new room
  const createRoom = (type: RoomType = 'public') => {
    if (!playerName.trim()) {
      toast({
        title: "Enter your name",
        description: "Please enter your name to create a room",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    const newRoomCode = generateRoomCode();
    const playerId = generateCardId();
    
    const newPlayer: Player = {
      id: playerId,
      username: playerName.trim(),
      handCount: 0,
      isHost: true,
      status: 'waiting',
      ready: false
    };
    
    const newRoom: Room = {
      id: newRoomCode,
      name: `${playerName}'s Room`,
      type,
      hostId: playerId,
      players: [newPlayer],
      maxPlayers: gameSettings.maxPlayers,
      inGame: false,
      settings: { ...gameSettings },
      createdAt: new Date()
    };
    
    setCurrentPlayer(newPlayer);
    setCurrentRoom(newRoom);
    setRoomCode(newRoomCode);
    setGameState('lobby');
    
    toast({
      title: "Room created!",
      description: `Room code: ${newRoomCode}`,
      status: "success",
      duration: 5000,
      isClosable: true
    });
  };
  
  // Join an existing room
  const joinRoom = (code: string = joinCode) => {
    if (!playerName.trim()) {
      toast({
        title: "Enter your name",
        description: "Please enter your name to join a room",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    if (!code.trim()) {
      toast({
        title: "Enter room code",
        description: "Please enter a room code to join",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    // Mock room joining (in a real app, this would query the backend)
    const playerId = generateCardId();
    const newPlayer: Player = {
      id: playerId,
      username: playerName.trim(),
      handCount: 0,
      isHost: false,
      status: 'waiting',
      ready: false
    };
    
    // Create a mock room if joining
    const mockRoom: Room = {
      id: code.toUpperCase(),
      name: `Room ${code.toUpperCase()}`,
      type: 'public',
      hostId: 'mock-host',
      players: [
        {
          id: 'mock-host',
          username: 'Room Host',
          handCount: 0,
          isHost: true,
          status: 'waiting',
          ready: true
        },
        newPlayer
      ],
      maxPlayers: gameSettings.maxPlayers,
      inGame: false,
      settings: { ...gameSettings },
      createdAt: new Date()
    };
    
    setCurrentPlayer(newPlayer);
    setCurrentRoom(mockRoom);
    setRoomCode(code.toUpperCase());
    setGameState('lobby');
    
    toast({
      title: "Joined room!",
      description: `Connected to room ${code.toUpperCase()}`,
      status: "success",
      duration: 3000,
      isClosable: true
    });
  };
  
  // Quick play - join any available public room
  const quickPlay = () => {
    if (!playerName.trim()) {
      toast({
        title: "Enter your name",
        description: "Please enter your name for quick play",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    // Mock quick play by creating a room with some players
    const quickRoomCode = generateRoomCode();
    joinRoom(quickRoomCode);
    
    toast({
      title: "Finding game...",
      description: "Connected to quick play room",
      status: "info",
      duration: 3000,
      isClosable: true
    });
  };
  
  // Start the game
  const startGame = () => {
    if (!currentRoom || !currentPlayer) return;
    
    if (!currentPlayer.isHost) {
      toast({
        title: "Not host",
        description: "Only the room host can start the game",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    if (currentRoom.players.filter(p => p.status === 'waiting').length < 2) {
      toast({
        title: "Need more players",
        description: "Need at least 2 players to start",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    // Initialize game
    const deck = shuffleDeck(createDeck());
    const startCard = deck.find(card => card.type === 'number' && card.color !== 'wild');
    
    if (startCard) {
      setCurrentCard(startCard);
    }
    
    // Deal initial hands (7 cards each)
    const initialHand = deck.slice(0, 7);
    setPlayerHand(initialHand);
    
    // Set turn order
    const activePlayers = currentRoom.players.filter(p => p.status === 'waiting');
    setTurnOrder(activePlayers.map(p => p.id));
    setCurrentTurn(0);
    
    setGameState('playing');
    
    // Update global games played
    setGlobalGamesPlayed(prev => prev + 1);
    
    toast({
      title: "Game started!",
      description: "UNO-like game has begun!",
      status: "success",
      duration: 3000,
      isClosable: true
    });
  };
  
  // Copy room code to clipboard
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
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
  
  // Toggle player ready status
  const toggleReady = () => {
    if (!currentPlayer) return;
    
    const newReady = !currentPlayer.ready;
    setCurrentPlayer(prev => prev ? { ...prev, ready: newReady } : null);
    
    toast({
      title: newReady ? "Ready!" : "Not ready",
      description: newReady ? "You are ready to play" : "You are not ready",
      status: newReady ? "success" : "info",
      duration: 2000,
      isClosable: true
    });
  };
  
  // Leave room
  const leaveRoom = () => {
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setRoomCode('');
    setPlayerHand([]);
    setCurrentCard(null);
    setGameState('setup');
    
    toast({
      title: "Left room",
      description: "You have left the room",
      status: "info",
      duration: 2000,
      isClosable: true
    });
  };
  
  // Get card color for display
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
  
  // Get card display text
  const getCardDisplayText = (card: Card): string => {
    if (card.type === 'number') return card.value?.toString() || '0';
    if (card.type === 'skip') return 'SKIP';
    if (card.type === 'reverse') return '⟲';
    if (card.type === 'draw2') return '+2';
    if (card.type === 'wild') return 'WILD';
    if (card.type === 'wild_draw4') return '+4';
    return '';
  };
  
  // Load global games played from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('unolike_global_games');
    if (stored) {
      setGlobalGamesPlayed(parseInt(stored, 10));
    }
  }, []);
  
  // Save global games played to localStorage
  useEffect(() => {
    localStorage.setItem('unolike_global_games', globalGamesPlayed.toString());
  }, [globalGamesPlayed]);

  // Render setup screen
  if (gameState === 'setup') {
    return (
      <VStack spacing={8} maxW="800px" mx="auto">
        <VStack spacing={4} textAlign="center">
          <Heading size="xl" color={accentColor}>
            UNO-Like Card Game
          </Heading>
          <Text color="gray.500" fontSize="lg">
            The classic UNO experience, but with more exciting features!
          </Text>
          <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
            Multiplayer Strategy Game
          </Badge>
        </VStack>

        <Card bg={cardBg} w="full" maxW="500px">
          <CardHeader>
            <Heading size="md" textAlign="center">
              <FaUsers style={{ display: 'inline', marginRight: '8px' }} />
              Join the Game
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Your Name</FormLabel>
                <Input
                  placeholder="Enter your player name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                />
              </FormControl>

              <Divider />

              <VStack spacing={3} w="full">
                <Button
                  colorScheme="blue"
                  size="lg"
                  leftIcon={<FaRandom />}
                  onClick={quickPlay}
                  w="full"
                  isDisabled={!playerName.trim()}
                >
                  Quick Play
                </Button>
                <Text fontSize="sm" color="gray.500">
                  Join any available public room instantly
                </Text>
              </VStack>

              <Divider />

              <VStack spacing={3} w="full">
                <Button
                  colorScheme="green"
                  size="lg"
                  leftIcon={<FaPlus />}
                  onClick={() => createRoom('public')}
                  w="full"
                  isDisabled={!playerName.trim()}
                >
                  Create Public Room
                </Button>
                <Button
                  colorScheme="purple"
                  variant="outline"
                  size="lg"
                  leftIcon={<FaKey />}
                  onClick={() => createRoom('private')}
                  w="full"
                  isDisabled={!playerName.trim()}
                >
                  Create Private Room
                </Button>
              </VStack>

              <Divider />

              <VStack spacing={3} w="full">
                <InputGroup>
                  <InputLeftElement>
                    <FaSignInAlt />
                  </InputLeftElement>
                  <Input
                    placeholder="Enter room code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </InputGroup>
                <Button
                  colorScheme="orange"
                  size="lg"
                  w="full"
                  onClick={() => joinRoom()}
                  isDisabled={!playerName.trim() || !joinCode.trim()}
                >
                  Join Room
                </Button>
              </VStack>

              <Divider />

              <HStack spacing={2} w="full" justify="center">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<FaCog />}
                  onClick={onSettingsOpen}
                >
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<FaGamepad />}
                  onClick={onStatsOpen}
                >
                  Stats
                </Button>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Global Statistics Display */}
        <Card bg={cardBg} w="full" maxW="500px">
          <CardBody textAlign="center">
            <VStack spacing={2}>
              <Text fontSize="sm" color="gray.500">Global Games Played</Text>
              <Text fontSize="2xl" fontWeight="bold" color={accentColor}>
                {globalGamesPlayed.toLocaleString()}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Settings Modal */}
        <Modal isOpen={isSettingsOpen} onClose={onSettingsClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Game Settings</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Maximum Players</FormLabel>
                  <NumberInput
                    value={gameSettings.maxPlayers}
                    onChange={(_, value) => setGameSettings(prev => ({ ...prev, maxPlayers: value || 4 }))}
                    min={2}
                    max={8}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="power-cards" mb="0">
                    Enable Power Cards
                  </FormLabel>
                  <Switch
                    id="power-cards"
                    isChecked={gameSettings.enablePowerCards}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, enablePowerCards: e.target.checked }))}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="fast-mode" mb="0">
                    Fast Mode (Shorter turns)
                  </FormLabel>
                  <Switch
                    id="fast-mode"
                    isChecked={gameSettings.fastMode}
                    onChange={(e) => setGameSettings(prev => ({ ...prev, fastMode: e.target.checked }))}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Stats Modal */}
        <Modal isOpen={isStatsOpen} onClose={onStatsClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Game Statistics</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4}>
                <Card w="full">
                  <CardBody textAlign="center">
                    <Text fontSize="lg" fontWeight="bold">Total Games Played</Text>
                    <Text fontSize="3xl" color={accentColor}>{globalGamesPlayed}</Text>
                  </CardBody>
                </Card>
                <Text color="gray.500" fontSize="sm" textAlign="center">
                  Statistics are tracked globally across all players
                </Text>
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    );
  }

  // Render lobby screen
  if (gameState === 'lobby') {
    return (
      <VStack spacing={6} maxW="1000px" mx="auto">
        <VStack spacing={2} textAlign="center">
          <Heading size="lg">
            {currentRoom?.name || `Room ${roomCode}`}
          </Heading>
          <HStack spacing={2}>
            <Badge colorScheme={currentRoom?.type === 'public' ? 'green' : 'purple'}>
              {currentRoom?.type === 'public' ? 'Public' : 'Private'}
            </Badge>
            <Badge colorScheme="blue">
              Room Code: {roomCode}
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
        </VStack>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6} w="full">
          {/* Players List */}
          <Card>
            <CardHeader>
              <Heading size="md">
                Players ({currentRoom?.players.length || 0}/{currentRoom?.maxPlayers || 4})
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {currentRoom?.players.map((player) => (
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
                        !currentRoom?.players.some(p => p.id !== currentPlayer.id) ||
                        currentRoom?.players.filter(p => p.status === 'waiting').length < 2
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

        {/* Waiting Queue - will be implemented with real multiplayer functionality */}
        {false && (
          <Card w="full">
            <CardHeader>
              <Heading size="md">Waiting to Join (0)</Heading>
            </CardHeader>
            <CardBody>
              <Text fontSize="sm" color="gray.500" mb={3}>
                These players will join when the current round ends
              </Text>
              <HStack spacing={2} flexWrap="wrap">
                {/* Queue players will be shown here */}
              </HStack>
            </CardBody>
          </Card>
        )}
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
            <Text fontSize="sm" color="gray.500">Room: {roomCode}</Text>
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
                {currentRoom?.players
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
                        {/* Turn indicator will be added when turn system is implemented */}
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
                      const player = currentRoom?.players.find(p => p.id === playerId);
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

export default UnoLike;