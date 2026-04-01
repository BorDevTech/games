"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Badge,
  Box,
  Card,
  CardBody,
  CardHeader,
  useColorModeValue,
  useToast,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  Icon,
  SimpleGrid,
} from '@chakra-ui/react';
import { FaRobot, FaUser, FaCopy, FaTrophy, FaArrowRight } from 'react-icons/fa';
import { GiSpades } from 'react-icons/gi';
import { useRouter } from 'next/navigation';
import roomManager, { Room, Player } from '@/lib/roomManager';

// ─────────────────────────── Types ───────────────────────────

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
}

type BidValue = 'nil' | 'blind_nil' | number;

interface SpadesPlayer {
  id: string;
  name: string;
  isAI: boolean;
  seat: number; // 0=North 1=East 2=South 3=West
  hand: Card[];
  bid: BidValue | null;
  tricksWon: number;
  nilBroken: boolean; // nil bid failed
}

interface TrickCard {
  seat: number;
  card: Card;
}

interface RoundResult {
  round: number;
  team0Bid: number;
  team0Tricks: number;
  team0Score: number;
  team0Bags: number;
  team1Bid: number;
  team1Tricks: number;
  team1Score: number;
  team1Bags: number;
}

type GamePhase = 'waiting' | 'bidding' | 'playing' | 'round_over' | 'game_over';

interface SpadesState {
  phase: GamePhase;
  players: SpadesPlayer[];
  currentSeat: number;
  dealerSeat: number;
  currentTrick: TrickCard[];
  trickLeaderSeat: number;
  spadesBroken: boolean;
  teamScores: [number, number];
  teamBags: [number, number];
  round: number;
  roundHistory: RoundResult[];
  gameTarget: number;
}

interface SpadesRoomProps {
  roomId: string;
  initialRoom: Room;
  forceAI?: boolean;
  onRoomDeleted?: () => void;
}

// ─────────────────────────── Constants ───────────────────────────

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};
const SEAT_NAMES = ['North', 'East', 'South', 'West'];
// Teams: 0 & 2 = Team A (North/South), 1 & 3 = Team B (East/West)
const seatTeam = (seat: number) => seat % 2; // 0→0, 1→1, 2→0, 3→1
const AI_NAMES = ['Alex (AI)', 'Bailey (AI)', 'Casey (AI)', 'Drew (AI)'];

// ─────────────────────────── Deck helpers ───────────────────────────

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealCards(deck: Card[]): [Card[], Card[], Card[], Card[]] {
  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  deck.forEach((card, i) => hands[i % 4].push(card));
  // Sort hands: spades first (high to low), then other suits
  hands.forEach((hand) =>
    hand.sort((a, b) => {
      if (a.suit === b.suit) return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
      const order: Suit[] = ['♠', '♥', '♦', '♣'];
      return order.indexOf(a.suit) - order.indexOf(b.suit);
    })
  );
  return hands;
}

// ─────────────────────────── Game logic helpers ───────────────────────────

/** Returns the seat that won the trick */
function trickWinner(trick: TrickCard[]): number {
  let winner = trick[0];
  for (const tc of trick) {
    const beats =
      (tc.card.suit === '♠' && winner.card.suit !== '♠') ||
      (tc.card.suit === winner.card.suit &&
        RANK_VALUES[tc.card.rank] > RANK_VALUES[winner.card.rank]);
    if (beats) winner = tc;
  }
  return winner.seat;
}

/** Is it legal to play this card? */
function isLegalPlay(card: Card, hand: Card[], trick: TrickCard[], spadesBroken: boolean): boolean {
  if (trick.length === 0) {
    // Leading a trick
    if (card.suit === '♠') {
      const hasOnlySpades = hand.every((c) => c.suit === '♠');
      return spadesBroken || hasOnlySpades;
    }
    return true;
  }
  // Following suit
  const leadSuit = trick[0].card.suit;
  const hasSuit = hand.some((c) => c.suit === leadSuit);
  if (hasSuit) return card.suit === leadSuit;
  return true; // Can play anything
}

function getLegalCards(hand: Card[], trick: TrickCard[], spadesBroken: boolean): Card[] {
  return hand.filter((c) => isLegalPlay(c, hand, trick, spadesBroken));
}

// ─────────────────────────── AI logic ───────────────────────────

