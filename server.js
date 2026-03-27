// Modern Multiplayer Game Server
// Implements authoritative server architecture with direct connections
// Features: Real-time state sync, anti-cheat, optimized networking

const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { parse } = require('url');
const next = require('next');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3001;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Import modern multiplayer components
let GameServer, ModernConnectionManager;
try {
  // These will be loaded after TypeScript compilation
  const gameServerModule = require('./lib/multiplayer/GameServer');
  const connectionManagerModule = require('./lib/multiplayer/ConnectionManager');
  GameServer = gameServerModule.GameServer;
  ModernConnectionManager = connectionManagerModule.ModernConnectionManager;
} catch (error) {
  console.warn('TypeScript modules not compiled yet, using fallback implementation');
}

// Modern server implementation with fallback
let gameServer = null;
let connectionManager = null;

// Initialize modern multiplayer architecture if available
if (GameServer && ModernConnectionManager) {
  console.log('Initializing modern multiplayer architecture...');
  
  connectionManager = new ModernConnectionManager();
  gameServer = new GameServer(connectionManager);
  
  // Set up event handlers for modern architecture
  connectionManager.on('message', ({ connectionId, playerId, message }) => {
    // Route messages to game server
    if (message.type === 'game_action' || message.type === 'player_input') {
      gameServer.processPlayerInput(playerId, {
        playerId,
        type: message.data?.action || message.type,
        data: message.data || {},
        sequenceNumber: message.sequenceNumber || 0
      });
    }
  });
  
  connectionManager.on('disconnect', ({ playerId, reason }) => {
    gameServer.handlePlayerDisconnection(playerId, reason);
  });
  
  // Game server events
  gameServer.on('player_connected', (player) => {
    console.log(`Modern multiplayer: Player ${player.username} connected`);
  });
  
  gameServer.on('lobby_created', (lobby) => {
    console.log(`Modern multiplayer: Lobby ${lobby.id} created for ${lobby.gameType}`);
  });
  
  gameServer.on('game_started', (lobby) => {
    console.log(`Modern multiplayer: Game started in lobby ${lobby.id}`);
  });
} else {
  console.log('Using fallback multiplayer implementation...');
}

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

// Modern WebSocket connection handler
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

// Initialize WebSocket Server with modern architecture
const wss = new WebSocketServer({ 
  noServer: true,
  perMessageDeflate: true,
  maxPayload: 1024 * 1024, // 1MB max message size
});

// Handle new WebSocket connections with modern or fallback implementation
wss.on('connection', async function connection(ws, request, connectionParams) {
  const { playerId, username, sessionId } = connectionParams;
  const connectionId = uuidv4();
  
  console.log(`WebSocket connection established for ${username} (${playerId})`);
  
  if (connectionManager && gameServer) {
    // Use modern multiplayer architecture
    try {
      const result = await connectionManager.handleConnection(ws, request, connectionId);
      if (result.success && result.playerId) {
        await gameServer.handlePlayerConnection(result.playerId, username, connectionId);
      }
    } catch (error) {
      console.error('Modern connection handling error:', error);
      // Fall back to legacy implementation
      handleLegacyConnection(ws, connectionParams, connectionId);
    }
  } else {
    // Use fallback implementation
    handleLegacyConnection(ws, connectionParams, connectionId);
  }
});

