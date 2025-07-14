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
  Link,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaArrowLeft, FaQuestionCircle, FaEnvelope, FaBook, FaBug } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

const SupportPage: React.FC = () => {
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
                <FaQuestionCircle style={{ display: 'inline', marginRight: '12px' }} />
                Support Center
              </Heading>
              <Text color={textColor}>
                Get help and find answers to your questions
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

          {/* Support Options */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={8} w="full">
            <GridItem>
              <Card bg={cardBg} h="full" _hover={{ transform: 'translateY(-4px)' }} transition="transform 0.2s">
                <CardHeader>
                  <HStack>
                    <FaBook color={accentColor} />
                    <Heading size="md">Help Center</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Text color={textColor}>
                      Browse our comprehensive help articles and guides to get started with GameHub.
                    </Text>
                    <Button 
                      colorScheme="purple" 
                      size="sm"
                      onClick={() => router.push('/help')}
                    >
                      Browse Help Articles
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem>
              <Card bg={cardBg} h="full" _hover={{ transform: 'translateY(-4px)' }} transition="transform 0.2s">
                <CardHeader>
                  <HStack>
                    <FaEnvelope color={accentColor} />
                    <Heading size="md">Contact Us</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Text color={textColor}>
                      Can't find what you're looking for? Send us a message and we'll get back to you.
                    </Text>
                    <Button colorScheme="purple" size="sm" isDisabled>
                      Contact Support (Coming Soon)
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem>
              <Card bg={cardBg} h="full" _hover={{ transform: 'translateY(-4px)' }} transition="transform 0.2s">
                <CardHeader>
                  <HStack>
                    <FaBug color={accentColor} />
                    <Heading size="md">Report a Bug</Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    <Text color={textColor}>
                      Found a bug or issue? Report it on our GitHub repository.
                    </Text>
                    <Button 
                      colorScheme="purple" 
                      size="sm"
                      as={Link}
                      href="https://github.com/BorDevTech/games/issues"
                      isExternal
                    >
                      Report on GitHub
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>

          {/* FAQ Section */}
          <Card bg={cardBg} w="full">
            <CardHeader>
              <Heading size="md">Frequently Asked Questions</Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="sm" mb={2}>How do I play games on GameHub?</Heading>
                  <Text color={textColor} fontSize="sm">
                    Simply click on any game from the featured games section on the homepage. 
                    Currently, we have Tic-Tac-Toe available to play.
                  </Text>
                </Box>

                <Box>
                  <Heading size="sm" mb={2}>Can I submit my own game ideas?</Heading>
                  <Text color={textColor} fontSize="sm">
                    Yes! Click on the "Add Your Game" button in the featured games section or use the 
                    search bar to create a new game idea. Your submission will be reviewed by our team.
                  </Text>
                </Box>

                <Box>
                  <Heading size="sm" mb={2}>How do I save my game progress?</Heading>
                  <Text color={textColor} fontSize="sm">
                    You can create an account when playing games to save your progress and statistics. 
                    This allows you to track your wins, losses, and overall performance.
                  </Text>
                </Box>

                <Box>
                  <Heading size="sm" mb={2}>Are there multiplayer features?</Heading>
                  <Text color={textColor} fontSize="sm">
                    Yes! Our games support multiplayer functionality. You can share games with friends 
                    using the share button on each game card.
                  </Text>
                </Box>

                <Box>
                  <Heading size="sm" mb={2}>Is GameHub free to use?</Heading>
                  <Text color={textColor} fontSize="sm">
                    Yes! GameHub is completely free to use. All our current games are free to play, 
                    and submitting game ideas is also free.
                  </Text>
                </Box>
              </VStack>
            </CardBody>
          </Card>

          {/* Contact Information */}
          <Card bg={useColorModeValue('blue.50', 'blue.900')} w="full" textAlign="center">
            <CardBody py={8}>
              <VStack spacing={4}>
                <Heading size="md" color="blue.500">
                  Still Need Help?
                </Heading>
                <Text color={textColor} maxW="lg">
                  Our team is here to help you have the best gaming experience possible. 
                  Don't hesitate to reach out!
                </Text>
                <VStack spacing={2}>
                  <Text fontSize="sm" color={textColor}>
                    <strong>Project Repository:</strong>{' '}
                    <Link href="https://github.com/BorDevTech/games" isExternal color="blue.500">
                      github.com/BorDevTech/games
                    </Link>
                  </Text>
                  <Text fontSize="sm" color={textColor}>
                    <strong>Response Time:</strong> Usually within 24-48 hours
                  </Text>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default SupportPage;