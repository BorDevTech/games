// Standalone WebSocket Server for Real-time Multiplayer Gaming
// Implements proper WebSocket API standards as per MDN documentation
// Provides backpressure handling and cross-browser compatibility

const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3001;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Game state management
const gameRooms = new Map();
const playerSessions = new Map();
const activeConnections = new Map();

// WebSocket message queue for backpressure handling
class MessageQueue {
  constructor(maxSize = 1000) {
    this.queue = [];
    this.maxSize = maxSize;
    this.processing = false;
  }

  enqueue(message, connection) {
    if (this.queue.length >= this.maxSize) {
      console.warn('Message queue full, dropping oldest message');
      this.queue.shift();
    }
    
    this.queue.push({ message, connection, timestamp: Date.now() });
    this.process();
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { message, connection } = this.queue.shift();
      
      if (connection.readyState === connection.OPEN) {
        try {
          connection.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending queued message:', error);
          // Connection error, remove from active connections
          this.removeConnection(connection);
        }
      }
      
      // Yield control to prevent blocking
      await new Promise(resolve => setImmediate(resolve));
    }
    
    this.processing = false;
  }

  removeConnection(connection) {
    this.queue = this.queue.filter(item => item.connection !== connection);
  }
}

const messageQueue = new MessageQueue();

// WebSocket connection handler with proper MDN standards implementation
function handleWebSocketUpgrade(request, socket, head) {
  const { pathname, query } = parse(request.url, true);
  
  if (pathname !== '/api/websocket') {
    socket.destroy();
    return;
  }

  // Validate required parameters
  const { playerId, username, sessionId } = query;
  if (!playerId || !username || !sessionId) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit('connection', ws, request, { playerId, username, sessionId });
  });
}

// Initialize WebSocket Server with proper error handling
const wss = new WebSocketServer({ 
  noServer: true,
  // Enable per-message deflate for bandwidth optimization
  perMessageDeflate: true,
  // Set reasonable limits
  maxPayload: 1024 * 1024, // 1MB max message size
});

