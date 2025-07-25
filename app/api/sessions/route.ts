import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import persistentStorage from '@/lib/persistentStorage';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Simple in-memory storage for sessions
// In production, this would be replaced with a database like Redis
// Note: Using persistent storage for sessions now

// Generate a cryptographically secure session ID
function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate a consistent player ID from session
function generatePlayerId(sessionId: string, username: string): string {
  // Use session ID + username for consistent player identification
  let hash = 0;
  const str = `${sessionId}_${username.toLowerCase()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `player_${Math.abs(hash).toString(36).toUpperCase()}`;
}

// Clean up expired sessions (older than 24 hours)
function cleanupExpiredSessions(): void {
  // This is now handled by persistentStorage
  persistentStorage.cleanupExpiredSessions();
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('game_session')?.value;
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'No session found'
      }, { status: 404 });
    }
    
    const session = persistentStorage.getPlayerSession(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found or expired'
      }, { status: 404 });
    }
    
    // Update last activity
    session.lastActivity = new Date();
    persistentStorage.setPlayerSession(sessionId, session);
    
    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        playerId: session.playerId,
        username: session.username,
        currentRoomId: session.currentRoomId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      }
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, roomId } = body;
    
    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Username is required'
      }, { status: 400 });
    }
    
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('game_session')?.value;
    let session = sessionId ? persistentStorage.getPlayerSession(sessionId) : null;
    
    // Clean up expired sessions periodically
    cleanupExpiredSessions();
    
    if (!session || session.username !== username.trim()) {
      // Create new session if no session exists OR username is different
      sessionId = generateSessionId();
      const playerId = generatePlayerId(sessionId, username.trim());
      
      session = {
        sessionId,
        playerId,
        username: username.trim(),
        createdAt: new Date(),
        lastActivity: new Date(),
        currentRoomId: roomId
      };
      
      persistentStorage.setPlayerSession(sessionId, session);
    } else {
      // Update existing session only if username matches
      session.lastActivity = new Date();
      if (roomId) {
        session.currentRoomId = roomId;
      }
      persistentStorage.setPlayerSession(sessionId!, session);
    }
    
    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        playerId: session.playerId,
        username: session.username,
        currentRoomId: session.currentRoomId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      }
    });
    
    // Set HTTP-only cookie that expires in 7 days
    response.cookies.set('game_session', session.sessionId as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Failed to create/update session:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId } = body;
    
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('game_session')?.value;
    
    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'No session found'
      }, { status: 404 });
    }
    
    const session = persistentStorage.getPlayerSession(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found or expired'
      }, { status: 404 });
    }
    
    // Update session
    session.currentRoomId = roomId;
    session.lastActivity = new Date();
    persistentStorage.setPlayerSession(sessionId, session);
    
    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        playerId: session.playerId,
        username: session.username,
        currentRoomId: session.currentRoomId,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      }
    });
  } catch (error) {
    console.error('Failed to update session:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('game_session')?.value;
    
    if (sessionId) {
      persistentStorage.deletePlayerSession(sessionId);
    }
    
    const response = NextResponse.json({
      success: true,
      message: 'Session deleted'
    });
    
    // Clear the session cookie
    response.cookies.delete('game_session');
    
    return response;
  } catch (error) {
    console.error('Failed to delete session:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}