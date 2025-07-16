import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Simple in-memory storage for room states
// In production, this would be replaced with a database
const roomStates = new Map<string, Record<string, unknown>>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    if (roomId) {
      // Get specific room
      const roomState = roomStates.get(roomId.toUpperCase());
      if (roomState) {
        return NextResponse.json({
          success: true,
          room: roomState,
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Room not found'
        }, { status: 404 });
      }
    } else {
      // Get all rooms (for admin/debugging purposes)
      const allRooms = Array.from(roomStates.entries()).map(([id, state]) => ({
        id,
        state,
        lastUpdated: state.lastActivity
      }));
      
      return NextResponse.json({
        success: true,
        rooms: allRooms,
        count: allRooms.length,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to get room state:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { roomId, roomState } = await request.json();
    
    if (!roomId || !roomState) {
      return NextResponse.json({
        success: false,
        error: 'Missing roomId or roomState'
      }, { status: 400 });
    }
    
    // Store room state with current timestamp
    const stateWithTimestamp = {
      ...roomState,
      lastUpdated: new Date().toISOString(),
      syncedAt: new Date().toISOString()
    };
    
    roomStates.set(roomId.toUpperCase(), stateWithTimestamp);
    
    return NextResponse.json({
      success: true,
      message: 'Room state updated',
      roomId: roomId.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to update room state:', error);
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
    
    const deleted = roomStates.delete(roomId.toUpperCase());
    
    return NextResponse.json({
      success: true,
      deleted,
      roomId: roomId.toUpperCase(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to delete room state:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}