// Authentication utilities for VettCode Engine
// Unified with VettCode CLI Landing Page authentication system

import { API_CONFIG, getDeveloper, isAuthenticated as checkAuth, logout as apiLogout } from './api-config';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  token: string;
  role?: string;
}

const SCAN_COUNT_KEY = 'vettcode_scan_count';
const MAX_FREE_SCANS = 10;

// Simple mutex for localStorage operations to prevent race conditions
let scanCountMutex = Promise.resolve();

// Get current authenticated user (uses unified storage keys)
export function getAuthUser(): AuthUser | null {
  return getDeveloper();
}

// Save authenticated user (uses unified storage keys)
export function setAuthUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, user.token);
  localStorage.setItem(API_CONFIG.STORAGE_KEYS.DEVELOPER, JSON.stringify(user));
  localStorage.setItem(API_CONFIG.STORAGE_KEYS.AUTHENTICATED, 'true');
}

// Clear authentication (uses unified storage keys)
export function clearAuth(): void {
  apiLogout();
}

// Check if user is authenticated (uses unified storage keys)
export function isAuthenticated(): boolean {
  return checkAuth();
}

// Get current scan count for unauthenticated users
export function getScanCount(): number {
  if (typeof window === 'undefined') return 0;
  
  const count = localStorage.getItem(SCAN_COUNT_KEY);
  return count ? parseInt(count, 10) : 0;
}

// Increment scan count with mutex to prevent race conditions
export async function incrementScanCount(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Wait for any previous increment operation to complete
  await scanCountMutex;

  // Create a new mutex for this operation
  scanCountMutex = (async () => {
    try {
      const current = getScanCount();
      const newValue = current + 1;
      localStorage.setItem(SCAN_COUNT_KEY, newValue.toString());
    } finally {
      // Release the mutex
      scanCountMutex = Promise.resolve();
    }
  })();

  await scanCountMutex;
}

// Check if user can scan
export function canScan(): { allowed: boolean; reason?: string; remaining?: number } {
  // Authenticated users have unlimited scans
  if (isAuthenticated()) {
    return { allowed: true };
  }
  
  // Unauthenticated users limited to 10 scans
  const count = getScanCount();
  if (count >= MAX_FREE_SCANS) {
    return { 
      allowed: false, 
      reason: 'You have reached the free scan limit. Please login or register to continue.' 
    };
  }
  
  return { 
    allowed: true, 
    remaining: MAX_FREE_SCANS - count 
  };
}

// Reset scan count (for testing or after login)
export function resetScanCount(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SCAN_COUNT_KEY);
}
