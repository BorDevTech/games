"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
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
  useToast,
  Center
} from '@chakra-ui/react';
import { FaPlay, FaPause, FaRocket, FaStar } from 'react-icons/fa';

// Game types and interfaces
type GameState = 'setup' | 'playing' | 'paused' | 'gameOver';
type PlayerMode = 'single' | 'alternating' | 'simultaneous';

interface Position {
  x: number;
  y: number;
}

interface GameObject {
  id: string;
  position: Position;
  width: number;
  height: number;
  active: boolean;
}

interface Player extends GameObject {
  lives: number;
  score: number;
  playerId: 1 | 2;
  canShoot: boolean;
  lastShot: number;
}

interface Enemy extends GameObject {
  type: 'galaga' | 'bee' | 'butterfly';
  formationX: number;
  formationY: number;
  isDiving: boolean;
  health: number;
  points: number;
  lastShot: number;
  movingDown: boolean;
}

interface Bullet extends GameObject {
  velocity: Position;
  owner: 'player1' | 'player2' | 'enemy';
}

interface GameResult {
  player1Score: number;
  player2Score: number;
  winner: 'player1' | 'player2' | 'draw' | null;
  mode: PlayerMode;
  timestamp: Date;
}

const Galaga: React.FC = () => {
  // Game configuration
  const GAME_WIDTH = 600;
  const GAME_HEIGHT = 800;
  const PLAYER_SPEED = 5;
  const BULLET_SPEED = 8;
  const ENEMY_ROWS = 5;
  const ENEMY_COLS = 10;
  const SHOOT_COOLDOWN = 150; // ms
  const ENEMY_SHOOT_COOLDOWN = 2000; // ms
  const ENEMY_MOVE_DOWN_SPEED = 0.5;

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [playerMode, setPlayerMode] = useState<PlayerMode>('single');
  
  // Game objects
  const [players, setPlayers] = useState<Player[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [wave, setWave] = useState(1);
  const [waveCompleteToastShown, setWaveCompleteToastShown] = useState(false);

  // UI state
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  // Theme colors
  const gameAreaBg = useColorModeValue('gray.900', 'black');
  const playerColor = useColorModeValue('cyan.300', 'cyan.400');

  // Create enemy formation
  const createEnemyFormation = useCallback((): Enemy[] => {
    const newEnemies: Enemy[] = [];
    const startX = 50;
    const startY = 100;
    const spacingX = 50;
    const spacingY = 40;

    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;
        
        let type: Enemy['type'] = 'bee';
        let health = 1;
        let points = 50;
        
        if (row === 0) {
          type = 'galaga';
          health = 2;
          points = 150;
        } else if (row === 1 || row === 2) {
          type = 'butterfly';
          points = 80;
        }

        newEnemies.push({
          id: `enemy-${row}-${col}`,
          position: { x, y },
          width: 30,
          height: 30,
          active: true,
          type,
          formationX: x,
          formationY: y,
          isDiving: false,
          health,
          points,
          lastShot: 0,
          movingDown: false
        });
      }
    }

    return newEnemies;
  }, [ENEMY_ROWS, ENEMY_COLS]);

  // Initialize game
  const initializeGame = useCallback(() => {
    const newPlayers: Player[] = [];
    
    if (playerMode === 'single' || playerMode === 'alternating') {
      newPlayers.push({
        id: 'player1',
        position: { x: GAME_WIDTH / 2 - 15, y: GAME_HEIGHT - 60 },
        width: 30,
        height: 40,
        active: true,
        lives: 3,
        score: 0,
        playerId: 1,
        canShoot: true,
        lastShot: 0
      });
    } else {
      // Simultaneous mode - two players
      newPlayers.push(
        {
          id: 'player1',
          position: { x: GAME_WIDTH / 3 - 15, y: GAME_HEIGHT - 60 },
          width: 30,
          height: 40,
          active: true,
          lives: 3,
          score: 0,
          playerId: 1,
          canShoot: true,
          lastShot: 0
        },
        {
          id: 'player2',
          position: { x: (2 * GAME_WIDTH) / 3 - 15, y: GAME_HEIGHT - 60 },
          width: 30,
          height: 40,
          active: true,
          lives: 3,
          score: 0,
          playerId: 2,
          canShoot: true,
          lastShot: 0
        }
      );
    }

    setPlayers(newPlayers);
    setEnemies(createEnemyFormation());
    setBullets([]);
    setWave(1);
    setWaveCompleteToastShown(false);
  }, [playerMode, GAME_WIDTH, GAME_HEIGHT, createEnemyFormation]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Process input and update players
  const processInput = useCallback(() => {
    if (gameState !== 'playing') return;

    setPlayers(prevPlayers => {
      return prevPlayers.map(player => {
        if (!player.active) return player;

        let newX = player.position.x;
        let canShoot = player.canShoot;
        const now = Date.now();

        // Player 1 controls: A/D for movement, W for shooting
        if (player.playerId === 1) {
          if (keysRef.current.has('a') && newX > 0) {
            newX -= PLAYER_SPEED;
          }
          if (keysRef.current.has('d') && newX < GAME_WIDTH - player.width) {
            newX += PLAYER_SPEED;
          }
          if (keysRef.current.has('w') && player.canShoot && now - player.lastShot > SHOOT_COOLDOWN) {
            setBullets(prev => [...prev, {
              id: `bullet-${now}-${player.playerId}`,
              position: { x: newX + player.width / 2 - 2, y: player.position.y },
              width: 4,
              height: 10,
              active: true,
              velocity: { x: 0, y: -BULLET_SPEED },
              owner: 'player1'
            }]);
            canShoot = false;
            setTimeout(() => {
              setPlayers(p => p.map(pl => 
                pl.id === player.id ? { ...pl, canShoot: true } : pl
              ));
            }, SHOOT_COOLDOWN);
          }
        }

        // Player 2 controls: Arrow keys for movement, Up arrow for shooting
        if (player.playerId === 2 && playerMode === 'simultaneous') {
          if (keysRef.current.has('arrowleft') && newX > 0) {
            newX -= PLAYER_SPEED;
          }
          if (keysRef.current.has('arrowright') && newX < GAME_WIDTH - player.width) {
            newX += PLAYER_SPEED;
          }
          if (keysRef.current.has('arrowup') && player.canShoot && now - player.lastShot > SHOOT_COOLDOWN) {
            setBullets(prev => [...prev, {
              id: `bullet-${now}-${player.playerId}`,
              position: { x: newX + player.width / 2 - 2, y: player.position.y },
              width: 4,
              height: 10,
              active: true,
              velocity: { x: 0, y: -BULLET_SPEED },
              owner: 'player2'
            }]);
            canShoot = false;
            setTimeout(() => {
              setPlayers(p => p.map(pl => 
                pl.id === player.id ? { ...pl, canShoot: true } : pl
              ));
            }, SHOOT_COOLDOWN);
          }
        }

        return {
          ...player,
          position: { ...player.position, x: newX },
          canShoot,
          lastShot: !canShoot ? now : player.lastShot
        };
      });
    });
  }, [gameState, playerMode, PLAYER_SPEED, BULLET_SPEED, GAME_WIDTH, SHOOT_COOLDOWN]);

  // Update bullets
  const updateBullets = useCallback(() => {
    setBullets(prevBullets => {
      return prevBullets
        .map(bullet => ({
          ...bullet,
          position: {
            x: bullet.position.x + bullet.velocity.x,
            y: bullet.position.y + bullet.velocity.y
          }
        }))
        .filter(bullet => 
          bullet.active && 
          bullet.position.y > -10 && 
          bullet.position.y < GAME_HEIGHT + 10
        );
    });
  }, [GAME_HEIGHT]);

  // Update enemies - movement and shooting
  const updateEnemies = useCallback(() => {
    const now = Date.now();
    
    setEnemies(prevEnemies => {
      return prevEnemies.map(enemy => {
        if (!enemy.active) return enemy;
        
        let newY = enemy.position.y;
        let newMovingDown = enemy.movingDown;
        
        // Start moving down after some time in wave
        if (wave > 1 || now > 10000) { // Move down after 10 seconds or in later waves
          newMovingDown = true;
          newY += ENEMY_MOVE_DOWN_SPEED;
        }
        
        // Enemy shooting logic - random chance for enemies to shoot
        if (now - enemy.lastShot > ENEMY_SHOOT_COOLDOWN && Math.random() < 0.0005) {
          setBullets(prev => [...prev, {
            id: `enemy-bullet-${now}-${enemy.id}`,
            position: { x: enemy.position.x + enemy.width / 2 - 2, y: enemy.position.y + enemy.height },
            width: 4,
            height: 10,
            active: true,
            velocity: { x: 0, y: BULLET_SPEED },
            owner: 'enemy'
          }]);
          
          return {
            ...enemy,
            position: { ...enemy.position, y: newY },
            movingDown: newMovingDown,
            lastShot: now
          };
        }
        
        return {
          ...enemy,
          position: { ...enemy.position, y: newY },
          movingDown: newMovingDown
        };
      });
    });
  }, [wave, ENEMY_MOVE_DOWN_SPEED, ENEMY_SHOOT_COOLDOWN, BULLET_SPEED]);

  // Check collisions
  const checkCollisions = useCallback(() => {
    setBullets(prevBullets => {
      const bulletsToKeep = [...prevBullets];
      
      setEnemies(prevEnemies => {
        const enemiesToKeep = [...prevEnemies];
        
        setPlayers(prevPlayers => {
          return prevPlayers.map(player => {
            let newScore = player.score;
            let newLives = player.lives;
            
            // Check player bullets hitting enemies
            bulletsToKeep.forEach(bullet => {
              if ((bullet.owner === 'player1' && player.playerId === 1) ||
                  (bullet.owner === 'player2' && player.playerId === 2)) {
                enemiesToKeep.forEach(enemy => {
                  if (enemy.active && bullet.active &&
                      bullet.position.x < enemy.position.x + enemy.width &&
                      bullet.position.x + bullet.width > enemy.position.x &&
                      bullet.position.y < enemy.position.y + enemy.height &&
                      bullet.position.y + bullet.height > enemy.position.y) {
                    
                    // Hit detected
                    bullet.active = false;
                    enemy.health -= 1;
                    
                    if (enemy.health <= 0) {
                      enemy.active = false;
                      newScore += enemy.points;
                    }
                  }
                });
              }
            });
            
            // Check enemy bullets hitting players
            bulletsToKeep.forEach(bullet => {
              if (bullet.owner === 'enemy' && bullet.active &&
                  bullet.position.x < player.position.x + player.width &&
                  bullet.position.x + bullet.width > player.position.x &&
                  bullet.position.y < player.position.y + player.height &&
                  bullet.position.y + bullet.height > player.position.y) {
                
                // Player hit by enemy bullet
                bullet.active = false;
                newLives -= 1;
              }
            });
            
            // Check if enemies reached player level
            enemiesToKeep.forEach(enemy => {
              if (enemy.active && 
                  enemy.position.y + enemy.height >= player.position.y) {
                // Enemy reached player - game over
                newLives = 0;
              }
            });
            
            return { ...player, score: newScore, lives: newLives };
          });
        });
        
        return enemiesToKeep;
      });
      
      return bulletsToKeep.filter(bullet => bullet.active);
    });
  }, []);

  // Save game result
  const saveGameResult = useCallback(() => {
    const result: GameResult = {
      player1Score: players[0]?.score || 0,
      player2Score: players[1]?.score || 0,
      winner: players[0]?.score > (players[1]?.score || 0) ? 'player1' : 
              players[1]?.score > players[0]?.score ? 'player2' : 'draw',
      mode: playerMode,
      timestamp: new Date()
    };

    const existingResults = JSON.parse(localStorage.getItem('galagaResults') || '[]');
    existingResults.push(result);
    localStorage.setItem('galagaResults', JSON.stringify(existingResults));

    toast({
      title: 'Game Over!',
      description: `Final Score - Player 1: ${result.player1Score}${
        playerMode !== 'single' ? `, Player 2: ${result.player2Score}` : ''
      }`,
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  }, [players, playerMode, toast]);

  // Game loop
  const gameLoop = useCallback(() => {
    processInput();
    updateBullets();
    updateEnemies();
    checkCollisions();
    
    // Check win condition
    setEnemies(prevEnemies => {
      const activeEnemies = prevEnemies.filter(enemy => enemy.active);
      if (activeEnemies.length === 0 && !waveCompleteToastShown) {
        // Wave completed
        setWaveCompleteToastShown(true);
        toast({
          title: `Wave ${wave} Complete!`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        
        // Create new wave
        setTimeout(() => {
          setWave(prev => prev + 1);
          setEnemies(createEnemyFormation());
          setWaveCompleteToastShown(false);
        }, 2000);
      }
      return prevEnemies;
    });
    
    // Check game over
    setPlayers(prevPlayers => {
      const alivePlayers = prevPlayers.filter(player => player.lives > 0);
      if (alivePlayers.length === 0) {
        setGameState('gameOver');
        setTimeout(() => {
          saveGameResult();
        }, 100);
      }
      return prevPlayers;
    });
  }, [processInput, updateBullets, updateEnemies, checkCollisions, wave, waveCompleteToastShown, toast, createEnemyFormation, saveGameResult]);

  // Start/stop game loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(gameLoop, 1000 / 60); // 60 FPS
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
  }, [gameState, gameLoop]);

  // Start game
  const startGame = () => {
    initializeGame();
    setGameState('playing');
    onClose();
  };

  // Pause/Resume game
  const togglePause = () => {
    setGameState(gameState === 'playing' ? 'paused' : 'playing');
  };

  // Reset game
  const resetGame = () => {
    setGameState('setup');
    setPlayers([]);
    setEnemies([]);
    setBullets([]);
    onOpen();
  };

  return (
    <VStack spacing={6} w="full">
      <HStack justify="space-between" w="full" wrap="wrap">
        <VStack align="start" spacing={2}>
          <HStack>
            <FaRocket color={playerColor} />
            <Heading size="lg">Galaga</Heading>
            <Badge colorScheme="purple" variant="solid">
              Wave {wave}
            </Badge>
          </HStack>
          <Text fontSize="sm" color="gray.500">
            Classic arcade action! Destroy the alien formations!
          </Text>
        </VStack>

        <HStack spacing={3}>
          {gameState === 'setup' && (
            <Button colorScheme="blue" leftIcon={<FaPlay />} onClick={onOpen}>
              Start Game
            </Button>
          )}
          {gameState === 'playing' && (
            <Button colorScheme="yellow" leftIcon={<FaPause />} onClick={togglePause}>
              Pause
            </Button>
          )}
          {gameState === 'paused' && (
            <Button colorScheme="green" leftIcon={<FaPlay />} onClick={togglePause}>
              Resume
            </Button>
          )}
          {(gameState === 'gameOver' || gameState === 'paused') && (
            <Button variant="outline" onClick={resetGame}>
              New Game
            </Button>
          )}
        </HStack>
      </HStack>

      {/* Player scores and stats */}
      {players.length > 0 && (
        <HStack spacing={8} w="full" justify="center">
          {players.map((player) => (
            <VStack key={player.id} spacing={1}>
              <Text fontWeight="bold" color={player.playerId === 1 ? 'cyan.400' : 'orange.400'}>
                Player {player.playerId}
              </Text>
              <HStack>
                <FaStar color="gold" />
                <Text>{player.score}</Text>
              </HStack>
              <HStack>
                <Text fontSize="sm">Lives:</Text>
                <Text fontSize="sm">{player.lives}</Text>
              </HStack>
            </VStack>
          ))}
        </HStack>
      )}

      {/* Game area */}
      <Box
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        bg={gameAreaBg}
        position="relative"
        border="2px solid"
        borderColor="gray.600"
        borderRadius="md"
        overflow="hidden"
      >
        {/* Game state overlay */}
        {gameState === 'setup' && (
          <Center h="full">
            <VStack spacing={4}>
              <FaRocket size="4rem" color={playerColor} />
              <Text fontSize="xl" color="white">Ready to defend Earth?</Text>
              <Button colorScheme="blue" onClick={onOpen}>
                Configure Game
              </Button>
            </VStack>
          </Center>
        )}

        {gameState === 'paused' && (
          <Center h="full" position="absolute" top={0} left={0} right={0} bottom={0} bg="blackAlpha.700" zIndex={10}>
            <VStack spacing={4}>
              <Text fontSize="2xl" color="white">PAUSED</Text>
              <Button colorScheme="green" onClick={togglePause}>
                Resume Game
              </Button>
            </VStack>
          </Center>
        )}

        {gameState === 'gameOver' && (
          <Center h="full" position="absolute" top={0} left={0} right={0} bottom={0} bg="blackAlpha.800" zIndex={10}>
            <VStack spacing={4}>
              <Text fontSize="2xl" color="red.400">GAME OVER</Text>
              <Text color="white">
                Final Score: {players[0]?.score || 0}
                {playerMode !== 'single' && ` | ${players[1]?.score || 0}`}
              </Text>
              <Button colorScheme="blue" onClick={resetGame}>
                Play Again
              </Button>
            </VStack>
          </Center>
        )}

        {/* Render players */}
        {players.map(player => (
          <Box
            key={player.id}
            position="absolute"
            left={`${player.position.x}px`}
            top={`${player.position.y}px`}
            width={`${player.width}px`}
            height={`${player.height}px`}
            bg={player.playerId === 1 ? 'cyan.400' : 'orange.400'}
            borderRadius="sm"
            clipPath="polygon(50% 0%, 0% 100%, 100% 100%)"
          />
        ))}

        {/* Render enemies */}
        {enemies.filter(enemy => enemy.active).map(enemy => (
          <Box
            key={enemy.id}
            position="absolute"
            left={`${enemy.position.x}px`}
            top={`${enemy.position.y}px`}
            width={`${enemy.width}px`}
            height={`${enemy.height}px`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="24px"
          >
            {enemy.type === 'galaga' ? '👾' : enemy.type === 'butterfly' ? '🛸' : '🤖'}
          </Box>
        ))}

        {/* Render bullets */}
        {bullets.map(bullet => (
          <Box
            key={bullet.id}
            position="absolute"
            left={`${bullet.position.x}px`}
            top={`${bullet.position.y}px`}
            width={`${bullet.width}px`}
            height={`${bullet.height}px`}
            bg={bullet.owner.includes('player') ? 'white' : 'red.400'}
            borderRadius="sm"
          />
        ))}
      </Box>

      {/* Controls help */}
      <VStack spacing={2} fontSize="sm" color="gray.500" textAlign="center">
        <Text fontWeight="bold">Controls:</Text>
        {playerMode === 'single' || playerMode === 'alternating' ? (
          <Text>A/D to move, W to shoot</Text>
        ) : (
          <VStack spacing={1}>
            <Text>Player 1: A/D to move, W to shoot</Text>
            <Text>Player 2: ←/→ to move, ↑ to shoot</Text>
          </VStack>
        )}
      </VStack>

      {/* Game setup modal */}
      <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <FaRocket color={playerColor} />
              <Text>Configure Galaga</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6}>
              <VStack spacing={3} w="full">
                <Text fontWeight="bold">Game Mode</Text>
                <Select
                  value={playerMode}
                  onChange={(e) => setPlayerMode(e.target.value as PlayerMode)}
                  placeholder="Select game mode"
                >
                  <option value="single">Single Player</option>
                  <option value="alternating">2 Players (Alternating)</option>
                  <option value="simultaneous">2 Players (Simultaneous)</option>
                </Select>
              </VStack>

              <VStack spacing={2} textAlign="center">
                <Text fontSize="sm" color="gray.600">
                  Defend Earth from the Galaga fleet! Destroy all enemies to advance to the next wave.
                </Text>
                {playerMode === 'alternating' && (
                  <Text fontSize="xs" color="orange.500">
                    In alternating mode, players take turns when one loses a life.
                  </Text>
                )}
              </VStack>

              <Button colorScheme="blue" onClick={startGame} w="full" leftIcon={<FaPlay />}>
                Start Mission
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default Galaga;