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
  useColorModeValue,
  useToast,
  Divider,
  Box,
  Grid,
  GridItem,
  Icon,
} from '@chakra-ui/react';
import {
  FaUsers,
  FaKey,
  FaPlus,
  FaSignInAlt,
  FaRobot,
  FaInfoCircle,
} from 'react-icons/fa';
import { GiSpades } from 'react-icons/gi';

const Spades: React.FC = () => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  const mutedText = useColorModeValue('gray.600', 'gray.400');

  const toast = useToast();

  const [playerName, setPlayerName] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const { default: sessionManager } = await import('@/lib/sessionManager');
        const session = await sessionManager.initializeSession();
        if (session?.username) {
          setPlayerName(session.username);
          setIsSessionActive(true);
        }
        setIsInitialized(true);
      } catch {
        setIsInitialized(true);
      }
    };
    initSession();
  }, []);

  const confirmPlayerName = async () => {
    if (!playerName.trim()) {
      toast({ title: 'Enter your name', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    try {
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const session = await sessionManager.createOrUpdateSession(playerName.trim());
      if (session) {
        setIsSessionActive(true);
        toast({ title: `Welcome, ${session.username}!`, status: 'success', duration: 2000, isClosable: true });
      }
    } catch {
      toast({ title: 'Failed to create session', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const createRoom = async () => {
    if (!isSessionActive) {
      toast({ title: 'Confirm your name first', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    try {
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const { default: roomManager } = await import('@/lib/roomManager');
      const playerInfo = await sessionManager.getPlayerInfo();
      if (!playerInfo) throw new Error('Session expired');

      const newPlayer = {
        id: playerInfo.id,
        username: playerInfo.username,
        handCount: 0,
        status: 'waiting' as const,
        ready: false,
      };
      const settings = { maxPlayers: 4, enablePowerCards: false, fastMode: false, customRules: [] };
      const room = roomManager.createRoom(newPlayer, settings, 'public');
      await sessionManager.updateCurrentRoom(room.id);

      toast({ title: `Room created! Code: ${room.id}`, status: 'success', duration: 3000, isClosable: true });
      window.location.href = `/games/08/room/${room.id}`;
    } catch {
      toast({ title: 'Failed to create room', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const joinRoom = async () => {
    if (!isSessionActive) {
      toast({ title: 'Confirm your name first', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    if (!joinCode.trim()) {
      toast({ title: 'Enter a room code', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    try {
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const { default: roomManager } = await import('@/lib/roomManager');
      const roomCode = joinCode.toUpperCase();
      if (roomManager.isRoomAccessible(roomCode)) {
        await sessionManager.updateCurrentRoom(roomCode);
        window.location.href = `/games/08/room/${roomCode}`;
      } else {
        toast({ title: `Room ${roomCode} not found`, status: 'error', duration: 3000, isClosable: true });
      }
    } catch {
      toast({ title: 'Failed to join room', status: 'error', duration: 3000, isClosable: true });
    }
  };

  const playVsAI = async () => {
    if (!isSessionActive) {
      toast({ title: 'Confirm your name first', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    try {
      const { default: sessionManager } = await import('@/lib/sessionManager');
      const { default: roomManager } = await import('@/lib/roomManager');
      const playerInfo = await sessionManager.getPlayerInfo();
      if (!playerInfo) throw new Error('Session expired');

      const newPlayer = {
        id: playerInfo.id,
        username: playerInfo.username,
        handCount: 0,
        status: 'waiting' as const,
        ready: false,
      };
      const settings = { maxPlayers: 4, enablePowerCards: false, fastMode: false, customRules: ['solo_ai'] };
      const room = roomManager.createRoom(newPlayer, settings, 'private');
      await sessionManager.updateCurrentRoom(room.id);

      window.location.href = `/games/08/room/${room.id}?ai=true`;
    } catch {
      toast({ title: 'Failed to start game', status: 'error', duration: 3000, isClosable: true });
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Title */}
      <VStack spacing={2} align="center" py={4}>
        <HStack spacing={3}>
          <Icon as={GiSpades} boxSize={10} color="gray.800" />
          <Heading size="xl" color={accentColor}>
            Spades
          </Heading>
        </HStack>
        <Text color={mutedText} textAlign="center">
          Classic trick-taking card game for 2–4 players. Spades always trump!
        </Text>
      </VStack>

      {/* Player Name */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardHeader pb={2}>
          <Heading size="sm">Your Name</Heading>
        </CardHeader>
        <CardBody pt={2}>
          <HStack>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <Icon as={FaUsers} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Enter your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmPlayerName()}
                isDisabled={!isInitialized}
              />
            </InputGroup>
            <Button
              colorScheme="purple"
              onClick={confirmPlayerName}
              isDisabled={!isInitialized || !playerName.trim()}
              minW="100px"
            >
              {isSessionActive ? 'Update' : 'Confirm'}
            </Button>
          </HStack>
          {isSessionActive && (
            <Badge colorScheme="green" mt={2}>
              ✓ Session active
            </Badge>
          )}
        </CardBody>
      </Card>

      {/* Game Options */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
        {/* Create Room */}
        <GridItem>
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" h="full">
            <CardHeader pb={2}>
              <HStack>
                <Icon as={FaPlus} color="green.500" />
                <Heading size="sm">Create Room</Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={2}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color={mutedText}>
                  Start a new multiplayer room. Share the code so friends can join. AI fills empty seats.
                </Text>
                <Button
                  colorScheme="green"
                  onClick={createRoom}
                  isDisabled={!isSessionActive}
                  leftIcon={<Icon as={FaPlus} />}
                >
                  Create Room
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        {/* Join Room */}
        <GridItem>
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" h="full">
            <CardHeader pb={2}>
              <HStack>
                <Icon as={FaKey} color="blue.500" />
                <Heading size="sm">Join Room</Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={2}>
              <VStack spacing={3} align="stretch">
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={FaKey} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Room code..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                    isDisabled={!isSessionActive}
                    textTransform="uppercase"
                  />
                </InputGroup>
                <Button
                  colorScheme="blue"
                  onClick={joinRoom}
                  isDisabled={!isSessionActive || !joinCode.trim()}
                  leftIcon={<Icon as={FaSignInAlt} />}
                >
                  Join Room
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        {/* Play vs AI */}
        <GridItem>
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px" h="full">
            <CardHeader pb={2}>
              <HStack>
                <Icon as={FaRobot} color="purple.500" />
                <Heading size="sm">Play vs AI</Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={2}>
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" color={mutedText}>
                  Play immediately against 3 AI opponents. No waiting for other players.
                </Text>
                <Button
                  colorScheme="purple"
                  onClick={playVsAI}
                  isDisabled={!isSessionActive}
                  leftIcon={<Icon as={FaRobot} />}
                >
                  Play vs AI
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      <Divider />

      {/* How to Play */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardHeader pb={2}>
          <HStack>
            <Icon as={FaInfoCircle} color="orange.500" />
            <Heading size="sm">How to Play Spades</Heading>
          </HStack>
        </CardHeader>
        <CardBody pt={2}>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            <Box>
              <Text fontWeight="bold" mb={1} fontSize="sm">
                🃏 The Basics
              </Text>
              <VStack align="start" spacing={1} fontSize="sm" color={mutedText}>
                <Text>• 4 players in 2 teams (North/South vs East/West)</Text>
                <Text>• Each player gets 13 cards from a 52-card deck</Text>
                <Text>• Spades are always trump</Text>
                <Text>• Play 13 tricks per round</Text>
              </VStack>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={1} fontSize="sm">
                📊 Bidding
              </Text>
              <VStack align="start" spacing={1} fontSize="sm" color={mutedText}>
                <Text>• Bid how many tricks you expect to win (0–13)</Text>
                <Text>• Nil: bid 0 (+100 if successful, −100 if not)</Text>
                <Text>• Team must meet combined bid to score</Text>
                <Text>• Overtricks (bags) count 1 pt but 10 bags = −100</Text>
              </VStack>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={1} fontSize="sm">
                🏆 Scoring
              </Text>
              <VStack align="start" spacing={1} fontSize="sm" color={mutedText}>
                <Text>• Made bid: bid × 10 points</Text>
                <Text>• Set (failed bid): −(bid × 10)</Text>
                <Text>• First team to 500 wins!</Text>
              </VStack>
            </Box>
            <Box>
              <Text fontWeight="bold" mb={1} fontSize="sm">
                🎯 Rules
              </Text>
              <VStack align="start" spacing={1} fontSize="sm" color={mutedText}>
                <Text>• Must follow suit if possible</Text>
                <Text>• Cannot lead spades until broken (spade played on another lead)</Text>
                <Text>• Highest card of led suit wins, spades beat all</Text>
              </VStack>
            </Box>
          </Grid>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default Spades;
