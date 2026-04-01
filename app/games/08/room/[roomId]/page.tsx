"use client";

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  HStack,
  VStack,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from '@chakra-ui/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import roomManager, { Room } from '@/lib/roomManager';
import SpadesRoom from '@/components/games/SpadesRoom';

const SpadesRoomPage: React.FC = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const forceAI = searchParams.get('ai') === 'true';

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    if (!roomId) {
      setError('No room ID provided');
      setLoading(false);
      return;
    }

    const checkRoom = async () => {
      try {
        const roomData = await roomManager.getRoomWithAPIFallback(roomId);
        if (!roomData) {
          setError('Room not found or no longer accessible');
          setLoading(false);
          return;
        }
        setRoom(roomData);
        setLoading(false);
      } catch {
        setError('Failed to access room');
        setLoading(false);
      }
    };

    checkRoom();
  }, [roomId]);

  if (loading) {
    return (
      <Box minH="100vh" bg={bgColor}>
        <Container maxW="6xl" py={8}>
          <VStack spacing={8} justify="center" minH="60vh">
            <Spinner size="xl" color="purple.500" />
            <Text>Loading room…</Text>
          </VStack>
        </Container>
      </Box>
    );
  }

  if (error || !room) {
    return (
      <Box minH="100vh" bg={bgColor}>
        <Container maxW="6xl" py={8}>
          <VStack spacing={8}>
            <HStack justify="space-between" w="full" wrap="wrap">
              <VStack align="start" spacing={2}>
                <Heading size="lg">Spades</Heading>
                <Text color="gray.500">Room: {roomId}</Text>
              </VStack>
              <Button variant="outline" onClick={() => router.push('/games/08')} size="sm">
                Back to Game
              </Button>
            </HStack>
            <Box w="full" bg={cardBg} borderRadius="lg" boxShadow="lg" p={8}>
              <VStack spacing={6}>
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Room Not Found!</AlertTitle>
                    <AlertDescription>
                      {error || 'This room does not exist or is no longer accessible.'}
                    </AlertDescription>
                  </Box>
                </Alert>
                <VStack spacing={4}>
                  <Text textAlign="center" color="gray.600">
                    The room &quot;{roomId}&quot; may have been deleted or expired.
                  </Text>
                  <HStack spacing={4}>
                    <Button colorScheme="purple" onClick={() => router.push('/games/08')}>
                      Create New Room
                    </Button>
                    <Button variant="outline" onClick={() => router.push('/')}>
                      Back to Home
                    </Button>
                  </HStack>
                </VStack>
              </VStack>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="6xl" py={8}>
        <VStack spacing={8}>
          <HStack justify="space-between" w="full" wrap="wrap">
            <VStack align="start" spacing={2}>
              <Heading size="lg">Spades</Heading>
              <Text color="gray.500">Room: {room.id}</Text>
            </VStack>
            <Button variant="outline" onClick={() => router.push('/games/08')} size="sm">
              Back to Game
            </Button>
          </HStack>

          <Box w="full" bg={cardBg} borderRadius="lg" boxShadow="lg" p={8}>
            <SpadesRoom
              roomId={roomId}
              initialRoom={room}
              forceAI={forceAI}
              onRoomDeleted={() => router.push('/games/08')}
            />
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default SpadesRoomPage;
