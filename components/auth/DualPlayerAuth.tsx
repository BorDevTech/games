"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Badge,
  Avatar,
  useColorModeValue,
  useToast,
  Divider,
  SimpleGrid
} from '@chakra-ui/react';
import { FaSignInAlt, FaUserPlus, FaGamepad, FaUser, FaUsers } from 'react-icons/fa';
import PlayerProfile from '@/components/profile/PlayerProfile';

interface Player {
  id: string;
  username: string;
  email?: string;
  isOnline: boolean;
  backgroundColor: string;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: Date;
}

interface DualPlayerAuthProps {
  gameMode: 'pvp' | 'pvc';
  player1: { isAuthenticated: boolean; username: string; } | null;
  player2: { isAuthenticated: boolean; username: string; } | null;
  onPlayer1Change: (isAuth: boolean, username: string) => void;
  onPlayer2Change: (isAuth: boolean, username: string) => void;
}

const DualPlayerAuth: React.FC<DualPlayerAuthProps> = ({ 
  gameMode,
  player1,
  player2,
  onPlayer1Change,
  onPlayer2Change
}) => {
  const [activePlayer, setActivePlayer] = useState<1 | 2>(1);
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [player1Offline, setPlayer1Offline] = useState('');
  const [player2Offline, setPlayer2Offline] = useState('');
  const [currentPlayer1, setCurrentPlayer1] = useState<Player | null>(null);
  const [currentPlayer2, setCurrentPlayer2] = useState<Player | null>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isProfileOpen, 
    onOpen: onProfileOpen, 
    onClose: onProfileClose 
  } = useDisclosure();
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Load player data on mount
  useEffect(() => {
    const savedPlayer1 = localStorage.getItem('currentPlayer1');
    const savedPlayer2 = localStorage.getItem('currentPlayer2');
    
    if (savedPlayer1) {
      const player = JSON.parse(savedPlayer1);
      setCurrentPlayer1(player);
      onPlayer1Change(true, player.username);
    }
    
    if (savedPlayer2 && gameMode === 'pvp') {
      const player = JSON.parse(savedPlayer2);
      setCurrentPlayer2(player);
      onPlayer2Change(true, player.username);
    }
  }, [gameMode, onPlayer1Change, onPlayer2Change]);

  // Save player data
  const savePlayer = async (player: Player, playerNum: 1 | 2) => {
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    const existingIndex = players.findIndex((p: Player) => p.id === player.id);
    
    if (existingIndex >= 0) {
      players[existingIndex] = player;
    } else {
      players.push(player);
    }
    
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem(`currentPlayer${playerNum}`, JSON.stringify(player));
    
    // Also create/update server session for games that require it
    try {
      const { default: sessionManager } = await import('@/lib/sessionManager');
      await sessionManager.createOrUpdateSession(player.username);
    } catch (error) {
      console.warn('Failed to create server session:', error);
    }
    
    if (playerNum === 1) {
      setCurrentPlayer1(player);
    } else {
      setCurrentPlayer2(player);
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!username.trim()) {
      toast({
        title: 'Username required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const players = JSON.parse(localStorage.getItem('players') || '[]');
    const existingPlayer = players.find((p: Player) => p.username === username);

    if (existingPlayer) {
      const updatedPlayer = { ...existingPlayer, isOnline: true };
      await savePlayer(updatedPlayer, activePlayer);
      
      if (activePlayer === 1) {
        onPlayer1Change(true, username);
      } else {
        onPlayer2Change(true, username);
      }
      
      onClose();
      resetForm();
      toast({
        title: `Player ${activePlayer} logged in successfully!`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Player not found',
        description: 'Please register or try a different username',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle registration
  const handleRegister = async () => {
    if (!username.trim()) {
      toast({
        title: 'Username required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const players = JSON.parse(localStorage.getItem('players') || '[]');
    const existingPlayer = players.find((p: Player) => p.username === username);

    if (existingPlayer) {
      toast({
        title: 'Username already exists',
        description: 'Please choose a different username',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Create new player
    const colors = ['#805AD5', '#3182CE', '#38A169', '#D69E2E', '#E53E3E', '#DD6B20'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const trimmedEmail = email.trim();
    const newPlayer: Player = {
      id: Date.now().toString() + '-' + activePlayer,
      username: username.trim(),
      ...(trimmedEmail && { email: trimmedEmail }),
      isOnline: true,
      backgroundColor: randomColor || '#805AD5',
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: new Date()
    };

    await savePlayer(newPlayer, activePlayer);
    
    if (activePlayer === 1) {
      onPlayer1Change(true, username);
    } else {
      onPlayer2Change(true, username);
    }
    
    onClose();
    resetForm();
    toast({
      title: `Player ${activePlayer} account created successfully!`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Handle offline play
  const handleOfflinePlay = async (playerNum: 1 | 2) => {
    const offlineUsername = playerNum === 1 ? player1Offline : player2Offline;
    
    if (!offlineUsername.trim()) {
      toast({
        title: `Player ${playerNum} name required`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const offlinePlayer: Player = {
      id: 'offline-' + Date.now() + '-' + playerNum,
      username: offlineUsername.trim(),
      isOnline: false,
      backgroundColor: '#718096',
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: new Date()
    };

    if (playerNum === 1) {
      setCurrentPlayer1(offlinePlayer);
      onPlayer1Change(true, offlineUsername.trim());
    } else {
      setCurrentPlayer2(offlinePlayer);
      onPlayer2Change(true, offlineUsername.trim());
    }
    
    // Create server session for offline play too (games need it)
    try {
      const { default: sessionManager } = await import('@/lib/sessionManager');
      await sessionManager.createOrUpdateSession(offlineUsername.trim());
    } catch (error) {
      console.warn('Failed to create server session for offline play:', error);
    }
    
    toast({
      title: `Player ${playerNum} playing offline`,
      description: 'Stats won\'t be saved permanently',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Handle logout
  const handleLogout = (playerNum: 1 | 2) => {
    const currentPlayer = playerNum === 1 ? currentPlayer1 : currentPlayer2;
    
    if (currentPlayer && currentPlayer.isOnline) {
      const updatedPlayer = { ...currentPlayer, isOnline: false };
      savePlayer(updatedPlayer, playerNum);
    }
    
    localStorage.removeItem(`currentPlayer${playerNum}`);
    
    if (playerNum === 1) {
      setCurrentPlayer1(null);
      onPlayer1Change(false, '');
    } else {
      setCurrentPlayer2(null);
      onPlayer2Change(false, '');
    }
    
    toast({
      title: `Player ${playerNum} logged out`,
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Reset form
  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
  };

  // Open login modal for specific player
  const openLoginModal = (playerNum: 1 | 2) => {
    setActivePlayer(playerNum);
    resetForm();
    onOpen();
  };

  // Open profile modal
  const openProfile = (player: Player) => {
    setProfilePlayer(player);
    onProfileOpen();
  };

  const renderPlayerCard = (playerNum: 1 | 2, player: Player | null, playerData: { isAuthenticated: boolean; username: string; } | null) => (
    <Box 
      p={4} 
      bg={cardBg} 
      borderRadius="md" 
      border="1px" 
      borderColor={borderColor}
      w="full"
    >
      <VStack spacing={3}>
        <HStack spacing={2} w="full" justify="center">
          <Text fontWeight="bold" fontSize="lg">Player {playerNum}</Text>
          {playerNum === 1 ? <FaUser /> : <FaUsers />}
        </HStack>
        
        {player && playerData?.isAuthenticated ? (
          <>
            {/* Authenticated Player */}
            <HStack spacing={3} w="full">
              <Box position="relative">
                <Avatar 
                  name={player.username} 
                  size="md"
                  bg={player.backgroundColor}
                />
                <Box
                  position="absolute"
                  bottom="0"
                  right="0"
                  w="16px"
                  h="16px"
                  bg={player.isOnline ? 'green.400' : 'red.400'}
                  borderRadius="full"
                  border="2px solid"
                  borderColor={cardBg}
                />
              </Box>
              
              <VStack align="start" spacing={1} flex={1}>
                <HStack>
                  <Text fontWeight="semibold">{player.username}</Text>
                  <Badge colorScheme={player.isOnline ? 'green' : 'red'}>
                    {player.isOnline ? 'Online' : 'Offline'}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="gray.500">
                  {player.gamesPlayed} games • {player.gamesWon} wins
                </Text>
              </VStack>
            </HStack>

            <HStack spacing={2} w="full">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => openProfile(player)}
                flex={1}
              >
                Profile
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleLogout(playerNum)}
                flex={1}
              >
                Logout
              </Button>
            </HStack>
          </>
        ) : (
          <>
            {/* Unauthenticated Player */}
            <VStack spacing={3} w="full">
              <FormControl>
                <FormLabel fontSize="sm">Quick Start (Offline)</FormLabel>
                <Input
                  placeholder={`Player ${playerNum} name`}
                  value={playerNum === 1 ? player1Offline : player2Offline}
                  onChange={(e) => playerNum === 1 ? setPlayer1Offline(e.target.value) : setPlayer2Offline(e.target.value)}
                  size="sm"
                />
              </FormControl>
              
              <Button 
                colorScheme="gray" 
                size="sm" 
                w="full"
                onClick={() => handleOfflinePlay(playerNum)}
                leftIcon={<FaGamepad />}
              >
                Play Offline
              </Button>

              <Divider />

              <Button 
                colorScheme="purple" 
                size="sm"
                w="full"
                onClick={() => openLoginModal(playerNum)}
                leftIcon={<FaSignInAlt />}
              >
                Login / Register
              </Button>
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  );

  if (gameMode === 'pvc') {
    // In PvC mode, only show Player 1 authentication
    return renderPlayerCard(1, currentPlayer1, player1);
  }

  return (
    <VStack spacing={6} w="full">
      <Text fontSize="lg" fontWeight="semibold" textAlign="center">
        Player Authentication
      </Text>
      
      <Text fontSize="sm" color="gray.500" textAlign="center">
        Both players can create accounts to save their progress
      </Text>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} w="full">
        {renderPlayerCard(1, currentPlayer1, player1)}
        {renderPlayerCard(2, currentPlayer2, player2)}
      </SimpleGrid>

      {/* Login/Register Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {loginMode === 'login' ? 'Login' : 'Create Account'} - Player {activePlayer}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Username</FormLabel>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </FormControl>

              {loginMode === 'register' && (
                <FormControl>
                  <FormLabel>Email (Optional)</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </FormControl>
              )}

              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </FormControl>

              <Text fontSize="sm" color="gray.500" textAlign="center">
                {loginMode === 'login' ? 'Don\'t have an account? ' : 'Already have an account? '}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setLoginMode(loginMode === 'login' ? 'register' : 'login')}
                >
                  {loginMode === 'login' ? 'Register here' : 'Login here'}
                </Button>
              </Text>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="purple" 
              onClick={loginMode === 'login' ? handleLogin : handleRegister}
              leftIcon={loginMode === 'login' ? <FaSignInAlt /> : <FaUserPlus />}
            >
              {loginMode === 'login' ? 'Login' : 'Register'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Player Profile Modal */}
      <Modal isOpen={isProfileOpen} onClose={onProfileClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Player Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {profilePlayer && (
              <PlayerProfile 
                player={profilePlayer} 
                onPlayerUpdate={(updatedPlayer) => {
                  const playerNum = profilePlayer.id.includes('-1') ? 1 : 2;
                  savePlayer(updatedPlayer, playerNum);
                  
                  if (playerNum === 1) {
                    onPlayer1Change(true, updatedPlayer.username);
                  } else {
                    onPlayer2Change(true, updatedPlayer.username);
                  }
                }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default DualPlayerAuth;