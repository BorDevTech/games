"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Grid,
  GridItem,
  Button,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Box,
  Select,
  useColorModeValue,
  useToast,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react';

// Types
type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
type GameMode = 'classic' | 'timer' | 'hardcore' | 'easy';
type GameState = 'setup' | 'playing' | 'paused' | 'finished';

interface Position {
  x: number;
  y: number;
}

interface Tetromino {
  type: TetrominoType;
  shape: number[][];
  color: string;
  position: Position;
}

interface GameStats {
  score: number;
  lines: number;
  level: number;
  timeLeft?: number; // For timer mode
}

interface HighScore {
  username: string;
  score: number;
  lines: number;
  mode: GameMode;
  timestamp: Date;
}

// Tetromino shapes and colors
const TETROMINOES: Record<TetrominoType, { shape: number[][]; color: string }> = {
  I: {
    shape: [[1, 1, 1, 1]],
    color: '#00F0F0'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#F0F000'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#A000F0'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#00F000'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#F00000'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#0000F0'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#F0A000'
  }
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_TIMER = 60; // 60 seconds for timer mode
const TIMER_BONUS = 8; // 8 seconds added per cleared line

const Tetris: React.FC = () => {
  // Game state
  const [board, setBoard] = useState<(string | null)[][]>(
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null);
  const [gameState, setGameState] = useState<GameState>('setup');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [gameStats, setGameStats] = useState<GameStats>({
    score: 0,
    lines: 0,
    level: 1,
    timeLeft: INITIAL_TIMER
  });

  // UI state
  const [userName, setUserName] = useState<string>('Player');
  const [showHighScores, setShowHighScores] = useState<boolean>(false);
  const toast = useToast();

  // Refs
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const boardCellBg = useColorModeValue('gray.100', 'gray.700');
  const boardBorderColor = useColorModeValue('gray.300', 'gray.600');

  // Utility functions
  const createEmptyBoard = (): (string | null)[][] => {
    return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
  };

  const getRandomTetromino = (): Tetromino => {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    const type = types[Math.floor(Math.random() * types.length)];
    const tetrominoData = TETROMINOES[type];
    
    return {
      type,
      shape: tetrominoData.shape,
      color: tetrominoData.color,
      position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 }
    };
  };

  const rotatePiece = (piece: Tetromino): number[][] => {
    const rows = piece.shape.length;
    const cols = piece.shape[0].length;
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[j][rows - 1 - i] = piece.shape[i][j];
      }
    }
    
    return rotated;
  };

  const isValidPosition = (piece: Tetromino, board: (string | null)[][], offsetX = 0, offsetY = 0): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.position.x + x + offsetX;
          const newY = piece.position.y + y + offsetY;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }
          
          if (newY >= 0 && board[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const placePiece = (piece: Tetromino, board: (string | null)[][]): (string | null)[][] => {
    const newBoard = board.map(row => [...row]);
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardX = piece.position.x + x;
          const boardY = piece.position.y + y;
          
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    
    return newBoard;
  };

  const clearLines = (board: (string | null)[][]): { newBoard: (string | null)[][]; linesCleared: number } => {
    const linesToClear: number[] = [];
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y].every(cell => cell !== null)) {
        linesToClear.push(y);
      }
    }
    
    if (linesToClear.length === 0) {
      return { newBoard: board, linesCleared: 0 };
    }
    
    const newBoard = board.filter((_, index) => !linesToClear.includes(index));
    const emptyLines = Array(linesToClear.length).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
    
    return {
      newBoard: [...emptyLines, ...newBoard],
      linesCleared: linesToClear.length
    };
  };

  const calculateScore = (linesCleared: number, level: number): number => {
    const baseScores = [0, 40, 100, 300, 1200];
    return baseScores[linesCleared] * level;
  };

  const getGhostPiece = (piece: Tetromino, board: (string | null)[][]): Tetromino | null => {
    if (!piece || gameMode !== 'easy') return null;
    
    let ghostY = piece.position.y;
    
    while (isValidPosition({ ...piece, position: { ...piece.position, y: ghostY + 1 } }, board)) {
      ghostY++;
    }
    
    return {
      ...piece,
      position: { ...piece.position, y: ghostY }
    };
  };

  // Save high score
  const saveHighScore = useCallback(() => {
    const highScores: HighScore[] = JSON.parse(localStorage.getItem('tetrisHighScores') || '[]');
    
    const newHighScore: HighScore = {
      username: userName,
      score: gameStats.score,
      lines: gameStats.lines,
      mode: gameMode,
      timestamp: new Date()
    };
    
    highScores.push(newHighScore);
    highScores.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    const topScores = highScores.slice(0, 10);
    localStorage.setItem('tetrisHighScores', JSON.stringify(topScores));
    
    // Show placement
    const placement = highScores.findIndex(score => 
      score.username === userName && 
      score.score === gameStats.score &&
      score.timestamp === newHighScore.timestamp
    ) + 1;
    
    toast({
      title: 'Game Over!',
      description: `Score: ${gameStats.score} | Placement: #${placement}`,
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  }, [userName, gameStats.score, gameStats.lines, gameMode, toast]);

  // Game logic
  const moveLeft = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    
    if (isValidPosition(currentPiece, board, -1, 0)) {
      setCurrentPiece({
        ...currentPiece,
        position: { ...currentPiece.position, x: currentPiece.position.x - 1 }
      });
    }
  }, [currentPiece, board, gameState]);

  const moveRight = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    
    if (isValidPosition(currentPiece, board, 1, 0)) {
      setCurrentPiece({
        ...currentPiece,
        position: { ...currentPiece.position, x: currentPiece.position.x + 1 }
      });
    }
  }, [currentPiece, board, gameState]);

  const moveDown = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return false;
    
    if (isValidPosition(currentPiece, board, 0, 1)) {
      setCurrentPiece({
        ...currentPiece,
        position: { ...currentPiece.position, y: currentPiece.position.y + 1 }
      });
      return true;
    }
    
    // Piece can't move down, place it
    const newBoard = placePiece(currentPiece, board);
    const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
    
    setBoard(clearedBoard);
    
    // Update stats
    const newScore = gameStats.score + calculateScore(linesCleared, gameStats.level);
    const newLines = gameStats.lines + linesCleared;
    const newLevel = Math.floor(newLines / 10) + 1;
    
    let newTimeLeft = gameStats.timeLeft;
    if (gameMode === 'timer' && linesCleared > 0) {
      newTimeLeft = (newTimeLeft || 0) + (TIMER_BONUS * linesCleared);
    }
    
    setGameStats({
      score: newScore,
      lines: newLines,
      level: newLevel,
      timeLeft: newTimeLeft
    });
    
    // Create new piece
    if (nextPiece) {
      const newCurrentPiece = { ...nextPiece, position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 } };
      
      if (!isValidPosition(newCurrentPiece, clearedBoard)) {
        // Game over
        setGameState('finished');
        saveHighScore();
        return false;
      }
      
      setCurrentPiece(newCurrentPiece);
      setNextPiece(getRandomTetromino());
    }
    
    return false;
  }, [currentPiece, board, gameState, gameStats, nextPiece, gameMode, saveHighScore]);

  const rotatePieceClockwise = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    
    const rotatedShape = rotatePiece(currentPiece);
    const rotatedPiece = { ...currentPiece, shape: rotatedShape };
    
    if (isValidPosition(rotatedPiece, board)) {
      setCurrentPiece(rotatedPiece);
    }
  }, [currentPiece, board, gameState]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameState !== 'playing') return;
    
    let dropY = currentPiece.position.y;
    
    while (isValidPosition({ ...currentPiece, position: { ...currentPiece.position, y: dropY + 1 } }, board)) {
      dropY++;
    }
    
    setCurrentPiece({
      ...currentPiece,
      position: { ...currentPiece.position, y: dropY }
    });
    
    // Force piece placement on next frame
    setTimeout(moveDown, 0);
  }, [currentPiece, board, gameState, moveDown]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      
      switch (e.code) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveDown();
          break;
        case 'ArrowUp':
        case 'Space':
          e.preventDefault();
          rotatePieceClockwise();
          break;
        case 'Enter':
          e.preventDefault();
          hardDrop();
          break;
        case 'Escape':
          setGameState(gameState === 'playing' ? 'paused' : 'playing');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, moveLeft, moveRight, moveDown, rotatePieceClockwise, hardDrop]);

  // Game loop
  useEffect(() => {
    if (gameState === 'playing') {
      const speed = Math.max(100, 1000 - (gameStats.level - 1) * 100);
      gameLoopRef.current = setInterval(() => {
        moveDown();
      }, speed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, gameStats.level, moveDown]);

  // Timer mode countdown
  useEffect(() => {
    if (gameMode === 'timer' && gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setGameStats(prev => {
          if ((prev.timeLeft || 0) <= 1) {
            setGameState('finished');
            saveHighScore();
            return prev;
          }
          return { ...prev, timeLeft: (prev.timeLeft || 0) - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameMode, gameState, saveHighScore]);

  // Initialize game
  const startGame = () => {
    const firstPiece = getRandomTetromino();
    const secondPiece = getRandomTetromino();
    
    setBoard(createEmptyBoard());
    setCurrentPiece(firstPiece);
    setNextPiece(secondPiece);
    setGameStats({
      score: 0,
      lines: 0,
      level: 1,
      timeLeft: gameMode === 'timer' ? INITIAL_TIMER : undefined
    });
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('setup');
    setBoard(createEmptyBoard());
    setCurrentPiece(null);
    setNextPiece(null);
    setGameStats({
      score: 0,
      lines: 0,
      level: 1,
      timeLeft: INITIAL_TIMER
    });
  };

  // Get high scores
  const getHighScores = (): HighScore[] => {
    return JSON.parse(localStorage.getItem('tetrisHighScores') || '[]')
      .filter((score: HighScore) => score.mode === gameMode)
      .slice(0, 10);
  };

  // Render game board with current piece and ghost piece
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    // Add ghost piece for easy mode
    const ghostPiece = getGhostPiece(currentPiece!, board);
    if (ghostPiece && currentPiece) {
      for (let y = 0; y < ghostPiece.shape.length; y++) {
        for (let x = 0; x < ghostPiece.shape[y].length; x++) {
          if (ghostPiece.shape[y][x]) {
            const boardX = ghostPiece.position.x + x;
            const boardY = ghostPiece.position.y + y;
            
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              if (!displayBoard[boardY][boardX]) {
                displayBoard[boardY][boardX] = 'ghost';
              }
            }
          }
        }
      }
    }
    
    // Add current piece
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardX = currentPiece.position.x + x;
            const boardY = currentPiece.position.y + y;
            
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }
    
    return displayBoard;
  };

  // Setup phase
  if (gameState === 'setup') {
    return (
      <VStack spacing={8} maxW="md" mx="auto">
        <Heading size="lg" textAlign="center">Tetris Setup</Heading>
        
        <VStack spacing={4} w="full">
          <Text fontSize="lg" fontWeight="semibold">Player Name</Text>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value || 'Player')}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              width: '100%'
            }}
            placeholder="Enter your name"
          />
        </VStack>

        <VStack spacing={4} w="full">
          <Text fontSize="lg" fontWeight="semibold">Select Game Mode</Text>
          <Select 
            value={gameMode} 
            onChange={(e) => setGameMode(e.target.value as GameMode)}
          >
            <option value="classic">Classic Mode</option>
            <option value="timer">Timer Mode (60s + bonus)</option>
            <option value="hardcore">Hardcore Mode (no next preview)</option>
            <option value="easy">Easy Mode (ghost piece)</option>
          </Select>
          
          <Text fontSize="sm" color="gray.500" textAlign="center">
            {gameMode === 'timer' && 'Start with 60 seconds, gain 8 seconds per cleared line'}
            {gameMode === 'hardcore' && 'No next piece preview - pure skill challenge'}
            {gameMode === 'easy' && 'Ghost piece shows where your piece will land'}
            {gameMode === 'classic' && 'Traditional Tetris gameplay'}
          </Text>
        </VStack>

        <VStack spacing={4}>
          <Button 
            colorScheme="purple" 
            size="lg" 
            onClick={startGame}
            isDisabled={!userName.trim()}
          >
            Start Game
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setShowHighScores(true)}
          >
            View High Scores
          </Button>
        </VStack>

        {/* High Scores Modal */}
        <Modal isOpen={showHighScores} onClose={() => setShowHighScores(false)} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>High Scores - {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Mode</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={2}>
                {getHighScores().map((score, index) => (
                  <HStack key={index} justify="space-between" w="full" p={2} borderRadius="md" bg={index < 3 ? 'yellow.100' : 'gray.50'}>
                    <HStack>
                      <Badge colorScheme={index === 0 ? 'gold' : index === 1 ? 'gray' : index === 2 ? 'orange' : 'blue'}>
                        #{index + 1}
                      </Badge>
                      <Text fontWeight="medium">{score.username}</Text>
                    </HStack>
                    <VStack spacing={0} align="end">
                      <Text fontSize="sm" fontWeight="bold">{score.score.toLocaleString()}</Text>
                      <Text fontSize="xs" color="gray.500">{score.lines} lines</Text>
                    </VStack>
                  </HStack>
                ))}
                {getHighScores().length === 0 && (
                  <Text color="gray.500">No high scores yet. Be the first!</Text>
                )}
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    );
  }

  return (
    <Box w="full" maxW="6xl" mx="auto">
      <VStack spacing={6}>
        {/* Game Header */}
        <Flex justify="space-between" align="center" w="full" wrap="wrap" gap={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">Tetris - {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Mode</Heading>
            <Text color="gray.500">Player: {userName}</Text>
          </VStack>
          
          <HStack spacing={2}>
            {gameState === 'playing' && (
              <Button size="sm" onClick={() => setGameState('paused')}>
                Pause
              </Button>
            )}
            {gameState === 'paused' && (
              <Button size="sm" colorScheme="green" onClick={() => setGameState('playing')}>
                Resume
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={resetGame}>
              Back to Setup
            </Button>
          </HStack>
        </Flex>

        {/* Game Status */}
        {gameState === 'paused' && (
          <Badge colorScheme="yellow" fontSize="lg" px={4} py={2}>
            PAUSED - Press ESC to resume
          </Badge>
        )}
        
        {gameState === 'finished' && (
          <Badge colorScheme="red" fontSize="lg" px={4} py={2}>
            GAME OVER - Final Score: {gameStats.score.toLocaleString()}
          </Badge>
        )}

        {/* Game Content */}
        <Flex gap={8} wrap="wrap" justify="center" align="start">
          {/* Game Board */}
          <Card bg={cardBg}>
            <CardBody p={4}>
              <Grid 
                templateColumns={`repeat(${BOARD_WIDTH}, 1fr)`} 
                gap={1} 
                border="2px solid" 
                borderColor={boardBorderColor}
                p={2}
                borderRadius="md"
                bg="black"
              >
                {renderBoard().map((row, y) =>
                  row.map((cell, x) => (
                    <GridItem key={`${y}-${x}`}>
                      <Box
                        w="25px"
                        h="25px"
                        bg={
                          cell === 'ghost' 
                            ? 'rgba(255, 255, 255, 0.3)'
                            : cell || boardCellBg
                        }
                        border={cell === 'ghost' ? '1px dashed rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'}
                        borderRadius="2px"
                      />
                    </GridItem>
                  ))
                )}
              </Grid>
            </CardBody>
          </Card>

          {/* Side Panel */}
          <VStack spacing={4} minW="200px">
            {/* Stats */}
            <Card bg={cardBg} w="full">
              <CardHeader pb={2}>
                <Heading size="md">Stats</Heading>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={3} align="stretch">
                  <Stat>
                    <StatLabel>Score</StatLabel>
                    <StatNumber fontSize="lg">{gameStats.score.toLocaleString()}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Lines</StatLabel>
                    <StatNumber fontSize="lg">{gameStats.lines}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Level</StatLabel>
                    <StatNumber fontSize="lg">{gameStats.level}</StatNumber>
                  </Stat>
                  {gameMode === 'timer' && (
                    <Stat>
                      <StatLabel>Time Left</StatLabel>
                      <StatNumber fontSize="lg" color={gameStats.timeLeft! < 10 ? 'red.500' : 'inherit'}>
                        {gameStats.timeLeft}s
                      </StatNumber>
                      <Progress 
                        value={(gameStats.timeLeft! / INITIAL_TIMER) * 100} 
                        colorScheme={gameStats.timeLeft! < 10 ? 'red' : 'blue'}
                        size="sm"
                        mt={1}
                      />
                    </Stat>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Next Piece Preview */}
            {nextPiece && gameMode !== 'hardcore' && (
              <Card bg={cardBg} w="full">
                <CardHeader pb={2}>
                  <Heading size="md">Next</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <Grid 
                    templateColumns="repeat(4, 1fr)" 
                    gap={1} 
                    justifyItems="center"
                    minH="100px"
                    alignItems="center"
                  >
                    {Array(4).fill(null).map((_, y) =>
                      Array(4).fill(null).map((_, x) => {
                        const isPartOfPiece = nextPiece.shape[y] && nextPiece.shape[y][x];
                        return (
                          <GridItem key={`${y}-${x}`}>
                            <Box
                              w="20px"
                              h="20px"
                              bg={isPartOfPiece ? nextPiece.color : 'transparent'}
                              border={isPartOfPiece ? '1px solid rgba(255, 255, 255, 0.3)' : 'none'}
                              borderRadius="2px"
                            />
                          </GridItem>
                        );
                      })
                    )}
                  </Grid>
                </CardBody>
              </Card>
            )}

            {/* Controls */}
            <Card bg={cardBg} w="full">
              <CardHeader pb={2}>
                <Heading size="md">Controls</Heading>
              </CardHeader>
              <CardBody pt={0}>
                <VStack spacing={1} align="start" fontSize="sm">
                  <Text>← → Move</Text>
                  <Text>↓ Soft drop</Text>
                  <Text>↑ / Space: Rotate</Text>
                  <Text>Enter: Hard drop</Text>
                  <Text>ESC: Pause</Text>
                </VStack>
              </CardBody>
            </Card>

            {/* Mobile Controls */}
            <VStack spacing={2} w="full" display={{ base: 'flex', md: 'none' }}>
              <HStack spacing={2}>
                <Button size="sm" onClick={moveLeft} disabled={gameState !== 'playing'}>←</Button>
                <Button size="sm" onClick={moveDown} disabled={gameState !== 'playing'}>↓</Button>
                <Button size="sm" onClick={moveRight} disabled={gameState !== 'playing'}>→</Button>
              </HStack>
              <HStack spacing={2}>
                <Button size="sm" onClick={rotatePieceClockwise} disabled={gameState !== 'playing'}>Rotate</Button>
                <Button size="sm" onClick={hardDrop} disabled={gameState !== 'playing'}>Drop</Button>
              </HStack>
            </VStack>
          </VStack>
        </Flex>

        {/* Game Instructions */}
        <Text fontSize="sm" color="gray.500" textAlign="center" maxW="2xl">
          {gameMode === 'classic' && 'Clear horizontal lines by filling them completely. Game gets faster as you progress!'}
          {gameMode === 'timer' && 'Race against time! You start with 60 seconds and gain 8 seconds for each line cleared.'}
          {gameMode === 'hardcore' && 'No next piece preview - rely on your skills and pattern recognition!'}
          {gameMode === 'easy' && 'Ghost piece shows where your piece will land for easier planning.'}
        </Text>
      </VStack>
    </Box>
  );
};

export default Tetris;