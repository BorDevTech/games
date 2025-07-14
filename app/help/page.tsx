"use client";

import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaArrowLeft, FaBook, FaGamepad, FaUsers, FaLightbulb } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

const HelpPage: React.FC = () => {
  const router = useRouter();
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.200');
  const accentColor = useColorModeValue('purple.500', 'purple.300');

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="6xl" py={8}>
        <VStack spacing={8}>
          {/* Header */}
          <HStack justify="space-between" w="full" wrap="wrap">
            <VStack align="start" spacing={2}>
              <Heading size="lg" color={accentColor}>
                <FaBook style={{ display: 'inline', marginRight: '12px' }} />
                Help Center
              </Heading>
              <Text color={textColor}>
                Everything you need to know about using GameHub
              </Text>
            </VStack>
            <Button 
              leftIcon={<FaArrowLeft />}
              variant="outline" 
              onClick={() => router.push('/')}
              size="sm"
            >
              Back to Home
            </Button>
          </HStack>

          {/* Getting Started */}
          <Card bg={cardBg} w="full">
            <CardHeader>
              <HStack>
                <FaGamepad color={accentColor} />
                <Heading size="md">Getting Started</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Accordion allowToggle>
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="medium">How to play your first game</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="start" spacing={3}>
                      <Text color={textColor}>
                        1. Go to the homepage and scroll down to the "Featured Games" section
                      </Text>
                      <Text color={textColor}>
                        2. Click on the "Play Now" button on any available game (currently Tic-Tac-Toe)
                      </Text>
                      <Text color={textColor}>
                        3. Set up your player profiles - you can play offline or create accounts to save progress
                      </Text>
                      <Text color={textColor}>
                        4. Choose your game mode (Player vs Player or Player vs Computer)
                      </Text>
                      <Text color={textColor}>
                        5. Click "Start Game" and enjoy!
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="medium">Creating and managing your account</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="start" spacing={3}>
                      <Text color={textColor}>
                        • When playing a game, click "Login / Register" to create an account
                      </Text>
                      <Text color={textColor}>
                        • Your account allows you to save game statistics and track your progress
                      </Text>
                      <Text color={textColor}>
                        • You can view your profile and stats by clicking the "Profile" button during gameplay
                      </Text>
                      <Text color={textColor}>
                        • Account data is stored locally on your device for privacy
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="medium">Using the search feature</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="start" spacing={3}>
                      <Text color={textColor}>
                        • Use the search bar on the homepage to find specific games
                      </Text>
                      <Text color={textColor}>
                        • You can search by game name or ID number
                      </Text>
                      <Text color={textColor}>
                        • If a game doesn't exist, you'll see a "Create: [Game Name]" option
                      </Text>
                      <Text color={textColor}>
                        • Click the create option to submit that game as a new idea
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          {/* Game Features */}
          <Card bg={cardBg} w="full">
            <CardHeader>
              <HStack>
                <FaUsers color={accentColor} />
                <Heading size="md">Game Features</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Accordion allowToggle>
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="medium">Liking and sharing games</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="start" spacing={3}>
                      <Text color={textColor}>
                        <strong>Liking Games:</strong> Click the heart icon on any game card to add it to your favorites. 
                        Liked games will show a red heart and are saved to your local preferences.
                      </Text>
                      <Text color={textColor}>
                        <strong>Sharing Games:</strong> Click the share icon to share a game with friends. 
                        This will either use your device's native sharing or copy the game link to your clipboard.
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="medium">Multiplayer gaming</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="start" spacing={3}>
                      <Text color={textColor}>
                        • Most games support multiplayer functionality
                      </Text>
                      <Text color={textColor}>
                        • Share game links with friends to invite them to play
                      </Text>
                      <Text color={textColor}>
                        • Both players can create accounts to track their head-to-head statistics
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="medium">Game statistics and progress</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="start" spacing={3}>
                      <Text color={textColor}>
                        • View detailed statistics for each game you play
                      </Text>
                      <Text color={textColor}>
                        • Track wins, losses, and total games played
                      </Text>
                      <Text color={textColor}>
                        • Statistics are saved per game and per player account
                      </Text>
                      <Text color={textColor}>
                        • Access stats through the "View Stats" button during gameplay
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          {/* Contributing */}
          <Card bg={cardBg} w="full">
            <CardHeader>
              <HStack>
                <FaLightbulb color={accentColor} />
                <Heading size="md">Contributing to GameHub</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <Accordion allowToggle>
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="medium">Submitting game ideas</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="start" spacing={3}>
                      <Text color={textColor}>
                        1. Click the "Add Your Game" card in the featured games section, OR
                      </Text>
                      <Text color={textColor}>
                        2. Search for a non-existent game and click "Create: [Game Name]"
                      </Text>
                      <Text color={textColor}>
                        3. Fill out the game submission form with details about your idea
                      </Text>
                      <Text color={textColor}>
                        4. Your submission will be reviewed and potentially developed into a real game
                      </Text>
                      <Text color={textColor}>
                        5. You'll be credited as the original idea contributor if your game is built
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Text fontWeight="medium">What makes a good game submission</Text>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="start" spacing={3}>
                      <Text color={textColor}>
                        • <strong>Clear concept:</strong> Explain the core gameplay mechanics simply
                      </Text>
                      <Text color={textColor}>
                        • <strong>Appropriate scope:</strong> Consider how complex the game would be to implement
                      </Text>
                      <Text color={textColor}>
                        • <strong>Multiplayer potential:</strong> Games that support multiple players are preferred
                      </Text>
                      <Text color={textColor}>
                        • <strong>Unique elements:</strong> What makes your game different from existing ones?
                      </Text>
                      <Text color={textColor}>
                        • <strong>Fun factor:</strong> Focus on what would make the game enjoyable to play
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              </Accordion>
            </CardBody>
          </Card>

          {/* Still Need Help */}
          <Card bg={useColorModeValue('green.50', 'green.900')} w="full" textAlign="center">
            <CardBody py={8}>
              <VStack spacing={4}>
                <Heading size="md" color="green.500">
                  Still Have Questions?
                </Heading>
                <Text color={textColor} maxW="lg">
                  If you couldn't find the answer you were looking for, don't hesitate to reach out for support.
                </Text>
                <Button 
                  colorScheme="green"
                  onClick={() => router.push('/support')}
                >
                  Contact Support
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default HelpPage;