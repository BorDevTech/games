// Session Management Service for Cookie-Based Player Persistence
// Handles player sessions across tabs and page refreshes with real-time integration

import realTimeClient from './realTimeClient';

export interface PlayerSession {
  sessionId: string;
  playerId: string;
  username: string;
  currentRoomId?: string;
  createdAt: Date;
  lastActivity: Date;
}

class SessionManager {
  private currentSession: PlayerSession | null = null;
  private sessionCheckPromise: Promise<PlayerSession | null> | null = null;

  // Get current session from server
  async getCurrentSession(): Promise<PlayerSession | null> {
    // Prevent multiple concurrent session checks
    if (this.sessionCheckPromise) {
      return this.sessionCheckPromise;
    }

    this.sessionCheckPromise = this.fetchCurrentSession();
    const result = await this.sessionCheckPromise;
    this.sessionCheckPromise = null;
    return result;
  }

  private async fetchCurrentSession(): Promise<PlayerSession | null> {
    try {
      const response = await fetch('/api/sessions', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          this.currentSession = {
            ...data.session,
            createdAt: new Date(data.session.createdAt),
            lastActivity: new Date(data.session.lastActivity)
          };
          return this.currentSession;
        }
      }
    } catch (error) {
      console.error('Failed to get current session:', error);
    }

    this.currentSession = null;
    return null;
  }

  // Create or update session with username and establish real-time connection
  async createOrUpdateSession(username: string, roomId?: string): Promise<PlayerSession | null> {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ username: username.trim(), roomId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session) {
          this.currentSession = {
            ...data.session,
            createdAt: new Date(data.session.createdAt),
            lastActivity: new Date(data.session.lastActivity)
          };
          
          // Establish real-time connection
          await this.connectRealTime();
          
          return this.currentSession;
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Failed to create/update session:', error);
      throw error;
    }

    return null;
  }

  // Update current room in session
  async updateCurrentRoom(roomId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ roomId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.session && this.currentSession) {
          this.currentSession.currentRoomId = data.session.currentRoomId;
          this.currentSession.lastActivity = new Date(data.session.lastActivity);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to update session room:', error);
    }

    return false;
  }

  // Clear session (logout) and disconnect real-time
  async clearSession(): Promise<boolean> {
    try {
      // Disconnect real-time first
      realTimeClient.disconnect();
      
      const response = await fetch('/api/sessions', {
        method: 'DELETE',
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        this.currentSession = null;
        return true;
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }

    return false;
  }

  // Get player information for room operations
  async getPlayerInfo(username?: string): Promise<{ id: string; username: string } | null> {
    // If we have a current session and no username provided, use session data
    if (this.currentSession && !username) {
      return {
        id: this.currentSession.playerId,
        username: this.currentSession.username
      };
    }

    // If username is provided, create or update session
    if (username) {
      const session = await this.createOrUpdateSession(username);
      if (session) {
        return {
          id: session.playerId,
          username: session.username
        };
      }
    }

    // Try to get existing session
    const session = await this.getCurrentSession();
    if (session) {
      return {
        id: session.playerId,
        username: session.username
      };
    }

    return null;
  }

  // Check if user has an active session
  async hasActiveSession(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session !== null;
  }

  // Connect to real-time WebSocket
  async connectRealTime(): Promise<boolean> {
    if (!this.currentSession) {
      console.error('No session available for real-time connection');
      return false;
    }

    try {
      const connected = await realTimeClient.connect(
        this.currentSession.playerId,
        this.currentSession.username,
        this.currentSession.sessionId
      );
      
      if (connected) {
        console.log('Real-time connection established for', this.currentSession.username);
      } else {
        console.warn('Failed to establish real-time connection');
      }
      
      return connected;
    } catch (error) {
      console.error('Error connecting to real-time:', error);
      return false;
    }
  }

  // Get real-time client for direct access
  getRealTimeClient() {
    return realTimeClient;
  }

  // Get connection status
  getRealTimeStatus() {
    return realTimeClient.getConnectionStatus();
  }

  // Get cached session (doesn't make API call)
  getCachedSession(): PlayerSession | null {
    return this.currentSession;
  }

  // Initialize session on app start
  async initializeSession(): Promise<PlayerSession | null> {
    return this.getCurrentSession();
  }

  // Recover session if possible, create anonymous session if not
  async recoverOrCreateSession(fallbackUsername?: string): Promise<PlayerSession | null> {
    // Try to recover existing session
    let session = await this.getCurrentSession();
    
    if (!session && fallbackUsername) {
      // Create new session with fallback username
      session = await this.createOrUpdateSession(fallbackUsername);
    }
    
    return session;
  }

  // Check if username is available in current session context
  async isUsernameConsistent(username: string): Promise<boolean> {
    const session = await this.getCurrentSession();
    if (!session) return true; // No session, any username is fine
    
    return session.username.toLowerCase() === username.toLowerCase();
  }

  // Get session info for debugging
  async getSessionInfo(): Promise<{ hasSession: boolean; sessionAge?: number; username?: string }> {
    const session = await this.getCurrentSession();
    if (!session) {
      return { hasSession: false };
    }
    
    const sessionAge = Date.now() - session.createdAt.getTime();
    return {
      hasSession: true,
      sessionAge,
      username: session.username
    };
  }
}

// Export singleton instance
const sessionManager = new SessionManager();
export default sessionManager;