function aiBid(hand: Card[]): number {
  let bid = 0;
  const suitCounts: Record<Suit, number> = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };
  for (const c of hand) suitCounts[c.suit]++;

  for (const c of hand) {
    const rv = RANK_VALUES[c.rank];
    if (c.suit === '♠') {
      if (rv >= 12) bid += 1;        // Q, K, A spades → sure trick
      else if (rv === 11) bid += 0.75; // J spades
      else if (rv >= 9) bid += 0.4;
    } else {
      if (rv === 14 && suitCounts[c.suit] <= 3) bid += 0.9; // Ace
      else if (rv === 13 && suitCounts[c.suit] <= 2) bid += 0.7; // King (void/doubleton suit)
      else if (rv === 12 && suitCounts[c.suit] === 1) bid += 0.6; // Singleton Q
    }
  }
  return Math.max(1, Math.min(13, Math.round(bid)));
}

function aiPlayCard(hand: Card[], trick: TrickCard[], spadesBroken: boolean): Card {
  const legal = getLegalCards(hand, trick, spadesBroken);

  if (trick.length === 0) {
    // Leading: prefer to lead with a high spade, else lowest card in shortest suit
    const spades = legal.filter((c) => c.suit === '♠');
    if (spades.length > 0 && spadesBroken) {
      return spades[0]; // highest spade
    }
    // Lead lowest card of shortest non-spade suit
    const nonSpades = legal.filter((c) => c.suit !== '♠');
    if (nonSpades.length > 0) {
      return nonSpades[nonSpades.length - 1]; // lowest
    }
    return legal[legal.length - 1];
  }

  const leadSuit = trick[0].card.suit;
  const hasSuit = hand.some((c) => c.suit === leadSuit);

  if (hasSuit) {
    const suitCards = legal.filter((c) => c.suit === leadSuit);
    const currentWinCard = trick.reduce((best, tc) => {
      const beats =
        (tc.card.suit === '♠' && best.card.suit !== '♠') ||
        (tc.card.suit === best.card.suit && RANK_VALUES[tc.card.rank] > RANK_VALUES[best.card.rank]);
      return beats ? tc : best;
    });
    // Try to beat current winner
    const winners = suitCards.filter(
      (c) =>
        (currentWinCard.card.suit !== '♠' || c.suit === '♠') &&
        RANK_VALUES[c.rank] > RANK_VALUES[currentWinCard.card.rank] &&
        c.suit === currentWinCard.card.suit
    );
    if (winners.length > 0) {
      return winners[winners.length - 1]; // lowest winning
    }
    return suitCards[suitCards.length - 1]; // lowest of suit
  }

  // Can't follow suit — play a spade to win, or dump lowest card
  const spadeCards = legal.filter((c) => c.suit === '♠');
  if (spadeCards.length > 0) {
    return spadeCards[spadeCards.length - 1]; // lowest spade
  }
  return legal[legal.length - 1]; // lowest card
}

// ─────────────────────────── Score helpers ───────────────────────────

function calcTeamBid(players: SpadesPlayer[], team: number): number {
  return players
    .filter((p) => seatTeam(p.seat) === team)
    .reduce((sum, p) => {
      if (p.bid === 'nil' || p.bid === 'blind_nil') return sum;
      return sum + (p.bid ?? 0);
    }, 0);
}

interface RoundScore {
  score: number;
  bags: number;
  nilBonus: number;
}

function calcRoundScore(
  players: SpadesPlayer[],
  team: number,
  prevBags: number
): RoundScore {
  const teamPlayers = players.filter((p) => seatTeam(p.seat) === team);
  const bid = calcTeamBid(players, team);
  const tricks = teamPlayers.reduce((s, p) => s + p.tricksWon, 0);

  let nilBonus = 0;
  for (const p of teamPlayers) {
    if (p.bid === 'nil') nilBonus += p.nilBroken ? -100 : 100;
    else if (p.bid === 'blind_nil') nilBonus += p.nilBroken ? -200 : 200;
  }

  // Non-nil tricks only for bag/set calc
  const nilTricks = teamPlayers
    .filter((p) => p.bid === 'nil' || p.bid === 'blind_nil')
    .reduce((s, p) => s + p.tricksWon, 0);
  const nonNilTricks = tricks - nilTricks;

  let score = 0;
  let bags = 0;
  if (bid === 0 && nilBonus !== 0) {
    // All players bid nil — score is purely the nil bonuses
    score = nilBonus;
    return { score, bags, nilBonus: 0 }; // nilBonus already included
  } else if (nonNilTricks >= bid) {
    score = bid * 10;
    bags = nonNilTricks - bid;
    score += bags;
  } else {
    score = -(bid * 10);
  }

  // Bag penalty: every 10 accumulated bags costs 100
  const totalBags = prevBags + bags;
  const bagPenalty = Math.floor(totalBags / 10) - Math.floor(prevBags / 10);
  score -= bagPenalty * 100;

  return { score, bags, nilBonus };
}

