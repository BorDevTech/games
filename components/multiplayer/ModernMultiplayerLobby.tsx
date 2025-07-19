"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue,
  useToast,
  Tooltip,
  Avatar,
  Flex,
  CircularProgress,
  CircularProgressLabel,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { 
  FaWifi,
  FaGamepad,
  FaUsers,
  FaCrown,
  FaPlay,
  FaPause,
  FaRedo
} from 'react-icons/fa';
import { MdSignalWifiOff } from 'react-icons/md';
import { MultiplayerClient, LobbyInfo, ConnectionStatus } from '@/lib/multiplayer/MultiplayerClient';

interface ModernMultiplayerLobbyProps {
  gameType: 'uno' | 'tetris' | 'tictactoe';
  onGameStart?: (gameData: unknown) => void;
  onLeaveLobby?: () => void;
}

const ModernMultiplayerLobby: React.FC<ModernMultiplayerLobbyProps> = ({
  gameType,
  onGameStart,
  onLeaveLobby
}) => {
  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Hooks
  const toast = useToast();
  
  // State
  const [client] = useState(() => new MultiplayerClient());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false,
    latency: 0,
    quality: 'excellent',
    reconnectAttempts: 0
  });
  const [currentLobby, setCurrentLobby] = useState<LobbyInfo | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [gameStarting, setGameStarting] = useState<boolean>(false);

  // Color values that need to be outside callbacks
  const playerListBg = useColorModeValue('gray.50', 'gray.700');
  
  // Initialize connection
  useEffect(() => {
    initializeConnection();
    
    return () => {
      client.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeConnection = async () => {
    try {
      // Get player info from session
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const playerInfo = await sessionManager.getPlayerInfo();
      
      if (!playerInfo) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access multiplayer features",
          status: "warning",
          duration: 5000,
          isClosable: true
        });
        return;
      }

      // Set up event handlers
      setupEventHandlers();
      
      // Connect to game server
      const session = await sessionManager.getCurrentSession();
      const connected = await client.connect(
        playerInfo.id,
        playerInfo.username,
        session?.sessionId || 'temp_session'
      );

      if (connected) {
        // Try to find a match automatically
        await findMatch();
      }

    } catch (error) {
      console.error('Connection initialization failed:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to connect to game server. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true
      });
    }
  };

  const setupEventHandlers = () => {
    // Connection events
    client.on('connecting', () => {
      setConnectionStatus(prev => ({ ...prev, connecting: true }));
    });

    client.on('connected', () => {
      setConnectionStatus(client.getConnectionStatus());
      toast({
        title: "Connected",
        description: "Connected to game server successfully",
        status: "success",
        duration: 3000,
        isClosable: true
      });
    });

    client.on('disconnected', ({ reason }) => {
      setConnectionStatus(client.getConnectionStatus());
      toast({
        title: "Disconnected",
        description: `Lost connection to server: ${reason}`,
        status: "warning",
        duration: 5000,
        isClosable: true
      });
    });

    // Lobby events
    client.on('lobby_joined', (lobby: LobbyInfo) => {
      setCurrentLobby(lobby);
      setIsHost(lobby.hostId === lobby.players.find(p => p.id)?.id);
      toast({
        title: "Joined Lobby",
        description: `Joined ${lobby.gameType.toUpperCase()} lobby with ${lobby.players.length} players`,
        status: "success",
        duration: 3000,
        isClosable: true
      });
    });

    client.on('lobby_updated', (lobby: LobbyInfo) => {
      setCurrentLobby(lobby);
    });

    client.on('lobby_closed', (reason: string) => {
      setCurrentLobby(null);
      setIsReady(false);
      setIsHost(false);
      toast({
        title: "Lobby Closed",
        description: `Lobby was closed: ${reason}`,
        status: "info",
        duration: 5000,
        isClosable: true
      });
    });

    // Game events
    client.on('game_started', (gameData) => {
      setGameStarting(true);
      setTimeout(() => {
        onGameStart?.(gameData);
      }, 3000); // 3 second countdown
    });

    client.on('error', (error) => {
      toast({
        title: "Game Error",
        description: error.message || "An unknown error occurred",
        status: "error",
        duration: 5000,
        isClosable: true
      });
    });

    // Connection quality monitoring
    const updateStatus = () => {
      setConnectionStatus(client.getConnectionStatus());
    };
    
    const statusInterval = setInterval(updateStatus, 1000);
    return () => clearInterval(statusInterval);
  };

  const findMatch = async () => {
    try {
      const lobbyId = await client.findMatch({
        gameType,
        gameMode: 'classic'
      });
      
      if (!lobbyId) {
        toast({
          title: "No Match Found",
          description: "Creating a new lobby for you...",
          status: "info",
          duration: 3000,
          isClosable: true
        });
        
        // Create new lobby
        await createLobby();
      }
    } catch (error) {
      console.error('Matchmaking failed:', error);
      toast({
        title: "Matchmaking Failed",
        description: "Unable to find or create a game. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true
      });
    }
  };

  const createLobby = async () => {
    try {
      const lobbyId = await client.createLobby(gameType, {
        maxPlayers: gameType === 'uno' ? 6 : gameType === 'tictactoe' ? 2 : 4,
        gameMode: 'classic'
      });
      
      if (!lobbyId) {
        throw new Error('Failed to create lobby');
      }
    } catch (error) {
      console.error('Lobby creation failed:', error);
      toast({
        title: "Failed to Create Lobby",
        description: "Unable to create a new game lobby",
        status: "error",
        duration: 5000,
        isClosable: true
      });
    }
  };

  const toggleReady = () => {
    const newReadyState = !isReady;
    client.setReady(newReadyState);
    setIsReady(newReadyState);
  };

  const startGame = () => {
    if (isHost && currentLobby) {
      const readyPlayers = currentLobby.players.filter(p => p.ready);
      if (readyPlayers.length < 2) {
        toast({
          title: "Cannot Start Game",
          description: "Need at least 2 ready players to start",
          status: "warning",
          duration: 3000,
          isClosable: true
        });
        return;
      }
      
      client.startGame();
    }
  };

  const leaveLobby = async () => {
    await client.leaveLobby();
    setCurrentLobby(null);
    setIsReady(false);
    setIsHost(false);
    onLeaveLobby?.();
  };

  const getConnectionIcon = () => {
    if (!connectionStatus.connected) {
      return <MdSignalWifiOff color="red" />;
    }
    
    switch (connectionStatus.quality) {
      case 'excellent':
        return <FaWifi color="green" />;
      case 'good':
        return <FaWifi color="blue" />;
      case 'fair':
        return <FaWifi color="orange" />;
      default:
        return <FaWifi color="red" />;
    }
  };

  const getConnectionQualityColor = () => {
    switch (connectionStatus.quality) {
      case 'excellent': return 'green';
      case 'good': return 'blue';
      case 'fair': return 'orange';
      default: return 'red';
    }
  };

  if (gameStarting) {
    return (
      <Box textAlign="center" py={20}>
        <CircularProgress size="120px" isIndeterminate color="purple.400">
          <CircularProgressLabel>
            <FaGamepad size="40px" />
          </CircularProgressLabel>
        </CircularProgress>
        <Heading mt={6} size="lg">Game Starting...</Heading>
        <Text mt={2} color="gray.500">Get ready to play!</Text>
      </Box>
    );
  }

  if (!connectionStatus.connected) {
    return (
      <Box textAlign="center" py={20}>
        <VStack spacing={6}>
          <CircularProgress 
            size="120px" 
            isIndeterminate={connectionStatus.connecting}
            color="purple.400"
          >
            <CircularProgressLabel>
              {connectionStatus.connecting ? <FaWifi /> : <MdSignalWifiOff />}
            </CircularProgressLabel>
          </CircularProgress>
          
          <VStack spacing={2}>
            <Heading size="lg">
              {connectionStatus.connecting ? 'Connecting...' : 'Connection Lost'}
            </Heading>
            <Text color="gray.500">
              {connectionStatus.connecting 
                ? 'Establishing connection to game server' 
                : 'Unable to connect to multiplayer server'
              }
            </Text>
            {connectionStatus.reconnectAttempts > 0 && (
              <Text fontSize="sm" color="orange.500">
                Reconnection attempts: {connectionStatus.reconnectAttempts}
              </Text>
            )}
          </VStack>

          {!connectionStatus.connecting && (
            <Button
              leftIcon={<FaRedo />}
              colorScheme="purple"
              onClick={initializeConnection}
            >
              Retry Connection
            </Button>
          )}
        </VStack>
      </Box>
    );
  }

  if (!currentLobby) {
    return (
      <Box textAlign="center" py={20}>
        <VStack spacing={6}>
          <CircularProgress size="120px" isIndeterminate color="purple.400">
            <CircularProgressLabel>
              <FaUsers size="40px" />
            </CircularProgressLabel>
          </CircularProgress>
          
          <VStack spacing={2}>
            <Heading size="lg">Finding Match...</Heading>
            <Text color="gray.500">
              Looking for players to join your {gameType.toUpperCase()} game
            </Text>
          </VStack>

          <Button
            variant="outline"
            onClick={leaveLobby}
          >
            Cancel
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box maxW="800px" mx="auto" p={6}>
      <VStack spacing={6}>
        {/* Connection Status */}
        <Card w="full" bg={bgColor} borderColor={borderColor}>
          <CardBody>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <Tooltip label={`Connection: ${connectionStatus.quality}`}>
                  {getConnectionIcon()}
                </Tooltip>
                <Text fontWeight="medium">
                  Multiplayer Server
                </Text>
              </HStack>
              
              <HStack spacing={4}>
                <Badge colorScheme={getConnectionQualityColor()}>
                  {connectionStatus.latency}ms
                </Badge>
                <Badge colorScheme="purple">
                  {connectionStatus.quality.toUpperCase()}
                </Badge>
              </HStack>
            </Flex>
          </CardBody>
        </Card>

        {/* Lobby Info */}
        <Card w="full" bg={bgColor} borderColor={borderColor}>
          <CardHeader>
            <HStack justify="space-between">
              <HStack spacing={3}>
                <FaGamepad />
                <Heading size="md">
                  {currentLobby.gameType.toUpperCase()} Lobby
                </Heading>
                <Badge colorScheme="blue">
                  {currentLobby.id}
                </Badge>
              </HStack>
              
              <Badge 
                colorScheme={currentLobby.gameState === 'waiting' ? 'green' : 'orange'}
                variant="solid"
              >
                {currentLobby.gameState.toUpperCase()}
              </Badge>
            </HStack>
          </CardHeader>
          
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Players List */}
              <Box>
                <Text fontWeight="medium" mb={3}>
                  Players ({currentLobby.players.length}/{currentLobby.maxPlayers})
                </Text>
                
                <VStack spacing={2} align="stretch">
                  {currentLobby.players.map((player) => (
                    <Flex
                      key={player.id}
                      justify="space-between"
                      align="center"
                      p={3}
                      borderRadius="md"
                      bg={playerListBg}
                    >
                      <HStack spacing={3}>
                        <Avatar size="sm" name={player.username} />
                        <Text fontWeight="medium">
                          {player.username}
                        </Text>
                        {player.isHost && (
                          <Tooltip label="Host">
                            <Box color="yellow.500">
                              <FaCrown />
                            </Box>
                          </Tooltip>
                        )}
                      </HStack>
                      
                      <HStack spacing={2}>
                        <Badge
                          colorScheme={player.ready ? 'green' : 'gray'}
                          variant={player.ready ? 'solid' : 'outline'}
                        >
                          {player.ready ? 'Ready' : 'Not Ready'}
                        </Badge>
                        <Badge variant="outline">
                          {player.latency}ms
                        </Badge>
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              </Box>

              {/* Game Settings */}
              <Box>
                <Text fontWeight="medium" mb={2}>Game Settings</Text>
                <HStack spacing={4} wrap="wrap">
                  <Badge variant="outline">
                    Mode: {currentLobby.settings.gameMode}
                  </Badge>
                  <Badge variant="outline">
                    Max Players: {currentLobby.settings.maxPlayers}
                  </Badge>
                  {currentLobby.settings.enablePowerCards && (
                    <Badge colorScheme="purple" variant="outline">
                      Power Cards
                    </Badge>
                  )}
                </HStack>
              </Box>

              {/* Ready Check */}
              {currentLobby.gameState === 'waiting' && (
                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Waiting for Players</AlertTitle>
                    <AlertDescription>
                      {currentLobby.players.filter(p => p.ready).length} of {currentLobby.players.length} players ready. 
                      Need at least 2 ready players to start.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Actions */}
        <HStack spacing={4} w="full" justify="center">
          <Button
            colorScheme={isReady ? 'red' : 'green'}
            variant={isReady ? 'outline' : 'solid'}
            leftIcon={isReady ? <FaPause /> : <FaPlay />}
            onClick={toggleReady}
            isDisabled={currentLobby.gameState !== 'waiting'}
          >
            {isReady ? 'Not Ready' : 'Ready'}
          </Button>

          {isHost && (
            <Button
              colorScheme="purple"
              leftIcon={<FaGamepad />}
              onClick={startGame}
              isDisabled={
                currentLobby.gameState !== 'waiting' ||
                currentLobby.players.filter(p => p.ready).length < 2
              }
            >
              Start Game
            </Button>
          )}

          <Button
            variant="outline"
            onClick={leaveLobby}
          >
            Leave Lobby
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default ModernMultiplayerLobby;