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
  useToast
} from '@chakra-ui/react';
import { FaPlay, FaPause, FaRocket, FaHeart, FaClock } from 'react-icons/fa';

// Game types and interfaces
type GameState = 'setup' | 'playing' | 'paused' | 'gameOver';
type PlayerMode = 'single' | 'cooperative' | 'versus';
type PowerUpType = 'rapidFire' | 'spreadShot' | 'extraLife' | 'slowTime';

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface GameObject {
  id: string;
  position: Position;
  velocity: Velocity;
  rotation: number;
  active: boolean;
}

interface Ship extends GameObject {
  playerId: 1 | 2;
  lives: number;
  score: number;
  isThrusting: boolean;
  canShoot: boolean;
  lastShot: number;
  invulnerable: boolean;
  invulnerabilityEnd: number;
  // Powerup states
  rapidFireEnd: number;
  spreadShotEnd: number;
  fireRate: number;
}

interface Asteroid extends GameObject {
  size: 'large' | 'medium' | 'small';
  rotationSpeed: number;
  points: number;
}

interface Bullet extends GameObject {
  owner: 'player1' | 'player2';
  lifespan: number;
}

interface PowerUp extends GameObject {
  type: PowerUpType;
  lifespan: number;
}

interface GameResult {
  player1Score: number;
  player2Score: number;
  winner: 'player1' | 'player2' | 'draw' | null;
  mode: PlayerMode;
  timestamp: Date;
}

