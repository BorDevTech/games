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
  Grid,
  GridItem,
  Badge,
  Avatar,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaArrowLeft, FaUsers, FaComments, FaCalendar, FaTrophy } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

const CommunityPage: React.FC = () => {
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
                <FaUsers style={{ display: 'inline', marginRight: '12px' }} />
                GameHub Community
              </Heading>
              <Text color={textColor}>
                Connect with fellow gamers and share your gaming experience
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

          {/* Community Stats */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={6} w="full">
            <GridItem>
              <Card bg={cardBg} textAlign="center">
                <CardBody>
                  <VStack spacing={2}>
                    <Text fontSize="2xl" fontWeight="bold" color={accentColor}>150+</Text>
                    <Text fontSize="sm" color={textColor}>Active Players</Text>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card bg={cardBg} textAlign="center">
                <CardBody>
                  <VStack spacing={2}>
                    <Text fontSize="2xl" fontWeight="bold" color={accentColor}>1</Text>
                    <Text fontSize="sm" color={textColor}>Games Available</Text>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card bg={cardBg} textAlign="center">
                <CardBody>
                  <VStack spacing={2}>
                    <Text fontSize="2xl" fontWeight="bold" color={accentColor}>25+</Text>
                    <Text fontSize="sm" color={textColor}>Game Ideas Submitted</Text>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
            <GridItem>
              <Card bg={cardBg} textAlign="center">
                <CardBody>
                  <VStack spacing={2}>
                    <Text fontSize="2xl" fontWeight="bold" color={accentColor}>500+</Text>
                    <Text fontSize="sm" color={textColor}>Games Played</Text>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>

          {/* Community Features */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={8} w="full">
            <GridItem>
              <Card bg={cardBg} h="full">
                <CardHeader>
                  <HStack>
                    <FaComments color={accentColor} />
                    <Heading size="md">Forums</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Text color={textColor}>
                      Join discussions about games, strategies, and connect with other players.
                    </Text>
                    <Button colorScheme="purple" size="sm" isDisabled>
                      Coming Soon
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem>
              <Card bg={cardBg} h="full">
                <CardHeader>
                  <HStack>
                    <FaCalendar color={accentColor} />
                    <Heading size="md">Events</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Text color={textColor}>
                      Participate in gaming events, tournaments, and community challenges.
                    </Text>
                    <Button colorScheme="purple" size="sm" isDisabled>
                      Coming Soon
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem>
              <Card bg={cardBg} h="full">
                <CardHeader>
                  <HStack>
                    <FaTrophy color={accentColor} />
                    <Heading size="md">Tournaments</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Text color={textColor}>
                      Compete in tournaments and climb the leaderboards for glory and prizes.
                    </Text>
                    <Button colorScheme="purple" size="sm" isDisabled>
                      Coming Soon
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>

          {/* Recent Activity */}
          <Card bg={cardBg} w="full">
            <CardHeader>
              <Heading size="md">Recent Community Activity</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <HStack>
                    <Avatar size="sm" name="Player1" />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">Player1 completed a Tic-Tac-Toe game</Text>
                      <Text fontSize="xs" color={textColor}>2 hours ago</Text>
                    </VStack>
                  </HStack>
                  <Badge colorScheme="green">Victory</Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack>
                    <Avatar size="sm" name="GamerX" />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">GamerX submitted a new game idea</Text>
                      <Text fontSize="xs" color={textColor}>5 hours ago</Text>
                    </VStack>
                  </HStack>
                  <Badge colorScheme="purple">Submission</Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack>
                    <Avatar size="sm" name="ProGamer" />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="medium">ProGamer joined GameHub</Text>
                      <Text fontSize="xs" color={textColor}>1 day ago</Text>
                    </VStack>
                  </HStack>
                  <Badge colorScheme="blue">New Member</Badge>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Call to Action */}
          <Card bg={useColorModeValue('purple.50', 'purple.900')} w="full" textAlign="center">
            <CardBody py={8}>
              <VStack spacing={4}>
                <Heading size="md" color={accentColor}>
                  Ready to Join Our Community?
                </Heading>
                <Text color={textColor} maxW="lg">
                  Start playing games, submit your ideas, and connect with fellow gamers. 
                  The GameHub community is waiting for you!
                </Text>
                <HStack spacing={4}>
                  <Button 
                    colorScheme="purple" 
                    onClick={() => router.push('/games/01')}
                  >
                    Play Games
                  </Button>
                  <Button 
                    variant="outline" 
                    colorScheme="purple"
                    onClick={() => router.push('/submit-game')}
                  >
                    Submit Game Idea
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default CommunityPage;