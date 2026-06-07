/**
 * Scan Analytics Tracker
 * Logs all scans with user information, scores, and results for analytics
 */

// Security: Sanitize user inputs to prevent XSS
function sanitizeString(input: string | null | undefined): string | null {
  if (!input) return null;
  
  // Remove HTML tags and dangerous characters
  return input
    .replace(/[<>'"]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 1000); // Limit length to prevent storage issues
}

function sanitizeNumber(input: number): number {
  // Ensure finite number and prevent NaN/Infinity
  if (!Number.isFinite(input)) return 0;
  // Clamp to reasonable range
  return Math.max(0, Math.min(input, Number.MAX_SAFE_INTEGER));
}

export interface ScanAnalytics {
  id: string;
  timestamp: string;
  
  // User information
  userId: string | null; // null for unsigned users
  userEmail: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  
  // Scan details
  projectName: string;
  scanMode: 'quick' | 'deep';
  
  // Results
  score: number;
  grade: string;
  filesScanned: number;
  linesScanned: number;
  
  // Findings breakdown
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  infoFindings: number;
  totalFindings: number;
  
  // Performance metrics
  scanDurationMs: number;
  tokensSaved: string;
  
  // Scanner configuration
  scannersUsed: string[]; // e.g., ['static', 'ai', 'npm-audit', 'snyk']
  
  // Success status
  success: boolean;
  errorMessage?: string;
}

const ANALYTICS_STORAGE_KEY = 'vettcode_analytics';
const MAX_LOCAL_ANALYTICS = 100; // Keep only last 100 scans in localStorage

/**
 * Get all analytics from localStorage
 */
export function getAllAnalytics(): ScanAnalytics[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save a single scan analytics entry with input sanitization
 */
export function saveScanAnalytics(rawAnalytics: ScanAnalytics): void {
  if (typeof window === 'undefined') return;
  
  // Sanitize all string inputs to prevent XSS and injection attacks
  const analytics: ScanAnalytics = {
    ...rawAnalytics,
    // Sanitize user-provided strings
    projectName: sanitizeString(rawAnalytics.projectName) || 'Unknown Project',
    userEmail: sanitizeString(rawAnalytics.userEmail),
    userName: sanitizeString(rawAnalytics.userName),
    grade: sanitizeString(rawAnalytics.grade) || 'F',
    errorMessage: sanitizeString(rawAnalytics.errorMessage) || undefined,
    
    // Sanitize numbers to prevent invalid values
    score: sanitizeNumber(rawAnalytics.score),
    filesScanned: sanitizeNumber(rawAnalytics.filesScanned),
    linesScanned: sanitizeNumber(rawAnalytics.linesScanned),
    criticalFindings: sanitizeNumber(rawAnalytics.criticalFindings),
    highFindings: sanitizeNumber(rawAnalytics.highFindings),
    mediumFindings: sanitizeNumber(rawAnalytics.mediumFindings),
    lowFindings: sanitizeNumber(rawAnalytics.lowFindings),
    infoFindings: sanitizeNumber(rawAnalytics.infoFindings),
    totalFindings: sanitizeNumber(rawAnalytics.totalFindings),
    scanDurationMs: sanitizeNumber(rawAnalytics.scanDurationMs),
    
    // Sanitize arrays
    scannersUsed: rawAnalytics.scannersUsed
      .map(s => sanitizeString(s))
      .filter((s): s is string => s !== null)
      .slice(0, 20), // Limit array size
  };
  
  const existing = getAllAnalytics();
  
  // Add new entry at the beginning
  existing.unshift(analytics);
  
  // Keep only the most recent entries
  const trimmed = existing.slice(0, MAX_LOCAL_ANALYTICS);
  
  try {
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save analytics:', error);
    // If storage fails (quota exceeded), clear old entries and try again
    const reduced = trimmed.slice(0, Math.floor(MAX_LOCAL_ANALYTICS / 2));
    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(reduced));
    } catch (retryError) {
      console.error('Failed to save analytics even after reducing size:', retryError);
    }
  }
}

/**
 * Get analytics summary statistics
 */
export function getAnalyticsSummary(): {
  totalScans: number;
  authenticatedScans: number;
  unauthenticatedScans: number;
  averageScore: number;
  totalFindings: number;
  mostCommonGrade: string;
  scansToday: number;
  scansThisWeek: number;
  scansThisMonth: number;
} {
  const analytics = getAllAnalytics();
  
  if (analytics.length === 0) {
    return {
      totalScans: 0,
      authenticatedScans: 0,
      unauthenticatedScans: 0,
      averageScore: 0,
      totalFindings: 0,
      mostCommonGrade: 'N/A',
      scansToday: 0,
      scansThisWeek: 0,
      scansThisMonth: 0,
    };
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const authenticatedScans = analytics.filter(a => a.isAuthenticated).length;
  const unauthenticatedScans = analytics.filter(a => !a.isAuthenticated).length;
  
  const totalScore = analytics.reduce((sum, a) => sum + a.score, 0);
  const averageScore = totalScore / analytics.length;
  
  const totalFindings = analytics.reduce((sum, a) => sum + a.totalFindings, 0);
  
  // Calculate most common grade
  const gradeCounts: Record<string, number> = {};
  analytics.forEach(a => {
    gradeCounts[a.grade] = (gradeCounts[a.grade] || 0) + 1;
  });
  const mostCommonGrade = Object.entries(gradeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  
  // Time-based counts
  const scansToday = analytics.filter(a => new Date(a.timestamp) >= today).length;
  const scansThisWeek = analytics.filter(a => new Date(a.timestamp) >= weekAgo).length;
  const scansThisMonth = analytics.filter(a => new Date(a.timestamp) >= monthAgo).length;
  
  return {
    totalScans: analytics.length,
    authenticatedScans,
    unauthenticatedScans,
    averageScore: Math.round(averageScore * 10) / 10,
    totalFindings,
    mostCommonGrade,
    scansToday,
    scansThisWeek,
    scansThisMonth,
  };
}

/**
 * Get analytics for a specific user
 */
export function getUserAnalytics(userId: string): ScanAnalytics[] {
  return getAllAnalytics().filter(a => a.userId === userId);
}

/**
 * Get analytics for unauthenticated users
 */
export function getUnauthenticatedAnalytics(): ScanAnalytics[] {
  return getAllAnalytics().filter(a => !a.isAuthenticated);
}

/**
 * Clear all analytics (admin function)
 */
export function clearAllAnalytics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ANALYTICS_STORAGE_KEY);
}

/**
 * Export analytics as JSON for download
 */
export function exportAnalytics(): string {
  const analytics = getAllAnalytics();
  return JSON.stringify(analytics, null, 2);
}

/**
 * Generate a unique scan ID
 */
export function generateScanId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
