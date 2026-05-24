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

    if (token && id && name && email) {
      // Save seller auth data from Google OAuth
      setAuthUser({
        id,
        name: decodeURIComponent(name),
        email: decodeURIComponent(email),
        token,
        userType: "Seller",
      });

      // Reset scan count - seller gets unlimited scans
      resetScanCount();

      // Redirect to home with success message
      router.push("/?auth=success");
    } else {
      // Auth failed - redirect with error
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
