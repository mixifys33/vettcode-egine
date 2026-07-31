import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * API endpoint to retrieve CLI-uploaded reports
 * GET /api/cli-report/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id;
    
    if (!reportId || !reportId.startsWith("report_")) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      );
    }

    // Load report from file system
    const reportsDir = path.join(process.cwd(), ".vettcode-reports");
    const reportPath = path.join(reportsDir, `${reportId}.json`);
    
    try {
      const fileContent = await fs.readFile(reportPath, "utf-8");
      const savedReport = JSON.parse(fileContent);
      
      return NextResponse.json({
        success: true,
        report: savedReport,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[CLI Report Fetch] Error:", error);
    return NextResponse.json(
      { error: "Failed to load report", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
