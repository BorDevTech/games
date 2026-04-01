"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Heading,
  Text,
  Badge,
  Input,
  Select,
  useToast,
  useColorModeValue,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@chakra-ui/react';
import { FaArrowUp, FaArrowDown, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

// ─── Constants ──────────────────────────────────────────────────────────────
const GRID_COLS = 15;
const GRID_ROWS = 13;
const CELL_SIZE = 40;
const TICK_MS = 180;
const FROG_LIVES = 3;
const TIME_LIMIT = 30;
const HOME_COLS = [1, 4, 7, 10, 13];
const RIVER_ROWS = [1, 2, 3, 4, 5];
const ROAD_ROWS = [7, 8, 9, 10, 11];
const MEDIAN_ROW = 6;
const HOME_ROW = 0;
const START_ROW = 12;
const START_COL = 7;
const PLAYER_EMOJIS = ['🐸', '🦊', '🐭', '🐷'];
const PLAYER_COLOR_SCHEMES = ['green', 'blue', 'red', 'yellow'];

// ─── Types ───────────────────────────────────────────────────────────────────
type GamePhase = 'setup' | 'playing' | 'gameover';
type LaneType = 'car' | 'truck' | 'log' | 'turtle';

interface PlayerData {
  name: string;
  score: number;
  lives: number;
  homesReached: number;
}

interface LaneItem {
  col: number; // leftmost column (can be negative while wrapping in)
}

interface Lane {
  row: number;
  type: LaneType;
  dir: 1 | -1;
  period: number; // advance 1 cell every N ticks
  width: number;  // item width in cells
  items: LaneItem[];
}

interface FrogPos {
  row: number;
  col: number;
}

interface GameState {
  phase: GamePhase;
  players: PlayerData[];
  turn: number;
  frog: FrogPos;
  lanes: Lane[];
  homes: boolean[]; // 5 slots
  timeLeft: number;
  tick: number;
}

// ─── Lane Definitions ───────────────────────────────────────────────────────
interface LaneDef {
  row: number;
  type: LaneType;
  dir: 1 | -1;
  period: number;
  width: number;
  initCols: number[];
}

const LANE_DEFS: LaneDef[] = [
  // River lanes (rows 1–5): logs and turtles
  { row: 1, type: 'log',    dir:  1, period: 5, width: 3, initCols: [0, 6, 11] },
  { row: 2, type: 'turtle', dir: -1, period: 4, width: 2, initCols: [1, 6, 11] },
  { row: 3, type: 'log',    dir:  1, period: 6, width: 4, initCols: [0, 8] },
  { row: 4, type: 'turtle', dir: -1, period: 5, width: 2, initCols: [2, 8, 13] },
  { row: 5, type: 'log',    dir:  1, period: 4, width: 3, initCols: [0, 7, 13] },
  // Road lanes (rows 7–11): cars and trucks
  { row: 7,  type: 'car',   dir: -1, period: 3, width: 1, initCols: [2, 6, 10, 14] },
  { row: 8,  type: 'truck', dir:  1, period: 4, width: 2, initCols: [0, 7] },
  { row: 9,  type: 'car',   dir: -1, period: 2, width: 1, initCols: [3, 8, 13] },
  { row: 10, type: 'car',   dir:  1, period: 3, width: 1, initCols: [1, 6, 11] },
  { row: 11, type: 'truck', dir: -1, period: 4, width: 2, initCols: [2, 9] },
];

// ─── Pure helpers ────────────────────────────────────────────────────────────
function initLanes(): Lane[] {
  return LANE_DEFS.map(def => ({
    row: def.row,
    type: def.type,
    dir: def.dir,
    period: def.period,
    width: def.width,
    items: def.initCols.map(col => ({ col })),
  }));
}

function coveredByLane(lane: Lane, col: number): boolean {
  return lane.items.some(item => col >= item.col && col < item.col + lane.width);
}

function advanceLane(lane: Lane): Lane {
  return {
    ...lane,
    items: lane.items.map(item => {
      let c = item.col + lane.dir;
      if (lane.dir === 1 && c >= GRID_COLS) c = -lane.width + 1;
      if (lane.dir === -1 && c + lane.width <= 0) c = GRID_COLS - 1;
      return { col: c };
    }),
  };
}

function tickLanes(lanes: Lane[], tick: number): Lane[] {
  return lanes.map(lane => (tick % lane.period === 0 ? advanceLane(lane) : lane));
}

type FrogStatus = 'alive' | 'dead' | 'home';

function checkStatus(frog: FrogPos, lanes: Lane[], homes: boolean[]): { status: FrogStatus; homeIdx?: number } {
  const { row, col } = frog;

  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return { status: 'dead' };

  if (row === HOME_ROW) {
    const homeIdx = HOME_COLS.indexOf(col);
    if (homeIdx !== -1 && !homes[homeIdx]) return { status: 'home', homeIdx };
    return { status: 'dead' }; // bank or already filled
  }

  if (RIVER_ROWS.includes(row)) {
    const lane = lanes.find(l => l.row === row);
    return { status: lane && coveredByLane(lane, col) ? 'alive' : 'dead' };
  }

  if (row === MEDIAN_ROW || row === START_ROW) return { status: 'alive' };

  if (ROAD_ROWS.includes(row)) {
    const lane = lanes.find(l => l.row === row);
    return { status: lane && coveredByLane(lane, col) ? 'dead' : 'alive' };
  }

  return { status: 'alive' };
}

function resetFrog(state: GameState): GameState {
  return { ...state, frog: { row: START_ROW, col: START_COL }, timeLeft: TIME_LIMIT };
}

function nextActivePlayer(players: PlayerData[], from: number): number {
  for (let i = 1; i <= players.length; i++) {
    const idx = (from + i) % players.length;
    if (players[idx].lives > 0) return idx;
  }
  return -1;
}

// ─── Component ───────────────────────────────────────────────────────────────
const Frogger: React.FC = () => {
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const howToBg = useColorModeValue('gray.100', 'gray.700');

  // Setup-only state (controlled inputs)
  const [numPlayers, setNumPlayers] = useState(2);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);

  // Single render-trigger counter; game state lives in the ref
  const [, setRenderCount] = useState(0);
  const rerender = useCallback(() => setRenderCount(n => n + 1), []);

  const stateRef = useRef<GameState>({
    phase: 'setup',
    players: [],
    turn: 0,
    frog: { row: START_ROW, col: START_COL },
    lanes: initLanes(),
    homes: Array(5).fill(false),
    timeLeft: TIME_LIMIT,
    tick: 0,
  });

  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── State transition helpers (read/write stateRef, then rerender) ──────────

  const showDeathToast = useCallback((playerName: string, nextName?: string) => {
    toast({
      title: `💀 ${playerName} lost a life!`,
      description: nextName ? `${nextName}'s turn!` : undefined,
      status: 'error',
      duration: 1500,
      isClosable: true,
    });
  }, [toast]);

  const showHomeToast = useCallback((points: number) => {
    toast({
      title: '🏠 Home!',
      description: `+${points} points!`,
      status: 'success',
      duration: 1500,
      isClosable: true,
    });
  }, [toast]);

  const applyDeath = useCallback(() => {
    const s = stateRef.current;
    const players = s.players.map((p, i) =>
      i === s.turn ? { ...p, lives: p.lives - 1 } : p
    );

    if (players[s.turn].lives <= 0) {
      const next = nextActivePlayer(players, s.turn);
      if (next === -1) {
        stateRef.current = { ...s, players, phase: 'gameover' };
        toast({ title: '🏁 Game Over!', status: 'info', duration: 2000 });
      } else {
        stateRef.current = resetFrog({ ...s, players, turn: next });
        toast({
          title: `${players[s.turn].name} is out of lives!`,
          description: `${players[next].name}'s turn!`,
          status: 'warning',
          duration: 2000,
        });
      }
    } else {
      const next = nextActivePlayer(players, s.turn);
      const nextTurn = next !== -1 ? next : s.turn;
      stateRef.current = resetFrog({ ...s, players, turn: nextTurn });
      showDeathToast(players[s.turn].name, next !== -1 && next !== s.turn ? players[next].name : undefined);
    }

    rerender();
  }, [toast, showDeathToast, rerender]);

  const applyHome = useCallback((homeIdx: number) => {
    const s = stateRef.current;
    const homes = [...s.homes];
    homes[homeIdx] = true;

    const timeBonus = s.timeLeft * 3;
    const pts = 100 + timeBonus;
    const players = s.players.map((p, i) =>
      i === s.turn
        ? { ...p, score: p.score + pts, homesReached: p.homesReached + 1 }
        : p
    );

    showHomeToast(pts);

    if (homes.every(h => h)) {
      stateRef.current = { ...s, players, homes, phase: 'gameover' };
      toast({ title: '🎉 All Homes Filled! Game Over!', status: 'success', duration: 3000 });
      rerender();
      return;
    }

    // Rotate to next player after scoring
    const next = nextActivePlayer(players, s.turn);
    const nextTurn = next !== -1 ? next : s.turn;
    stateRef.current = resetFrog({ ...s, players, homes, turn: nextTurn });

    if (nextTurn !== s.turn) {
      toast({
        title: `🎮 ${players[nextTurn].name}'s Turn!`,
        status: 'info',
        duration: 1500,
      });
    }

    rerender();
  }, [toast, showHomeToast, rerender]);

  // ── Game Loop ──────────────────────────────────────────────────────────────
  const stopLoops = useCallback(() => {
    if (gameLoopRef.current) { clearInterval(gameLoopRef.current); gameLoopRef.current = null; }
    if (timeLoopRef.current) { clearInterval(timeLoopRef.current); timeLoopRef.current = null; }
  }, []);

  const startLoops = useCallback(() => {
    stopLoops();

    gameLoopRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.phase !== 'playing') return;

      const newTick = s.tick + 1;
      const newLanes = tickLanes(s.lanes, newTick);

      // Carry frog with platform if in river
      let newFrog = { ...s.frog };
      if (RIVER_ROWS.includes(s.frog.row)) {
        const lane = newLanes.find(l => l.row === s.frog.row);
        if (lane && newTick % lane.period === 0) {
          newFrog = { row: s.frog.row, col: s.frog.col + lane.dir };
        }
      }

      const partialState: GameState = { ...s, tick: newTick, lanes: newLanes, frog: newFrog };
      stateRef.current = partialState;

      // Check whether frog drifted off-screen or was run over
      const { status, homeIdx } = checkStatus(newFrog, newLanes, s.homes);
      if (status === 'dead') {
        applyDeath();
      } else if (status === 'home' && homeIdx !== undefined) {
        applyHome(homeIdx);
      } else {
        rerender();
      }
    }, TICK_MS);

    timeLoopRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.phase !== 'playing') return;

      const newTime = s.timeLeft - 1;
      if (newTime <= 0) {
        stateRef.current = { ...s, timeLeft: 0 };
        toast({ title: '⏰ Time\'s Up!', status: 'warning', duration: 1200 });
        applyDeath();
      } else {
        stateRef.current = { ...s, timeLeft: newTime };
        rerender();
      }
    }, 1000);
  }, [stopLoops, applyDeath, applyHome, toast, rerender]);

  // ── Move frog (key/button press) ──────────────────────────────────────────
  const moveFrog = useCallback((dr: number, dc: number) => {
    const s = stateRef.current;
    if (s.phase !== 'playing') return;

    const newRow = s.frog.row + dr;
    const newCol = s.frog.col + dc;

    if (newRow < 0 || newRow >= GRID_ROWS || newCol < 0 || newCol >= GRID_COLS) return;

    const newFrog: FrogPos = { row: newRow, col: newCol };
    const scoreBonus = dr === -1 ? 10 : 0; // points for hopping forward

    // Apply forward-hop score
    let players = s.players;
    if (scoreBonus > 0) {
      players = s.players.map((p, i) =>
        i === s.turn ? { ...p, score: p.score + scoreBonus } : p
      );
    }

    stateRef.current = { ...s, frog: newFrog, players };

    const { status, homeIdx } = checkStatus(newFrog, s.lanes, s.homes);
    if (status === 'dead') {
      applyDeath();
    } else if (status === 'home' && homeIdx !== undefined) {
      applyHome(homeIdx);
    } else {
      rerender();
    }
  }, [applyDeath, applyHome, rerender]);

  // ── Keyboard listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stateRef.current.phase !== 'playing') return;
      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); moveFrog(-1,  0); break;
        case 'ArrowDown':  case 's': case 'S': e.preventDefault(); moveFrog( 1,  0); break;
        case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); moveFrog( 0, -1); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); moveFrog( 0,  1); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveFrog]);

  // ── Start / restart game ──────────────────────────────────────────────────
  const startGame = useCallback(() => {
    stopLoops();

    const activePlayers: PlayerData[] = playerNames.slice(0, numPlayers).map((name, i) => ({
      name: name.trim() || `Player ${i + 1}`,
      score: 0,
      lives: FROG_LIVES,
      homesReached: 0,
    }));

    stateRef.current = {
      phase: 'playing',
      players: activePlayers,
      turn: 0,
      frog: { row: START_ROW, col: START_COL },
      lanes: initLanes(),
      homes: Array(5).fill(false),
      timeLeft: TIME_LIMIT,
      tick: 0,
    };

    rerender();
    startLoops();
  }, [numPlayers, playerNames, stopLoops, startLoops, rerender]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => stopLoops(), [stopLoops]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderBoard = (s: GameState) => {
    const cells: React.ReactNode[] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const isFrog = s.frog.row === row && s.frog.col === col;
        let bg = 'gray.400';
        let label: React.ReactNode = null;

        if (row === HOME_ROW) {
          const homeIdx = HOME_COLS.indexOf(col);
          if (homeIdx !== -1) {
            bg = s.homes[homeIdx] ? 'green.600' : 'green.300';
            label = s.homes[homeIdx] ? '🏠' : '🪷';
          } else {
            bg = 'green.800';
          }
        } else if (RIVER_ROWS.includes(row)) {
          bg = 'blue.400';
          const lane = s.lanes.find(l => l.row === row);
          if (lane && coveredByLane(lane, col)) {
            bg = lane.type === 'log' ? 'orange.700' : 'teal.500';
            label = lane.type === 'log' ? '🪵' : '🐢';
          }
        } else if (row === MEDIAN_ROW) {
          bg = 'green.400';
        } else if (ROAD_ROWS.includes(row)) {
          bg = 'gray.600';
          const lane = s.lanes.find(l => l.row === row);
          if (lane && coveredByLane(lane, col)) {
            bg = lane.type === 'car' ? 'red.500' : 'orange.500';
            label = lane.type === 'car' ? '🚗' : '🚛';
          }
        } else if (row === START_ROW) {
          bg = 'green.400';
        }

        if (isFrog) {
          label = PLAYER_EMOJIS[s.turn] || '🐸';
          bg = 'yellow.300';
        }

        cells.push(
          <Box
            key={`${row}-${col}`}
            w={`${CELL_SIZE}px`}
            h={`${CELL_SIZE}px`}
            bg={bg}
            border="1px solid"
            borderColor="blackAlpha.200"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="md"
            lineHeight="1"
            userSelect="none"
          >
            {label}
          </Box>
        );
      }
    }

    return (
      <Box
        display="grid"
        gridTemplateColumns={`repeat(${GRID_COLS}, ${CELL_SIZE}px)`}
        border="2px solid"
        borderColor="gray.600"
        borderRadius="md"
        overflow="hidden"
        gap={0}
      >
        {cells}
      </Box>
    );
  };

  // ── Setup phase ───────────────────────────────────────────────────────────
  const s = stateRef.current;

  if (s.phase === 'setup') {
    return (
      <VStack spacing={6} p={4}>
        <Heading size="lg">🐸 Frogger</Heading>
        <Text color="gray.500">Guide your frog safely across the road and river!</Text>

        <Box w="full" maxW="md">
          <VStack spacing={4}>
            <HStack w="full" justify="space-between">
              <Text fontWeight="bold">Number of Players:</Text>
              <Select
                value={numPlayers}
                onChange={e => setNumPlayers(Number(e.target.value))}
                w="140px"
              >
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </Select>
            </HStack>

            {Array.from({ length: numPlayers }).map((_, i) => (
              <HStack key={i} w="full">
                <Badge colorScheme={PLAYER_COLOR_SCHEMES[i]} fontSize="lg" px={2} py={1}>
                  {PLAYER_EMOJIS[i]}
                </Badge>
                <Input
                  value={playerNames[i]}
                  onChange={e => {
                    const names = [...playerNames];
                    names[i] = e.target.value;
                    setPlayerNames(names);
                  }}
                  placeholder={`Player ${i + 1}`}
                />
              </HStack>
            ))}

            <Button colorScheme="green" size="lg" w="full" onClick={startGame}>
              🐸 Start Game!
            </Button>
          </VStack>
        </Box>

        <Box bg={howToBg} p={4} borderRadius="md" maxW="md" w="full">
          <Heading size="sm" mb={2}>How to Play</Heading>
          <VStack align="start" spacing={1} fontSize="sm">
            <Text>🎮 Use <b>Arrow Keys</b> or <b>WASD</b> to move your frog</Text>
            <Text>🛣️ Dodge cars and trucks on the road</Text>
            <Text>🌊 Ride logs 🪵 and turtles 🐢 to cross the river</Text>
            <Text>🏠 Land on a lily pad 🪷 at the top to score</Text>
            <Text>⏰ You have {TIME_LIMIT} seconds per attempt</Text>
            <Text>💀 Each player has {FROG_LIVES} lives — turns rotate after each attempt</Text>
            <Text>🏆 Highest score after all homes are filled wins!</Text>
          </VStack>
        </Box>
      </VStack>
    );
  }

  // ── Game-over phase ───────────────────────────────────────────────────────
  if (s.phase === 'gameover') {
    const sorted = [...s.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    return (
      <VStack spacing={6} p={4}>
        <Heading size="lg">🏁 Game Over!</Heading>
        <Text fontSize="xl" fontWeight="bold" color="green.500">
          🏆 {winner.name} Wins with {winner.score} points!
        </Text>

        <Table variant="simple" maxW="md" w="full">
          <Thead>
            <Tr>
              <Th>Rank</Th>
              <Th>Player</Th>
              <Th isNumeric>Homes</Th>
              <Th isNumeric>Score</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sorted.map((p, i) => (
              <Tr key={p.name}>
                <Td>
                  <Badge colorScheme={i === 0 ? 'yellow' : i === 1 ? 'gray' : 'orange'}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </Badge>
                </Td>
                <Td>
                  {PLAYER_EMOJIS[s.players.indexOf(p)]} {p.name}
                </Td>
                <Td isNumeric>{p.homesReached}</Td>
                <Td isNumeric>{p.score}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        <HStack>
          <Button colorScheme="green" onClick={startGame}>🔄 Play Again</Button>
          <Button
            variant="outline"
            onClick={() => {
              stopLoops();
              stateRef.current = { ...stateRef.current, phase: 'setup' };
              rerender();
            }}
          >
            ⚙️ Change Players
          </Button>
        </HStack>
      </VStack>
    );
  }

  // ── Playing phase ─────────────────────────────────────────────────────────
  const currentPlayer = s.players[s.turn];
  const boardMaxW = `${GRID_COLS * CELL_SIZE}px`;

  return (
    <VStack spacing={4} p={4} align="center">
      {/* Player scorecards */}
      <HStack justify="space-between" w="full" maxW={boardMaxW} flexWrap="wrap" gap={2}>
        {s.players.map((p, i) => (
          <Box
            key={p.name}
            p={2}
            borderRadius="md"
            bg={i === s.turn ? cardBg : 'transparent'}
            border="2px solid"
            borderColor={i === s.turn ? PLAYER_COLOR_SCHEMES[i] + '.400' : 'transparent'}
            minW="110px"
          >
            <Text fontSize="sm" fontWeight={i === s.turn ? 'bold' : 'normal'}>
              {PLAYER_EMOJIS[i]} {p.name}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Score: {p.score}
            </Text>
            <Text fontSize="xs" color={p.lives > 0 ? 'green.500' : 'red.400'}>
              {'❤️'.repeat(Math.max(0, p.lives))}{p.lives === 0 ? '💀 Out' : ''}
            </Text>
          </Box>
        ))}
      </HStack>

      {/* Timer bar */}
      <HStack w="full" maxW={boardMaxW} align="center">
        <Text fontSize="sm" minW="55px">⏰ {s.timeLeft}s</Text>
        <Progress
          value={(s.timeLeft / TIME_LIMIT) * 100}
          colorScheme={s.timeLeft > 15 ? 'green' : s.timeLeft > 8 ? 'yellow' : 'red'}
          flex={1}
          borderRadius="md"
          size="sm"
        />
      </HStack>

      {/* Homes progress */}
      <HStack w="full" maxW={boardMaxW}>
        <Text fontSize="sm" mr={2}>Homes:</Text>
        {s.homes.map((filled, i) => (
          <Text key={i} fontSize="lg">{filled ? '🏠' : '🪷'}</Text>
        ))}
      </HStack>

      {/* Board */}
      {renderBoard(s)}

      {/* On-screen controls */}
      <VStack spacing={1}>
        <Button size="sm" onClick={() => moveFrog(-1, 0)} aria-label="Up">
          <FaArrowUp />
        </Button>
        <HStack spacing={1}>
          <Button size="sm" onClick={() => moveFrog(0, -1)} aria-label="Left">
            <FaArrowLeft />
          </Button>
          <Button size="sm" onClick={() => moveFrog(1, 0)} aria-label="Down">
            <FaArrowDown />
          </Button>
          <Button size="sm" onClick={() => moveFrog(0, 1)} aria-label="Right">
            <FaArrowRight />
          </Button>
        </HStack>
      </VStack>

      <Text fontSize="xs" color="gray.500">
        Arrow Keys / WASD to move &mdash; {currentPlayer?.name}&apos;s Turn
      </Text>
    </VStack>
  );
};

export default Frogger;
