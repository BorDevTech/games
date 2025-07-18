// WebSocket API Endpoint - Server Information
// This endpoint provides information about WebSocket server availability
// The actual WebSocket server is now implemented as a standalone server following MDN standards

import { NextRequest } from 'next/server';

// HTTP handler for WebSocket server information
export async function GET(request: NextRequest) {
  try {
    // Extract connection info from URL params
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('playerId');
    const username = searchParams.get('username');
    const sessionId = searchParams.get('sessionId');

    return new Response(JSON.stringify({
      success: true,
      message: 'WebSocket server available on this port',
      info: 'WebSocket connections are handled by the standalone server implementation',
      connectionParams: {
        playerId: playerId || 'not_provided',
        username: username || 'not_provided', 
        sessionId: sessionId || 'not_provided'
      },
      implementation: 'MDN WebSocket API standards with backpressure handling',
      features: [
        'Real-time bidirectional communication',
        'Automatic reconnection with exponential backoff',
        'Message queuing with backpressure handling',
        'Cross-browser compatibility',
        'Graceful fallback to polling if needed'
      ],
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    });
  } catch (error) {
    console.error('WebSocket endpoint error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'WebSocket server information unavailable',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}