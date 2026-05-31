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
const STORAGE_VERSION_KEY = "vettcode_storage_version";

// Improved mutex with version tracking for better race condition prevention
let reportStorageMutex = Promise.resolve();
let currentStorageVersion = 0;

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
    
    // Validate the parsed result is an array
    if (!Array.isArray(reports)) {
      console.error("Invalid reports data: expected array, got", typeof reports);
      return [];
    }
    
    // Validate each report has required fields
    const validReports = reports.filter(r => 
      r && 
      typeof r === 'object' &&
      typeof r.id === 'string' &&
      typeof r.projectName === 'string' &&
      r.report &&
      typeof r.savedAt === 'string'
    );
    
    if (validReports.length !== reports.length) {
      console.warn(`Filtered out ${reports.length - validReports.length} invalid reports`);
    }
    
    // Sort by most recent first
    return validReports.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("JSON parse error in saved reports data:", error);
      // Clear corrupted data
      try {
        localStorage.removeItem(`${REPORTS_STORAGE_KEY}_${user.id}`);
      } catch (clearError) {
        console.error("Failed to clear corrupted reports:", clearError);
      }
    } else {
      console.error("Error loading saved reports:", error);
    }
    return [];
  }
}

/**
 * Save a new report with improved mutex and version tracking to prevent race conditions
 */
export async function saveReport(
  projectName: string,
  report: VettReport,
  scanMode: "quick" | "deep" = "quick"
): Promise<SavedReport> {
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
  
  // Wait for any previous storage operation to complete
  await reportStorageMutex;
  
  // Create a new mutex for this operation with version tracking
  const operationVersion = ++currentStorageVersion;
  reportStorageMutex = (async () => {
    try {
      // Check if this operation is still the latest one
      if (operationVersion !== currentStorageVersion) {
        console.warn(`Storage operation ${operationVersion} superseded by ${currentStorageVersion}`);
        return;
      }
      
      const existingReports = getSavedReports();
      
      // Add new report at the beginning
      const updatedReports = [savedReport, ...existingReports];
      
      // Limit to MAX_REPORTS
      const limitedReports = updatedReports.slice(0, MAX_REPORTS);
      
      // Update storage version atomically
      const newVersion = Date.now();
      localStorage.setItem(`${STORAGE_VERSION_KEY}_${user.id}`, newVersion.toString());
      
      localStorage.setItem(
        `${REPORTS_STORAGE_KEY}_${user.id}`,
        JSON.stringify(limitedReports)
      );
    } catch (error) {
      console.error("Error saving report:", error);
      throw error;
    } finally {
      // Release the mutex
      reportStorageMutex = Promise.resolve();
    }
  })();
  
  await reportStorageMutex;
  
  return savedReport;
}

/**
 * Get a specific report by ID
 * Only returns reports owned by the current authenticated user
 */
export function getReportById(reportId: string): SavedReport | null {
  if (typeof window === "undefined") return null;
  
  const user = getAuthUser();
  if (!user) return null; // Must be authenticated
  
  const reports = getSavedReports(); // Already filtered by user ID
  const report = reports.find(r => r.id === reportId);
  
  // Double-check: ensure report belongs to current user
  if (!report) return null;
  
  return report;
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