// ─────────────────────────── Component ───────────────────────────

const SpadesRoom: React.FC<SpadesRoomProps> = ({ roomId, initialRoom, forceAI = false }) => {
  const router = useRouter();
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedText = useColorModeValue('gray.500', 'gray.400');

  const [room] = useState<Room>(initialRoom);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [game, setGame] = useState<SpadesState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string>('');
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initialize player & game ──
  useEffect(() => {
    const init = async () => {
      try {
        const { default: sessionManager } = await import('@/lib/sessionManager');
        const playerInfo = await sessionManager.getPlayerInfo();
        if (!playerInfo) {
          router.push('/games/08');
          return;
        }

        await sessionManager.updateCurrentRoom(roomId);
        const check = await roomManager.isPlayerInRoomWithAPIFallback(roomId, playerInfo.id);
        let myPlayer: Player | null = null;
        if (check.inRoom && check.player) {
          myPlayer = check.player;
        } else {
          const newP: Omit<Player, 'isHost' | 'joinedAt' | 'lastActivity'> = {
            id: playerInfo.id,
            username: playerInfo.username,
            handCount: 0,
            status: 'waiting',
            ready: false,
          };
          const result = await roomManager.joinRoomWithAPIFallback(roomId, newP);
          if (result.success && result.room) {
            myPlayer = result.room.players.find((p) => p.id === playerInfo.id) ?? null;
          }
        }
        setCurrentPlayer(myPlayer);
      } catch {
        router.push('/games/08');
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Start game (host or auto if forceAI) ──
  const startGame = useCallback(
    (humanPlayers: (Player | null)[]) => {
      const deck = shuffleDeck(createDeck());
      const hands = dealCards(deck);
      const dealerSeat = 0;

      // Fill seats: human players in seats 0..n-1, AI in remaining seats
      const players: SpadesPlayer[] = [];
      for (let seat = 0; seat < 4; seat++) {
        const hp = humanPlayers[seat];
        players.push({
          id: hp ? hp.id : `ai-${seat}`,
          name: hp ? hp.username : AI_NAMES[seat],
          isAI: !hp,
          seat,
          hand: hands[seat],
          bid: null,
          tricksWon: 0,
          nilBroken: false,
        });
      }

      setGame({
        phase: 'bidding',
        players,
        currentSeat: (dealerSeat + 1) % 4,
        dealerSeat,
        currentTrick: [],
        trickLeaderSeat: (dealerSeat + 1) % 4,
        spadesBroken: false,
        teamScores: [0, 0],
        teamBags: [0, 0],
        round: 1,
        roundHistory: [],
        gameTarget: 500,
      });
      setMessage('Bidding phase — each player bids how many tricks they will win.');
    },
    []
  );

  // ── Auto-start when forceAI or all 4 seats filled ──
  useEffect(() => {
    if (!currentPlayer || loading) return;
    if (game) return; // already started
    const humanPlayers = room.players.slice(0, 4);
    if (forceAI || humanPlayers.length >= 1) {
      // Pad with nulls so AI fills remaining seats
      const padded = Array.from({ length: 4 }, (_, i) => humanPlayers[i] ?? null);
      startGame(padded);
    }
  }, [currentPlayer, loading, forceAI, room.players, game, startGame]);

  // ── AI turn ──
  const processAITurn = useCallback(
    (g: SpadesState): SpadesState => {
      const player = g.players[g.currentSeat];
      if (!player.isAI) return g;

      if (g.phase === 'bidding') {
        const bid = aiBid(player.hand);
        const newPlayers = g.players.map((p) =>
          p.seat === g.currentSeat ? { ...p, bid } : p
        );
        const allBid = newPlayers.every((p) => p.bid !== null);
        const nextSeat = (g.currentSeat + 1) % 4;
        return {
          ...g,
          players: newPlayers,
          phase: allBid ? 'playing' : 'bidding',
          currentSeat: allBid ? g.trickLeaderSeat : nextSeat,
        };
      }

      if (g.phase === 'playing') {
        const card = aiPlayCard(player.hand, g.currentTrick, g.spadesBroken);
        const newHand = player.hand.filter((c) => !(c.suit === card.suit && c.rank === card.rank));
        const newTrick = [...g.currentTrick, { seat: g.currentSeat, card }];
        const spadesBroken = g.spadesBroken || card.suit === '♠';
        const newPlayers = g.players.map((p) =>
          p.seat === g.currentSeat ? { ...p, hand: newHand } : p
        );

        if (newTrick.length === 4) {
          return finalizeTrick({ ...g, players: newPlayers, currentTrick: newTrick, spadesBroken });
        }
        return {
          ...g,
          players: newPlayers,
          currentTrick: newTrick,
          spadesBroken,
          currentSeat: (g.currentSeat + 1) % 4,
        };
      }
      return g;
    },
    []
  );

  function finalizeTrick(g: SpadesState): SpadesState {
    const winnerSeat = trickWinner(g.currentTrick);
    const newPlayers = g.players.map((p) =>
      p.seat === winnerSeat ? { ...p, tricksWon: p.tricksWon + 1 } : p
    );

    // Check nil violations
    const nilChecked = newPlayers.map((p) => {
      if ((p.bid === 'nil' || p.bid === 'blind_nil') && p.tricksWon > 0 && !p.nilBroken) {
        return { ...p, nilBroken: true };
      }
      return p;
    });

    const totalTricks = nilChecked.reduce((s, p) => s + p.tricksWon, 0);
    if (totalTricks < 13) {
      return {
        ...g,
        players: nilChecked,
        currentTrick: [],
        trickLeaderSeat: winnerSeat,
        currentSeat: winnerSeat,
      };
    }

    // Round over — calculate scores
    const team0 = calcRoundScore(nilChecked, 0, g.teamBags[0]);
    const team1 = calcRoundScore(nilChecked, 1, g.teamBags[1]);
    const newBags: [number, number] = [
      (g.teamBags[0] + team0.bags) % 10,
      (g.teamBags[1] + team1.bags) % 10,
    ];
    const newScores: [number, number] = [
      g.teamScores[0] + team0.score + team0.nilBonus,
      g.teamScores[1] + team1.score + team1.nilBonus,
    ];

    const result: RoundResult = {
      round: g.round,
      team0Bid: calcTeamBid(nilChecked, 0),
      team0Tricks: nilChecked.filter((p) => seatTeam(p.seat) === 0).reduce((s, p) => s + p.tricksWon, 0),
      team0Score: team0.score + team0.nilBonus,
      team0Bags: team0.bags,
      team1Bid: calcTeamBid(nilChecked, 1),
      team1Tricks: nilChecked.filter((p) => seatTeam(p.seat) === 1).reduce((s, p) => s + p.tricksWon, 0),
      team1Score: team1.score + team1.nilBonus,
      team1Bags: team1.bags,
    };

    const gameOver = newScores[0] >= g.gameTarget || newScores[1] >= g.gameTarget ||
      newScores[0] <= -200 || newScores[1] <= -200;

    return {
      ...g,
      players: nilChecked,
      currentTrick: [],
      teamScores: newScores,
      teamBags: newBags,
      roundHistory: [...g.roundHistory, result],
      phase: gameOver ? 'game_over' : 'round_over',
    };
  }

  // ── Drive AI turns automatically ──
  useEffect(() => {
    if (!game) return;
    if (game.phase !== 'bidding' && game.phase !== 'playing') return;
    const currentP = game.players[game.currentSeat];
    if (!currentP?.isAI) return;

    aiTimerRef.current = setTimeout(() => {
      setGame((prev) => {
        if (!prev) return prev;
        return processAITurn(prev);
      });
    }, 600);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [game, processAITurn]);

  // ── Human bidding ──
  const humanBid = (bid: BidValue) => {
    if (!game || !currentPlayer) return;
    const mySeat = game.players.findIndex((p) => p.id === currentPlayer.id);
    if (mySeat !== game.currentSeat || game.phase !== 'bidding') return;

    setGame((prev) => {
      if (!prev) return prev;
      const newPlayers = prev.players.map((p) =>
        p.seat === mySeat ? { ...p, bid } : p
      );
      const allBid = newPlayers.every((p) => p.bid !== null);
      const nextSeat = (prev.currentSeat + 1) % 4;
      return {
        ...prev,
        players: newPlayers,
        phase: allBid ? 'playing' : 'bidding',
        currentSeat: allBid ? prev.trickLeaderSeat : nextSeat,
      };
    });
  };

  // ── Human card play ──
  const playCard = (card: Card) => {
    if (!game || !currentPlayer) return;
    const mySeat = game.players.findIndex((p) => p.id === currentPlayer.id);
    if (mySeat !== game.currentSeat || game.phase !== 'playing') return;

    const player = game.players[mySeat];
    if (!isLegalPlay(card, player.hand, game.currentTrick, game.spadesBroken)) {
      toast({ title: 'Illegal play', description: 'You must follow suit if possible, and cannot lead spades until broken.', status: 'warning', duration: 2000, isClosable: true });
      return;
    }

    const newHand = player.hand.filter((c) => !(c.suit === card.suit && c.rank === card.rank));
    const newTrick = [...game.currentTrick, { seat: mySeat, card }];
    const spadesBroken = game.spadesBroken || card.suit === '♠';
    const newPlayers = game.players.map((p) =>
      p.seat === mySeat ? { ...p, hand: newHand } : p
    );

    setSelectedCard(null);
    if (newTrick.length === 4) {
      setGame((prev) => {
        if (!prev) return prev;
        return finalizeTrick({ ...prev, players: newPlayers, currentTrick: newTrick, spadesBroken });
      });
    } else {
      setGame((prev) =>
        prev ? { ...prev, players: newPlayers, currentTrick: newTrick, spadesBroken, currentSeat: (prev.currentSeat + 1) % 4 } : prev
      );
    }
  };

  // ── Next round ──
  const nextRound = () => {
    if (!game) return;
    const deck = shuffleDeck(createDeck());
    const hands = dealCards(deck);
    const newDealerSeat = (game.dealerSeat + 1) % 4;
    const firstBidder = (newDealerSeat + 1) % 4;

    const newPlayers = game.players.map((p) => ({
      ...p,
      hand: hands[p.seat],
      bid: null,
      tricksWon: 0,
      nilBroken: false,
    }));

    setGame({
      ...game,
      phase: 'bidding',
      players: newPlayers,
      currentSeat: firstBidder,
      dealerSeat: newDealerSeat,
      currentTrick: [],
      trickLeaderSeat: firstBidder,
      spadesBroken: false,
      round: game.round + 1,
    });
    setMessage('New round — place your bids!');
  };

  // ─────────────────────────── Render helpers ───────────────────────────

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    toast({ title: 'Room code copied!', status: 'success', duration: 2000, isClosable: true });
  };

  function CardView({ card, onClick, selected, disabled }: {
    card: Card; onClick?: () => void; selected?: boolean; disabled?: boolean;
  }) {
    const bg = useColorModeValue('white', 'gray.100');
    const isRed = card.suit === '♥' || card.suit === '♦';
    return (
      <Box
        as="button"
        onClick={onClick}
        bg={bg}
        borderWidth="1px"
        borderColor={selected ? 'purple.500' : 'gray.300'}
        borderRadius="md"
        px={2}
        py={1}
        minW="44px"
        textAlign="center"
        transform={selected ? 'translateY(-8px)' : 'none'}
        transition="transform 0.15s, border-color 0.15s"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.5 : 1}
        _hover={!disabled ? { borderColor: 'purple.400', transform: 'translateY(-4px)' } : {}}
        boxShadow={selected ? 'md' : 'sm'}
        color={isRed ? 'red.500' : 'gray.900'}
        fontSize="sm"
        fontWeight="bold"
      >
        <Text>{card.rank}</Text>
        <Text>{card.suit}</Text>
      </Box>
    );
  }

  function TrickPile({ trick }: { trick: TrickCard[] }) {
    if (trick.length === 0) return <Text fontSize="sm" color="gray.400">No cards played yet</Text>;
    return (
      <HStack spacing={2} justify="center" wrap="wrap">
        {trick.map((tc, i) => (
          <VStack key={i} spacing={0}>
            <Text fontSize="xs" color="gray.500">{SEAT_NAMES[tc.seat]}</Text>
            <CardView card={tc.card} />
          </VStack>
        ))}
      </HStack>
    );
  }

  // ─────────────────────────── Render ───────────────────────────

  if (loading) {
    return (
      <VStack py={16} spacing={4}>
        <Spinner size="xl" color="purple.500" />
        <Text>Loading game...</Text>
      </VStack>
    );
  }

  // ── Waiting Lobby ──
  if (!game) {
    return (
      <VStack spacing={6}>
        <HStack>
          <Icon as={GiSpades} boxSize={8} />
          <Heading size="lg">Spades — Lobby</Heading>
        </HStack>
        <HStack>
          <Text fontWeight="bold" fontSize="sm">Room Code:</Text>
          <Badge fontSize="md" colorScheme="purple" px={3} py={1}>{roomId}</Badge>
          <Button size="xs" onClick={copyRoomCode} leftIcon={<Icon as={FaCopy} />}>Copy</Button>
        </HStack>
        <Text color={mutedText}>Waiting for players… share the room code with friends. AI will fill empty seats automatically.</Text>
        <VStack spacing={2} w="full">
          {room.players.map((p, i) => (
            <HStack key={p.id} justify="space-between" w="full" p={3} bg={cardBg} borderRadius="md" borderWidth="1px">
              <HStack>
                <Icon as={FaUser} />
                <Text fontWeight="bold">{p.username}</Text>
                {p.isHost && <Badge colorScheme="yellow">Host</Badge>}
              </HStack>
              <Badge colorScheme="green">{SEAT_NAMES[i]}</Badge>
            </HStack>
          ))}
          {Array.from({ length: 4 - room.players.length }).map((_, i) => (
            <HStack key={`ai-${i}`} justify="space-between" w="full" p={3} bg={cardBg} borderRadius="md" borderWidth="1px" opacity={0.6}>
              <HStack>
                <Icon as={FaRobot} />
                <Text>{AI_NAMES[room.players.length + i]}</Text>
              </HStack>
              <Badge colorScheme="gray">AI</Badge>
            </HStack>
          ))}
        </VStack>
        {currentPlayer?.isHost && (
          <Button colorScheme="green" size="lg" onClick={() => startGame(Array.from({ length: 4 }, (_, i) => room.players[i] ?? null))}>
            Start Game
          </Button>
        )}
        {!currentPlayer?.isHost && (
          <Text color={mutedText} fontSize="sm">Waiting for the host to start the game…</Text>
        )}
      </VStack>
    );
  }

  // ── Game Over ──
  if (game.phase === 'game_over') {
    const winner = game.teamScores[0] > game.teamScores[1] ? 0 : 1;
    const myTeam = game.players.findIndex((p) => p.id === currentPlayer?.id) >= 0
      ? seatTeam(game.players.find((p) => p.id === currentPlayer?.id)?.seat ?? 0)
      : -1;
    return (
      <VStack spacing={6}>
        <Icon as={FaTrophy} boxSize={16} color="yellow.400" />
        <Heading>
          {winner === myTeam ? '🎉 Your Team Wins!' : 'Game Over'}
        </Heading>
        <Heading size="md">
          {winner === 0 ? 'North/South' : 'East/West'} wins!
        </Heading>
        <HStack spacing={8}>
          <VStack>
            <Badge colorScheme="blue" fontSize="md" px={3} py={1}>North/South</Badge>
            <Heading size="lg">{game.teamScores[0]}</Heading>
          </VStack>
          <VStack>
            <Badge colorScheme="red" fontSize="md" px={3} py={1}>East/West</Badge>
            <Heading size="lg">{game.teamScores[1]}</Heading>
          </VStack>
        </HStack>
        <Button colorScheme="purple" onClick={() => router.push('/games/08')}>
          Play Again
        </Button>
      </VStack>
    );
  }

  // ── Round Over ──
  if (game.phase === 'round_over') {
    const last = game.roundHistory[game.roundHistory.length - 1];
    return (
      <VStack spacing={6}>
        <Heading size="md">Round {last?.round} Complete</Heading>
        <SimpleGrid columns={2} spacing={4} w="full">
          <Card bg={cardBg}>
            <CardHeader pb={1}><Badge colorScheme="blue">North/South</Badge></CardHeader>
            <CardBody pt={1}>
              <Text fontSize="sm">Bid: {last?.team0Bid} | Won: {last?.team0Tricks}</Text>
              <Text fontSize="sm">Score this round: {last?.team0Score > 0 ? '+' : ''}{last?.team0Score}</Text>
              <Divider my={1} />
              <Text fontWeight="bold">Total: {game.teamScores[0]}</Text>
            </CardBody>
          </Card>
          <Card bg={cardBg}>
            <CardHeader pb={1}><Badge colorScheme="red">East/West</Badge></CardHeader>
            <CardBody pt={1}>
              <Text fontSize="sm">Bid: {last?.team1Bid} | Won: {last?.team1Tricks}</Text>
              <Text fontSize="sm">Score this round: {last?.team1Score > 0 ? '+' : ''}{last?.team1Score}</Text>
              <Divider my={1} />
              <Text fontWeight="bold">Total: {game.teamScores[1]}</Text>
            </CardBody>
          </Card>
        </SimpleGrid>
        <Button colorScheme="green" rightIcon={<Icon as={FaArrowRight} />} onClick={nextRound}>
          Next Round
        </Button>
      </VStack>
    );
  }

  // ── My seat ──
  const mySeat = game.players.findIndex((p) => p.id === currentPlayer?.id);
  const myPlayer = mySeat >= 0 ? game.players[mySeat] : null;
  const isMyTurn = mySeat === game.currentSeat;
  const currentP = game.players[game.currentSeat];

  return (
    <VStack spacing={4} align="stretch">
      {/* Header row */}
      <HStack justify="space-between" wrap="wrap">
        <HStack>
          <Icon as={GiSpades} boxSize={6} />
          <Heading size="md">Spades — Round {game.round}</Heading>
        </HStack>
        <HStack spacing={4}>
          <VStack spacing={0}>
            <Badge colorScheme="blue" px={2}>North/South</Badge>
            <Text fontWeight="bold">{game.teamScores[0]}</Text>
          </VStack>
          <VStack spacing={0}>
            <Badge colorScheme="red" px={2}>East/West</Badge>
            <Text fontWeight="bold">{game.teamScores[1]}</Text>
          </VStack>
        </HStack>
      </HStack>

      {/* Status */}
      {message && (
        <Alert status="info" borderRadius="md" py={2}>
          <AlertIcon />
          <Text fontSize="sm">{message}</Text>
        </Alert>
      )}

      {/* Players summary */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
        {game.players.map((p) => (
          <Card key={p.seat} bg={cardBg} borderWidth="2px"
            borderColor={p.seat === game.currentSeat ? 'purple.400' : borderColor}
          >
            <CardBody py={2} px={3}>
              <HStack justify="space-between">
                <HStack spacing={1}>
                  <Icon as={p.isAI ? FaRobot : FaUser} boxSize={3} />
                  <Text fontSize="xs" fontWeight="bold" noOfLines={1}>{p.name}</Text>
                </HStack>
                <Badge fontSize="xs" colorScheme={seatTeam(p.seat) === 0 ? 'blue' : 'red'}>
                  {SEAT_NAMES[p.seat]}
                </Badge>
              </HStack>
              <HStack justify="space-between" mt={1}>
                <Text fontSize="xs" color={mutedText}>
                  Bid: {p.bid === null ? '—' : p.bid === 'nil' ? 'Nil' : p.bid === 'blind_nil' ? 'Blind Nil' : p.bid}
                </Text>
                <Text fontSize="xs" color={mutedText}>
                  Won: {p.tricksWon}
                </Text>
              </HStack>
              {p.nilBroken && <Badge colorScheme="red" fontSize="xs">Nil broken!</Badge>}
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Current trick */}
      <Card bg={cardBg}>
        <CardHeader pb={2}>
          <Text fontWeight="bold" fontSize="sm">
            Current Trick {game.spadesBroken && <Badge colorScheme="purple" ml={2}>Spades broken</Badge>}
          </Text>
        </CardHeader>
        <CardBody pt={0}>
          <TrickPile trick={game.currentTrick} />
        </CardBody>
      </Card>

      {/* Bidding UI */}
      {game.phase === 'bidding' && (
        <Card bg={cardBg}>
          <CardHeader pb={2}>
            <Text fontWeight="bold">
              {isMyTurn && myPlayer?.bid === null
                ? '🎯 Your turn to bid'
                : `Waiting for ${currentP.name} to bid…`}
            </Text>
          </CardHeader>
          {isMyTurn && myPlayer?.bid === null && (
            <CardBody pt={0}>
              <Text fontSize="sm" color={mutedText} mb={3}>
                How many tricks will you win? (Your hand has {myPlayer?.hand.length} cards)
              </Text>
              <HStack wrap="wrap" spacing={2}>
                {Array.from({ length: 14 }, (_, i) => (
                  <Button key={i} size="sm" colorScheme="purple" variant="outline" onClick={() => humanBid(i)}>
                    {i}
                  </Button>
                ))}
                <Button size="sm" colorScheme="teal" variant="solid" onClick={() => humanBid('nil')}>
                  Nil (+100/-100)
                </Button>
                <Button size="sm" colorScheme="orange" variant="solid" onClick={() => humanBid('blind_nil')}>
                  Blind Nil (+200/-200)
                </Button>
              </HStack>
            </CardBody>
          )}
        </Card>
      )}

      {/* Player's hand */}
      {myPlayer && (
        <Card bg={cardBg}>
          <CardHeader pb={2}>
            <HStack justify="space-between">
              <Text fontWeight="bold">Your Hand ({myPlayer.hand.length} cards)</Text>
              {game.phase === 'playing' && isMyTurn && (
                <Badge colorScheme="green">Your turn!</Badge>
              )}
              {game.phase === 'playing' && !isMyTurn && (
                <Badge colorScheme="gray">Waiting for {currentP.name}…</Badge>
              )}
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            {game.phase === 'playing' && isMyTurn && selectedCard && (
              <Button
                colorScheme="purple"
                size="sm"
                mb={3}
                onClick={() => { if (selectedCard) playCard(selectedCard); }}
              >
                Play {selectedCard.rank}{selectedCard.suit}
              </Button>
            )}
            <HStack spacing={1} wrap="wrap" justify="flex-start">
              {myPlayer.hand.map((card, i) => {
                const legal = isLegalPlay(card, myPlayer.hand, game.currentTrick, game.spadesBroken);
                return (
                  <CardView
                    key={`${card.suit}${card.rank}-${i}`}
                    card={card}
                    selected={selectedCard?.suit === card.suit && selectedCard?.rank === card.rank}
                    disabled={game.phase !== 'playing' || !isMyTurn || !legal}
                    onClick={() => {
                      if (game.phase !== 'playing' || !isMyTurn) return;
                      if (!legal) {
                        toast({ title: 'Must follow suit', status: 'warning', duration: 1500, isClosable: true });
                        return;
                      }
                      if (selectedCard?.suit === card.suit && selectedCard?.rank === card.rank) {
                        playCard(card);
                      } else {
                        setSelectedCard(card);
                      }
                    }}
                  />
                );
              })}
            </HStack>
            {game.phase === 'playing' && isMyTurn && (
              <Text fontSize="xs" color={mutedText} mt={2}>
                Click a card to select it, click again to play. Illegal cards are dimmed.
              </Text>
            )}
          </CardBody>
        </Card>
      )}

      {/* Score history */}
      {game.roundHistory.length > 0 && (
        <Card bg={cardBg}>
          <CardHeader pb={2}>
            <Text fontWeight="bold" fontSize="sm">Score History</Text>
          </CardHeader>
          <CardBody pt={0}>
            <Box overflowX="auto">
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px' }}>Rnd</th>
                    <th style={{ padding: '4px' }}>N/S Bid</th>
                    <th style={{ padding: '4px' }}>N/S Won</th>
                    <th style={{ padding: '4px' }}>N/S Pts</th>
                    <th style={{ padding: '4px' }}>E/W Bid</th>
                    <th style={{ padding: '4px' }}>E/W Won</th>
                    <th style={{ padding: '4px' }}>E/W Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {game.roundHistory.map((r) => (
                    <tr key={r.round}>
                      <td style={{ padding: '4px' }}>{r.round}</td>
                      <td style={{ textAlign: 'center', padding: '4px' }}>{r.team0Bid}</td>
                      <td style={{ textAlign: 'center', padding: '4px' }}>{r.team0Tricks}</td>
                      <td style={{ textAlign: 'center', padding: '4px', color: r.team0Score >= 0 ? 'green' : 'red' }}>
                        {r.team0Score > 0 ? '+' : ''}{r.team0Score}
                      </td>
                      <td style={{ textAlign: 'center', padding: '4px' }}>{r.team1Bid}</td>
                      <td style={{ textAlign: 'center', padding: '4px' }}>{r.team1Tricks}</td>
                      <td style={{ textAlign: 'center', padding: '4px', color: r.team1Score >= 0 ? 'green' : 'red' }}>
                        {r.team1Score > 0 ? '+' : ''}{r.team1Score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};

export default SpadesRoom;
