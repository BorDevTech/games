// WebSocket API for Real-time Multiplayer Communication
// Handles WebSocket upgrade requests and manages real-time connections

import { WebSocketServer, WebSocket } from 'ws';
import webSocketManager from '@/lib/webSocketManager';
import persistentStorage from '@/lib/persistentStorage';

// Global WebSocket server instance
let wss: WebSocketServer | null = null;

// Initialize WebSocket server if not already created
function initializeWebSocketServer(): WebSocketServer {
  if (!wss) {
    wss = new WebSocketServer({ 
      port: 8080, 
      path: '/api/websocket',
      verifyClient: (info: { origin: string }) => {
        // Basic origin check (in production, implement proper CORS)
        const origin = info.origin;
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001', 
          process.env.NEXT_PUBLIC_SITE_URL
        ].filter(Boolean);
        
        return !origin || allowedOrigins.some(allowed => allowed && origin.startsWith(allowed));
      }
    });

    wss.on('connection', (ws: WebSocket, request) => {
      if (request.url && request.headers.host) {
        handleWebSocketConnection(ws, {
          url: request.url,
          headers: { host: request.headers.host as string }
        });
      } else {
        console.error('Invalid WebSocket connection request');
        ws.close(1008, 'Invalid request');
      }
    });

    wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    console.log('WebSocket server initialized on port 8080');
  }
  
  return wss;
}

// Handle new WebSocket connections
function handleWebSocketConnection(ws: WebSocket, request: { url: string; headers: { host: string } }): void {
  console.log('New WebSocket connection established');

  // Extract connection info from query parameters or headers
  const url = new URL(request.url, `http://${request.headers.host}`);
  const playerId = url.searchParams.get('playerId');
  const username = url.searchParams.get('username');
  const sessionId = url.searchParams.get('sessionId');

  if (!playerId || !username || !sessionId) {
    console.error('WebSocket connection missing required parameters');
    ws.close(1008, 'Missing required parameters: playerId, username, sessionId');
    return;
  }

  // Validate session exists
  const session = persistentStorage.getPlayerSession(sessionId);
  if (!session || session.playerId !== playerId) {
    console.error(`Invalid session for WebSocket connection: ${sessionId}`);
    ws.close(1008, 'Invalid session');
    return;
  }

  // Add player to WebSocket manager
  webSocketManager.addPlayer(ws, playerId, username, sessionId);

  // Send connection confirmation
  const confirmationMessage = {
    type: 'connection_established' as const,
    playerId,
    data: {
      message: 'WebSocket connection established',
      playerId,
      username,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    messageId: `conn_${Date.now()}_${playerId}`
  };

  ws.send(JSON.stringify(confirmationMessage));
}

// HTTP handler for WebSocket upgrade requests
export async function GET() {
  try {
    // Initialize WebSocket server
    initializeWebSocketServer();
    
    // For HTTP requests to this endpoint, return WebSocket connection info
    return new Response(JSON.stringify({
      success: true,
      message: 'WebSocket server is running',
      endpoint: 'ws://localhost:8080/api/websocket',
      activeConnections: webSocketManager.getPlayerCount(),
      activeRooms: webSocketManager.getRoomStats(),
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
      error: 'WebSocket server initialization failed',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    console.log('Shutting down WebSocket server...');
    if (wss) {
      wss.close();
    }
    webSocketManager.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down WebSocket server...');
    if (wss) {
      wss.close();
    }
    webSocketManager.shutdown();
    process.exit(0);
  });
}