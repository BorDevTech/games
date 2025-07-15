import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  try {
    const submission: GameSubmission = await request.json();

    // Validate required fields
    if (!submission.title || !submission.description || !submission.submitterName) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, and submitterName are required' },
        { status: 400 }
      );
    }

    // Use GitHub repository dispatch to trigger a workflow
    // This uses a server-side token that's not exposed to the frontend
    // Check for test-specific tokens first, then fallback to general tokens
    const githubToken = process.env.GAME_SUBMISSION_TEST_TOKEN || 
                       process.env.TEST_GITHUB_TOKEN ||
                       process.env.GITHUB_TEST_TOKEN ||
                       process.env.GAME_SUBMISSION_TOKEN || 
                       process.env.GITHUB_WEBHOOK_TOKEN ||
                       process.env.GITHUB_TOKEN;
    
    // Log which token type is being used (for debugging)
    if (process.env.GAME_SUBMISSION_TEST_TOKEN) {
      console.log('Using GAME_SUBMISSION_TEST_TOKEN for submission');
    } else if (process.env.TEST_GITHUB_TOKEN) {
      console.log('Using TEST_GITHUB_TOKEN for submission');
    } else if (process.env.GITHUB_TEST_TOKEN) {
      console.log('Using GITHUB_TEST_TOKEN for submission');
    } else if (githubToken) {
      console.log('Using fallback token for submission');
    }
    
    if (!githubToken) {
      console.log('GitHub token not available, submission will need to be handled manually');
      return NextResponse.json(
        { 
          success: false, 
          error: 'GitHub integration not configured',
          fallback: true
        },
        { status: 503 }
      );
    }

    const response = await fetch('https://api.github.com/repos/BorDevTech/games/dispatches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'games-submission-app'
      },
      body: JSON.stringify({
        event_type: 'game-submission',
        client_payload: {
          submission: submission,
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to submit to GitHub',
          fallback: true,
          details: `GitHub API returned ${response.status}`
        },
        { status: 502 }
      );
    }

    console.log('Game submission dispatched to GitHub Actions successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Game submission dispatched to GitHub Actions' 
    });

  } catch (error) {
    console.error('Failed to process game submission:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        fallback: true
      },
      { status: 500 }
    );
  }
}