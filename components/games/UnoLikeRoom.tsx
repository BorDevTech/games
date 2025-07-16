"use client";

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue,
  useToast,
  IconButton,
  Tooltip,
  Avatar,
  Divider
} from '@chakra-ui/react';
import { 
  FaCopy, 
  FaCrown
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import roomManager, { Room, Player } from '@/lib/roomManager';
import UnoGameplay from './UnoGameplay';

// Types

interface UnoLikeRoomProps {
  roomId: string;
  initialRoom: Room;
  onRoomDeleted?: () => void;
}

const UnoLikeRoom: React.FC<UnoLikeRoomProps> = ({ roomId, initialRoom, onRoomDeleted }) => {
  // Color mode values
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Hooks
  const router = useRouter();
  const toast = useToast();
  
  // State
  const [room, setRoom] = useState<Room>(initialRoom);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isInQueue, setIsInQueue] = useState<boolean>(false);

  // Initialize current player from URL or local storage
  useEffect(() => {
    if (!currentPlayer) {
      // Get player info from localStorage
      const storedPlayerId = localStorage.getItem(`player_${roomId}`) || localStorage.getItem('temp_player_id');
      const storedPlayerName = localStorage.getItem('player_name');
      
      if (!storedPlayerId || !storedPlayerName) {
        // No stored player info, redirect back to main game page
        toast({
          title: "Player info missing",
          description: "Please enter your name from the main game page first",
          status: "warning",
          duration: 3000,
          isClosable: true
        });
        router.push('/games/04');
        return;
      }
      
      // Check if this player is already in the room
      const playerCheck = roomManager.isPlayerInRoom(roomId, storedPlayerId);
      if (playerCheck.inRoom && playerCheck.player) {
        setCurrentPlayer(playerCheck.player);
        setIsInQueue(false);
        return;
      } else if (playerCheck.inQueue && playerCheck.player) {
        setCurrentPlayer(playerCheck.player);
        setIsInQueue(true);
        return;
      }
      
      // Player not in room, attempt to join
      const newPlayer: Omit<Player, 'isHost' | 'joinedAt' | 'lastActivity'> = {
        id: storedPlayerId,
        username: storedPlayerName.trim(),
        handCount: 0,
        status: 'waiting',
        ready: false
      };

      const result = roomManager.joinRoom(roomId, newPlayer);
      if (result.success && result.room) {
        setRoom(result.room);
        
        if (result.inQueue) {
          // Player was added to queue
          setIsInQueue(true);
          const queuedPlayer = result.room.waitingQueue.find(p => p.id === storedPlayerId);
          setCurrentPlayer(queuedPlayer || null);
          
          // Update stored player ID for this room
          localStorage.setItem(`player_${roomId}`, storedPlayerId);
          
          toast({
            title: "Added to queue",
            description: `Room is full. You are #${result.room.waitingQueue.length} in the waiting queue.`,
            status: "info",
            duration: 5000,
            isClosable: true
          });
        } else {
          // Player joined directly
          setIsInQueue(false);
          const joinedPlayer = result.room.players.find(p => p.id === storedPlayerId);
          setCurrentPlayer(joinedPlayer || null);
          
          // Update stored player ID for this room
          localStorage.setItem(`player_${roomId}`, storedPlayerId);
          
          toast({
            title: "Joined room!",
            description: `Welcome to ${result.room.name}`,
            status: "success",
            duration: 3000,
            isClosable: true
          });
        }
      } else {
        toast({
          title: "Failed to join room",
          description: result.error || "Could not join the room",
          status: "error",
          duration: 3000,
          isClosable: true
        });
        // Redirect back to main game page
        router.push('/games/04');
      }
    }
  }, [roomId, currentPlayer, room.players, router, toast]);

  // Periodic room updates and cross-tab synchronization
  useEffect(() => {
    // Storage event listener for cross-tab synchronization
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'unolike_rooms' && event.newValue && currentPlayer) {
        // Storage was updated from another tab, reload room data
        const updatedRoom = roomManager.getRoom(roomId, true);
        if (updatedRoom) {
          const roomChanged = JSON.stringify(room) !== JSON.stringify(updatedRoom);
          if (roomChanged) {
            setRoom(updatedRoom);
            // Update current player if their status changed
            let updatedCurrentPlayer = updatedRoom.players.find(p => p.id === currentPlayer.id);
            
            // If not in main players, check queue
            if (!updatedCurrentPlayer) {
              updatedCurrentPlayer = updatedRoom.waitingQueue.find(p => p.id === currentPlayer.id);
              setIsInQueue(true);
            } else {
              setIsInQueue(false);
            }
            
            if (updatedCurrentPlayer && JSON.stringify(currentPlayer) !== JSON.stringify(updatedCurrentPlayer)) {
              setCurrentPlayer(updatedCurrentPlayer);
            }
          }
        } else {
          // Room was deleted
          if (onRoomDeleted) {
            onRoomDeleted();
          }
        }
      }
    };

    // Add storage event listener for cross-tab updates
    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      if (currentPlayer) {
        roomManager.updatePlayerActivity(roomId, currentPlayer.id);
        const updatedRoom = roomManager.getRoom(roomId, true);
        if (updatedRoom) {
          // Check if the room data has actually changed before updating state
          const roomChanged = JSON.stringify(room) !== JSON.stringify(updatedRoom);
          if (roomChanged) {
            setRoom(updatedRoom);
            // Update current player if their status changed
            let updatedCurrentPlayer = updatedRoom.players.find(p => p.id === currentPlayer.id);
            
            // If not in main players, check queue
            if (!updatedCurrentPlayer) {
              updatedCurrentPlayer = updatedRoom.waitingQueue.find(p => p.id === currentPlayer.id);
              setIsInQueue(true);
            } else {
              setIsInQueue(false);
            }
            
            if (updatedCurrentPlayer && JSON.stringify(currentPlayer) !== JSON.stringify(updatedCurrentPlayer)) {
              setCurrentPlayer(updatedCurrentPlayer);
            }
          }
        } else {
          // Room was deleted
          if (onRoomDeleted) {
            onRoomDeleted();
          }
        }
      }
    }, 3000); // Update every 3 seconds for better responsiveness

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [roomId, currentPlayer, onRoomDeleted, room]);

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast({
        title: "Copied!",
        description: "Room code copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true
      });
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  // Share room via URL
  const shareRoom = async () => {
    const roomUrl = `${window.location.origin}/games/04/room/${roomId}`;
    try {
      await navigator.clipboard.writeText(roomUrl);
      toast({
        title: "Room URL copied!",
        description: "Share this URL with others to join the room",
        status: "success",
        duration: 3000,
        isClosable: true
      });
    } catch (err) {
      console.error('Failed to copy room URL:', err);
    }
  };

  // Toggle player ready status
  const toggleReady = () => {
    if (!currentPlayer || isInQueue) return;
    
    const newReady = !currentPlayer.ready;
    
    // Update ready status through room manager
    const result = roomManager.updatePlayerReady(roomId, currentPlayer.id, newReady);
    
    if (result.success && result.room) {
      setRoom(result.room);
      // Update current player state
      const updatedPlayer = result.room.players.find(p => p.id === currentPlayer.id);
      if (updatedPlayer) {
        setCurrentPlayer(updatedPlayer);
      }
      
      toast({
        title: newReady ? "Ready!" : "Not ready",
        description: newReady ? "You are ready to play" : "You are not ready",
        status: newReady ? "success" : "info",
        duration: 2000,
        isClosable: true
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update ready status",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
  };

  // End game and return to lobby
  const endGame = () => {
    if (!currentPlayer) return;

    const result = roomManager.endGame(roomId);
    
    if (result.success) {
      // Reload room to get updated state
      const updatedRoom = roomManager.getRoom(roomId, true);
      if (updatedRoom) {
        setRoom(updatedRoom);
        
        // Update current player status
        const updatedPlayer = updatedRoom.players.find(p => p.id === currentPlayer.id);
        if (updatedPlayer) {
          setCurrentPlayer(updatedPlayer);
        }
        
        toast({
          title: "Game ended",
          description: "Returned to lobby",
          status: "info",
          duration: 3000,
          isClosable: true
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to end game",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Leave room
  const leaveRoom = () => {
    if (!currentPlayer) return;

    const result = roomManager.leaveRoom(roomId, currentPlayer.id);
    
    if (result.roomDeleted) {
      toast({
        title: "Room deleted",
        description: "The room has been deleted as all players have left",
        status: "info",
        duration: 3000,
        isClosable: true
      });
      
      if (onRoomDeleted) {
        onRoomDeleted();
      }
      return;
    }

    router.push('/games/04');
  };

  // Check if game is in progress
  const isGameInProgress = room.inGame && room.players.some(p => p.status === 'playing');

  // If game is in progress, show the gameplay component
  if (isGameInProgress && currentPlayer && !isInQueue) {
    return (
      <VStack spacing={6} maxW="1200px" mx="auto">
        <UnoGameplay 
          players={room.players} 
          currentPlayer={currentPlayer}
          onEndGame={endGame}
        />
      </VStack>
    );
  }

  // Render lobby screen
  return (
    <VStack spacing={6} maxW="1000px" mx="auto">
      <VStack spacing={2} textAlign="center">
        <Heading size="lg">
          {room.name || `Room ${roomId}`}
        </Heading>
        <HStack spacing={2}>
          <Badge colorScheme={room.type === 'public' ? 'green' : 'purple'}>
            {room.type === 'public' ? 'Public' : 'Private'}
          </Badge>
          <Badge colorScheme="blue">
            Room Code: {roomId}
          </Badge>
          <Tooltip label="Copy room code">
            <IconButton
              aria-label="Copy room code"
              icon={<FaCopy />}
              size="xs"
              onClick={copyRoomCode}
            />
          </Tooltip>
        </HStack>
        <Button size="sm" variant="outline" onClick={shareRoom}>
          Share Room URL
        </Button>
      </VStack>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6} w="full">
          {/* Players List */}
          <Card>
            <CardHeader>
              <Heading size="md">
                Players ({room.players.filter(p => p.id !== 'ai-dealer-bot').length}/{room.maxPlayers - 1})
              </Heading>
              {room.waitingQueue.length > 0 && (
                <Text fontSize="sm" color="gray.500">
                  + {room.waitingQueue.length} in queue
                </Text>
              )}
            </CardHeader>
            <CardBody>
              <VStack spacing={3} align="stretch">
                {room.players.map((player) => (
                  <Box
                    key={player.id}
                    p={3}
                    borderRadius="md"
                    bg={player.ready ? 'green.50' : 'gray.50'}
                    border="1px"
                    borderColor={player.ready ? 'green.200' : borderColor}
                    opacity={player.id === 'ai-dealer-bot' ? 0.7 : 1}
                  >
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Avatar 
                          size="sm" 
                          name={player.username}
                          bg={player.id === 'ai-dealer-bot' ? 'purple.400' : undefined}
                        />
                        <VStack align="start" spacing={0}>
                          <HStack spacing={1}>
                            <Text fontWeight="medium">
                              {player.username}
                              {player.id === 'ai-dealer-bot' && ' (AI)'}
                            </Text>
                            {player.isHost && (
                              <Tooltip label="Game Host">
                                <Box color="gold">
                                  <FaCrown />
                                </Box>
                              </Tooltip>
                            )}
                            {currentPlayer?.id === player.id && (
                              <Badge colorScheme="blue" size="sm">You</Badge>
                            )}
                          </HStack>
                          <Text fontSize="xs" color="gray.500">
                            {player.status}
                            {player.id === 'ai-dealer-bot' && ' • Auto-hosts games'}
                          </Text>
                        </VStack>
                      </HStack>
                      <Badge colorScheme={player.ready ? 'green' : 'gray'}>
                        {player.ready ? 'Ready' : 'Not Ready'}
                      </Badge>
                    </HStack>
                  </Box>
                ))}
                
                {/* Show waiting queue */}
                {room.waitingQueue.length > 0 && (
                  <>
                    <Divider />
                    <Text fontSize="sm" fontWeight="medium" color="gray.600">
                      Waiting Queue ({room.waitingQueue.length})
                    </Text>
                    {room.waitingQueue.map((player, index) => (
                      <Box
                        key={player.id}
                        p={3}
                        borderRadius="md"
                        bg="orange.50"
                        border="1px"
                        borderColor="orange.200"
                      >
                        <HStack justify="space-between">
                          <HStack spacing={2}>
                            <Avatar size="sm" name={player.username} />
                            <VStack align="start" spacing={0}>
                              <HStack spacing={1}>
                                <Text fontWeight="medium">{player.username}</Text>
                                {currentPlayer?.id === player.id && (
                                  <Badge colorScheme="blue" size="sm">You</Badge>
                                )}
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                Position #{index + 1} in queue
                              </Text>
                            </VStack>
                          </HStack>
                          <Badge colorScheme="orange">
                            Waiting
                          </Badge>
                        </HStack>
                      </Box>
                    ))}
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Game Controls */}
          <Card>
            <CardHeader>
              <Heading size="md">Game Controls</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                {isInQueue ? (
                  <VStack spacing={3} w="full">
                    <Text fontSize="sm" color="orange.500" textAlign="center" fontWeight="medium">
                      You are in the waiting queue
                    </Text>
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      You'll be moved to the game when a spot becomes available
                    </Text>
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={leaveRoom}
                      w="full"
                    >
                      Leave Queue
                    </Button>
                  </VStack>
                ) : (
                  <>
                    {/* AI Dealer Auto-Start Info */}
                    <VStack spacing={3} w="full">
                      <Text fontSize="sm" color="purple.500" textAlign="center" fontWeight="medium">
                        AI Dealer Auto-Start
                      </Text>
                      <Text fontSize="xs" color="gray.500" textAlign="center">
                        Game will start automatically when 2+ players are ready
                      </Text>
                      {(() => {
                        const readyHumanPlayers = room.players.filter(p => 
                          p.id !== 'ai-dealer-bot' && p.ready && p.status === 'waiting'
                        ).length;
                        const totalHumanPlayers = room.players.filter(p => p.id !== 'ai-dealer-bot').length;
                        
                        if (readyHumanPlayers >= 2) {
                          return (
                            <Badge colorScheme="green">
                              Starting soon... ({readyHumanPlayers} ready!)
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge colorScheme="gray">
                              {readyHumanPlayers}/{Math.max(2, totalHumanPlayers)} ready
                            </Badge>
                          );
                        }
                      })()}
                    </VStack>

                    <Divider />

                    <VStack spacing={3} w="full">
                      <Text fontSize="sm" color="gray.500" textAlign="center">
                        Player Controls
                      </Text>
                      <Button
                        colorScheme={currentPlayer?.ready ? 'red' : 'blue'}
                        variant={currentPlayer?.ready ? 'outline' : 'solid'}
                        onClick={toggleReady}
                        w="full"
                      >
                        {currentPlayer?.ready ? 'Not Ready' : 'Ready'}
                      </Button>
                    </VStack>

                    <Divider />

                    <VStack spacing={3} w="full">
                      <Button
                        variant="outline"
                        colorScheme="red"
                        onClick={leaveRoom}
                        w="full"
                      >
                        Leave Room
                      </Button>
                    </VStack>
                  </>
                )}
              </VStack>
            </CardBody>
          </Card>
        </Grid>
      </VStack>
    );
};

export default UnoLikeRoom;