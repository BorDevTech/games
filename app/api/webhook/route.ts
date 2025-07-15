import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

interface WebhookPayload {
  title: string;
  description: string;
  genre?: string;
  players?: string;
  difficulty?: string;
  features?: string;
  submitterName: string;
  submitterEmail?: string;
  source?: string; // To identify webhook source
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    let payload: WebhookPayload;

    // Verify webhook signature if secret is configured
    const signature = request.headers.get('x-hub-signature-256') || 
                     request.headers.get('x-signature-256') ||
                     request.headers.get('signature');
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('Webhook signature verification failed');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!payload.title || !payload.description || !payload.submitterName) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, and submitterName are required' },
        { status: 400 }
      );
    }

    // Transform webhook payload to game submission format
    const gameSubmission = {
      title: payload.title,
      description: payload.description,
      genre: payload.genre || 'Not specified',
      players: payload.players || 'Not specified',
      difficulty: payload.difficulty || 'Not specified',
      features: payload.features || 'No specific features listed',
      submitterName: payload.submitterName,
      submitterEmail: payload.submitterEmail || '',
      source: payload.source || 'External Webhook'
    };

    // Forward to existing submission handler
    const submissionResponse = await fetch(`${getBaseUrl(request)}/api/submit-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'webhook-forwarder'
      },
      body: JSON.stringify(gameSubmission)
    });

    if (!submissionResponse.ok) {
      const errorText = await submissionResponse.text();
      console.error('Failed to forward submission:', errorText);
      
      return NextResponse.json(
        { 
          error: 'Failed to process submission',
          details: `Internal submission API returned ${submissionResponse.status}`
        },
        { status: 502 }
      );
    }

    const submissionResult = await submissionResponse.json();
    
    console.log('Webhook processed successfully:', {
      title: payload.title,
      source: payload.source,
      submitter: payload.submitterName
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed and game submission created',
      submission: {
        title: gameSubmission.title,
        submitter: gameSubmission.submitterName,
        source: gameSubmission.source
      },
      result: submissionResult
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to process webhook'
      },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Support multiple signature formats
    const cleanSignature = signature.replace('sha256=', '');
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

function getBaseUrl(request: NextRequest): string {
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

// Support GET requests to provide webhook information
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/webhook',
    method: 'POST',
    contentType: 'application/json',
    description: 'External webhook endpoint for game submissions',
    requiredFields: ['title', 'description', 'submitterName'],
    optionalFields: ['genre', 'players', 'difficulty', 'features', 'submitterEmail', 'source'],
    security: {
      signatureHeader: 'x-hub-signature-256 or x-signature-256 or signature',
      algorithm: 'HMAC-SHA256',
      secret: 'Set WEBHOOK_SECRET environment variable'
    },
    example: {
      title: 'My Amazing Game',
      description: 'A detailed description of the game idea',
      genre: 'Action',
      players: 'Multiplayer',
      difficulty: 'Medium',
      features: 'Unique gameplay mechanics and features',
      submitterName: 'John Doe',
      submitterEmail: 'john@example.com',
      source: 'External Form'
    }
  });
}