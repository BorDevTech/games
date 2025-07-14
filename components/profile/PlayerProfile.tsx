"use client";

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  Avatar,
  Badge,
  Grid,
  GridItem,
  useColorModeValue,
  useToast,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import { FaSave, FaPalette } from 'react-icons/fa';

interface GameResult {
  winner: 'X' | 'O' | 'draw' | null;
  player1: string;
  player2: string | 'Bot';
  mode: 'pvp' | 'pvc';
  timestamp: Date;
}

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

interface PlayerProfileProps {
  player: Player;
  onPlayerUpdate: (updatedPlayer: Player) => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ player, onPlayerUpdate }) => {
  const [editedPlayer, setEditedPlayer] = useState<Player>({ ...player });
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const toast = useToast();
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Chakra UI color palette
  const colorOptions = [
    '#E53E3E', // red.500
    '#DD6B20', // orange.500
    '#D69E2E', // yellow.500
    '#38A169', // green.500
    '#00B5D8', // cyan.500
    '#3182CE', // blue.500
    '#805AD5', // purple.500
    '#D53F8C', // pink.500
    '#319795', // teal.500
    '#718096', // gray.500
    '#2D3748', // gray.800
    '#1A202C'  // gray.900
  ];

  const handleSave = () => {
    if (!editedPlayer.username.trim()) {
      toast({
        title: 'Username required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onPlayerUpdate(editedPlayer);
    toast({
      title: 'Profile updated successfully!',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleColorSelect = (color: string) => {
    setEditedPlayer({ ...editedPlayer, backgroundColor: color });
    setShowColorPicker(false);
  };

  const calculateWinRate = () => {
    if (player.gamesPlayed === 0) return 0;
    return Math.round((player.gamesWon / player.gamesPlayed) * 100);
  };

  const getPlayerStats = () => {
    const results = JSON.parse(localStorage.getItem('ticTacToeResults') || '[]') as GameResult[];
    const playerResults = results.filter((result: GameResult) => 
      result.player1 === player.username || 
      (result.player2 === player.username && result.player2 !== 'Bot')
    );

    const wins = playerResults.filter((result: GameResult) => {
      if (result.winner === 'draw') return false;
      return (result.player1 === player.username && result.winner === 'X') ||
             (result.player2 === player.username && result.winner === 'O');
    }).length;

    const draws = playerResults.filter((result: GameResult) => result.winner === 'draw').length;
    const losses = playerResults.length - wins - draws;

    return { wins, draws, losses, total: playerResults.length };
  };

  const stats = getPlayerStats();

  return (
    <VStack spacing={6} w="full">
      {/* Profile Header */}
      <VStack spacing={4} textAlign="center">
        <Box position="relative">
          <Avatar 
            name={editedPlayer.username} 
            size="xl"
            bg={editedPlayer.backgroundColor}
          />
          {/* Online Status Indicator */}
          <Box
            position="absolute"
            bottom="0"
            right="0"
            w="20px"
            h="20px"
            bg={player.isOnline ? 'green.400' : 'red.400'}
            borderRadius="full"
            border="3px solid"
            borderColor={useColorModeValue('white', 'gray.800')}
          />
        </Box>
        
        <VStack spacing={1}>
          <Text fontSize="xl" fontWeight="bold">{player.username}</Text>
          <Badge colorScheme={player.isOnline ? 'green' : 'red'}>
            {player.isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Text fontSize="sm" color="gray.500">
            Member since {new Date(player.createdAt).toLocaleDateString()}
          </Text>
        </VStack>
      </VStack>

      <Divider />

      {/* Edit Profile */}
      <VStack spacing={4} w="full">
        <Text fontSize="lg" fontWeight="semibold">Edit Profile</Text>
        
        <FormControl>
          <FormLabel>Username</FormLabel>
          <Input
            value={editedPlayer.username}
            onChange={(e) => setEditedPlayer({ ...editedPlayer, username: e.target.value })}
            placeholder="Enter your username"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Email (Optional)</FormLabel>
          <Input
            type="email"
            value={editedPlayer.email || ''}
            onChange={(e) => setEditedPlayer({ ...editedPlayer, email: e.target.value })}
            placeholder="Enter your email"
          />
        </FormControl>

        {/* Color Picker */}
        <FormControl>
          <FormLabel>Avatar Background Color</FormLabel>
          <VStack spacing={3}>
            <HStack>
              <Avatar 
                name={editedPlayer.username} 
                size="sm"
                bg={editedPlayer.backgroundColor}
              />
              <Button
                size="sm"
                variant="outline"
                leftIcon={<FaPalette />}
                onClick={() => setShowColorPicker(!showColorPicker)}
              >
                Choose Color
              </Button>
            </HStack>
            
            {showColorPicker && (
              <Box p={3} bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                <Text fontSize="sm" mb={2}>Choose a color:</Text>
                <Grid templateColumns="repeat(6, 1fr)" gap={2}>
                  {colorOptions.map((color, index) => (
                    <GridItem key={index}>
                      <Button
                        w="40px"
                        h="40px"
                        bg={color}
                        onClick={() => handleColorSelect(color)}
                        border={editedPlayer.backgroundColor === color ? "3px solid" : "1px solid"}
                        borderColor={editedPlayer.backgroundColor === color ? "blue.500" : "gray.300"}
                        _hover={{ transform: 'scale(1.1)' }}
                        borderRadius="full"
                      />
                    </GridItem>
                  ))}
                </Grid>
              </Box>
            )}
          </VStack>
        </FormControl>

        <Button
          colorScheme="purple"
          leftIcon={<FaSave />}
          onClick={handleSave}
          w="full"
        >
          Save Changes
        </Button>
      </VStack>

      <Divider />

      {/* Player Statistics */}
      <VStack spacing={4} w="full">
        <Text fontSize="lg" fontWeight="semibold">Game Statistics</Text>
        
        <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={4} w="full">
          <GridItem>
            <Stat textAlign="center">
              <StatLabel>Games Played</StatLabel>
              <StatNumber>{stats.total}</StatNumber>
            </Stat>
          </GridItem>
          
          <GridItem>
            <Stat textAlign="center">
              <StatLabel>Wins</StatLabel>
              <StatNumber color="green.500">{stats.wins}</StatNumber>
            </Stat>
          </GridItem>
          
          <GridItem>
            <Stat textAlign="center">
              <StatLabel>Draws</StatLabel>
              <StatNumber color="yellow.500">{stats.draws}</StatNumber>
            </Stat>
          </GridItem>
          
          <GridItem>
            <Stat textAlign="center">
              <StatLabel>Losses</StatLabel>
              <StatNumber color="red.500">{stats.losses}</StatNumber>
            </Stat>
          </GridItem>
        </Grid>

        <Box textAlign="center">
          <Stat>
            <StatLabel>Win Rate</StatLabel>
            <StatNumber>{calculateWinRate()}%</StatNumber>
            <StatHelpText>
              Based on {stats.total} game{stats.total !== 1 ? 's' : ''}
            </StatHelpText>
          </Stat>
        </Box>
      </VStack>
    </VStack>
  );
};

export default PlayerProfile;