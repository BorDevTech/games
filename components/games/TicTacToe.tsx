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
import PlayerAuth from '@/components/auth/PlayerAuth';

type CellValue = 'X' | 'O' | null;
type GameBoard = CellValue[];
type Player = 'X' | 'O';
type GameMode = 'pvp' | 'pvc';
type GameState = 'setup' | 'playing' | 'finished';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [player1Name, setPlayer1Name] = useState<string>('Player 1');
  
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

  // Save game result to localStorage (simple persistence)
  const saveGameResult = useCallback((result: Player | 'draw' | null) => {
    const gameResult: GameResult = {
      winner: result,
      player1: player1Name,
      player2: gameMode === 'pvc' ? 'Bot' : 'Player 2',
      mode: gameMode,
      timestamp: new Date()
    };

    const existingResults = JSON.parse(localStorage.getItem('ticTacToeResults') || '[]');
    existingResults.push(gameResult);
    localStorage.setItem('ticTacToeResults', JSON.stringify(existingResults));

    // Show result toast
    toast({
      title: result === 'draw' ? 'It\'s a Draw!' : `${result === 'X' ? player1Name : (gameMode === 'pvc' ? 'Bot' : 'Player 2')} Wins!`,
      status: result === 'draw' ? 'warning' : 'success',
      duration: 3000,
      isClosable: true,
    });
  }, [player1Name, gameMode, toast]);

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
    if (currentPlayer === 'X') return player1Name;
    return gameMode === 'pvc' ? 'Bot' : 'Player 2';
  };

  // Setup phase
  if (gameState === 'setup') {
    return (
      <VStack spacing={8}>
        <Heading size="lg" textAlign="center">Tic-Tac-Toe Setup</Heading>
        
        {/* Authentication Component */}
        <PlayerAuth 
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onAuthChange={(auth, user) => {
            setIsAuthenticated(auth);
            setCurrentUser(user);
            if (auth && user) {
              setPlayer1Name(user);
            }
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

          {gameMode === 'pvp' && !isAuthenticated && (
            <VStack spacing={2} w="full">
              <Text fontSize="sm" color="gray.500">Offline Mode - Enter Player Names</Text>
            </VStack>
          )}
        </VStack>

        {/* Start Game Button */}
        <Button 
          colorScheme="purple" 
          size="lg" 
          onClick={startNewGame}
          leftIcon={gameMode === 'pvc' ? <FaRobot /> : <FaUser />}
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
              : `${winner === 'X' ? player1Name : (gameMode === 'pvc' ? 'Bot' : 'Player 2')} Wins!`
            }
          </Badge>
        )}

        {/* Player Info */}
        <HStack spacing={8} fontSize="sm">
          <HStack>
            <Text fontWeight="semibold">X:</Text>
            <Text>{player1Name}</Text>
          </HStack>
          <HStack>
            <Text fontWeight="semibold">O:</Text>
            <Text>{gameMode === 'pvc' ? 'Bot' : 'Player 2'}</Text>
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