"use client";

import React, { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Button,
  Card,
  CardBody,
  useColorModeValue,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { FaGamepad, FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

interface GameSubmission {
  title: string;
  description: string;
  genre: string;
  players: string;
  difficulty: string;
  features: string;
  submitterName: string;
  submitterEmail: string;
}

const SubmitGamePage: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  
  // Get search params safely
  const [initialTitle, setInitialTitle] = useState('');
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const name = params.get('name');
      if (name) {
        setInitialTitle(name);
      }
    }
  }, []);
  
  const [submission, setSubmission] = useState<GameSubmission>({
    title: '',
    description: '',
    genre: '',
    players: '',
    difficulty: '',
    features: '',
    submitterName: '',
    submitterEmail: '',
  });
  
  // Update title when initial title is available
  React.useEffect(() => {
    if (initialTitle && !submission.title) {
      setSubmission(prev => ({ ...prev, title: initialTitle }));
    }
  }, [initialTitle, submission.title]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.200');
  const accentColor = useColorModeValue('purple.500', 'purple.300');

  const handleInputChange = (field: keyof GameSubmission, value: string) => {
    setSubmission(prev => ({ ...prev, [field]: value }));
  };

  const submitToGitHub = async (submission: GameSubmission): Promise<boolean> => {
    // In a real implementation, this would make an API call to create a GitHub issue
    // For now, we'll simulate the submission
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store submission locally for now
      const existingSubmissions = JSON.parse(localStorage.getItem('gameSubmissions') || '[]');
      const newSubmission = {
        ...submission,
        id: Date.now(),
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };
      existingSubmissions.push(newSubmission);
      localStorage.setItem('gameSubmissions', JSON.stringify(existingSubmissions));
      
      return true;
    } catch (error) {
      console.error('Failed to submit game idea:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!submission.title || !submission.description || !submission.submitterName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await submitToGitHub(submission);
      
      if (success) {
        setIsSubmitted(true);
        toast({
          title: 'Game Idea Submitted!',
          description: 'Thank you for your submission. We\'ll review it and get back to you.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error('Submission failed');
      }
    } catch {
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your game idea. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Box minH="100vh" bg={bgColor}>
        <Container maxW="4xl" py={16}>
          <VStack spacing={8} textAlign="center">
            <Box>
              <FaGamepad size="4rem" color={accentColor} />
            </Box>
            
            <Alert
              status="success"
              variant="subtle"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              textAlign="center"
              height="200px"
              borderRadius="lg"
            >
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">
                Game Idea Submitted Successfully!
              </AlertTitle>
              <AlertDescription maxWidth="sm">
                Thank you for submitting &quot;{submission.title}&quot;! Your game idea has been added to our development queue. 
                We&apos;ll review it and may contact you for more details.
              </AlertDescription>
            </Alert>
            
            <HStack spacing={4}>
              <Button 
                leftIcon={<FaArrowLeft />}
                onClick={() => router.push('/')}
                variant="outline"
              >
                Back to Home
              </Button>
              <Button 
                colorScheme="purple"
                onClick={() => {
                  setIsSubmitted(false);
                  setSubmission({
                    title: '',
                    description: '',
                    genre: '',
                    players: '',
                    difficulty: '',
                    features: '',
                    submitterName: '',
                    submitterEmail: '',
                  });
                }}
              >
                Submit Another Idea
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg={bgColor}>
      <Container maxW="4xl" py={8}>
        <VStack spacing={8}>
          {/* Header */}
          <HStack justify="space-between" w="full" wrap="wrap">
            <VStack align="start" spacing={2}>
              <Heading size="lg" color={accentColor}>
                <FaGamepad style={{ display: 'inline', marginRight: '12px' }} />
                Submit Your Game Idea
              </Heading>
              <Text color={textColor}>
                Share your creative game concept with our development team
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

          {/* Submission Form */}
          <Card w="full" bg={cardBg} boxShadow="lg">
            <CardBody p={8}>
              <form onSubmit={handleSubmit}>
                <VStack spacing={6}>
                  <FormControl isRequired>
                    <FormLabel>Game Title</FormLabel>
                    <Input
                      placeholder="Enter your game title"
                      value={submission.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Game Description</FormLabel>
                    <Textarea
                      placeholder="Describe your game concept, gameplay, story, and what makes it unique..."
                      value={submission.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={6}
                    />
                  </FormControl>

                  <HStack spacing={4} w="full">
                    <FormControl>
                      <FormLabel>Genre</FormLabel>
                      <Select
                        placeholder="Select genre"
                        value={submission.genre}
                        onChange={(e) => handleInputChange('genre', e.target.value)}
                      >
                        <option value="Action">Action</option>
                        <option value="Adventure">Adventure</option>
                        <option value="Strategy">Strategy</option>
                        <option value="RPG">RPG</option>
                        <option value="Puzzle">Puzzle</option>
                        <option value="Sports">Sports</option>
                        <option value="Racing">Racing</option>
                        <option value="Simulation">Simulation</option>
                        <option value="Other">Other</option>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Number of Players</FormLabel>
                      <Select
                        placeholder="Select players"
                        value={submission.players}
                        onChange={(e) => handleInputChange('players', e.target.value)}
                      >
                        <option value="Single Player">Single Player</option>
                        <option value="2 Players">2 Players</option>
                        <option value="2-4 Players">2-4 Players</option>
                        <option value="2-8 Players">2-8 Players</option>
                        <option value="Multiplayer (8+)">Multiplayer (8+)</option>
                      </Select>
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel>Difficulty Level</FormLabel>
                    <Select
                      placeholder="Select difficulty to implement"
                      value={submission.difficulty}
                      onChange={(e) => handleInputChange('difficulty', e.target.value)}
                    >
                      <option value="Easy">Easy (Simple rules, quick to develop)</option>
                      <option value="Medium">Medium (Moderate complexity)</option>
                      <option value="Hard">Hard (Complex gameplay mechanics)</option>
                      <option value="Expert">Expert (Advanced features required)</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Key Features</FormLabel>
                    <Textarea
                      placeholder="List the main features and mechanics you envision for this game..."
                      value={submission.features}
                      onChange={(e) => handleInputChange('features', e.target.value)}
                      rows={4}
                    />
                  </FormControl>

                  <HStack spacing={4} w="full">
                    <FormControl isRequired>
                      <FormLabel>Your Name</FormLabel>
                      <Input
                        placeholder="Enter your name"
                        value={submission.submitterName}
                        onChange={(e) => handleInputChange('submitterName', e.target.value)}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Email (Optional)</FormLabel>
                      <Input
                        type="email"
                        placeholder="Enter your email for updates"
                        value={submission.submitterEmail}
                        onChange={(e) => handleInputChange('submitterEmail', e.target.value)}
                      />
                    </FormControl>
                  </HStack>

                  <Button
                    type="submit"
                    colorScheme="purple"
                    size="lg"
                    leftIcon={<FaPaperPlane />}
                    isLoading={isSubmitting}
                    loadingText="Submitting..."
                    w="full"
                  >
                    Submit Game Idea
                  </Button>
                </VStack>
              </form>
            </CardBody>
          </Card>
        </VStack>
      </Container>
    </Box>
  );
};

export default SubmitGamePage;