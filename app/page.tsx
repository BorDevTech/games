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

  // Sample game data with proper TypeScript typing
  const featuredGames: GameCard[] = [
    {
      id: 1,
      title: "Tic-Tac-Toe",
      genre: "Classic/Strategy",
      rating: 4.9,
      players: "1-2 Players",
      image: "https://via.placeholder.com/300x200/805AD5/ffffff?text=Tic-Tac-Toe",
      price: "Free",
      description: "The classic game everyone loves! Play against a friend or challenge our smart AI bot."
    },
    {
      id: 2,
      title: "Cyber Quest 2024",
      genre: "RPG/Adventure",
      rating: 4.8,
      players: "1-4 Players",
      image: "https://via.placeholder.com/300x200/6366f1/ffffff?text=Cyber+Quest",
      price: "$49.99",
      description: "An immersive cyberpunk adventure in a dystopian future."
    },
    {
      id: 3,
      title: "Space Warrior",
      genre: "Action/Shooter",
      rating: 4.6,
      players: "1-8 Players",
      image: "https://via.placeholder.com/300x200/8b5cf6/ffffff?text=Space+Warrior",
      price: "$39.99",
      description: "Epic space battles across multiple galaxies."
    },
    {
      id: 4,
      title: "Mystic Realms",
      genre: "Fantasy/Strategy",
      rating: 4.9,
      players: "1-6 Players",
      image: "https://via.placeholder.com/300x200/a855f7/ffffff?text=Mystic+Realms",
      price: "$59.99",
      description: "Build your kingdom in a magical world full of wonders."
    }
  ];

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
      title: "New Gaming Tournament Announced",
      excerpt: "Join the biggest gaming competition of the year with prizes worth $100,000",
      date: "Dec 15, 2024",
      author: "Gaming News Team",
      image: "https://via.placeholder.com/400x250/ec4899/ffffff?text=Tournament+News"
    },
    {
      id: 2,
      title: "Top 10 Games of 2024",
      excerpt: "Discover the most popular and critically acclaimed games of this year",
      date: "Dec 12, 2024",
      author: "Game Reviews",
      image: "https://via.placeholder.com/400x250/f97316/ffffff?text=Top+Games+2024"
    }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
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
                  <Link href="#community" color={textColor} _hover={{ color: accentColor }}>
                    Community
                  </Link>
                  <Link href="#news" color={textColor} _hover={{ color: accentColor }}>
                    News
                  </Link>
                  <Link href="#support" color={textColor} _hover={{ color: accentColor }}>
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
              >
                Explore Library
              </Button>
            </HStack>

            {/* Search Bar */}
            <Box maxW="md" w="full">
              <form onSubmit={handleSearchSubmit}>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <FaSearch color={textColor} />
                  </InputLeftElement>
                  <Input
                    placeholder="Search for games..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    bg={cardBg}
                    aria-label="Search for games"
                  />
                </InputGroup>
              </form>
            </Box>
          </VStack>
        </Container>

        {/* Features Section */}
        <Box bg={useColorModeValue('white', 'gray.800')} py={16}>
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
                              if (game.title === "Tic-Tac-Toe") {
                                window.location.href = "/games/01";
                              }
                            }}
                          >
                            {game.title === "Tic-Tac-Toe" ? "Play Now" : "Get Game"}
                          </Button>
                          <IconButton
                            aria-label={`Add ${game.title} to wishlist`}
                            icon={<FaHeart />}
                            size="sm"
                            variant="outline"
                          />
                          <IconButton
                            aria-label={`Share ${game.title}`}
                            icon={<FaShare />}
                            size="sm"
                            variant="outline"
                          />
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
              ))}
            </Grid>
          </VStack>
        </Container>

        {/* Gaming News Section */}
        <Box bg={useColorModeValue('gray.100', 'gray.900')} py={16} id="news">
          <Container maxW="7xl">
            <VStack spacing={12}>
              <Heading as="h2" size="xl" textAlign="center">
                Latest Gaming News
              </Heading>
              
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={8}>
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
      <Box as="footer" bg={cardBg} borderTop="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
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
                  <Link href="#" _hover={{ color: accentColor }}>Action</Link>
                  <Link href="#" _hover={{ color: accentColor }}>Adventure</Link>
                  <Link href="#" _hover={{ color: accentColor }}>Strategy</Link>
                  <Link href="#" _hover={{ color: accentColor }}>RPG</Link>
                </Stack>
              </VStack>
            </GridItem>
            
            <GridItem>
              <VStack align="start" spacing={3}>
                <Heading size="sm">Community</Heading>
                <Stack spacing={2} fontSize="sm" color={textColor}>
                  <Link href="#" _hover={{ color: accentColor }}>Forums</Link>
                  <Link href="#" _hover={{ color: accentColor }}>Discord</Link>
                  <Link href="#" _hover={{ color: accentColor }}>Events</Link>
                  <Link href="#" _hover={{ color: accentColor }}>Tournaments</Link>
                </Stack>
              </VStack>
            </GridItem>
            
            <GridItem>
              <VStack align="start" spacing={3}>
                <Heading size="sm">Support</Heading>
                <Stack spacing={2} fontSize="sm" color={textColor}>
                  <Link href="#" _hover={{ color: accentColor }}>Help Center</Link>
                  <Link href="#" _hover={{ color: accentColor }}>Contact Us</Link>
                  <Link href="#" _hover={{ color: accentColor }}>Privacy Policy</Link>
                  <Link href="#" _hover={{ color: accentColor }}>Terms of Service</Link>
                </Stack>
              </VStack>
            </GridItem>
          </Grid>
          
          <Box mt={8} pt={8} borderTop="1px" borderColor={useColorModeValue('gray.200', 'gray.700')}>
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
