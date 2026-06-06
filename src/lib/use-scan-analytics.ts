/**
 * Hook to integrate scan analytics into the scanning flow
 */

import { useCallback } from 'react';
import { getAuthUser } from './auth';
import { 
  generateScanId, 
  saveScanAnalytics, 
  type ScanAnalytics 
} from './scan-analytics';
import type { VettReport } from './types';

export function useScanAnalytics() {
  /**
   * Log a scan after it completes
   */
  const logScan = useCallback(async (
    report: VettReport,
    scanMode: 'quick' | 'deep',
    scanDurationMs: number,
    scannersUsed: string[],
    success: boolean = true,
    errorMessage?: string
  ) => {
    try {
      const user = getAuthUser();
      
      // Count findings by severity
      const criticalFindings = report.findings?.filter(f => f.severity === 'critical').length || 0;
      const highFindings = report.findings?.filter(f => f.severity === 'high').length || 0;
      const mediumFindings = report.findings?.filter(f => f.severity === 'medium').length || 0;
      const lowFindings = report.findings?.filter(f => f.severity === 'low').length || 0;
      const infoFindings = report.findings?.filter(f => f.severity === 'info').length || 0;
      
      const analytics: ScanAnalytics = {
        id: generateScanId(),
        timestamp: new Date().toISOString(),
        
        // User info
        userId: user?.id || null,
        userEmail: user?.email || null,
        userName: user?.name || null,
        isAuthenticated: user !== null,
        
        // Scan details
        projectName: report.metadata?.projectName || 'unknown-project',
        scanMode,
        
        // Results
        score: report.score || 0,
        grade: report.grade || 'F',
        filesScanned: report.metadata?.filesScanned || 0,
        linesScanned: report.metadata?.linesScanned || 0,
        
        // Findings
        criticalFindings,
        highFindings,
        mediumFindings,
        lowFindings,
        infoFindings,
        totalFindings: report.findings?.length || 0,
        
        // Performance
        scanDurationMs,
        tokensSaved: 'N/A', // Will be updated from stats if available
        
        // Configuration
        scannersUsed,
        
        // Status
        success,
        errorMessage,
      };
      
      // Save to localStorage
      saveScanAnalytics(analytics);
      
      // Send to backend API (fire and forget - don't block on this)
      fetch('/api/analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analytics),
      }).catch(error => {
        console.warn('[Analytics] Failed to send to backend:', error);
        // Don't throw - analytics is saved locally anyway
      });
      
      console.log('[Analytics] Scan logged successfully:', analytics.id);
      
    } catch (error) {
      console.error('[Analytics] Failed to log scan:', error);
      // Don't throw - analytics is not critical to the scan flow
    }
  }, []);
  
  /**
   * Log a failed scan
   */
  const logFailedScan = useCallback(async (
    projectName: string,
    scanMode: 'quick' | 'deep',
    scanDurationMs: number,
    errorMessage: string
  ) => {
    try {
      const user = getAuthUser();
      
      const analytics: ScanAnalytics = {
        id: generateScanId(),
        timestamp: new Date().toISOString(),
        
        // User info
        userId: user?.id || null,
        userEmail: user?.email || null,
        userName: user?.name || null,
        isAuthenticated: user !== null,
        
        // Scan details
        projectName,
        scanMode,
        
        // Results (failed scan)
        score: 0,
        grade: 'F',
        filesScanned: 0,
        linesScanned: 0,
        
        // Findings
        criticalFindings: 0,
        highFindings: 0,
        mediumFindings: 0,
        lowFindings: 0,
        infoFindings: 0,
        totalFindings: 0,
        
        // Performance
        scanDurationMs,
        tokensSaved: 'N/A',
        
        // Configuration
        scannersUsed: [],
        
        // Status
        success: false,
        errorMessage,
      };
      
      // Save to localStorage
      saveScanAnalytics(analytics);
      
      // Send to backend API
      fetch('/api/analytics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analytics),
      }).catch(() => {
        // Silently fail
      });
      
      console.log('[Analytics] Failed scan logged:', analytics.id);
      
    } catch (error) {
      console.error('[Analytics] Failed to log failed scan:', error);
    }
  }, []);
  
  return {
    logScan,
    logFailedScan,
  };
}
