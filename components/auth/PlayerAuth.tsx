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
  Divider
} from '@chakra-ui/react';
import { FaSignInAlt, FaUserPlus, FaGamepad } from 'react-icons/fa';
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

interface PlayerAuthProps {
  isAuthenticated: boolean;
  currentUser: string;
  onAuthChange: (isAuth: boolean, username: string) => void;
}

const PlayerAuth: React.FC<PlayerAuthProps> = ({ 
  isAuthenticated, 
  onAuthChange 
}) => {
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [offlineUsername, setOfflineUsername] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isProfileOpen, 
    onOpen: onProfileOpen, 
    onClose: onProfileClose 
  } = useDisclosure();
  
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Load player data on mount
  useEffect(() => {
    const savedPlayer = localStorage.getItem('currentPlayer');
    if (savedPlayer) {
      const player = JSON.parse(savedPlayer);
      setCurrentPlayer(player);
      onAuthChange(true, player.username);
    }
  }, [onAuthChange]);

  // Save player data
  const savePlayer = (player: Player) => {
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    const existingIndex = players.findIndex((p: Player) => p.id === player.id);
    
    if (existingIndex >= 0) {
      players[existingIndex] = player;
    } else {
      players.push(player);
    }
    
    localStorage.setItem('players', JSON.stringify(players));
    localStorage.setItem('currentPlayer', JSON.stringify(player));
    setCurrentPlayer(player);
  };

  // Handle login
  const handleLogin = () => {
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
      // Login existing player
      const updatedPlayer = { ...existingPlayer, isOnline: true };
      savePlayer(updatedPlayer);
      onAuthChange(true, username);
      onClose();
      toast({
        title: 'Logged in successfully!',
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
  const handleRegister = () => {
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
    const trimmedEmail = email.trim();
    const newPlayer: Player = {
      id: Date.now().toString(),
      username: username.trim(),
      ...(trimmedEmail && { email: trimmedEmail }),
      isOnline: true,
      backgroundColor: '#805AD5', // Default purple
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: new Date()
    };

    savePlayer(newPlayer);
    onAuthChange(true, username);
    onClose();
    toast({
      title: 'Account created successfully!',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Handle offline play
  const handleOfflinePlay = () => {
    if (!offlineUsername.trim()) {
      toast({
        title: 'Username required for offline play',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const offlinePlayer: Player = {
      id: 'offline-' + Date.now(),
      username: offlineUsername.trim(),
      isOnline: false,
      backgroundColor: '#718096', // Gray for offline
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: new Date()
    };

    setCurrentPlayer(offlinePlayer);
    setIsOffline(true);
    onAuthChange(true, offlineUsername.trim());
    
    toast({
      title: 'Playing offline',
      description: 'Your stats won\'t be saved permanently',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Handle logout
  const handleLogout = () => {
    if (currentPlayer && !isOffline) {
      const updatedPlayer = { ...currentPlayer, isOnline: false };
      savePlayer(updatedPlayer);
    }
    
    localStorage.removeItem('currentPlayer');
    setCurrentPlayer(null);
    setIsOffline(false);
    onAuthChange(false, '');
    
    toast({
      title: 'Logged out successfully',
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
    setOfflineUsername('');
  };

  if (isAuthenticated && currentPlayer) {
    return (
      <Box 
        p={4} 
        bg={cardBg} 
        borderRadius="md" 
        border="1px" 
        borderColor={borderColor}
        w="full"
        maxW="md"
      >
        <VStack spacing={4}>
          {/* Player Info */}
          <HStack spacing={3} w="full">
            <Box position="relative">
              <Avatar 
                name={currentPlayer.username} 
                size="md"
                bg={currentPlayer.backgroundColor}
              />
              {/* Online Status Indicator */}
              <Box
                position="absolute"
                bottom="0"
                right="0"
                w="16px"
                h="16px"
                bg={currentPlayer.isOnline ? 'green.400' : 'red.400'}
                borderRadius="full"
                border="2px solid"
                borderColor={cardBg}
              />
            </Box>
            
            <VStack align="start" spacing={1} flex={1}>
              <HStack>
                <Text fontWeight="semibold">{currentPlayer.username}</Text>
                <Badge colorScheme={currentPlayer.isOnline ? 'green' : 'red'}>
                  {currentPlayer.isOnline ? 'Online' : 'Offline'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                {currentPlayer.gamesPlayed} games played • {currentPlayer.gamesWon} wins
              </Text>
            </VStack>
          </HStack>

          {/* Action Buttons */}
          <HStack spacing={2} w="full">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onProfileOpen}
              flex={1}
            >
              Profile
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleLogout}
              flex={1}
            >
              Logout
            </Button>
          </HStack>
        </VStack>

        {/* Player Profile Modal */}
        <Modal isOpen={isProfileOpen} onClose={onProfileClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Player Profile</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <PlayerProfile 
                player={currentPlayer} 
                onPlayerUpdate={(updatedPlayer) => {
                  savePlayer(updatedPlayer);
                  onAuthChange(true, updatedPlayer.username);
                }}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    );
  }

  return (
    <Box 
      p={4} 
      bg={cardBg} 
      borderRadius="md" 
      border="1px" 
      borderColor={borderColor}
      w="full"
      maxW="md"
    >
      <VStack spacing={4}>
        <Text fontSize="lg" fontWeight="semibold" textAlign="center">
          Player Authentication
        </Text>
        
        <Text fontSize="sm" color="gray.500" textAlign="center">
          Login to save your stats or play offline
        </Text>

        {/* Quick Offline Option */}
        <VStack spacing={2} w="full">
          <FormControl>
            <FormLabel fontSize="sm">Play Offline (Quick Start)</FormLabel>
            <Input
              placeholder="Enter your name"
              value={offlineUsername}
              onChange={(e) => setOfflineUsername(e.target.value)}
              size="sm"
            />
          </FormControl>
          <Button 
            colorScheme="gray" 
            size="sm" 
            w="full"
            onClick={handleOfflinePlay}
            leftIcon={<FaGamepad />}
          >
            Play Offline
          </Button>
        </VStack>

        <Divider />

        {/* Login/Register Button */}
        <Button 
          colorScheme="purple" 
          onClick={() => {
            resetForm();
            onOpen();
          }}
          leftIcon={<FaSignInAlt />}
          w="full"
        >
          Login / Register
        </Button>

        {/* Login/Register Modal */}
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {loginMode === 'login' ? 'Login' : 'Create Account'}
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

                {/* Switch between login and register */}
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
      </VStack>
    </Box>
  );
};

export default PlayerAuth;