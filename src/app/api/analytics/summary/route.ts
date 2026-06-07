import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/analytics/summary
 * Returns analytics summary (requires admin authentication in production)
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check - require admin authorization
    const authHeader = req.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '').trim();
    
    // Validate admin API key
    const validAdminKey = process.env.ADMIN_API_KEY;
    if (!validAdminKey || apiKey !== validAdminKey) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
    }
    
    console.log('[Analytics] Summary endpoint accessed by authorized admin');
    
    // Return analytics summary
    // Note: Analytics are currently stored client-side
    // To enable server-side analytics, implement database storage
    return NextResponse.json({
      status: 'client-side-only',
      message: 'Analytics are stored in browser localStorage. Server-side analytics require database implementation.',
      implementation: {
        required: ['Database setup', 'Analytics collection endpoint', 'Data aggregation service'],
        recommended: ['PostgreSQL with Prisma', 'MongoDB with aggregation pipeline', 'Time-series database for metrics'],
      },
      clientAccess: {
        storageKey: 'vettcode-analytics',
        viewInConsole: 'localStorage.getItem("vettcode-analytics")',
      }
    });
    
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
