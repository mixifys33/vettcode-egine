// Authentication utilities for VettCode Engine
// Users are saved as "incomplete sellers" in the backend

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  token: string;
  userType: 'Seller';
}

const AUTH_STORAGE_KEY = 'vettcode_auth';
const SCAN_COUNT_KEY = 'vettcode_scan_count';
const MAX_FREE_SCANS = 10;

// Simple mutex for localStorage operations to prevent race conditions
let scanCountMutex = Promise.resolve();

// Get current authenticated user
export function getAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Save authenticated user
export function setAuthUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

// Clear authentication
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getAuthUser() !== null;
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
      localStorage.setItem(SCAN_COUNT_KEY, (current + 1).toString());
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
