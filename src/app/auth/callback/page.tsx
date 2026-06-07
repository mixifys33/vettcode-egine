"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAuthUser, resetScanCount } from "@/lib/auth";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const id = searchParams.get("id");
    const name = searchParams.get("name");
    const email = searchParams.get("email");

    // Validate all required parameters exist
    if (!token || !id || !name || !email) {
      console.error("[Auth Callback] Missing required parameters");
      router.push("/?auth=failed");
      return;
    }

    // Validate token format (should be a JWT or similar)
    if (token.length < 32 || !/^[A-Za-z0-9._-]+$/.test(token)) {
      console.error("[Auth Callback] Invalid token format");
      router.push("/?auth=failed");
      return;
    }

    // Validate ID format (should be alphanumeric)
    if (!/^[A-Za-z0-9_-]+$/.test(id) || id.length > 100) {
      console.error("[Auth Callback] Invalid ID format");
      router.push("/?auth=failed");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const decodedEmail = decodeURIComponent(email);
    if (!emailRegex.test(decodedEmail) || decodedEmail.length > 255) {
      console.error("[Auth Callback] Invalid email format");
      router.push("/?auth=failed");
      return;
    }

    // Validate name length
    const decodedName = decodeURIComponent(name);
    if (decodedName.length === 0 || decodedName.length > 255) {
      console.error("[Auth Callback] Invalid name length");
      router.push("/?auth=failed");
      return;
    }

    // Sanitize inputs to prevent XSS
    const sanitizedName = decodedName.replace(/[<>]/g, '');
    const sanitizedEmail = decodedEmail.replace(/[<>]/g, '');

    // Verify the token with backend before storing
    // In a real implementation, you would validate the token with your backend here
    // For now, we'll perform basic validation
    try {
      // Save seller auth data from Google OAuth
      setAuthUser({
        id,
        name: sanitizedName,
        email: sanitizedEmail,
        token,
        userType: "Seller",
      });

      // Reset scan count - seller gets unlimited scans
      resetScanCount();

      console.log("[Auth Callback] Authentication successful");
      // Redirect to home with success message
      router.push("/?auth=success");
    } catch (error) {
      console.error("[Auth Callback] Error setting auth data:", error);
      router.push("/?auth=failed");
    }
  }, [searchParams, router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        flexDirection: "column",
        gap: "1rem",
        background: "var(--background)",
        color: "var(--text)",
      }}
    >
      <div className="spinner" style={{
        width: "40px",
        height: "40px",
        border: "4px solid var(--border)",
        borderTop: "4px solid var(--primary)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}></div>
      <p style={{ fontSize: "1.1rem", fontWeight: 500 }}>
        Completing authentication...
      </p>
      <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
        Please wait while we log you in as a seller
      </p>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}>
        Loading...
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
