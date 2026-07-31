import { NextRequest, NextResponse } from "next/server";
import type { VettReport } from "@/lib/types";
import { promises as fs } from "fs";
import path from "path";

/**
 * API endpoint to receive scan reports from CLI
 * POST /api/cli-upload
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.report || !body.projectName) {
      return NextResponse.json(
        { error: "Missing required fields: report, projectName" },
        { status: 400 }
      );
    }

    const { report, projectName, scanMode } = body as {
      report: VettReport;
      projectName: string;
      scanMode: "quick" | "deep";
    };

    // Generate unique report ID
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save report to file system (server-side storage)
    const reportsDir = path.join(process.cwd(), ".vettcode-reports");
    
    try {
      await fs.mkdir(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, continue
    }
    
    const savedReport = {
      id: reportId,
      projectName,
      report,
      savedAt: new Date().toISOString(),
      scanMode: scanMode || "quick",
    };
    
    const reportPath = path.join(reportsDir, `${reportId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(savedReport, null, 2), "utf-8");

    // Generate shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vetted-xi.vercel.app";
    const reportUrl = `${baseUrl}/report/${reportId}`;

    return NextResponse.json({
      success: true,
      reportId: reportId,
      reportUrl,
      message: "Report uploaded successfully",
    });
  } catch (error) {
    console.error("[CLI Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload report", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
