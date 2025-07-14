"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Grid,
  GridItem,
  useColorModeValue,
  Select,
  Divider
} from '@chakra-ui/react';
import { FaRobot, FaUser, FaHandshake } from 'react-icons/fa';

interface GameResult {
  winner: 'X' | 'O' | 'draw' | null;
  player1: string;
  player2: string | 'Bot';
  mode: 'pvp' | 'pvc';
  timestamp: Date;
}

const GameStats: React.FC = () => {
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'pvp' | 'pvc'>('all');
  const [currentPlayer, setCurrentPlayer] = useState<string>('');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    // Load game results from localStorage
    const results = JSON.parse(localStorage.getItem('ticTacToeResults') || '[]');
    setGameResults(results.map((r: GameResult) => ({
      ...r,
      timestamp: new Date(r.timestamp)
    })));

    // Get current player
    const player = JSON.parse(localStorage.getItem('currentPlayer') || 'null');
    if (player) {
      setCurrentPlayer(player.username);
    }
  }, []);

  // Filter results based on mode and current player
  const getFilteredResults = () => {
    let filtered = gameResults;
    
    if (filterMode !== 'all') {
      filtered = filtered.filter(result => result.mode === filterMode);
    }
    
    // If there's a current player, show their games
    if (currentPlayer) {
      filtered = filtered.filter(result => 
        result.player1 === currentPlayer || 
        (result.player2 === currentPlayer && result.player2 !== 'Bot')
      );
    }
    
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const filteredResults = getFilteredResults();

  // Calculate overall statistics
  const calculateStats = () => {
    const total = filteredResults.length;
    const wins = filteredResults.filter(result => {
      if (!currentPlayer) return false;
      if (result.winner === 'draw') return false;
      return (result.player1 === currentPlayer && result.winner === 'X') ||
             (result.player2 === currentPlayer && result.winner === 'O');
    }).length;
    
    const draws = filteredResults.filter(result => result.winner === 'draw').length;
    const losses = total - wins - draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    
    const pvpGames = filteredResults.filter(r => r.mode === 'pvp').length;
    const pvcGames = filteredResults.filter(r => r.mode === 'pvc').length;
    
    return { total, wins, draws, losses, winRate, pvpGames, pvcGames };
  };

  const stats = calculateStats();

  // Get result display info
  const getResultInfo = (result: GameResult) => {
    if (result.winner === 'draw') {
      return {
        icon: <FaHandshake />,
        text: 'Draw',
        color: 'yellow.500'
      };
    }
    
    const winnerName = result.winner === 'X' ? result.player1 : result.player2;
    const isCurrentPlayerWinner = winnerName === currentPlayer;
    
    return {
      icon: result.mode === 'pvc' ? <FaRobot /> : <FaUser />,
      text: winnerName,
      color: isCurrentPlayerWinner ? 'green.500' : 'red.500'
    };
  };

  // Get opponent name for current player
  const getOpponentName = (result: GameResult) => {
    if (!currentPlayer) return 'Unknown';
    if (result.player1 === currentPlayer) return result.player2;
    if (result.player2 === currentPlayer) return result.player1;
    return 'Unknown';
  };

  return (
    <VStack spacing={6} w="full">
      {/* Statistics Overview */}
      <VStack spacing={4} w="full">
        <Text fontSize="lg" fontWeight="semibold">Game Statistics</Text>
        
        {stats.total === 0 ? (
          <Box textAlign="center" p={8} bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
            <Text color="gray.500">No games played yet</Text>
            <Text fontSize="sm" color="gray.400">Start playing to see your statistics!</Text>
          </Box>
        ) : (
          <>
            {/* Quick Stats */}
            <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={4} w="full">
              <GridItem>
                <Stat textAlign="center" p={3} bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                  <StatLabel>Total Games</StatLabel>
                  <StatNumber>{stats.total}</StatNumber>
                </Stat>
              </GridItem>
              
              <GridItem>
                <Stat textAlign="center" p={3} bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                  <StatLabel>Wins</StatLabel>
                  <StatNumber color="green.500">{stats.wins}</StatNumber>
                </Stat>
              </GridItem>
              
              <GridItem>
                <Stat textAlign="center" p={3} bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                  <StatLabel>Win Rate</StatLabel>
                  <StatNumber>{stats.winRate}%</StatNumber>
                </Stat>
              </GridItem>
              
              <GridItem>
                <Stat textAlign="center" p={3} bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                  <StatLabel>vs Bot</StatLabel>
                  <StatNumber>{stats.pvcGames}</StatNumber>
                  <StatHelpText>vs Players: {stats.pvpGames}</StatHelpText>
                </Stat>
              </GridItem>
            </Grid>

            <Divider />

            {/* Filter Controls */}
            <HStack spacing={4} w="full" justify="center">
              <Text fontSize="sm">Filter:</Text>
              <Select 
                value={filterMode} 
                onChange={(e) => setFilterMode(e.target.value as 'all' | 'pvp' | 'pvc')}
                size="sm"
                maxW="150px"
              >
                <option value="all">All Games</option>
                <option value="pvp">Player vs Player</option>
                <option value="pvc">Player vs Computer</option>
              </Select>
            </HStack>

            {/* Game History Table */}
            <Box w="full">
              <Text fontSize="md" fontWeight="semibold" mb={3}>Recent Games</Text>
              <TableContainer>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Opponent</Th>
                      <Th>Mode</Th>
                      <Th>Result</Th>
                      <Th>Winner</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredResults.slice(0, 10).map((result, index) => {
                      const resultInfo = getResultInfo(result);
                      const opponent = getOpponentName(result);
                      
                      return (
                        <Tr key={index}>
                          <Td>
                            <Text fontSize="xs">
                              {result.timestamp.toLocaleDateString()}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {result.timestamp.toLocaleTimeString()}
                            </Text>
                          </Td>
                          
                          <Td>
                            <HStack spacing={2}>
                              {result.mode === 'pvc' ? <FaRobot /> : <FaUser />}
                              <Text fontSize="sm">{opponent}</Text>
                            </HStack>
                          </Td>
                          
                          <Td>
                            <Badge 
                              colorScheme={result.mode === 'pvp' ? 'blue' : 'purple'}
                              variant="subtle"
                            >
                              {result.mode === 'pvp' ? 'PvP' : 'PvC'}
                            </Badge>
                          </Td>
                          
                          <Td>
                            <Badge 
                              colorScheme={
                                result.winner === 'draw' ? 'yellow' :
                                ((result.player1 === currentPlayer && result.winner === 'X') ||
                                 (result.player2 === currentPlayer && result.winner === 'O')) ? 'green' : 'red'
                              }
                            >
                              {result.winner === 'draw' ? 'Draw' :
                               ((result.player1 === currentPlayer && result.winner === 'X') ||
                                (result.player2 === currentPlayer && result.winner === 'O')) ? 'Win' : 'Loss'}
                            </Badge>
                          </Td>
                          
                          <Td>
                            <HStack spacing={1}>
                              <Box color={resultInfo.color}>
                                {resultInfo.icon}
                              </Box>
                              <Text fontSize="sm" color={resultInfo.color}>
                                {resultInfo.text}
                              </Text>
                            </HStack>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
              
              {filteredResults.length > 10 && (
                <Text fontSize="xs" color="gray.500" textAlign="center" mt={2}>
                  Showing 10 most recent games out of {filteredResults.length} total
                </Text>
              )}
            </Box>
          </>
        )}
      </VStack>
    </VStack>
  );
};

export default GameStats;