const Asteroid: React.FC = () => {
  // Game configuration
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  const SHIP_SIZE = 20;
  const SHIP_THRUST = 0.3;
  const SHIP_ROTATION_SPEED = 5;
  const BULLET_SPEED = 8;
  const NORMAL_FIRE_RATE = 200; // ms
  const RAPID_FIRE_RATE = 100; // ms
  const POWERUP_DURATION = 10000; // ms
  const SLOW_TIME_FACTOR = 0.3;
  const INVULNERABILITY_TIME = 2000; // ms

  // Game state
  const [gameState, setGameState] = useState<GameState>('setup');
  const [playerMode, setPlayerMode] = useState<PlayerMode>('cooperative');
  const [slowTimeActive, setSlowTimeActive] = useState(false);
  const [slowTimeEnd, setSlowTimeEnd] = useState(0);
  const [waveCompleting, setWaveCompleting] = useState(false);
  
  // Game objects
  const [ships, setShips] = useState<Ship[]>([]);
  const [asteroids, setAsteroids] = useState<Asteroid[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [wave, setWave] = useState(1);

  // UI state and refs
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  // Color theme
  const bgColor = useColorModeValue('gray.900', 'black');
  const shipColor = useColorModeValue('white', 'cyan.300');
  const bulletColor = useColorModeValue('yellow.300', 'yellow.400');

  // Initialize game objects
  const createShip = useCallback((playerId: 1 | 2): Ship => {
    const startX = playerId === 1 ? GAME_WIDTH * 0.25 : GAME_WIDTH * 0.75;
    const startY = GAME_HEIGHT / 2;
    
    return {
      id: `ship-${playerId}`,
      playerId,
      position: { x: startX, y: startY },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      active: true,
      lives: 3,
      score: 0,
      isThrusting: false,
      canShoot: true,
      lastShot: 0,
      invulnerable: false,
      invulnerabilityEnd: 0,
      rapidFireEnd: 0,
      spreadShotEnd: 0,
      fireRate: NORMAL_FIRE_RATE
    };
  }, []);

  const createAsteroid = useCallback((x: number, y: number, size: 'large' | 'medium' | 'small', velocityX?: number, velocityY?: number): Asteroid => {
    const pointValues = { large: 20, medium: 50, small: 100 };
    
    return {
      id: `asteroid-${Date.now()}-${Math.random()}`,
      position: { x, y },
      velocity: {
        x: velocityX ?? (Math.random() - 0.5) * 4,
        y: velocityY ?? (Math.random() - 0.5) * 4
      },
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 6,
      size,
      points: pointValues[size],
      active: true
    };
  }, []);

  const createRandomAsteroids = useCallback((count: number): Asteroid[] => {
    const asteroids: Asteroid[] = [];
    
    for (let i = 0; i < count; i++) {
      let x, y;
      // Spawn asteroids away from center where players start
      do {
        x = Math.random() * GAME_WIDTH;
        y = Math.random() * GAME_HEIGHT;
      } while (
        (x > GAME_WIDTH * 0.2 && x < GAME_WIDTH * 0.8 &&
         y > GAME_HEIGHT * 0.3 && y < GAME_HEIGHT * 0.7)
      );
      
      asteroids.push(createAsteroid(x, y, 'large'));
    }
    
    return asteroids;
  }, [createAsteroid]);

  const createPowerUp = useCallback((x: number, y: number): PowerUp => {
    const types: PowerUpType[] = ['rapidFire', 'spreadShot', 'extraLife', 'slowTime'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return {
      id: `powerup-${Date.now()}-${Math.random()}`,
      position: { x, y },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      type,
      lifespan: 15000, // 15 seconds
      active: true
    };
  }, []);

  // Game initialization
  const initializeGame = useCallback(() => {
    const newShips = playerMode === 'single' ? [createShip(1)] : [createShip(1), createShip(2)];
    const initialAsteroids = createRandomAsteroids(4 + wave);
    
    setShips(newShips);
    setAsteroids(initialAsteroids);
    setBullets([]);
    setPowerUps([]);
    setSlowTimeActive(false);
    setSlowTimeEnd(0);
    setWaveCompleting(false);
  }, [playerMode, wave, createShip, createRandomAsteroids]);

  // Input handling
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    keysPressed.current.add(event.code);
  }, []);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    keysPressed.current.delete(event.code);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [gameState, handleKeyDown, handleKeyUp]);

  // Ship movement and shooting
  const updateShips = useCallback(() => {
    const currentTime = Date.now();
    const timeMultiplier = slowTimeActive ? SLOW_TIME_FACTOR : 1;
    
    setShips(prevShips => 
      prevShips.map(ship => {
        if (!ship.active) return ship;
        
        const newShip = { ...ship };
        const keys = keysPressed.current;
        
        // Player 1 controls: WASD + Space
        if (ship.playerId === 1) {
          if (keys.has('KeyA')) {
            newShip.rotation -= SHIP_ROTATION_SPEED * timeMultiplier;
          }
          if (keys.has('KeyD')) {
            newShip.rotation += SHIP_ROTATION_SPEED * timeMultiplier;
          }
          if (keys.has('KeyW')) {
            newShip.isThrusting = true;
            const angle = (newShip.rotation - 90) * Math.PI / 180;
            newShip.velocity.x += Math.cos(angle) * SHIP_THRUST * timeMultiplier;
            newShip.velocity.y += Math.sin(angle) * SHIP_THRUST * timeMultiplier;
          } else {
            newShip.isThrusting = false;
          }
          if (keys.has('Space') && newShip.canShoot && currentTime - newShip.lastShot > newShip.fireRate) {
            // Shoot bullets
            const angle = (newShip.rotation - 90) * Math.PI / 180;
            const bulletStart = {
              x: newShip.position.x + Math.cos(angle) * SHIP_SIZE,
              y: newShip.position.y + Math.sin(angle) * SHIP_SIZE
            };
            
            const newBullets: Bullet[] = [];
            
            if (currentTime < newShip.spreadShotEnd) {
              // Spread shot - 3 bullets
              for (let i = -1; i <= 1; i++) {
                const spreadAngle = angle + (i * Math.PI / 12); // 15 degrees spread
                newBullets.push({
                  id: `bullet-${Date.now()}-${i}`,
                  position: { ...bulletStart },
                  velocity: {
                    x: Math.cos(spreadAngle) * BULLET_SPEED,
                    y: Math.sin(spreadAngle) * BULLET_SPEED
                  },
                  rotation: 0,
                  owner: `player${ship.playerId}` as 'player1' | 'player2',
                  lifespan: 2000,
                  active: true
                });
              }
            } else {
              // Normal shot
              newBullets.push({
                id: `bullet-${Date.now()}`,
                position: { ...bulletStart },
                velocity: {
                  x: Math.cos(angle) * BULLET_SPEED,
                  y: Math.sin(angle) * BULLET_SPEED
                },
                rotation: 0,
                owner: `player${ship.playerId}` as 'player1' | 'player2',
                lifespan: 2000,
                active: true
              });
            }
            
            setBullets(prevBullets => [...prevBullets, ...newBullets]);
            newShip.lastShot = currentTime;
          }
        }
        
        // Player 2 controls: Arrow keys + Enter
        if (ship.playerId === 2) {
          if (keys.has('ArrowLeft')) {
            newShip.rotation -= SHIP_ROTATION_SPEED * timeMultiplier;
          }
          if (keys.has('ArrowRight')) {
            newShip.rotation += SHIP_ROTATION_SPEED * timeMultiplier;
          }
          if (keys.has('ArrowUp')) {
            newShip.isThrusting = true;
            const angle = (newShip.rotation - 90) * Math.PI / 180;
            newShip.velocity.x += Math.cos(angle) * SHIP_THRUST * timeMultiplier;
            newShip.velocity.y += Math.sin(angle) * SHIP_THRUST * timeMultiplier;
          } else {
            newShip.isThrusting = false;
          }
          if (keys.has('Enter') && newShip.canShoot && currentTime - newShip.lastShot > newShip.fireRate) {
            // Similar shooting logic for player 2
            const angle = (newShip.rotation - 90) * Math.PI / 180;
            const bulletStart = {
              x: newShip.position.x + Math.cos(angle) * SHIP_SIZE,
              y: newShip.position.y + Math.sin(angle) * SHIP_SIZE
            };
            
            const newBullets: Bullet[] = [];
            
            if (currentTime < newShip.spreadShotEnd) {
              for (let i = -1; i <= 1; i++) {
                const spreadAngle = angle + (i * Math.PI / 12);
                newBullets.push({
                  id: `bullet-${Date.now()}-${i}`,
                  position: { ...bulletStart },
                  velocity: {
                    x: Math.cos(spreadAngle) * BULLET_SPEED,
                    y: Math.sin(spreadAngle) * BULLET_SPEED
                  },
                  rotation: 0,
                  owner: `player${ship.playerId}` as 'player1' | 'player2',
                  lifespan: 2000,
                  active: true
                });
              }
            } else {
              newBullets.push({
                id: `bullet-${Date.now()}`,
                position: { ...bulletStart },
                velocity: {
                  x: Math.cos(angle) * BULLET_SPEED,
                  y: Math.sin(angle) * BULLET_SPEED
                },
                rotation: 0,
                owner: `player${ship.playerId}` as 'player1' | 'player2',
                lifespan: 2000,
                active: true
              });
            }
            
            setBullets(prevBullets => [...prevBullets, ...newBullets]);
            newShip.lastShot = currentTime;
          }
        }
        
        // Apply velocity with friction
        newShip.velocity.x *= 0.98;
        newShip.velocity.y *= 0.98;
        
        // Update position
        newShip.position.x += newShip.velocity.x * timeMultiplier;
        newShip.position.y += newShip.velocity.y * timeMultiplier;
        
        // Wrap around screen
        if (newShip.position.x < 0) newShip.position.x = GAME_WIDTH;
        if (newShip.position.x > GAME_WIDTH) newShip.position.x = 0;
        if (newShip.position.y < 0) newShip.position.y = GAME_HEIGHT;
        if (newShip.position.y > GAME_HEIGHT) newShip.position.y = 0;
        
        // Update powerup states
        if (currentTime < newShip.rapidFireEnd) {
          newShip.fireRate = RAPID_FIRE_RATE;
        } else {
          newShip.fireRate = NORMAL_FIRE_RATE;
        }
        
        // Update invulnerability
        if (currentTime > newShip.invulnerabilityEnd) {
          newShip.invulnerable = false;
        }
        
        return newShip;
      })
    );
  }, [slowTimeActive]);

  // Update game objects
  const updateGameObjects = useCallback(() => {
    const currentTime = Date.now();
    const timeMultiplier = slowTimeActive ? SLOW_TIME_FACTOR : 1;
    
    // Update asteroids
    setAsteroids(prevAsteroids =>
      prevAsteroids.filter(asteroid => asteroid.active).map(asteroid => {
        const newAsteroid = { ...asteroid };
        
        // Update position
        newAsteroid.position.x += newAsteroid.velocity.x * timeMultiplier;
        newAsteroid.position.y += newAsteroid.velocity.y * timeMultiplier;
        newAsteroid.rotation += newAsteroid.rotationSpeed * timeMultiplier;
        
        // Wrap around screen
        if (newAsteroid.position.x < -50) newAsteroid.position.x = GAME_WIDTH + 50;
        if (newAsteroid.position.x > GAME_WIDTH + 50) newAsteroid.position.x = -50;
        if (newAsteroid.position.y < -50) newAsteroid.position.y = GAME_HEIGHT + 50;
        if (newAsteroid.position.y > GAME_HEIGHT + 50) newAsteroid.position.y = -50;
        
        return newAsteroid;
      })
    );
    
    // Update bullets
    setBullets(prevBullets =>
      prevBullets.filter(bullet => {
        if (!bullet.active) return false;
        
        bullet.position.x += bullet.velocity.x * timeMultiplier;
        bullet.position.y += bullet.velocity.y * timeMultiplier;
        bullet.lifespan -= 16 * timeMultiplier; // Assuming 60 FPS
        
        // Remove if out of bounds or expired
        if (bullet.position.x < 0 || bullet.position.x > GAME_WIDTH ||
            bullet.position.y < 0 || bullet.position.y > GAME_HEIGHT ||
            bullet.lifespan <= 0) {
          return false;
        }
        
        return true;
      })
    );
    
    // Update powerups
    setPowerUps(prevPowerUps =>
      prevPowerUps.filter(powerUp => {
        if (!powerUp.active) return false;
        
        powerUp.lifespan -= 16 * timeMultiplier;
        powerUp.rotation += 2 * timeMultiplier; // Rotate for visibility
        
        return powerUp.lifespan > 0;
      })
    );
    
    // Update slow time
    if (slowTimeActive && currentTime > slowTimeEnd) {
      setSlowTimeActive(false);
    }
  }, [slowTimeActive, slowTimeEnd]);

  // Collision detection
  const checkCollisions = useCallback(() => {
    const currentTime = Date.now();
    
    // Performance optimization: limit collision checks if too many objects
    const totalObjects = asteroids.length + bullets.length + powerUps.length;
    const performanceMode = totalObjects > 50;
    
    // Helper function for circle collision
    const circleCollision = (obj1: GameObject, obj2: GameObject, radius1: number, radius2: number) => {
      const dx = obj1.position.x - obj2.position.x;
      const dy = obj1.position.y - obj2.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < radius1 + radius2;
    };
    
    // Ship-asteroid collisions
    setShips(prevShips => 
      prevShips.map(ship => {
        if (!ship.active || ship.invulnerable) return ship;
        
        const newShip = { ...ship };
        
        setAsteroids(prevAsteroids => {
          const collided = prevAsteroids.find(asteroid => 
            asteroid.active && circleCollision(ship, asteroid, SHIP_SIZE, getAsteroidSize(asteroid.size))
          );
          
          if (collided) {
            newShip.lives -= 1;
            newShip.invulnerable = true;
            newShip.invulnerabilityEnd = currentTime + INVULNERABILITY_TIME;
            
            // Destroy the asteroid
            collided.active = false;
            
            if (newShip.lives <= 0) {
              newShip.active = false;
            }
          }
          
          return prevAsteroids;
        });
        
        return newShip;
      })
    );
    
    // Bullet-asteroid collisions (optimized for performance)
    const activeBullets = bullets.filter(bullet => bullet.active);
    const activeAsteroids = asteroids.filter(asteroid => asteroid.active);
    
    // Performance optimization: batch process collisions
    const collisionPairs: { bullet: Bullet; asteroid: Asteroid }[] = [];
    
    for (const bullet of activeBullets) {
      for (const asteroid of activeAsteroids) {
        if (circleCollision(bullet, asteroid, 2, getAsteroidSize(asteroid.size))) {
          collisionPairs.push({ bullet, asteroid });
          break; // Each bullet can only hit one asteroid
        }
      }
    }
    
    // Process all collisions at once
    if (collisionPairs.length > 0) {
      const bulletsToRemove = new Set<string>();
      const asteroidsToRemove = new Set<string>();
      const newAsteroids: Asteroid[] = [];
      const newPowerUps: PowerUp[] = [];
      const scoreUpdates: { playerId: string; points: number }[] = [];
      
      for (const { bullet, asteroid } of collisionPairs) {
        bulletsToRemove.add(bullet.id);
        asteroidsToRemove.add(asteroid.id);
        
        // Track score update
        scoreUpdates.push({
          playerId: bullet.owner.slice(-1),
          points: asteroid.points
        });
        
        // Split asteroid if large or medium
        if (asteroid.size === 'large') {
          newAsteroids.push(
            createAsteroid(asteroid.position.x, asteroid.position.y, 'medium', -2, -1),
            createAsteroid(asteroid.position.x, asteroid.position.y, 'medium', 2, 1)
          );
        } else if (asteroid.size === 'medium') {
          newAsteroids.push(
            createAsteroid(asteroid.position.x, asteroid.position.y, 'small', -1.5, -0.5),
            createAsteroid(asteroid.position.x, asteroid.position.y, 'small', 1.5, 0.5)
          );
        }
        
        // Chance to drop powerup (reduced chance in performance mode)
        const powerUpChance = performanceMode ? 0.08 : 0.15;
        if (Math.random() < powerUpChance) {
          newPowerUps.push(createPowerUp(asteroid.position.x, asteroid.position.y));
        }
      }
      
      // Apply all changes at once
      setBullets(prevBullets => 
        prevBullets.filter(bullet => !bulletsToRemove.has(bullet.id))
      );
      
      setAsteroids(prevAsteroids => [
        ...prevAsteroids.filter(asteroid => !asteroidsToRemove.has(asteroid.id)),
        ...newAsteroids
      ]);
      
      setPowerUps(prevPowerUps => [...prevPowerUps, ...newPowerUps]);
      
      // Update scores
      if (scoreUpdates.length > 0) {
        setShips(prevShips => 
          prevShips.map(ship => {
            const totalPoints = scoreUpdates
              .filter(update => update.playerId === ship.playerId.toString())
              .reduce((sum, update) => sum + update.points, 0);
            
            if (totalPoints > 0) {
              return { ...ship, score: ship.score + totalPoints };
            }
            return ship;
          })
        );
      }
    }
    
    // Ship-powerup collisions
    setShips(prevShips => 
      prevShips.map(ship => {
        if (!ship.active) return ship;
        
        const newShip = { ...ship };
        
        setPowerUps(prevPowerUps => 
          prevPowerUps.filter(powerUp => {
            if (!powerUp.active) return true;
            
            if (circleCollision(ship, powerUp, SHIP_SIZE, 15)) {
              // Apply powerup effect
              const endTime = currentTime + POWERUP_DURATION;
              
              switch (powerUp.type) {
                case 'rapidFire':
                  newShip.rapidFireEnd = endTime;
                  toast({
                    title: `Player ${ship.playerId} got Rapid Fire!`,
                    status: 'info',
                    duration: 2000,
                    isClosable: true,
                  });
                  break;
                case 'spreadShot':
                  newShip.spreadShotEnd = endTime;
                  toast({
                    title: `Player ${ship.playerId} got Spread Shot!`,
                    status: 'info',
                    duration: 2000,
                    isClosable: true,
                  });
                  break;
                case 'extraLife':
                  newShip.lives += 1;
                  toast({
                    title: `Player ${ship.playerId} got Extra Life!`,
                    status: 'success',
                    duration: 2000,
                    isClosable: true,
                  });
                  break;
                case 'slowTime':
                  setSlowTimeActive(true);
                  setSlowTimeEnd(currentTime + POWERUP_DURATION);
                  toast({
                    title: 'Time Slowed!',
                    status: 'warning',
                    duration: 2000,
                    isClosable: true,
                  });
                  break;
              }
              
              return false; // Remove powerup
            }
            
            return true;
          })
        );
        
        return newShip;
      })
    );
  }, [createAsteroid, createPowerUp, toast, asteroids, bullets, powerUps]);

  // Helper function to get asteroid visual size
  const getAsteroidSize = (size: 'large' | 'medium' | 'small') => {
    switch (size) {
      case 'large': return 40;
      case 'medium': return 25;
      case 'small': return 15;
      default: return 20;
    }
  };

  // Save game result
  const saveGameResult = useCallback(() => {
    const result: GameResult = {
      player1Score: ships[0]?.score || 0,
      player2Score: ships[1]?.score || 0,
      winner: playerMode === 'single' ? null :
              ships[0]?.score > (ships[1]?.score || 0) ? 'player1' : 
              ships[1]?.score > ships[0]?.score ? 'player2' : 'draw',
      mode: playerMode,
      timestamp: new Date()
    };

    const existingResults = JSON.parse(localStorage.getItem('asteroidResults') || '[]');
    existingResults.push(result);
    localStorage.setItem('asteroidResults', JSON.stringify(existingResults));

    toast({
      title: 'Game Over!',
      description: `Final Score - Player 1: ${result.player1Score}${
        playerMode !== 'single' ? `, Player 2: ${result.player2Score}` : ''
      }`,
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  }, [ships, playerMode, toast]);

  // Main game loop
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;
    
    updateShips();
    updateGameObjects();
    checkCollisions();
    
    // Check win condition (all asteroids destroyed)
    setAsteroids(prevAsteroids => {
      const activeAsteroids = prevAsteroids.filter(asteroid => asteroid.active);
      if (activeAsteroids.length === 0 && !waveCompleting) {
        // Wave complete - only trigger once
        setWaveCompleting(true);
        
        toast({
          title: `Wave ${wave} Complete!`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Start next wave after a delay
        setTimeout(() => {
          setWave(prev => prev + 1);
          const nextWaveAsteroids = createRandomAsteroids(Math.min(4 + wave, 12)); // Cap at 12 asteroids for performance
          setAsteroids(nextWaveAsteroids);
          setWaveCompleting(false);
        }, 2000);
      }
      return prevAsteroids;
    });
    
    // Check game over (all ships destroyed)
    setShips(prevShips => {
      const activeShips = prevShips.filter(ship => ship.active);
      if (activeShips.length === 0) {
        setGameState('gameOver');
        saveGameResult();
      }
      return prevShips;
    });
  }, [gameState, updateShips, updateGameObjects, checkCollisions, wave, waveCompleting, toast, createRandomAsteroids, saveGameResult]);

  // Game loop effect
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(gameLoop, 16); // ~60 FPS
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    }
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameLoop, gameState]);

  // Game controls
  const startGame = () => {
    initializeGame();
    setGameState('playing');
    onClose();
  };

  const pauseGame = () => {
    setGameState('paused');
  };

  const resumeGame = () => {
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('setup');
    setWave(1);
    setWaveCompleting(false);
    onOpen();
  };

  // Auto-open setup on first load
  useEffect(() => {
    if (gameState === 'setup') {
      onOpen();
    }
  }, [gameState, onOpen]);

  return (
    <VStack spacing={6} align="center" w="full">
      {/* Header */}
      <HStack justify="space-between" w="full" wrap="wrap">
        <HStack spacing={4}>
          <FaRocket color={shipColor} size={24} />
          <Heading size="lg" color={shipColor}>Asteroid</Heading>
          <Badge colorScheme="purple">Wave {wave}</Badge>
          {slowTimeActive && (
            <Badge colorScheme="yellow">
              <HStack spacing={1}>
                <FaClock />
                <Text>Slow Time</Text>
              </HStack>
            </Badge>
          )}
        </HStack>
        
        <HStack spacing={3}>
          {gameState === 'playing' && (
            <Button size="sm" onClick={pauseGame} leftIcon={<FaPause />}>
              Pause
            </Button>
          )}
          {gameState === 'paused' && (
            <Button size="sm" onClick={resumeGame} leftIcon={<FaPlay />}>
              Resume
            </Button>
          )}
          <Button size="sm" onClick={resetGame} variant="outline">
            New Game
          </Button>
        </HStack>
      </HStack>

      {/* Game Stats */}
      <HStack spacing={6} w="full" justify="center" wrap="wrap">
        {ships.map(ship => (
          <VStack key={ship.id} spacing={1} align="center">
            <Text fontWeight="bold" color={ship.playerId === 1 ? 'cyan.400' : 'orange.400'}>
              Player {ship.playerId}
            </Text>
            <Text fontSize="lg" fontWeight="bold">{ship.score.toLocaleString()}</Text>
            <HStack spacing={1}>
              {Array.from({ length: ship.lives }, (_, i) => (
                <FaHeart key={i} color="red" />
              ))}
            </HStack>
            {/* Powerup indicators */}
            <VStack spacing={1}>
              {Date.now() < ship.rapidFireEnd && (
                <Badge colorScheme="red" fontSize="xs">Rapid Fire</Badge>
              )}
              {Date.now() < ship.spreadShotEnd && (
                <Badge colorScheme="orange" fontSize="xs">Spread Shot</Badge>
              )}
            </VStack>
          </VStack>
        ))}
      </HStack>

      {/* Game Area */}
      <Box
        ref={canvasRef}
        width={`${GAME_WIDTH}px`}
        height={`${GAME_HEIGHT}px`}
        bg={bgColor}
        border="2px solid"
        borderColor={shipColor}
        position="relative"
        overflow="hidden"
        tabIndex={0}
        onClick={() => canvasRef.current?.focus()}
        _focus={{ outline: 'none', borderColor: 'cyan.400' }}
      >
        {/* Render ships */}
        {ships.map(ship => (
          <Box
            key={ship.id}
            position="absolute"
            left={`${ship.position.x - SHIP_SIZE/2}px`}
            top={`${ship.position.y - SHIP_SIZE/2}px`}
            width={`${SHIP_SIZE}px`}
            height={`${SHIP_SIZE}px`}
            transform={`rotate(${ship.rotation}deg)`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="20px"
            opacity={ship.invulnerable ? 0.5 : 1}
            color={ship.playerId === 1 ? 'cyan.300' : 'orange.300'}
          >
            🚀
          </Box>
        ))}

        {/* Render asteroids */}
        {asteroids.map(asteroid => (
          <Box
            key={asteroid.id}
            position="absolute"
            left={`${asteroid.position.x - getAsteroidSize(asteroid.size)/2}px`}
            top={`${asteroid.position.y - getAsteroidSize(asteroid.size)/2}px`}
            width={`${getAsteroidSize(asteroid.size)}px`}
            height={`${getAsteroidSize(asteroid.size)}px`}
            transform={`rotate(${asteroid.rotation}deg)`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize={asteroid.size === 'large' ? '32px' : asteroid.size === 'medium' ? '24px' : '16px'}
          >
            🪨
          </Box>
        ))}

        {/* Render bullets */}
        {bullets.map(bullet => (
          <Box
            key={bullet.id}
            position="absolute"
            left={`${bullet.position.x - 2}px`}
            top={`${bullet.position.y - 2}px`}
            width="4px"
            height="4px"
            bg={bulletColor}
            borderRadius="full"
          />
        ))}

        {/* Render powerups */}
        {powerUps.map(powerUp => (
          <Box
            key={powerUp.id}
            position="absolute"
            left={`${powerUp.position.x - 15}px`}
            top={`${powerUp.position.y - 15}px`}
            width="30px"
            height="30px"
            transform={`rotate(${powerUp.rotation}deg)`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="20px"
          >
            {powerUp.type === 'rapidFire' ? '⚡' : 
             powerUp.type === 'spreadShot' ? '💥' :
             powerUp.type === 'extraLife' ? '❤️' : '⏰'}
          </Box>
        ))}

        {/* Slow time overlay */}
        {slowTimeActive && (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="blue.500"
            opacity="0.1"
            pointerEvents="none"
          />
        )}
      </Box>

      {/* Controls help */}
      <VStack spacing={2} fontSize="sm" color="gray.500" textAlign="center">
        <Text fontWeight="bold">Controls:</Text>
        {playerMode === 'single' ? (
          <VStack spacing={1}>
            <Text>A/D to rotate, W to thrust, Space to shoot</Text>
          </VStack>
        ) : (
          <VStack spacing={1}>
            <Text>Player 1: A/D rotate, W thrust, Space shoot</Text>
            <Text>Player 2: ←/→ rotate, ↑ thrust, Enter shoot</Text>
          </VStack>
        )}
        <Text fontSize="xs" color="gray.400">
          Click the game area to focus for keyboard controls
        </Text>
      </VStack>

      {/* Game setup modal */}
      <Modal isOpen={isOpen} onClose={onClose} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack>
              <FaRocket color={shipColor} />
              <Text>Configure Asteroid</Text>
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
                  <option value="cooperative">2 Players (Cooperative)</option>
                  <option value="versus">2 Players (Versus)</option>
                </Select>
              </VStack>

              <VStack spacing={2} textAlign="center">
                <Text fontSize="sm" color="gray.600">
                  Navigate asteroid fields and collect powerups! Shoot asteroids to break them down and earn points.
                </Text>
                <Text fontSize="xs" color="blue.500">
                  Powerups: ⚡ Rapid Fire, 💥 Spread Shot, ❤️ Extra Life, ⏰ Slow Time
                </Text>
              </VStack>

              <Button colorScheme="purple" onClick={startGame} w="full" leftIcon={<FaPlay />}>
                Launch Mission
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default Asteroid;