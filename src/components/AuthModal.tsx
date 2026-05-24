"use client";

import { useState } from "react";
import { setAuthUser, resetScanCount } from "@/lib/auth";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const registerRes = await fetch(`${BACKEND_URL}/api/sellers/register`, {
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
      const verifyRes = await fetch(`${BACKEND_URL}/api/sellers/verify`, {
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
      const loginRes = await fetch(`${BACKEND_URL}/api/sellers/login`, {
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
      const resendRes = await fetch(`${BACKEND_URL}/api/sellers/resend-otp`, {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{titles[mode]}</h2>
            <p className="modal-sub">{subtitles[mode]}</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
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
  );
}
