/**
 * Report Link Generator
 * Generates shareable links to view reports on the VettCode CLI landing page
 */

import type { VettReport } from "./types";

const LANDING_PAGE_URL = process.env.NEXT_PUBLIC_LANDING_URL || "https://vettcodecli.vercel.app";

/**
 * Generate a shareable link to view the report on the landing page
 * The report data is encoded in the URL as base64
 */
export function generateReportViewLink(report: VettReport, projectName: string): string {
  try {
    // Create a clean report object with only necessary data
    const cleanReport = {
      score: report.score,
      grade: report.grade,
      summary: report.summary,
      executiveVerdict: report.executiveVerdict,
      findings: report.findings,
      strengths: report.strengths,
      criticalBlockers: report.criticalBlockers,
      metadata: {
        projectName,
        scannedAt: report.metadata?.scannedAt || new Date().toISOString(),
        filesScanned: report.metadata?.filesScanned || report.scannedFiles || 0,
        linesScanned: report.metadata?.linesScanned || report.scannedLines || 0,
        ignoredPaths: report.metadata?.ignoredPaths || report.ignoredPaths || 0,
        reportConfidence: report.metadata?.reportConfidence,
        fileTree: report.metadata?.fileTree,
        staticFindings: report.metadata?.staticFindings,
        aiFindings: report.metadata?.aiFindings,
        verifiedFindings: report.metadata?.verifiedFindings,
        scanMode: "quick", // Default to quick scan
      },
    };

    // Convert to JSON and encode as base64
    const jsonData = JSON.stringify(cleanReport);
    const base64Data = btoa(jsonData);

    // Generate the URL with encoded data
    const url = `${LANDING_PAGE_URL}/reports/view?data=${encodeURIComponent(base64Data)}`;

    return url;
  } catch (error) {
    console.error("Failed to generate report link:", error);
    throw new Error("Failed to generate shareable link");
  }
}

/**
 * Check if the generated link is too long (URL length limits)
 * Most browsers support ~2000 characters safely
 */
export function isLinkTooLong(link: string): boolean {
  return link.length > 2000;
}

/**
 * Generate a shortened report with fewer findings if the link is too long
 */
export function generateCompactReportLink(report: VettReport, projectName: string): string {
  // If normal link works, use it
  const normalLink = generateReportViewLink(report, projectName);
  if (!isLinkTooLong(normalLink)) {
    return normalLink;
  }

  // Otherwise, create a compact version with top findings only
  const compactReport: VettReport = {
    ...report,
    findings: report.findings
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 50), // Keep top 50 findings
    metadata: {
      ...report.metadata,
      projectName,
    },
  };

  return generateReportViewLink(compactReport, projectName);
}

/**
 * Copy link to clipboard and show success message
 */
export async function copyReportLinkToClipboard(report: VettReport, projectName: string): Promise<boolean> {
  try {
    const link = generateCompactReportLink(report, projectName);
    
    // Try modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(link);
      return true;
    }

    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = link;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    return success;
  } catch (error) {
    console.error("Failed to copy link:", error);
    return false;
  }
}

/**
 * Open report in new tab on landing page
 */
export function openReportInNewTab(report: VettReport, projectName: string): void {
  try {
    const link = generateCompactReportLink(report, projectName);
    window.open(link, '_blank', 'noopener,noreferrer');
  } catch (error) {
    console.error("Failed to open report:", error);
    throw error;
  }
}
