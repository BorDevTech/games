import { NextRequest, NextResponse } from 'next/server';
import persistentStorage from '@/lib/persistentStorage';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: 'Missing roomId'
      }, { status: 400 });
    }
    
    const gameState = persistentStorage.getGameSession(roomId);
    if (gameState) {
      return NextResponse.json({
        success: true,
        gameState,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Game state not found'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Failed to get game state:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, gameState, playerId, action } = await request.json();
    
    if (!roomId || !gameState) {
      return NextResponse.json({
        success: false,
        error: 'Missing roomId or gameState'
      }, { status: 400 });
    }
    
    // Store game state with metadata
    const stateWithMetadata = {
      ...gameState,
      lastUpdated: new Date().toISOString(),
      lastAction: action || 'state_update',
      lastPlayerId: playerId,
      syncedAt: new Date().toISOString()
    };
    
    persistentStorage.setGameSession(roomId, stateWithMetadata);
    
    return NextResponse.json({
      success: true,
      message: 'Game state updated',
      roomId: roomId.toUpperCase(),
      action: action || 'state_update',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to update game state:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: 'Missing roomId'
      }, { status: 400 });
    }
    
    const deleted = persistentStorage.deleteGameSession(roomId);
    
    return NextResponse.json({
      success: true,
      deleted,
      roomId: roomId.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to delete game state:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}