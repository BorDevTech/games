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
import { useRouter } from 'next/navigation';
import UnoLike from '@/components/games/UnoLike';

const UnoLikeGamePage: React.FC = () => {
  const router = useRouter();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="6xl" py={8}>
        <VStack spacing={8}>
          {/* Header */}
          <HStack justify="space-between" w="full" wrap="wrap">
            <VStack align="start" spacing={2}>
              <Heading size="lg">UNO-Like Card Game</Heading>
              <Text color="gray.500">Game ID: 04</Text>
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
            <UnoLike />
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default UnoLikeGamePage;