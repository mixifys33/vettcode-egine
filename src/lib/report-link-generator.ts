/**
 * Report Link Generator
 * Generates shareable links to view reports on the VettCode CLI landing page
 */

import type { VettReport } from "./types";
import { encode } from "js-base64";

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
        scanMode: report.metadata?.scanMode || "quick",
        reportConfidence: report.metadata?.reportConfidence,
        fileTree: report.metadata?.fileTree,
        staticFindings: report.metadata?.staticFindings,
        aiFindings: report.metadata?.aiFindings,
        verifiedFindings: report.metadata?.verifiedFindings,
      },
    };

    // Convert to JSON and encode as base64 (Unicode-safe)
    const jsonData = JSON.stringify(cleanReport);
    const base64Data = encode(jsonData, true); // true = URL-safe encoding

    // Generate the URL with encoded data
    const url = `${LANDING_PAGE_URL}/reports/view?data=${base64Data}`;

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
  // Use a safer limit of 1800 to account for browser differences
  return link.length > 1800;
}

/**
 * Generate a shortened report with fewer findings if the link is too long
 */
export function generateCompactReportLink(report: VettReport, projectName: string): string {
  // Try with full report first
  const normalLink = generateReportViewLink(report, projectName);
  if (!isLinkTooLong(normalLink)) {
    console.log("Using full report - link length:", normalLink.length);
    return normalLink;
  }

  console.log("Full report too large, creating compact version...");

  // Sort findings by severity
  const sortedFindings = [...report.findings].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Try with 50 findings
  let compactReport: VettReport = {
    ...report,
    findings: sortedFindings.slice(0, 50).map(f => ({
      ...f,
      // Truncate long descriptions and evidence
      description: f.description.length > 200 ? f.description.substring(0, 200) + "..." : f.description,
      evidence: f.evidence && f.evidence.length > 150 ? f.evidence.substring(0, 150) + "..." : f.evidence,
      mitigation: f.mitigation.length > 150 ? f.mitigation.substring(0, 150) + "..." : f.mitigation,
      prevention: f.prevention.length > 150 ? f.prevention.substring(0, 150) + "..." : f.prevention,
    })),
    // Remove file tree to save space
    metadata: {
      projectName,
      scannedAt: report.metadata?.scannedAt || new Date().toISOString(),
      filesScanned: report.metadata?.filesScanned || report.scannedFiles || 0,
      linesScanned: report.metadata?.linesScanned || report.scannedLines || 0,
      ignoredPaths: report.metadata?.ignoredPaths || report.ignoredPaths || 0,
      scanMode: report.metadata?.scanMode || "quick",
      reportConfidence: report.metadata?.reportConfidence,
      staticFindings: report.metadata?.staticFindings,
      aiFindings: report.metadata?.aiFindings,
      verifiedFindings: report.metadata?.verifiedFindings,
    },
  };

  let link = generateReportViewLink(compactReport, projectName);
  if (!isLinkTooLong(link)) {
    console.log("Using compact report (50 findings) - link length:", link.length);
    return link;
  }

  // Try with 25 findings
  compactReport.findings = sortedFindings.slice(0, 25).map(f => ({
    ...f,
    description: f.description.length > 150 ? f.description.substring(0, 150) + "..." : f.description,
    evidence: f.evidence && f.evidence.length > 100 ? f.evidence.substring(0, 100) + "..." : f.evidence,
    mitigation: f.mitigation.length > 100 ? f.mitigation.substring(0, 100) + "..." : f.mitigation,
    prevention: f.prevention.length > 100 ? f.prevention.substring(0, 100) + "..." : f.prevention,
  }));

  link = generateReportViewLink(compactReport, projectName);
  if (!isLinkTooLong(link)) {
    console.log("Using compact report (25 findings) - link length:", link.length);
    return link;
  }

  // Try with 10 findings (minimum)
  compactReport.findings = sortedFindings.slice(0, 10).map(f => ({
    id: f.id,
    severity: f.severity,
    category: f.category,
    title: f.title,
    description: f.description.length > 100 ? f.description.substring(0, 100) + "..." : f.description,
    file: f.file,
    line: f.line,
    evidence: undefined, // Remove evidence to save space
    mitigation: f.mitigation.length > 80 ? f.mitigation.substring(0, 80) + "..." : f.mitigation,
    prevention: f.prevention.length > 80 ? f.prevention.substring(0, 80) + "..." : f.prevention,
    source: f.source,
  }));
  
  // Also truncate strengths and blockers
  compactReport.strengths = report.strengths.slice(0, 3);
  compactReport.criticalBlockers = report.criticalBlockers.slice(0, 3);

  link = generateReportViewLink(compactReport, projectName);
  console.log("Using minimal report (10 findings) - link length:", link.length);
  
  return link;
}

/**
 * Copy link to clipboard and show success message
 */
export async function copyReportLinkToClipboard(report: VettReport, projectName: string): Promise<boolean> {
  try {
    console.log("Generating compact report link...");
    const link = generateCompactReportLink(report, projectName);
    console.log("Generated link length:", link.length);
    console.log("Link preview:", link.substring(0, 100) + "...");
    
    // Try modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      console.log("Using modern clipboard API");
      await navigator.clipboard.writeText(link);
      console.log("Successfully copied to clipboard");
      return true;
    }

    // Fallback for older browsers
    console.log("Using fallback clipboard method");
    const textarea = document.createElement('textarea');
    textarea.value = link;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
      const success = document.execCommand('copy');
      console.log("Fallback copy result:", success);
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error("Fallback copy failed:", err);
      document.body.removeChild(textarea);
      return false;
    }
  } catch (error) {
    console.error("Failed to copy link - detailed error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
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