// Handle new WebSocket connections
wss.on('connection', function connection(ws, request, connectionParams) {
  const { playerId, username, sessionId } = connectionParams;
  
  console.log(`WebSocket connection established for ${username} (${playerId})`);
  
  // Store connection info
  const connectionInfo = {
    playerId,
    username,
    sessionId,
    socket: ws,
    joinedAt: new Date(),
    lastActivity: new Date(),
    roomId: null,
    isAlive: true
  };
  
  activeConnections.set(playerId, connectionInfo);
  playerSessions.set(sessionId, connectionInfo);

  // Set up ping/pong heartbeat as per MDN recommendations
  ws.isAlive = true;
  ws.on('pong', function heartbeat() {
    ws.isAlive = true;
    connectionInfo.lastActivity = new Date();
  });

  // Handle incoming messages with backpressure consideration
  ws.on('message', function message(data) {
    try {
      connectionInfo.lastActivity = new Date();
      const parsedMessage = JSON.parse(data.toString());
      
      // Validate message structure
      if (!parsedMessage.type || !parsedMessage.messageId) {
        sendError(ws, 'Invalid message format');
        return;
      }
      
      handleGameMessage(playerId, parsedMessage);
      
    } catch (error) {
      console.error(`Error processing message from ${playerId}:`, error);
      sendError(ws, 'Message processing error');
    }
  });

  // Handle connection close
  ws.on('close', function close(code, reason) {
    console.log(`WebSocket connection closed for ${username}: ${code} ${reason}`);
    cleanupConnection(playerId);
  });

  // Handle connection errors
  ws.on('error', function error(err) {
    console.error(`WebSocket error for ${username}:`, err);
    cleanupConnection(playerId);
  });

  // Send connection confirmation
  sendMessage(ws, {
    type: 'connection_established',
    playerId,
    data: { 
      message: 'Real-time connection established',
      serverTime: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    messageId: `conn_${Date.now()}`
  });
});

// Heartbeat interval to detect broken connections
const heartbeatInterval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      // Find and cleanup the connection
      for (const [playerId, conn] of activeConnections.entries()) {
        if (conn.socket === ws) {
          console.log(`Heartbeat failed for ${conn.username}, terminating connection`);
          cleanupConnection(playerId);
          return ws.terminate();
        }
      }
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Check every 30 seconds

// Game message handling
function handleGameMessage(playerId, message) {
  const connection = activeConnections.get(playerId);
  if (!connection) return;

  switch (message.type) {
    case 'join_room':
      handleJoinRoom(playerId, message.roomId);
      break;
      
    case 'leave_room':
      handleLeaveRoom(playerId, message.roomId);
      break;
      
    case 'game_action':
      handleGameAction(playerId, message);
      break;
      
    case 'heartbeat':
      // Respond to client heartbeat
      sendMessage(connection.socket, {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
        messageId: `heartbeat_${Date.now()}`
      });
      break;
      
    default:
      console.warn(`Unknown message type: ${message.type}`);
  }
}

function handleJoinRoom(playerId, roomId) {
  const connection = activeConnections.get(playerId);
  if (!connection) return;

  // Leave current room if in one
  if (connection.roomId) {
    handleLeaveRoom(playerId, connection.roomId);
  }

  // Initialize room if it doesn't exist
  if (!gameRooms.has(roomId)) {
    gameRooms.set(roomId, {
      id: roomId,
      players: new Set(),
      createdAt: new Date(),
      lastActivity: new Date()
    });
  }

  const room = gameRooms.get(roomId);
  room.players.add(playerId);
  room.lastActivity = new Date();
  connection.roomId = roomId;

  console.log(`Player ${connection.username} joined room ${roomId}`);

  // Notify all players in the room
  broadcastToRoom(roomId, {
    type: 'player_update',
    roomId,
    data: {
      action: 'joined',
      playerId,
      playerName: connection.username,
      playerCount: room.players.size,
      players: Array.from(room.players).map(id => {
        const conn = activeConnections.get(id);
        return conn ? { id: conn.playerId, username: conn.username } : null;
      }).filter(Boolean)
    },
    timestamp: new Date().toISOString(),
    messageId: `join_${Date.now()}_${playerId}`
  });
}

function handleLeaveRoom(playerId, roomId) {
  const connection = activeConnections.get(playerId);
  const room = gameRooms.get(roomId);
  
  if (!connection || !room) return;

  room.players.delete(playerId);
  connection.roomId = null;

  console.log(`Player ${connection.username} left room ${roomId}`);

  // Clean up empty rooms
  if (room.players.size === 0) {
    gameRooms.delete(roomId);
  } else {
    // Notify remaining players
    broadcastToRoom(roomId, {
      type: 'player_update',
      roomId,
      data: {
        action: 'left',
        playerId,
        playerName: connection.username,
        playerCount: room.players.size,
        players: Array.from(room.players).map(id => {
          const conn = activeConnections.get(id);
          return conn ? { id: conn.playerId, username: conn.username } : null;
        }).filter(Boolean)
      },
      timestamp: new Date().toISOString(),
      messageId: `leave_${Date.now()}_${playerId}`
    });
  }
}

function handleGameAction(playerId, message) {
  const connection = activeConnections.get(playerId);
  if (!connection || !connection.roomId) return;

  // Broadcast game action to all players in the room except sender
  broadcastToRoom(connection.roomId, message, playerId);
}

// Send message with backpressure handling
function sendMessage(ws, message) {
  if (ws.readyState === ws.OPEN) {
    // Check buffer size for backpressure handling
    if (ws.bufferedAmount > 1024 * 1024) { // 1MB threshold
      console.warn('WebSocket buffer full, queuing message');
      messageQueue.enqueue(message, ws);
    } else {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
        messageQueue.enqueue(message, ws);
      }
    }
  } else {
    // Queue message if connection is not ready
    messageQueue.enqueue(message, ws);
  }
}

function sendError(ws, errorMessage) {
  sendMessage(ws, {
    type: 'error',
    data: { message: errorMessage },
    timestamp: new Date().toISOString(),
    messageId: `error_${Date.now()}`
  });
}

function broadcastToRoom(roomId, message, excludePlayerId = null) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  for (const playerId of room.players) {
    if (playerId !== excludePlayerId) {
      const connection = activeConnections.get(playerId);
      if (connection) {
        sendMessage(connection.socket, message);
      }
    }
  }
}

function cleanupConnection(playerId) {
  const connection = activeConnections.get(playerId);
  if (!connection) return;

  // Leave any room the player was in
  if (connection.roomId) {
    handleLeaveRoom(playerId, connection.roomId);
  }

  // Clean up from message queue
  messageQueue.removeConnection(connection.socket);

  // Remove from tracking
  activeConnections.delete(playerId);
  playerSessions.delete(connection.sessionId);
}

// Graceful shutdown handling
function shutdown() {
  console.log('Shutting down WebSocket server...');
  
  clearInterval(heartbeatInterval);
  
  // Close all WebSocket connections
  wss.clients.forEach(function each(ws) {
    ws.close(1000, 'Server shutdown');
  });
  
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the application
app.prepare().then(() => {
  const server = createServer((req, res) => {
    return handle(req, res);
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', handleWebSocketUpgrade);

  // Start server
  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready for real-time connections`);
    console.log(`> Implementing MDN WebSocket API standards with backpressure handling`);
  });

  // Log server stats periodically
  setInterval(() => {
    console.log(`Server stats: ${activeConnections.size} connections, ${gameRooms.size} active rooms`);
  }, 60000); // Log every minute
});