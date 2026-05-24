"use client";

import { useState, useEffect } from "react";
import { UploadZone } from "@/components/UploadZone";
import { ScanProgress } from "@/components/ScanProgress";
import { ReportView } from "@/components/ReportView";
import { AuthModal } from "@/components/AuthModal";
import { collectFromFileList, collectFromZip } from "@/lib/file-collector";
import { runSmartScan } from "@/lib/smart-scan-orchestrator";
import { 
  canScan, 
  incrementScanCount, 
  isAuthenticated, 
  getAuthUser, 
  clearAuth 
} from "@/lib/auth";
import type { VettReport } from "@/lib/types";

export default function Home() {
  const [projectName, setProjectName] = useState("my-project");
  const [scanning, setScanning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState<string>();
  const [report, setReport] = useState<VettReport | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(getAuthUser());

  // Update user state when auth changes
  useEffect(() => {
    setUser(getAuthUser());
  }, [showAuthModal]);

  function handleLogout() {
    clearAuth();
    setUser(null);
  }

  async function startScan(
    collect: () => Promise<{
      files: import("@/lib/types").CodeFile[];
      ignoredCount: number;
      warnings: string[];
    }>
  ) {
    // Check if user can scan
    const scanCheck = canScan();
    if (!scanCheck.allowed) {
      setShowAuthModal(true);
      setError(scanCheck.reason || 'Please login to continue scanning');
      return;
    }

    setError(null);
    setReport(null);
    setScanning(true);
    setProgress(0);
    setPhase("Collecting files");

    try {
      const result = await collect();
      setWarnings(result.warnings);

      if (result.files.length === 0) {
        throw new Error(
          result.warnings[0] ??
            "No source files to scan. Pick a folder with application code."
        );
      }

      const scanResult = await runSmartScan(
        projectName,
        result.files,
        result.ignoredCount,
        (p, pct, d) => {
          setPhase(p);
          setProgress(pct);
          setDetail(d);
        }
      );

      setReport(scanResult.report);
      
      // Increment scan count for unauthenticated users
      if (!isAuthenticated()) {
        incrementScanCount();
      }
      
      // Log stats for debugging
      console.log("Scan stats:", scanResult.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="container">
      <header className="hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0 }}>
            <span>Vettcode</span> Engine
          </h1>
          
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Welcome, {user.name}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid var(--primary)',
                background: 'var(--primary)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Login / Register
            </button>
          )}
        </div>
        
        <p>
          Upload any codebase. AI vets security holes, production failures, typing
          mistakes, database risks, and logic that can break your system — then
          scores it harshly from 0–100 with zero sugar-coating.
        </p>
        
        {!isAuthenticated() && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: 'var(--text-muted)'
          }}>
            ℹ️ Free users: {canScan().remaining || 0} scan{canScan().remaining === 1 ? '' : 's'} remaining. 
            Login for unlimited scans.
          </div>
        )}
      </header>

      {!report && (
        <>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="project-name"
              style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.9rem" }}
            >
              Project name (for the report)
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={scanning}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface2)",
                color: "var(--text)",
              }}
            />
          </div>

          <UploadZone
            disabled={scanning}
            onFolderSelect={(list) =>
              startScan(() => collectFromFileList(list, projectName))
            }
            onZipSelect={(file) =>
              startScan(() => collectFromZip(file, projectName))
            }
          />
        </>
      )}

      {scanning && (
        <ScanProgress phase={phase} progress={progress} detail={detail} />
      )}

      {error && (
        <div
          className="card"
          style={{ marginTop: "1rem", borderColor: "var(--danger)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}

      {report && (
        <ReportView
          report={report}
          warnings={warnings}
          onReset={() => {
            setReport(null);
            setError(null);
            setWarnings([]);
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setError(null);
            setUser(getAuthUser());
          }}
        />
      )}
    </main>
  );
}
