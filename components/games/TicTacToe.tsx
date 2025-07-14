"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  GridItem,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Select,
  useDisclosure,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { FaRobot, FaUser } from 'react-icons/fa';
import GameStats from '@/components/profile/GameStats';
import DualPlayerAuth from '@/components/auth/DualPlayerAuth';

type CellValue = 'X' | 'O' | null;
type GameBoard = CellValue[];
type Player = 'X' | 'O';
type GameMode = 'pvp' | 'pvc';
type GameState = 'setup' | 'playing' | 'finished';

interface StoredPlayer {
  username: string;
  gamesPlayed: number;
  gamesWon: number;
}

interface GameResult {
  winner: Player | 'draw' | null;
  player1: string;
  player2: string | 'Bot';
  mode: GameMode;
  timestamp: Date;
}

const TicTacToe: React.FC = () => {
  // Game state
  const [board, setBoard] = useState<GameBoard>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [gameState, setGameState] = useState<GameState>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  
  // Player management
  const [player1, setPlayer1] = useState<{ isAuthenticated: boolean; username: string; } | null>(null);
  const [player2, setPlayer2] = useState<{ isAuthenticated: boolean; username: string; } | null>(null);
  
  // UI state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // Theme colors
  const cellBg = useColorModeValue('gray.100', 'gray.700');
  const cellHoverBg = useColorModeValue('gray.200', 'gray.600');
  const winnerBg = useColorModeValue('green.100', 'green.700');

  // Check for winning combinations
  const checkWinner = (gameBoard: GameBoard): Player | 'draw' | null => {
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
        return gameBoard[a] as Player;
      }
    }

    // Check for draw
    if (gameBoard.every(cell => cell !== null)) {
      return 'draw';
    }

    return null;
  };

  // Bot AI - simple random move for now
  const makeBotMove = useCallback((gameBoard: GameBoard): number => {
    const availableMoves = gameBoard
      .map((cell, index) => cell === null ? index : null)
      .filter(index => index !== null) as number[];
    
    if (availableMoves.length === 0) return -1;
    
    // Simple AI: try to win, then block, then random
    const testMove = (player: Player) => {
      for (const move of availableMoves) {
        const testBoard = [...gameBoard];
        testBoard[move] = player;
        if (checkWinner(testBoard) === player) {
          return move;
        }
      }
      return null;
    };

    // Try to win
    const winMove = testMove('O');
    if (winMove !== null) return winMove;

    // Try to block
    const blockMove = testMove('X');
    if (blockMove !== null) return blockMove;

    // Random move
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }, []);

  // Update player statistics
  const updatePlayerStats = useCallback((username: string, gameResult: 'win' | 'loss' | 'draw') => {
    const players: StoredPlayer[] = JSON.parse(localStorage.getItem('players') || '[]');
    const playerIndex = players.findIndex((p: StoredPlayer) => p.username === username);
    
    if (playerIndex >= 0) {
      players[playerIndex].gamesPlayed += 1;
      if (gameResult === 'win') {
        players[playerIndex].gamesWon += 1;
      }
      localStorage.setItem('players', JSON.stringify(players));
      
      // Update current player data in localStorage
      const currentPlayer1 = localStorage.getItem('currentPlayer1');
      const currentPlayer2 = localStorage.getItem('currentPlayer2');
      
      if (currentPlayer1) {
        const p1 = JSON.parse(currentPlayer1);
        if (p1.username === username) {
          p1.gamesPlayed += 1;
          if (gameResult === 'win') p1.gamesWon += 1;
          localStorage.setItem('currentPlayer1', JSON.stringify(p1));
        }
      }
      
      if (currentPlayer2) {
        const p2 = JSON.parse(currentPlayer2);
        if (p2.username === username) {
          p2.gamesPlayed += 1;
          if (gameResult === 'win') p2.gamesWon += 1;
          localStorage.setItem('currentPlayer2', JSON.stringify(p2));
        }
      }
    }
  }, []);

  // Save game result to localStorage (simple persistence)
  const saveGameResult = useCallback((result: Player | 'draw' | null) => {
    const gameResult: GameResult = {
      winner: result,
      player1: player1?.username || 'Player 1',
      player2: gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2'),
      mode: gameMode,
      timestamp: new Date()
    };

    const existingResults = JSON.parse(localStorage.getItem('ticTacToeResults') || '[]');
    existingResults.push(gameResult);
    localStorage.setItem('ticTacToeResults', JSON.stringify(existingResults));

    // Update player stats if they are authenticated
    if (player1?.isAuthenticated) {
      updatePlayerStats(player1.username, result === 'X' ? 'win' : result === 'draw' ? 'draw' : 'loss');
    }
    
    if (gameMode === 'pvp' && player2?.isAuthenticated) {
      updatePlayerStats(player2.username, result === 'O' ? 'win' : result === 'draw' ? 'draw' : 'loss');
    }

    // Show result toast
    const winnerName = result === 'X' ? (player1?.username || 'Player 1') : 
                     result === 'O' ? (gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2')) : null;
                     
    toast({
      title: result === 'draw' ? 'It\'s a Draw!' : `${winnerName} Wins!`,
      status: result === 'draw' ? 'warning' : 'success',
      duration: 3000,
      isClosable: true,
    });
  }, [player1, player2, gameMode, toast, updatePlayerStats]);


  // Handle cell click
  const handleCellClick = (index: number) => {
    if (gameState !== 'playing' || board[index] !== null) return;
    
    // Only allow human moves during their turn
    if (gameMode === 'pvc' && currentPlayer === 'O') return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameResult = checkWinner(newBoard);
    if (gameResult) {
      setWinner(gameResult);
      setGameState('finished');
      saveGameResult(gameResult);
      return;
    }

    // Switch player
    const nextPlayer = currentPlayer === 'X' ? 'O' : 'X';
    setCurrentPlayer(nextPlayer);
  };

  // Bot move effect
  useEffect(() => {
    if (gameState === 'playing' && gameMode === 'pvc' && currentPlayer === 'O') {
      const timer = setTimeout(() => {
        const botMove = makeBotMove(board);
        if (botMove !== -1) {
          const newBoard = [...board];
          newBoard[botMove] = 'O';
          setBoard(newBoard);

          const gameResult = checkWinner(newBoard);
          if (gameResult) {
            setWinner(gameResult);
            setGameState('finished');
            saveGameResult(gameResult);
          } else {
            setCurrentPlayer('X');
          }
        }
      }, 500); // Small delay for better UX

      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameState, gameMode, board, makeBotMove, saveGameResult]);

  // Start new game
  const startNewGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setGameState('playing');
  };

  // Reset game
  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setGameState('setup');
  };

  // Get current player display name
  const getCurrentPlayerName = () => {
    if (currentPlayer === 'X') return player1?.username || 'Player 1';
    return gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2');
  };

  // Setup phase
  if (gameState === 'setup') {
    return (
      <VStack spacing={8}>
        <Heading size="lg" textAlign="center">Tic-Tac-Toe Setup</Heading>
        
        {/* Authentication Component */}
        <DualPlayerAuth 
          gameMode={gameMode}
          player1={player1}
          player2={player2}
          onPlayer1Change={(isAuth, username) => {
            setPlayer1(isAuth ? { isAuthenticated: isAuth, username } : null);
          }}
          onPlayer2Change={(isAuth, username) => {
            setPlayer2(isAuth ? { isAuthenticated: isAuth, username } : null);
          }}
        />

        {/* Game Mode Selection */}
        <VStack spacing={4} w="full" maxW="md">
          <Text fontSize="lg" fontWeight="semibold">Select Game Mode</Text>
          <Select 
            value={gameMode} 
            onChange={(e) => setGameMode(e.target.value as GameMode)}
          >
            <option value="pvp">Player vs Player</option>
            <option value="pvc">Player vs Computer</option>
          </Select>

          {gameMode === 'pvp' && (!player1?.isAuthenticated || !player2?.isAuthenticated) && (
            <VStack spacing={2} w="full">
              <Text fontSize="sm" color="gray.500">
                {!player1?.isAuthenticated && !player2?.isAuthenticated 
                  ? "Both players can create accounts to save progress"
                  : !player1?.isAuthenticated 
                    ? "Player 1 can create an account to save progress"
                    : "Player 2 can create an account to save progress"
                }
              </Text>
            </VStack>
          )}
        </VStack>

        {/* Start Game Button */}
        <Button 
          colorScheme="purple" 
          size="lg" 
          onClick={startNewGame}
          leftIcon={gameMode === 'pvc' ? <FaRobot /> : <FaUser />}
          isDisabled={!player1 || (gameMode === 'pvp' && !player2)}
        >
          Start Game
        </Button>

        {/* Game Stats */}
        <GameStats />
      </VStack>
    );
  }

  return (
    <VStack spacing={6}>
      {/* Game Header */}
      <VStack spacing={4} textAlign="center">
        <Heading size="lg">Tic-Tac-Toe</Heading>
        
        {/* Current Turn Indicator */}
        {gameState === 'playing' && (
          <HStack spacing={2}>
            <Text fontSize="lg">Current Turn:</Text>
            <Badge 
              colorScheme={currentPlayer === 'X' ? 'blue' : 'red'} 
              fontSize="md" 
              px={3} 
              py={1}
            >
              {getCurrentPlayerName()} ({currentPlayer})
            </Badge>
          </HStack>
        )}

        {/* Game Result */}
        {gameState === 'finished' && (
          <Badge 
            colorScheme={winner === 'draw' ? 'yellow' : 'green'} 
            fontSize="lg" 
            px={4} 
            py={2}
          >
            {winner === 'draw' 
              ? 'It\'s a Draw!' 
              : `${winner === 'X' ? (player1?.username || 'Player 1') : (gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2'))} Wins!`
            }
          </Badge>
        )}

        {/* Player Info */}
        <HStack spacing={8} fontSize="sm">
          <HStack>
            <Text fontWeight="semibold">X:</Text>
            <Text>{player1?.username || 'Player 1'}</Text>
          </HStack>
          <HStack>
            <Text fontWeight="semibold">O:</Text>
            <Text>{gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2')}</Text>
          </HStack>
        </HStack>
      </VStack>

      {/* Game Board */}
      <Grid templateColumns="repeat(3, 1fr)" gap={2} maxW="300px" mx="auto">
        {board.map((cell, index) => (
          <GridItem key={index}>
            <Button
              w="90px"
              h="90px"
              fontSize="2xl"
              fontWeight="bold"
              bg={cell ? winnerBg : cellBg}
              _hover={!cell && gameState === 'playing' ? { bg: cellHoverBg } : {}}
              onClick={() => handleCellClick(index)}
              isDisabled={gameState !== 'playing' || cell !== null}
              color={cell === 'X' ? 'blue.500' : 'red.500'}
            >
              {cell}
            </Button>
          </GridItem>
        ))}
      </Grid>

      {/* Game Controls */}
      <HStack spacing={4}>
        <Button 
          colorScheme="blue" 
          onClick={startNewGame}
          isDisabled={gameState !== 'finished'}
        >
          New Game
        </Button>
        <Button variant="outline" onClick={resetGame}>
          Back to Setup
        </Button>
        <Button variant="outline" onClick={onOpen}>
          View Stats
        </Button>
      </HStack>

      {/* Stats Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Game Statistics</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <GameStats />
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default TicTacToe;