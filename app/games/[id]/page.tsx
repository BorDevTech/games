"use client";

import React from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Button,
  HStack,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import TicTacToe from '@/components/games/TicTacToe';
import Tetris from '@/components/games/Tetris';

const GamePage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  // Game configuration based on ID
  const getGameComponent = () => {
    switch (gameId) {
      case '01':
        return <TicTacToe />;
      case '03':
        return <Tetris />;
      default:
        return (
          <VStack spacing={6} textAlign="center">
            <Heading size="lg">Game Not Found</Heading>
            <Text>The game with ID &quot;{gameId}&quot; doesn&apos;t exist yet.</Text>
            <Button colorScheme="purple" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </VStack>
        );
    }
  };

  const getGameTitle = () => {
    switch (gameId) {
      case '01':
        return 'Tic-Tac-Toe';
      case '03':
        return 'Tetris';
      default:
        return 'Unknown Game';
    }
  };

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="6xl" py={8}>
        <VStack spacing={8}>
          {/* Header */}
          <HStack justify="space-between" w="full" wrap="wrap">
            <VStack align="start" spacing={2}>
              <Heading size="lg">{getGameTitle()}</Heading>
              <Text color="gray.500">Game ID: {gameId}</Text>
            </VStack>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              size="sm"
            >
              Back to Home
            </Button>
          </HStack>

          {/* Game Content */}
          <Box 
            w="full" 
            bg={cardBg} 
            borderRadius="lg" 
            boxShadow="lg" 
            p={8}
          >
            {getGameComponent()}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default GamePage;