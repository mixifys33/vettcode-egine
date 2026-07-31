// Unified API Configuration for VettCode (Shared between Landing and Web Scanner)

export const API_CONFIG = {
  // Base API URL - points to landing page API routes
  BASE_URL: process.env.NEXT_PUBLIC_LANDING_API_URL || 'https://vettcodecli.vercel.app',
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    SIGNUP: '/api/developer-auth/signup',
    LOGIN: '/api/developer-auth/login',
    LOGOUT: '/api/developer-auth/logout',
    ME: '/api/developer-auth/me',
    
    // Profile
    UPDATE_PROFILE: '/api/developer-auth/update-profile',
    GET_STATS: '/api/developer-auth/stats',
    
    // Google Auth
    GOOGLE_VERIFY: '/api/google-auth/verify',
  },
  
  // Local Storage Keys (SHARED ACROSS ALL VETTCODE APPS)
  STORAGE_KEYS: {
    TOKEN: 'vettcode_token',
    DEVELOPER: 'vettcode_developer',
    AUTHENTICATED: 'vettcode_authenticated',
  },
  
  // Request timeout (ms)
  TIMEOUT: 10000,
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (): HeadersInit => {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  
  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
  
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(API_CONFIG.STORAGE_KEYS.AUTHENTICATED) === 'true';
};

// Helper function to get developer data
export const getDeveloper = () => {
  if (typeof window === 'undefined') return null;
  const developerData = localStorage.getItem(API_CONFIG.STORAGE_KEYS.DEVELOPER);
  return developerData ? JSON.parse(developerData) : null;
};

// Helper function to logout (clear local storage)
export const logout = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN);
  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.DEVELOPER);
  localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTHENTICATED);
  window.location.href = '/';
};

// Helper function to save auth data
export const saveAuthData = (token: string, developer: any) => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(API_CONFIG.STORAGE_KEYS.DEVELOPER, JSON.stringify(developer));
  localStorage.setItem(API_CONFIG.STORAGE_KEYS.AUTHENTICATED, 'true');
};
