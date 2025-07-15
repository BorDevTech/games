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
  NumberDecrementStepper
} from '@chakra-ui/react';
import { 
  FaUsers, 
  FaKey, 
  FaRandom,
  FaPlus,
  FaSignInAlt,
  FaCog,
  FaGamepad
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
  
  // Generate a unique card ID for internal use
  const generateCardId = (): string => {
    return Math.random().toString(36).substring(2, 15);
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
    
    const playerId = generateCardId();
    
    const newPlayer = {
      id: playerId,
      username: playerName.trim(),
      handCount: 0,
      status: 'waiting' as const,
      ready: false
    };
    
    // Import room manager
    import('@/lib/roomManager').then(({ default: roomManager }) => {
      const room = roomManager.createRoom(newPlayer, gameSettings, type);
      
      toast({
        title: "Room created!",
        description: `Room code: ${room.id}`,
        status: "success",
        duration: 3000,
        isClosable: true
      });
      
      // Navigate to the room URL
      window.location.href = `/games/04/room/${room.id}`;
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
    
    const roomCode = code.toUpperCase();
    
    // Check if room exists and navigate to it
    import('@/lib/roomManager').then(({ default: roomManager }) => {
      if (roomManager.isRoomAccessible(roomCode)) {
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
    
    // Get available public rooms
    import('@/lib/roomManager').then(({ default: roomManager }) => {
      const publicRooms = roomManager.getPublicRooms();
      
      if (publicRooms.length > 0) {
        // Join the first available public room
        const targetRoom = publicRooms[0];
        window.location.href = `/games/04/room/${targetRoom.id}`;
      } else {
        // No public rooms available, create one
        const playerId = generateCardId();
        const newPlayer = {
          id: playerId,
          username: playerName.trim(),
          handCount: 0,
          status: 'waiting' as const,
          ready: false
        };
        
        const room = roomManager.createRoom(newPlayer, gameSettings, 'public');
        
        toast({
          title: "Created new public room",
          description: "No rooms available, created a new one for you",
          status: "info",
          duration: 3000,
          isClosable: true
        });
        
        window.location.href = `/games/04/room/${room.id}`;
      }
    });
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
};

export default UnoLike;