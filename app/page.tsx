"use client";

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  Container,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Avatar,
  Badge,
  Flex,
  useColorMode,
  useColorModeValue,
  IconButton,
  Image,
  Link,
  Stack,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { 
  FaSun, 
  FaMoon, 
  FaGamepad, 
  FaTrophy, 
  FaUsers, 
  FaPlay,
  FaSearch,
  FaStar,
  FaHeart,
  FaShare,
  FaDownload
} from 'react-icons/fa';

// TypeScript interfaces for type safety
interface GameCard {
  id: number;
  title: string;
  genre: string;
  rating: number;
  players: string;
  image: string;
  price: string;
  description: string;
}

interface FeatureCard {
  icon: React.ReactElement;
  title: string;
  description: string;
}

interface NewsItem {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  image: string;
}

const GameHub: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Color mode values for consistent theming
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.200');
  const accentColor = useColorModeValue('purple.500', 'purple.300');
  const searchDropdownBorderColor = useColorModeValue('gray.200', 'gray.600');
  const searchDropdownHoverBg = useColorModeValue('gray.50', 'gray.700');
  const addGameCardBg = useColorModeValue('purple.50', 'purple.900');
  const createOptionHoverBg = useColorModeValue('purple.50', 'purple.900');
  const newsGridBg = useColorModeValue('gray.100', 'gray.900');
  const featuresCardBg = useColorModeValue('white', 'gray.800');
  const footerBorderColor = useColorModeValue('gray.200', 'gray.700');

  // Function to check which games are actually implemented
  const getImplementedGameIds = (): string[] => {
    // Based on app/games/[id]/page.tsx, these games are implemented
    return ['01', '02']; // Tic-Tac-Toe and Tetris are implemented
  };

  // Function to map game ID to route ID
  const getGameRouteId = (gameId: number): string | null => {
    const gameRouteMap: { [key: number]: string } = {
      1: '01', // Tic-Tac-Toe
      2: '02', // Tetris
      // Add more mappings here when games are implemented
      // 3: '03', // Cyber Quest 2024
      // 4: '04', // Space Warrior  
      // 5: '05', // Mystic Realms
    };
    return gameRouteMap[gameId] || null;
  };

  // All game data (for future use when games are implemented)
  const allGames: GameCard[] = [
    {
      id: 1,
      title: "Tic-Tac-Toe",
      genre: "Classic/Strategy",
      rating: 4.9,
      players: "1-2 Players",
      image: "/tic-tac-toe-screenshot.png",
      price: "Free",
      description: "The classic game everyone loves! Play against a friend or challenge our smart AI bot."
    },
    {
      id: 2,
      title: "Tetris",
      genre: "Puzzle/Strategy",
      rating: 4.8,
      players: "Single Player",
      image: "https://via.placeholder.com/300x200/6366f1/ffffff?text=Tetris",
      price: "Free",
      description: "Classic block puzzle game with timer, hardcore, and easy modes. Clear lines and achieve high scores!"
    },
    {
      id: 3,
      title: "Cyber Quest 2024",
      genre: "RPG/Adventure",
      rating: 4.8,
      players: "1-4 Players",
      image: "https://via.placeholder.com/300x200/6366f1/ffffff?text=Cyber+Quest",
      price: "$49.99",
      description: "An immersive cyberpunk adventure in a dystopian future."
    },
    {
      id: 4,
      title: "Space Warrior",
      genre: "Action/Shooter",
      rating: 4.6,
      players: "1-8 Players",
      image: "https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Space+Warrior",
      price: "$39.99",
      description: "Epic space battles across multiple galaxies."
    },
    {
      id: 5,
      title: "Mystic Realms",
      genre: "Fantasy/Strategy",
      rating: 4.9,
      players: "1-6 Players",
      image: "https://via.placeholder.com/300x200/a855f7/ffffff?text=Mystic+Realms",
      price: "$59.99",
      description: "Build your kingdom in a magical world full of wonders."
    }
  ];

  // Filter games to only show implemented ones
  const featuredGames: GameCard[] = allGames.filter(game => {
    const routeId = getGameRouteId(game.id);
    return routeId && getImplementedGameIds().includes(routeId);
  });

  const features: FeatureCard[] = [
    {
      icon: <FaGamepad size="2rem" />,
      title: "Vast Game Library",
      description: "Access thousands of games across all genres and platforms"
    },
    {
      icon: <FaTrophy size="2rem" />,
      title: "Achievements",
      description: "Unlock rewards and showcase your gaming accomplishments"
    },
    {
      icon: <FaUsers size="2rem" />,
      title: "Community",
      description: "Connect with millions of gamers worldwide"
    }
  ];

  const latestNews: NewsItem[] = [
    {
      id: 1,
      title: "GameHub Reaches 150+ Players This Month!",
      excerpt: "Our community is growing! This month we welcomed 150+ new players to GameHub. Thank you for making our gaming platform a success.",
      date: "Dec 15, 2024",
      author: "GameHub Team",
      image: "https://via.placeholder.com/400x250/6366f1/ffffff?text=Community+Growth"
    },
    {
      id: 2,
      title: "New Game in Development: Space Adventure",
      excerpt: "We're excited to announce that our next game 'Space Adventure' is currently in development! Expect epic space battles and exploration.",
      date: "Dec 12, 2024",
      author: "Development Team",
      image: "https://via.placeholder.com/400x250/8b5cf6/ffffff?text=Space+Adventure"
    },
    {
      id: 3,
      title: "Game Submission Feature Now Live!",
      excerpt: "Players can now submit their own game ideas directly through our platform. The best ideas will be developed into actual games!",
      date: "Dec 10, 2024",
      author: "GameHub Team",
      image: "https://via.placeholder.com/400x250/a855f7/ffffff?text=Submit+Games"
    }
  ];

  // Enhanced search functionality
  const [searchResults, setSearchResults] = useState<GameCard[]>([]);
  const [showCreateOption, setShowCreateOption] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [likedGames, setLikedGames] = useState<Set<number>>(new Set());

  // Load liked games from localStorage on component mount
  React.useEffect(() => {
    const stored = localStorage.getItem('likedGames');
    if (stored) {
      setLikedGames(new Set(JSON.parse(stored)));
    }
  }, []);

  // Handle liking a game
  const handleLikeGame = (gameId: number) => {
    const newLikedGames = new Set(likedGames);
    if (newLikedGames.has(gameId)) {
      newLikedGames.delete(gameId);
    } else {
      newLikedGames.add(gameId);
    }
    setLikedGames(newLikedGames);
    localStorage.setItem('likedGames', JSON.stringify(Array.from(newLikedGames)));
    
    // Show feedback
    const game = allGames.find(g => g.id === gameId);
    if (game) {
      const action = newLikedGames.has(gameId) ? 'added to' : 'removed from';
      // We'll need to add toast here if not already imported
      console.log(`${game.title} ${action} favorites!`);
    }
  };

  // Handle sharing a game
  const handleShareGame = async (game: GameCard) => {
    const routeId = getGameRouteId(game.id);
    const gameUrl = routeId ? `${window.location.origin}/games/${routeId}` : window.location.origin;
    const shareText = `Check out ${game.title} on GameHub! ${game.description}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${game.title} - GameHub`,
          text: shareText,
          url: gameUrl,
        });
      } catch (err) {
        console.log('Share was cancelled or failed', err);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText} ${gameUrl}`);
        // Show success message
        console.log('Game link copied to clipboard!');
      } catch (err) {
        console.log('Failed to copy to clipboard', err);
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim() === '') {
      setSearchResults([]);
      setShowSearchDropdown(false);
      setShowCreateOption(false);
      return;
    }

    // Search by game ID or name
    const results = allGames.filter(game => 
      game.title.toLowerCase().includes(value.toLowerCase()) ||
      game.id.toString().includes(value)
    );
    
    setSearchResults(results);
    setShowCreateOption(results.length === 0);
    setShowSearchDropdown(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() === '') return;
    
    const results = allGames.filter(game => 
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.id.toString().includes(searchQuery)
    );
    
    if (results.length > 0) {
      // Navigate to first result if it's implemented
      const game = results[0];
      const routeId = getGameRouteId(game.id);
      if (routeId) {
        window.location.href = `/games/${routeId}`;
      }
    } else {
      // Show game creation form
      handleCreateGameIdea(searchQuery);
    }
  };

  const handleCreateGameIdea = (gameName: string) => {
    // This will open the game submission form
    window.location.href = `/submit-game?name=${encodeURIComponent(gameName)}`;
  };

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Skip Link for Accessibility */}
      <Link
        href="#main-content"
        position="absolute"
        top="-100px"
        left="0"
        bg="blue.600"
        color="white"
        p={3}
        zIndex={1000}
        _focus={{ top: 0 }}
        className="sr-only focus:not-sr-only"
      >
        Skip to main content
      </Link>

      {/* Header Navigation */}
      <Box as="header" bg={cardBg} boxShadow="sm" position="sticky" top={0} zIndex={100}>
        <Container maxW="7xl" py={4}>
          <Flex justify="space-between" align="center">
            <HStack spacing={2}>
              <FaGamepad size="2rem" color={accentColor} />
              <Heading 
                size="lg" 
                color={accentColor}
                role="banner"
                aria-label="GameHub - Your Ultimate Gaming Destination"
              >
                GameHub
              </Heading>
            </HStack>
            
            <HStack spacing={4}>
              <Box as="nav" role="navigation" aria-label="Main navigation">
                <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
                  <Link href="#games" color={textColor} _hover={{ color: accentColor }}>
                    Games
                  </Link>
                  <Link href="/community" color={textColor} _hover={{ color: accentColor }}>
                    Community
                  </Link>
                  <Link href="#news" color={textColor} _hover={{ color: accentColor }}>
                    News
                  </Link>
                  <Link href="/support" color={textColor} _hover={{ color: accentColor }}>
                    Support
                  </Link>
                </HStack>
              </Box>
              
              <IconButton
                aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
                icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
                onClick={toggleColorMode}
                variant="ghost"
                size="sm"
              />
              
              <Button colorScheme="purple" size="sm">
                Sign In
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Main Content */}
      <Box as="main" id="main-content">
        {/* Hero Section */}
        <Container maxW="7xl" py={16}>
          <VStack spacing={8} textAlign="center">
            <Heading
              as="h1"
              size="3xl"
              bgGradient="linear(to-r, purple.400, pink.400)"
              bgClip="text"
              fontWeight="extrabold"
              lineHeight="shorter"
            >
              Your Ultimate Gaming Destination
            </Heading>
            
            <Text 
              fontSize="xl" 
              color={textColor} 
              maxW="2xl"
              lineHeight="tall"
            >
              Discover amazing games, connect with fellow gamers, and embark on epic adventures. 
              Join millions of players in the most comprehensive gaming platform.
            </Text>
            
            <HStack spacing={4} flexWrap="wrap" justify="center">
              <Button 
                colorScheme="purple" 
                size="lg" 
                leftIcon={<FaPlay />}
                aria-label="Start gaming now"
              >
                Start Gaming
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                aria-label="Explore our game library"
                onClick={() => {
                  const gamesSection = document.getElementById('games');
                  gamesSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Explore Library
              </Button>
            </HStack>

            {/* Enhanced Search Bar */}
            <Box maxW="md" w="full" position="relative">
              <form onSubmit={handleSearchSubmit}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FaSearch color={textColor} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search for games..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => searchQuery && setShowSearchDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                    bg={cardBg}
                    aria-label="Search for games"
                  />
                </InputGroup>
              </form>
              
              {/* Search Results Dropdown */}
              {showSearchDropdown && (
                <Box
                  position="absolute"
                  top="100%"
                  left={0}
                  right={0}
                  bg={cardBg}
                  boxShadow="lg"
                  borderRadius="md"
                  mt={1}
                  maxH="300px"
                  overflowY="auto"
                  zIndex={1000}
                  border="1px"
                  borderColor={searchDropdownBorderColor}
                >
                  {searchResults.map((game) => (
                    <Box
                      key={game.id}
                      p={3}
                      _hover={{ bg: searchDropdownHoverBg }}
                      cursor="pointer"
                      onClick={() => {
                        const routeId = getGameRouteId(game.id);
                        if (routeId) {
                          window.location.href = `/games/${routeId}`;
                        }
                      }}
                    >
                      <HStack>
                        <Image src={game.image} alt={game.title} w="40px" h="30px" objectFit="cover" borderRadius="sm" />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontWeight="medium" fontSize="sm">{game.title}</Text>
                          <Text fontSize="xs" color={textColor}>{game.genre}</Text>
                        </VStack>
                        <Badge colorScheme={game.price === "Free" ? "green" : "blue"} fontSize="xs">
                          {game.price}
                        </Badge>
                      </HStack>
                    </Box>
                  ))}
                  
                  {showCreateOption && (
                    <Box
                      p={3}
                      _hover={{ bg: createOptionHoverBg }}
                      cursor="pointer"
                      onClick={() => handleCreateGameIdea(searchQuery)}
                      borderTop="1px"
                      borderColor={searchDropdownBorderColor}
                    >
                      <HStack>
                        <Box w="40px" h="30px" bg="purple.100" borderRadius="sm" display="flex" alignItems="center" justifyContent="center">
                          <Text fontSize="lg">+</Text>
                        </Box>
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontWeight="medium" fontSize="sm" color="purple.500">
                            Create: {searchQuery}
                          </Text>
                          <Text fontSize="xs" color={textColor}>Submit a game idea</Text>
                        </VStack>
                      </HStack>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </VStack>
        </Container>

        {/* Features Section */}
        <Box bg={featuresCardBg} py={16}>
          <Container maxW="7xl">
            <VStack spacing={12}>
              <Heading as="h2" size="xl" textAlign="center">
                Why Choose GameHub?
              </Heading>
              
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={8}>
                {features.map((feature: FeatureCard, index: number) => (
                  <GridItem key={index}>
                    <Card 
                      h="full" 
                      textAlign="center" 
                      bg={cardBg}
                      transition="transform 0.2s"
                      _hover={{ transform: 'translateY(-4px)' }}
                    >
                      <CardBody>
                        <VStack spacing={4}>
                          <Box color={accentColor} aria-hidden="true">
                            {feature.icon}
                          </Box>
                          <Heading as="h3" size="md">
                            {feature.title}
                          </Heading>
                          <Text color={textColor}>
                            {feature.description}
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>
                ))}
              </Grid>
            </VStack>
          </Container>
        </Box>

        {/* Featured Games Section */}
        <Container maxW="7xl" py={16} id="games">
          <VStack spacing={12}>
            <Heading as="h2" size="xl" textAlign="center">
              Featured Games
            </Heading>
            
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={8}>
              {featuredGames.map((game: GameCard) => (
                <GridItem key={game.id}>
                  <Card 
                    bg={cardBg}
                    transition="all 0.3s"
                    _hover={{ transform: 'translateY(-8px)', boxShadow: 'xl' }}
                    role="article"
                    aria-label={`Game: ${game.title}`}
                  >
                    <CardHeader p={0}>
                      <Image
                        src={game.image}
                        alt={`Screenshot of ${game.title}`}
                        borderTopRadius="md"
                        h="200px"
                        w="full"
                        objectFit="cover"
                      />
                    </CardHeader>
                    
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={1} flex={1}>
                            <Heading as="h3" size="md" noOfLines={1}>
                              {game.title}
                            </Heading>
                            <Badge colorScheme="purple" variant="subtle">
                              {game.genre}
                            </Badge>
                          </VStack>
                          <Text fontSize="lg" fontWeight="bold" color={accentColor}>
                            {game.price}
                          </Text>
                        </HStack>
                        
                        <Text color={textColor} noOfLines={2} fontSize="sm">
                          {game.description}
                        </Text>
                        
                        <HStack justify="space-between" align="center">
                          <HStack spacing={1}>
                            <FaStar color="gold" aria-hidden="true" />
                            <Text fontSize="sm">
                              {game.rating}
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color={textColor}>
                            {game.players}
                          </Text>
                        </HStack>
                        
                        <HStack spacing={2}>
                          <Button 
                            colorScheme="purple" 
                            size="sm" 
                            flex={1}
                            leftIcon={<FaDownload />}
                            aria-label={`Download ${game.title}`}
                            onClick={() => {
                              const routeId = getGameRouteId(game.id);
                              if (routeId) {
                                window.location.href = `/games/${routeId}`;
                              }
                            }}
                          >
                            {game.price === "Free" ? "Play Now" : "Get Game"}
                          </Button>
                          <IconButton
                            aria-label={`Add ${game.title} to wishlist`}
                            icon={<FaHeart />}
                            size="sm"
                            variant={likedGames.has(game.id) ? "solid" : "outline"}
                            colorScheme={likedGames.has(game.id) ? "red" : "gray"}
                            onClick={() => handleLikeGame(game.id)}
                          />
                          <IconButton
                            aria-label={`Share ${game.title}`}
                            icon={<FaShare />}
                            size="sm"
                            variant="outline"
                            onClick={() => handleShareGame(game)}
                          />
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
              ))}
              
              {/* Add Your Game Card */}
              <GridItem>
                <Card 
                  bg={addGameCardBg}
                  border="2px dashed"
                  borderColor={accentColor}
                  transition="all 0.3s"
                  _hover={{ transform: 'translateY(-8px)', boxShadow: 'xl', borderColor: 'purple.400' }}
                  cursor="pointer"
                  onClick={() => window.location.href = '/submit-game'}
                  role="button"
                  aria-label="Submit a new game idea"
                >
                  <CardBody>
                    <VStack spacing={6} justify="center" align="center" minH="300px">
                      <Box
                        w="80px"
                        h="80px"
                        bg={accentColor}
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="3xl"
                        color="white"
                      >
                        +
                      </Box>
                      
                      <VStack spacing={2} textAlign="center">
                        <Heading as="h3" size="md" color={accentColor}>
                          Add Your Game
                        </Heading>
                        <Text color={textColor} fontSize="sm">
                          Have a great game idea? Submit it and it might become the next featured game!
                        </Text>
                      </VStack>
                      
                      <Button 
                        colorScheme="purple" 
                        size="sm"
                        variant="outline"
                      >
                        Submit Idea
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </VStack>
        </Container>

        {/* Gaming News Section */}
        <Box bg={newsGridBg} py={16} id="news">
          <Container maxW="7xl">
            <VStack spacing={12}>
              <Heading as="h2" size="xl" textAlign="center">
                Latest Gaming News
              </Heading>
              
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={8}>
                {latestNews.map((news: NewsItem) => (
                  <GridItem key={news.id}>
                    <Card 
                      bg={cardBg}
                      transition="transform 0.2s"
                      _hover={{ transform: 'translateY(-4px)' }}
                      role="article"
                      aria-label={`News article: ${news.title}`}
                    >
                      <CardHeader p={0}>
                        <Image
                          src={news.image}
                          alt={`Thumbnail for ${news.title}`}
                          borderTopRadius="md"
                          h="200px"
                          w="full"
                          objectFit="cover"
                        />
                      </CardHeader>
                      
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <Heading as="h3" size="md" noOfLines={2}>
                            {news.title}
                          </Heading>
                          
                          <Text color={textColor} noOfLines={3}>
                            {news.excerpt}
                          </Text>
                          
                          <HStack justify="space-between" align="center" pt={2}>
                            <HStack spacing={2}>
                              <Avatar size="xs" name={news.author} />
                              <Text fontSize="sm" color={textColor}>
                                {news.author}
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color={textColor}>
                              {news.date}
                            </Text>
                          </HStack>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            aria-label={`Read full article: ${news.title}`}
                          >
                            Read More
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  </GridItem>
                ))}
              </Grid>
            </VStack>
          </Container>
        </Box>
      </Box>

      {/* Footer */}
      <Box as="footer" bg={cardBg} borderTop="1px" borderColor={footerBorderColor}>
        <Container maxW="7xl" py={12}>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={8}>
            <GridItem>
              <VStack align="start" spacing={4}>
                <HStack spacing={2}>
                  <FaGamepad size="1.5rem" color={accentColor} />
                  <Heading size="md" color={accentColor}>
                    GameHub
                  </Heading>
                </HStack>
                <Text color={textColor} fontSize="sm">
                  Your ultimate destination for gaming excellence. Connect, play, and achieve greatness.
                </Text>
              </VStack>
            </GridItem>
            
            <GridItem>
              <VStack align="start" spacing={3}>
                <Heading size="sm">Games</Heading>
                <Stack spacing={2} fontSize="sm" color={textColor}>
                  <Link href="#games" _hover={{ color: accentColor }}>Action</Link>
                  <Link href="#games" _hover={{ color: accentColor }}>Adventure</Link>
                  <Link href="#games" _hover={{ color: accentColor }}>Strategy</Link>
                  <Link href="#games" _hover={{ color: accentColor }}>RPG</Link>
                </Stack>
              </VStack>
            </GridItem>
            
            <GridItem>
              <VStack align="start" spacing={3}>
                <Heading size="sm">Community</Heading>
                <Stack spacing={2} fontSize="sm" color={textColor}>
                  <Link href="/community" _hover={{ color: accentColor }}>Forums</Link>
                  <Link href="/community" _hover={{ color: accentColor }}>Discord</Link>
                  <Link href="/community" _hover={{ color: accentColor }}>Events</Link>
                  <Link href="/community" _hover={{ color: accentColor }}>Tournaments</Link>
                </Stack>
              </VStack>
            </GridItem>
            
            <GridItem>
              <VStack align="start" spacing={3}>
                <Heading size="sm">Support</Heading>
                <Stack spacing={2} fontSize="sm" color={textColor}>
                  <Link href="/help" _hover={{ color: accentColor }}>Help Center</Link>
                  <Link href="/support" _hover={{ color: accentColor }}>Contact Us</Link>
                  <Link href="/support" _hover={{ color: accentColor }}>Privacy Policy</Link>
                  <Link href="/support" _hover={{ color: accentColor }}>Terms of Service</Link>
                </Stack>
              </VStack>
            </GridItem>
          </Grid>
          
          <Box mt={8} pt={8} borderTop="1px" borderColor={footerBorderColor}>
            <Text textAlign="center" fontSize="sm" color={textColor}>
              © 2024 GameHub. All rights reserved. Built with accessibility and gamers in mind.
            </Text>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default GameHub;
