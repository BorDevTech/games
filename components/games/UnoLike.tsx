"use client";

import React, { useState, useEffect } from 'react';
import {
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
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
  Divider,
  Switch,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Spinner
} from '@chakra-ui/react';
import { 
  FaUsers, 
  FaKey, 
  FaRandom,
  FaPlus,
  FaSignInAlt,
  FaCog,
  FaGamepad,
  FaUserShield,
  FaTrash
} from 'react-icons/fa';

// Types
type RoomType = 'public' | 'private';

interface GameSettings {
  maxPlayers: number;
  enablePowerCards: boolean;
  fastMode: boolean;
  customRules: string[];
}

const UnoLike: React.FC = () => {
  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.700');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  
  // Hooks
  const toast = useToast();
  const { isOpen: isStatsOpen, onOpen: onStatsOpen, onClose: onStatsClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const { isOpen: isSessionOpen, onOpen: onSessionOpen, onClose: onSessionClose } = useDisclosure();
  
  // State
  const [playerName, setPlayerName] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    maxPlayers: 4,
    enablePowerCards: true,
    fastMode: false,
    customRules: []
  });
  
  // Statistics
  const [globalGamesPlayed, setGlobalGamesPlayed] = useState<number>(0);
  
  // Session manager for persistent player identity
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<string>('');
  
  // Initialize session on component mount and load existing username
  useEffect(() => {
    const initSession = async () => {
      try {
        // Import session manager dynamically
        const { default: sessionManager } = await import('@/lib/sessionManager');
        const session = await sessionManager.initializeSession();
        
        // If session exists and has a username, populate the field and mark as active
        if (session && session.username) {
          setPlayerName(session.username);
          setIsSessionActive(true);
          
          const sessionAge = Math.floor((Date.now() - session.createdAt.getTime()) / (1000 * 60));
          setSessionInfo(`Active session for "${session.username}" (${sessionAge}m old)`);
        } else {
          setIsSessionActive(false);
          setSessionInfo('Enter your name to create a session');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setSessionInfo('Session initialization failed - using fallback');
        setIsSessionActive(false);
        setIsInitialized(true); // Still allow app to work
      }
    };
    
    initSession();
  }, []); // Remove playerName dependency to avoid loops
  
  // Create session immediately when player confirms their name
  const confirmPlayerName = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Enter your name",
        description: "Please enter your name to create a session",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    if (!isInitialized) {
      toast({
        title: "Please wait",
        description: "Initializing...",
        status: "info",
        duration: 2000,
        isClosable: true
      });
      return;
    }
    
    try {
      const trimmedName = playerName.trim();
      
      // Create session immediately
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const session = await sessionManager.createOrUpdateSession(trimmedName);
      
      if (session) {
        setIsSessionActive(true);
        setSessionInfo(`Active session for "${session.username}"`);
        
        toast({
          title: "Session created!",
          description: `Welcome, ${session.username}! You can now join or create rooms.`,
          status: "success",
          duration: 3000,
          isClosable: true
        });
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({
        title: "Failed to create session",
        description: "Please try again",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
  };
  
  // Create a new room
  const createRoom = async (type: RoomType = 'public') => {
    if (!isSessionActive) {
      toast({
        title: "No active session",
        description: "Please confirm your name first to create a session",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    try {
      // Get player info from existing session
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const playerInfo = await sessionManager.getPlayerInfo();
      
      if (!playerInfo) {
        throw new Error('Session expired or invalid');
      }
      
      const newPlayer = {
        id: playerInfo.id,
        username: playerInfo.username,
        handCount: 0,
        status: 'waiting' as const,
        ready: false
      };
      
      // Import room manager
      const { default: roomManager } = await import('@/lib/roomManager');
      const room = roomManager.createRoom(newPlayer, gameSettings, type);
      
      // Update session with room info
      await sessionManager.updateCurrentRoom(room.id);
      
      toast({
        title: "Room created!",
        description: `Room code: ${room.id} (AI Dealer hosting)`,
        status: "success",
        duration: 3000,
        isClosable: true
      });
      
      // Navigate to the room URL
      window.location.href = `/games/04/room/${room.id}`;
    } catch (error) {
      console.error('Failed to create room:', error);
      toast({
        title: "Failed to create room",
        description: "Please try again or refresh your session",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
  };
  
  // Join an existing room
  const joinRoom = async (code: string = joinCode) => {
    if (!isSessionActive) {
      toast({
        title: "No active session",
        description: "Please confirm your name first to create a session",
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
    
    try {
      const roomCode = code.toUpperCase();
      
      // Get player info from existing session
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const playerInfo = await sessionManager.getPlayerInfo();
      
      if (!playerInfo) {
        throw new Error('Session expired or invalid');
      }
      
      // Check if room exists and navigate to it
      const { default: roomManager } = await import('@/lib/roomManager');
      if (roomManager.isRoomAccessible(roomCode)) {
        // Update session with room info
        await sessionManager.updateCurrentRoom(roomCode);
        
        // Navigate to the room URL - the room page will handle the actual joining
        window.location.href = `/games/04/room/${roomCode}`;
      } else {
        toast({
          title: "Room not found",
          description: `Room ${roomCode} does not exist or is no longer accessible`,
          status: "error",
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      toast({
        title: "Failed to join room",
        description: "Please try again or refresh your session",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
  };
  
  // Quick play - join any available public room
  const quickPlay = async () => {
    if (!isSessionActive) {
      toast({
        title: "No active session",
        description: "Please confirm your name first to create a session",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    try {
      // Get player info from existing session
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const playerInfo = await sessionManager.getPlayerInfo();
      
      if (!playerInfo) {
        throw new Error('Session expired or invalid');
      }
      
      // Get available public rooms
      const { default: roomManager } = await import('@/lib/roomManager');
      const publicRooms = roomManager.getPublicRooms();
      
      if (publicRooms.length > 0) {
        // Join the first available public room
        const targetRoom = publicRooms[0];
        if (targetRoom) {
          await sessionManager.updateCurrentRoom(targetRoom.id);
          window.location.href = `/games/04/room/${targetRoom.id}`;
        }
      } else {
        // No public rooms available, create one
        const newPlayer = {
          id: playerInfo.id,
          username: playerInfo.username,
          handCount: 0,
          status: 'waiting' as const,
          ready: false
        };
        
        const room = roomManager.createRoom(newPlayer, gameSettings, 'public');
        await sessionManager.updateCurrentRoom(room.id);
        
        toast({
          title: "Created new public room",
          description: "No rooms available, created a new one for you",
          status: "info",
          duration: 3000,
          isClosable: true
        });
        
        window.location.href = `/games/04/room/${room.id}`;
      }
    } catch (error) {
      console.error('Failed to quick play:', error);
      toast({
        title: "Failed to quick play",
        description: "Please try again or refresh your session",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
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

  // Clear current session
  const clearSession = async () => {
    try {
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const success = await sessionManager.clearSession();
      
      if (success) {
        setPlayerName('');
        setIsSessionActive(false);
        setSessionInfo('Session cleared - enter your name to create a new session');
        toast({
          title: "Session cleared",
          description: "Your session has been reset",
          status: "success",
          duration: 3000,
          isClosable: true
        });
      } else {
        throw new Error('Failed to clear session');
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
      toast({
        title: "Failed to clear session",
        description: "Please try refreshing the page",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Render setup screen
  if (!isInitialized) {
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
          <CardBody>
            <VStack spacing={4} py={8}>
              <Spinner size="xl" color={accentColor} />
              <Text>Initializing session...</Text>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Setting up your secure player session for cross-device compatibility
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  }
  
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
              <HStack spacing={2}>
                <Input
                  placeholder="Enter your player name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  isDisabled={isSessionActive}
                />
                {!isSessionActive ? (
                  <Button
                    colorScheme="blue"
                    onClick={confirmPlayerName}
                    isDisabled={!playerName.trim() || !isInitialized}
                    isLoading={!isInitialized}
                    loadingText="Wait"
                    size="md"
                    minW="100px"
                  >
                    Confirm
                  </Button>
                ) : (
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={clearSession}
                    size="md"
                    minW="100px"
                  >
                    Change
                  </Button>
                )}
              </HStack>
              {sessionInfo && (
                <Text fontSize="xs" color={isSessionActive ? "green.600" : "gray.500"} mt={1}>
                  {sessionInfo}
                </Text>
              )}
            </FormControl>

            <Divider />

            <VStack spacing={3} w="full">
              <Button
                colorScheme="blue"
                size="lg"
                leftIcon={<FaRandom />}
                onClick={quickPlay}
                w="full"
                isDisabled={!isSessionActive}
                isLoading={!isInitialized}
                loadingText="Initializing"
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
                isDisabled={!isSessionActive}
                isLoading={!isInitialized}
                loadingText="Initializing"
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
                isDisabled={!isSessionActive}
                isLoading={!isInitialized}
                loadingText="Initializing"
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
                isDisabled={!isSessionActive || !joinCode.trim()}
                isLoading={!isInitialized}
                loadingText="Initializing"
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
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<FaUserShield />}
                onClick={onSessionOpen}
              >
                Session
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

      {/* Session Management Modal */}
      <Modal isOpen={isSessionOpen} onClose={onSessionClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Session Management</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Card w="full">
                <CardBody>
                  <VStack spacing={3}>
                    <Text fontSize="lg" fontWeight="bold">Current Session</Text>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      {sessionInfo || 'Session information loading...'}
                    </Text>
                    {playerName && (
                      <Text fontSize="md">
                        <strong>Username:</strong> {playerName}
                      </Text>
                    )}
                  </VStack>
                </CardBody>
              </Card>
              
              <Card w="full">
                <CardBody>
                  <VStack spacing={3}>
                    <Text fontSize="lg" fontWeight="bold">Session Actions</Text>
                    <Text fontSize="sm" color="gray.600" textAlign="center">
                      Clear your session to start fresh with a new identity. This will remove your current player session across all tabs.
                    </Text>
                    <Button
                      colorScheme="red"
                      variant="outline"
                      leftIcon={<FaTrash />}
                      onClick={clearSession}
                      w="full"
                    >
                      Clear Session
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
              
              <Text color="gray.500" fontSize="xs" textAlign="center">
                Session Management uses secure HTTP-only cookies for cross-tab persistence. 
                Sessions automatically expire after 7 days of inactivity.
              </Text>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default UnoLike;