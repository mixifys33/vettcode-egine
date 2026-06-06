import { NextRequest, NextResponse } from "next/server";
import type { ScanAnalytics } from "@/lib/scan-analytics";

export const dynamic = 'force-dynamic';

/**
 * POST /api/analytics/log
 * Logs a scan analytics entry to the backend database
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const analytics: ScanAnalytics = body;
    
    // Validate required fields
    if (!analytics.id || !analytics.timestamp || !analytics.projectName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    
    // Log to console
    console.log('[Analytics] Scan logged:', {
      id: analytics.id,
      user: analytics.isAuthenticated ? analytics.userEmail : 'unauthenticated',
      project: analytics.projectName,
      score: analytics.score,
      grade: analytics.grade,
      findings: analytics.totalFindings,
      duration: `${analytics.scanDurationMs}ms`,
      scanMode: analytics.scanMode,
    });
    
    // Send to backend database
    try {
      const backendResponse = await fetch(`${backendUrl}/api/scan-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanId: analytics.id,
          userId: analytics.userId,
          userEmail: analytics.userEmail,
          userName: analytics.userName,
          isAuthenticated: analytics.isAuthenticated,
          projectName: analytics.projectName,
          scanMode: analytics.scanMode,
          score: analytics.score,
          grade: analytics.grade,
          filesScanned: analytics.filesScanned,
          linesScanned: analytics.linesScanned,
          criticalFindings: analytics.criticalFindings,
          highFindings: analytics.highFindings,
          mediumFindings: analytics.mediumFindings,
          lowFindings: analytics.lowFindings,
          infoFindings: analytics.infoFindings,
          totalFindings: analytics.totalFindings,
          scanDurationMs: analytics.scanDurationMs,
          tokensSaved: analytics.tokensSaved,
          scannersUsed: analytics.scannersUsed,
          success: analytics.success,
          errorMessage: analytics.errorMessage,
        }),
      });

      if (!backendResponse.ok) {
        console.warn('[Analytics] Failed to save to backend database:', backendResponse.statusText);
      } else {
        console.log('[Analytics] Successfully saved to backend database');
      }
    } catch (backendError) {
      console.warn('[Analytics] Backend database save failed:', backendError);
      // Don't fail the request if backend is unavailable
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Analytics logged successfully' 
    });
    
  } catch (error) {
    console.error('[Analytics] Error logging scan:', error);
    return NextResponse.json(
      { 
        error: "Failed to log analytics",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
