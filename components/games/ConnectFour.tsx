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
  useToast
} from '@chakra-ui/react';
import { FaRobot, FaUser } from 'react-icons/fa';
import GameStats from '@/components/profile/GameStats';
import DualPlayerAuth from '@/components/auth/DualPlayerAuth';

type CellValue = 'Red' | 'Yellow' | null;
type GameBoard = CellValue[][];
type Player = 'Red' | 'Yellow';
type GameMode = 'pvp' | 'pvc';
type GameState = 'setup' | 'playing' | 'finished';

interface GameResult {
  winner: Player | 'draw' | null;
  player1: string;
  player2: string | 'Bot';
  mode: GameMode;
  timestamp: Date;
}

const ROWS = 6;
const COLS = 7;

const ConnectFour: React.FC = () => {
  // Game state
  const [board, setBoard] = useState<GameBoard>(() => 
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>('Red');
  const [gameState, setGameState] = useState<GameState>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('pvp');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  
  // Player management
  const [player1, setPlayer1] = useState<{ isAuthenticated: boolean; username: string; } | null>(null);
  const [player2, setPlayer2] = useState<{ isAuthenticated: boolean; username: string; } | null>(null);
  
  // UI state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Check for winning combinations
  const checkWinner = (gameBoard: GameBoard): Player | 'draw' | null => {
    // Check horizontal
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 3; col++) {
        if (
          gameBoard[row][col] &&
          gameBoard[row][col] === gameBoard[row][col + 1] &&
          gameBoard[row][col] === gameBoard[row][col + 2] &&
          gameBoard[row][col] === gameBoard[row][col + 3]
        ) {
          return gameBoard[row][col] as Player;
        }
      }
    }

    // Check vertical
    for (let row = 0; row < ROWS - 3; row++) {
      for (let col = 0; col < COLS; col++) {
        if (
          gameBoard[row][col] &&
          gameBoard[row][col] === gameBoard[row + 1][col] &&
          gameBoard[row][col] === gameBoard[row + 2][col] &&
          gameBoard[row][col] === gameBoard[row + 3][col]
        ) {
          return gameBoard[row][col] as Player;
        }
      }
    }

    // Check diagonal (top-left to bottom-right)
    for (let row = 0; row < ROWS - 3; row++) {
      for (let col = 0; col < COLS - 3; col++) {
        if (
          gameBoard[row][col] &&
          gameBoard[row][col] === gameBoard[row + 1][col + 1] &&
          gameBoard[row][col] === gameBoard[row + 2][col + 2] &&
          gameBoard[row][col] === gameBoard[row + 3][col + 3]
        ) {
          return gameBoard[row][col] as Player;
        }
      }
    }

    // Check diagonal (top-right to bottom-left)
    for (let row = 0; row < ROWS - 3; row++) {
      for (let col = 3; col < COLS; col++) {
        if (
          gameBoard[row][col] &&
          gameBoard[row][col] === gameBoard[row + 1][col - 1] &&
          gameBoard[row][col] === gameBoard[row + 2][col - 2] &&
          gameBoard[row][col] === gameBoard[row + 3][col - 3]
        ) {
          return gameBoard[row][col] as Player;
        }
      }
    }

    // Check for draw
    if (gameBoard[0].every(cell => cell !== null)) {
      return 'draw';
    }

    return null;
  };

  // Find the lowest available row in a column
  const getLowestEmptyRow = (board: GameBoard, col: number): number => {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!board[row][col]) {
        return row;
      }
    }
    return -1; // Column is full
  };

  // AI bot move
  const makeBotMove = useCallback((gameBoard: GameBoard): number => {
    // Simple AI: Try to win, block player, or make random move
    
    // Check if bot can win
    for (let col = 0; col < COLS; col++) {
      const row = getLowestEmptyRow(gameBoard, col);
      if (row !== -1) {
        const testBoard = gameBoard.map(r => [...r]);
        testBoard[row][col] = 'Yellow';
        if (checkWinner(testBoard) === 'Yellow') {
          return col;
        }
      }
    }

    // Check if bot should block player
    for (let col = 0; col < COLS; col++) {
      const row = getLowestEmptyRow(gameBoard, col);
      if (row !== -1) {
        const testBoard = gameBoard.map(r => [...r]);
        testBoard[row][col] = 'Red';
        if (checkWinner(testBoard) === 'Red') {
          return col;
        }
      }
    }

    // Make random move
    const availableCols = [];
    for (let col = 0; col < COLS; col++) {
      if (getLowestEmptyRow(gameBoard, col) !== -1) {
        availableCols.push(col);
      }
    }

    return availableCols.length > 0 
      ? availableCols[Math.floor(Math.random() * availableCols.length)]
      : -1;
  }, []);

  // Update player statistics
  const updatePlayerStats = useCallback((winner: Player | 'draw', player1Name: string, player2Name: string) => {
    const updatePlayer = (username: string, won: boolean) => {
      if (typeof window === 'undefined') return;
      
      const stats = JSON.parse(localStorage.getItem('playerStats') || '{}');
      if (!stats[username]) {
        stats[username] = { gamesPlayed: 0, gamesWon: 0 };
      }
      stats[username].gamesPlayed++;
      if (won) stats[username].gamesWon++;
      localStorage.setItem('playerStats', JSON.stringify(stats));
    };

    // Only update for authenticated users
    if (player1?.isAuthenticated) {
      updatePlayer(player1Name, winner === 'Red');
    }
    if (gameMode === 'pvp' && player2?.isAuthenticated) {
      updatePlayer(player2Name, winner === 'Yellow');
    }
  }, [gameMode, player1, player2]);

  // Save game result
  const saveGameResult = useCallback((result: Player | 'draw' | null) => {
    const gameResult: GameResult = {
      winner: result,
      player1: player1?.username || 'Player 1',
      player2: gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2'),
      mode: gameMode,
      timestamp: new Date()
    };

    const history = JSON.parse(localStorage.getItem('connectFourHistory') || '[]');
    history.unshift(gameResult);
    if (history.length > 50) history.pop(); // Keep only last 50 games
    localStorage.setItem('connectFourHistory', JSON.stringify(history));

    if (result) {
      updatePlayerStats(result, gameResult.player1, gameResult.player2);
    }

    // Show toast notification
    const winnerName = result === 'Red' 
      ? (player1?.username || 'Player 1')
      : result === 'Yellow'
        ? (gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2'))
        : null;

    toast({
      title: result === 'draw' ? 'It\'s a Draw!' : `${winnerName} Wins!`,
      status: result === 'draw' ? 'warning' : 'success',
      duration: 3000,
      isClosable: true,
    });
  }, [player1, player2, gameMode, toast, updatePlayerStats]);

  // Handle column click
  const handleColumnClick = (col: number) => {
    if (gameState !== 'playing') return;
    
    // Only allow human moves during their turn
    if (gameMode === 'pvc' && currentPlayer === 'Yellow') return;

    const row = getLowestEmptyRow(board, col);
    if (row === -1) return; // Column is full

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);

    const gameResult = checkWinner(newBoard);
    if (gameResult) {
      setWinner(gameResult);
      setGameState('finished');
      saveGameResult(gameResult);
      return;
    }

    // Switch player
    const nextPlayer = currentPlayer === 'Red' ? 'Yellow' : 'Red';
    setCurrentPlayer(nextPlayer);
  };

  // Bot move effect
  useEffect(() => {
    if (gameState === 'playing' && gameMode === 'pvc' && currentPlayer === 'Yellow') {
      const timer = setTimeout(() => {
        const botMove = makeBotMove(board);
        if (botMove !== -1) {
          const row = getLowestEmptyRow(board, botMove);
          if (row !== -1) {
            const newBoard = board.map(r => [...r]);
            newBoard[row][botMove] = 'Yellow';
            setBoard(newBoard);

            const gameResult = checkWinner(newBoard);
            if (gameResult) {
              setWinner(gameResult);
              setGameState('finished');
              saveGameResult(gameResult);
            } else {
              setCurrentPlayer('Red');
            }
          }
        }
      }, 1000); // Delay for better UX

      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameState, gameMode, board, makeBotMove, saveGameResult]);

  // Start new game
  const startNewGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer('Red');
    setWinner(null);
    setGameState('playing');
  };

  // Reset game
  const resetGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer('Red');
    setWinner(null);
    setGameState('setup');
  };

  // Get current player display name
  const getCurrentPlayerName = () => {
    if (currentPlayer === 'Red') return player1?.username || 'Player 1';
    return gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2');
  };

  // Setup phase
  if (gameState === 'setup') {
    return (
      <VStack spacing={8}>
        <Heading size="lg" textAlign="center">Connect Four Setup</Heading>
        
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
        <Heading size="lg">Connect Four</Heading>
        
        {/* Current Turn Indicator */}
        {gameState === 'playing' && (
          <HStack spacing={2}>
            <Text fontSize="lg">Current Turn:</Text>
            <Badge 
              colorScheme={currentPlayer === 'Red' ? 'red' : 'yellow'} 
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
              : `${winner === 'Red' ? (player1?.username || 'Player 1') : (gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2'))} Wins!`
            }
          </Badge>
        )}

        {/* Player Info */}
        <HStack spacing={8} fontSize="sm">
          <HStack>
            <Text fontWeight="semibold">Red:</Text>
            <Text>{player1?.username || 'Player 1'}</Text>
          </HStack>
          <HStack>
            <Text fontWeight="semibold">Yellow:</Text>
            <Text>{gameMode === 'pvc' ? 'Bot' : (player2?.username || 'Player 2')}</Text>
          </HStack>
        </HStack>
      </VStack>

      {/* Game Board */}
      <VStack spacing={2}>
        {/* Column buttons for dropping pieces */}
        <HStack spacing={1}>
          {Array(COLS).fill(null).map((_, col) => (
            <Button
              key={col}
              w="50px"
              h="30px"
              fontSize="sm"
              onClick={() => handleColumnClick(col)}
              isDisabled={
                gameState !== 'playing' || 
                getLowestEmptyRow(board, col) === -1 ||
                (gameMode === 'pvc' && currentPlayer === 'Yellow')
              }
              colorScheme={currentPlayer === 'Red' ? 'red' : 'yellow'}
              variant="outline"
            >
              ↓
            </Button>
          ))}
        </HStack>

        {/* Game Board Grid */}
        <Grid templateColumns={`repeat(${COLS}, 1fr)`} gap={1} bg="blue.600" p={2} borderRadius="md">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <GridItem key={`${rowIndex}-${colIndex}`}>
                <Button
                  w="50px"
                  h="50px"
                  borderRadius="50%"
                  bg={
                    cell === 'Red' ? 'red.500' : 
                    cell === 'Yellow' ? 'yellow.400' : 
                    'white'
                  }
                  border="2px solid"
                  borderColor="blue.700"
                  _hover={{}}
                  cursor="default"
                  isDisabled={true}
                />
              </GridItem>
            ))
          )}
        </Grid>
      </VStack>

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

export default ConnectFour;