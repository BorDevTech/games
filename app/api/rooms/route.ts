import { NextRequest, NextResponse } from 'next/server';
import persistentStorage from '@/lib/persistentStorage';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    
    if (roomId) {
      // Get specific room
      const roomState = persistentStorage.getRoom(roomId);
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
      const allRooms = persistentStorage.getAllRooms();
      
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
    
    persistentStorage.setRoom(roomId, stateWithTimestamp);
    
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
    
    const deleted = persistentStorage.deleteRoom(roomId);
    
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