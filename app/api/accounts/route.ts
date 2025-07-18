import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Simple account data structure for future implementation
// interface UserAccount {
//   id: string;
//   username: string;
//   email?: string;
//   createdAt: Date;
//   lastLogin: Date;
//   gameStats: {
//     gamesPlayed: number;
//     gamesWon: number;
//     favoriteGame?: string;
//   };
// }

// Placeholder storage - would be replaced with database in production
// const accounts = new Map<string, UserAccount>();

// This endpoint is prepared for future account system implementation
// Currently returns "not implemented" responses

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'register') {
      return NextResponse.json({
        success: false,
        error: 'Account registration not yet implemented',
        message: 'Currently using session-based anonymous play. Account system coming soon!'
      }, { status: 501 });
    }
    
    if (action === 'login') {
      return NextResponse.json({
        success: false,
        error: 'Account login not yet implemented',
        message: 'Currently using session-based anonymous play. Account system coming soon!'
      }, { status: 501 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
  } catch (error) {
    console.error('Account API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Account system placeholder',
      status: 'not_implemented',
      features: {
        registration: false,
        login: false,
        crossDeviceSync: false,
        gameStats: false
      },
      currentSystem: 'session_based_anonymous'
    });
  } catch (error) {
    console.error('Account API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}