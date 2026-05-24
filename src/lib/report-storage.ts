/**
 * Report Storage Utility
 * Manages saving and retrieving scan reports for authenticated users
 */

import type { VettReport } from "./types";
import { getAuthUser } from "./auth";

export interface SavedReport {
  id: string;
  projectName: string;
  report: VettReport;
  savedAt: string;
  scanMode: "quick" | "deep";
}

const REPORTS_STORAGE_KEY = "vettcode_saved_reports";
const MAX_REPORTS = 50; // Limit to prevent localStorage overflow

/**
 * Get all saved reports for the current user
 */
export function getSavedReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  
  const user = getAuthUser();
  if (!user) return []; // Only authenticated users can save reports
  
  try {
    const stored = localStorage.getItem(`${REPORTS_STORAGE_KEY}_${user.id}`);
    if (!stored) return [];
    
    const reports = JSON.parse(stored) as SavedReport[];
    // Sort by most recent first
    return reports.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch (error) {
    console.error("Error loading saved reports:", error);
    return [];
  }
}

/**
 * Save a new report
 */
export function saveReport(
  projectName: string,
  report: VettReport,
  scanMode: "quick" | "deep" = "quick"
): SavedReport {
  if (typeof window === "undefined") throw new Error("Cannot save reports on server");
  
  const user = getAuthUser();
  if (!user) throw new Error("Must be authenticated to save reports");
  
  const savedReport: SavedReport = {
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    projectName,
    report,
    savedAt: new Date().toISOString(),
    scanMode,
  };
  
  const existingReports = getSavedReports();
  
  // Add new report at the beginning
  const updatedReports = [savedReport, ...existingReports];
  
  // Limit to MAX_REPORTS
  const limitedReports = updatedReports.slice(0, MAX_REPORTS);
  
  try {
    localStorage.setItem(
      `${REPORTS_STORAGE_KEY}_${user.id}`,
      JSON.stringify(limitedReports)
    );
    return savedReport;
  } catch (error) {
    console.error("Error saving report:", error);
    throw new Error("Failed to save report. Storage may be full.");
  }
}

/**
 * Get a specific report by ID
 */
export function getReportById(reportId: string): SavedReport | null {
  const reports = getSavedReports();
  return reports.find(r => r.id === reportId) || null;
}

/**
 * Delete a report by ID
 */
export function deleteReport(reportId: string): boolean {
  if (typeof window === "undefined") return false;
  
  const user = getAuthUser();
  if (!user) return false;
  
  try {
    const reports = getSavedReports();
    const filtered = reports.filter(r => r.id !== reportId);
    
    localStorage.setItem(
      `${REPORTS_STORAGE_KEY}_${user.id}`,
      JSON.stringify(filtered)
    );
    return true;
  } catch (error) {
    console.error("Error deleting report:", error);
    return false;
  }
}

/**
 * Update report project name
 */
export function updateReportName(reportId: string, newName: string): boolean {
  if (typeof window === "undefined") return false;
  
  const user = getAuthUser();
  if (!user) return false;
  
  try {
    const reports = getSavedReports();
    const updated = reports.map(r => 
      r.id === reportId ? { ...r, projectName: newName } : r
    );
    
    localStorage.setItem(
      `${REPORTS_STORAGE_KEY}_${user.id}`,
      JSON.stringify(updated)
    );
    return true;
  } catch (error) {
    console.error("Error updating report name:", error);
    return false;
  }
}

/**
 * Clear all saved reports for current user
 */
export function clearAllReports(): boolean {
  if (typeof window === "undefined") return false;
  
  const user = getAuthUser();
  if (!user) return false;
  
  try {
    localStorage.removeItem(`${REPORTS_STORAGE_KEY}_${user.id}`);
    return true;
  } catch (error) {
    console.error("Error clearing reports:", error);
    return false;
  }
}

/**
 * Get storage usage info
 */
export function getStorageInfo(): { count: number; maxReports: number } {
  const reports = getSavedReports();
  return {
    count: reports.length,
    maxReports: MAX_REPORTS,
  };
}