// Fallback implementation for compatibility
function handleLegacyConnection(ws, connectionParams, connectionId) {
  const { playerId, username, sessionId } = connectionParams;
  
  // Store connection info (legacy format)
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
  
  // Legacy connection tracking
  if (typeof activeConnections !== 'undefined') {
    activeConnections.set(playerId, connectionInfo);
    playerSessions.set(sessionId, connectionInfo);
  }

  // Set up legacy ping/pong heartbeat
  ws.isAlive = true;
  ws.on('pong', function heartbeat() {
    ws.isAlive = true;
    connectionInfo.lastActivity = new Date();
  });

  // Handle legacy messages
  ws.on('message', function message(data) {
    try {
      connectionInfo.lastActivity = new Date();
      const parsedMessage = JSON.parse(data.toString());
      
      if (!parsedMessage.type || !parsedMessage.messageId) {
        sendError(ws, 'Invalid message format');
        return;
      }
      
      handleLegacyGameMessage(playerId, parsedMessage);
      
    } catch (error) {
      console.error(`Error processing legacy message from ${playerId}:`, error);
      sendError(ws, 'Message processing error');
    }
  });

  // Handle connection close
  ws.on('close', function close(code, reason) {
    console.log(`WebSocket connection closed for ${username}: ${code} ${reason}`);
    cleanupLegacyConnection(playerId);
  });

  // Handle connection errors
  ws.on('error', function error(err) {
    console.error(`WebSocket error for ${username}:`, err);
    cleanupLegacyConnection(playerId);
  });

  // Send connection confirmation
  sendMessage(ws, {
    type: 'connection_established',
    playerId,
    data: { 
      message: 'Real-time connection established',
      serverTime: new Date().toISOString(),
      architecture: 'legacy_fallback'
    },
    timestamp: new Date().toISOString(),
    messageId: `conn_${Date.now()}`
  });
}

// Legacy game state management (fallback)
const gameRooms = new Map();
const playerSessions = new Map();
const activeConnections = new Map();

// Legacy message queue for backpressure handling
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
          this.removeConnection(connection);
        }
      }
      
      await new Promise(resolve => setImmediate(resolve));
    }
    
    this.processing = false;
  }

  removeConnection(connection) {
    this.queue = this.queue.filter(item => item.connection !== connection);
  }
}

const messageQueue = new MessageQueue();

// Legacy game message handling
function handleLegacyGameMessage(playerId, message) {
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

  if (connection.roomId) {
    handleLeaveRoom(playerId, connection.roomId);
  }

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

  if (room.players.size === 0) {
    gameRooms.delete(roomId);
  } else {
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

  broadcastToRoom(connection.roomId, message, playerId);
}

function sendMessage(ws, message) {
  if (ws.readyState === ws.OPEN) {
    if (ws.bufferedAmount > 1024 * 1024) {
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

function cleanupLegacyConnection(playerId) {
  const connection = activeConnections.get(playerId);
  if (!connection) return;

  if (connection.roomId) {
    handleLeaveRoom(playerId, connection.roomId);
  }

  messageQueue.removeConnection(connection.socket);
  activeConnections.delete(playerId);
  playerSessions.delete(connection.sessionId);
}

// Heartbeat interval to detect broken connections
const heartbeatInterval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      // Find and cleanup the connection
      for (const [playerId, conn] of activeConnections.entries()) {
        if (conn.socket === ws) {
          console.log(`Heartbeat failed for ${conn.username}, terminating connection`);
          cleanupLegacyConnection(playerId);
          return ws.terminate();
        }
      }
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Check every 30 seconds

// Graceful shutdown handling
function shutdown() {
  console.log('Shutting down game server...');
  
  clearInterval(heartbeatInterval);
  
  // Shutdown modern components if available
  if (gameServer) {
    gameServer.shutdown();
  }
  if (connectionManager) {
    connectionManager.shutdown();
  }
  
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
    console.log(`> Modern multiplayer game server ready`);
    console.log(`> Architecture: ${gameServer ? 'Modern authoritative server' : 'Legacy fallback'}`);
    console.log(`> Features: Direct connections, real-time sync, anti-cheat measures`);
  });

  // Log server stats periodically
  setInterval(() => {
    if (gameServer && connectionManager) {
      const gameStats = gameServer.getServerStats();
      const connStats = connectionManager.getStats();
      console.log(`Modern server stats: ${connStats.totalConnections} connections, ${gameStats.activeLobbies} lobbies, ${gameStats.connectedPlayers} players`);
    } else {
      console.log(`Legacy server stats: ${activeConnections.size} connections, ${gameRooms.size} active rooms`);
    }
  }, 60000); // Log every minute
});