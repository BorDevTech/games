// WebSocket API for Real-time Multiplayer Communication
// Note: Next.js API routes don't support WebSocket upgrades directly
// This endpoint provides fallback information when WebSocket is not available

import webSocketManager from '@/lib/webSocketManager';

// HTTP handler for WebSocket information (WebSocket connections not supported in Next.js API routes)
export async function GET() {
  try {
    // For HTTP requests to this endpoint, return information about WebSocket availability
    return new Response(JSON.stringify({
      success: false,
      message: 'WebSocket server not available in this environment',
      fallback: 'Using polling-based synchronization instead',
      activeConnections: 0,
      activeRooms: {},
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('WebSocket endpoint error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'WebSocket server not available',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Graceful shutdown (not needed for API routes)
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    webSocketManager.shutdown();
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    webSocketManager.shutdown();
  });
}