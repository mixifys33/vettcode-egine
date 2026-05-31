"use client";

import { useState, useEffect } from "react";
import { setAuthUser, resetScanCount } from "@/lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [loading, setLoading] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const [googleAuthStep, setGoogleAuthStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  
  // Prevent modal close during Google auth
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (googleAuthInProgress) {
      // Don't close modal during Google authentication
      return;
    }
    onClose();
  };
  
  // Network timeout helper
  const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection and try again.');
      }
      throw error;
    }
  };
  
  // Retry helper with exponential backoff
  const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 2) => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetchWithTimeout(url, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Network request failed');
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s
          const backoffMs = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
    
    throw lastError;
  };

  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    setGoogleAuthInProgress(true);
    setGoogleAuthStep("Opening Google Sign-In...");

    try {
      // Use Google Sign-In with popup
      const google = (window as any).google;
      
      if (!google) {
        throw new Error("Google Sign-In not loaded. Please refresh the page.");
      }

      // Initialize Google Sign-In
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        cancel_on_tap_outside: false, // Don't cancel if user clicks outside
      });

      // Prompt the user to select a Google account
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // User closed the popup or it wasn't shown
          setGoogleAuthInProgress(false);
          setGoogleAuthStep("");
          setLoading(false);
          setError("Google Sign-In was cancelled. Please try again.");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
      setLoading(false);
      setGoogleAuthInProgress(false);
      setGoogleAuthStep("");
    }
  }

  async function handleGoogleCallback(response: any) {
    try {
      setGoogleAuthStep("Verifying your Google account...");
      
      // Send the raw Google credential (JWT) to backend for verification
      // Backend should verify the signature, expiration, and audience
      const credential = response.credential;
      
      setGoogleAuthStep("Authenticating with backend...");
      
      // Send credential to backend for OAuth login/registration
      const oauthRes = await fetchWithRetry(`${BACKEND_URL}/api/sellers/google-oauth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential, // Send the raw JWT for server-side verification
        }),
      });

      if (!oauthRes.ok) {
        const errorData = await oauthRes.json();
        throw new Error(errorData.message || errorData.error || "Google authentication failed");
      }

      const oauthData = await oauthRes.json();
      
      // Backend should return a secure token (JWT or session ID)
      const token = oauthData.token || oauthData.sessionToken;
      
      if (!token) {
        throw new Error("Authentication failed: No token received from server");
      }
      
      setGoogleAuthStep("Signing you in...");
      
      setAuthUser({
        id: oauthData.seller.id,
        name: oauthData.seller.name,
        email: oauthData.seller.email,
        token, // Use server-generated secure token
        userType: "Seller",
      });

      resetScanCount();
      
      setGoogleAuthStep("Success! Redirecting...");
      setTimeout(() => {
        setGoogleAuthInProgress(false);
        setGoogleAuthStep("");
        setLoading(false);
        onSuccess();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
      setGoogleAuthInProgress(false);
      setGoogleAuthStep("");
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const registerRes = await fetchWithRetry(`${BACKEND_URL}/api/sellers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phoneNumber: phoneNumber.trim(),
          password,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(
          registerData.message || registerData.error || "Registration failed"
        );
      }

      setSuccessMessage("Verification code sent. Check your inbox.");
      setMode("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const verifyRes = await fetchWithRetry(`${BACKEND_URL}/api/sellers/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(
          verifyData.message || verifyData.error || "Verification failed"
        );
      }

      const token = `vettcode_${verifyData.seller.id}_${Date.now()}`;

      setAuthUser({
        id: verifyData.seller.id,
        name: verifyData.seller.name,
        email: verifyData.seller.email,
        token,
        userType: "Seller",
      });

      resetScanCount();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loginRes = await fetchWithRetry(`${BACKEND_URL}/api/sellers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        throw new Error(loginData.message || loginData.error || "Login failed");
      }

      const token = `vettcode_${loginData.seller.id}_${Date.now()}`;

      setAuthUser({
        id: loginData.seller.id,
        name: loginData.seller.name,
        email: loginData.seller.email,
        token,
        userType: "Seller",
      });

      resetScanCount();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const resendRes = await fetchWithRetry(`${BACKEND_URL}/api/sellers/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const resendData = await resendRes.json();

      if (!resendRes.ok) {
        throw new Error(
          resendData.message || resendData.error || "Failed to resend code"
        );
      }

      setSuccessMessage("A new code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  }

  const titles = {
    login: "Sign in",
    register: "Create account",
    verify: "Verify email",
  };

  const subtitles = {
    login: "Access unlimited scans and saved preferences.",
    register: "Free account — no payment required.",
    verify: `Enter the code sent to ${email || "your email"}.`,
  };

  return (
    <>
      {isOpen && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2>{titles[mode]}</h2>
              <p className="modal-sub">{subtitles[mode]}</p>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={googleAuthInProgress ? undefined : onClose}
              aria-label="Close"
              disabled={googleAuthInProgress}
              style={{ 
                opacity: googleAuthInProgress ? 0.5 : 1,
                cursor: googleAuthInProgress ? 'not-allowed' : 'pointer'
              }}
            >
              ×
            </button>
          </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn btn-google"
              style={{ width: "100%" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: "8px" }}>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-switch">
              No account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                className="link-button"
                disabled={loading}
              >
                Register
              </button>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={8}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Creating…" : "Create account"}
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="btn btn-google"
              style={{ width: "100%" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: "8px" }}>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Sign up with Google
            </button>

            <div className="auth-switch">
              Have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="link-button"
                disabled={loading}
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {mode === "verify" && (
          <form onSubmit={handleVerify} className="auth-form">
            <div className="form-group">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={loading}
                maxLength={6}
                style={{
                  fontSize: "1.15rem",
                  letterSpacing: "0.4rem",
                  textAlign: "center",
                }}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {successMessage && (
              <div className="success-message">{successMessage}</div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Verifying…" : "Complete registration"}
            </button>

            <div className="auth-switch">
              <button
                type="button"
                onClick={handleResendOTP}
                className="link-button"
                disabled={loading}
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        <p className="auth-footer">
          Registration data is used for authentication and product analytics only.
          Your uploaded source code is not stored on our servers by default.
        </p>
      </div>
    </div>
      )}
    
    {/* Google Authentication Loading Overlay */}
    {googleAuthInProgress && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          background: 'var(--bg-elevated)',
          padding: '2rem 3rem',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {/* Animated spinner */}
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid var(--border)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem',
          }} />
          
          <h3 style={{
            margin: '0 0 0.5rem',
            fontSize: '1.25rem',
            color: 'var(--text)',
          }}>
            Authenticating with Google
          </h3>
          
          <p style={{
            margin: 0,
            color: 'var(--muted)',
            fontSize: '0.95rem',
          }}>
            {googleAuthStep || "Please wait..."}
          </p>
          
          <p style={{
            margin: '1rem 0 0',
            color: 'var(--muted)',
            fontSize: '0.85rem',
            fontStyle: 'italic',
          }}>
            Please don't close this window
          </p>
        </div>
      </div>
    )}
    
    {/* Add spinner animation */}
    <style jsx>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </>
  );
}
