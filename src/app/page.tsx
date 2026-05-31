"use client";

import { useState, useEffect } from "react";
import { UploadZone } from "@/components/UploadZone";
import { ScanProgress } from "@/components/ScanProgress";
import { ReportView } from "@/components/ReportView";
import { AuthModal } from "@/components/AuthModal";
import { ReportsHistory } from "@/components/ReportsHistory";
import { collectFromFileList, collectFromZip, type CollectResult } from "@/lib/file-collector";
import { collectFromRemoteUrl } from "@/lib/collect-from-remote";
import { RepoUrlInput } from "@/components/RepoUrlInput";
import { runSmartScan, type ScanMode, type ScannerConfig, defaultScannerConfig } from "@/lib/smart-scan-orchestrator";
import {
  canScan,
  incrementScanCount,
  isAuthenticated,
  getAuthUser,
  clearAuth,
} from "@/lib/auth";
import { saveReport, type SavedReport } from "@/lib/report-storage";
import type { VettReport } from "@/lib/types";

// Sanitize project name to prevent potential issues
function sanitizeProjectName(name: string): string {
  return name
    .replace(/[<>\"'`]/g, '') // Remove potential HTML/script chars
    .replace(/[\/\\]/g, '-') // Replace path separators
    .trim()
    .slice(0, 100); // Limit length
}

function PrivacyBanner() {
  return (
    <aside className="privacy-banner">
      <svg
        className="privacy-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <div>
        <strong>Your code stays in your browser</strong>
        Uploads and repository URLs are processed in memory for your session. We do
        not store your codebase. Pasting a repo link fetches a snapshot to scan —
        nothing is kept after you reload or start a new scan.
      </div>
    </aside>
  );
}

export default function Home() {
  const [projectName, setProjectName] = useState("my-project");
  const [scanMode, setScanMode] = useState<ScanMode>("quick");
  const [scannerConfig, setScannerConfig] = useState<ScannerConfig>(defaultScannerConfig);
  const [scanning, setScanning] = useState(false);
  const [scanStartedAt, setScanStartedAt] = useState<number | undefined>();
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState<string>();
  const [report, setReport] = useState<VettReport | null>(null);
  const [lastScanMode, setLastScanMode] = useState<ScanMode>("quick");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<typeof getAuthUser extends () => infer T ? T : null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getAuthUser());
    
    // Check if desktop to auto-open sidebar
    const checkDesktop = () => {
      if (window.innerWidth >= 768 && isAuthenticated()) {
        setSidebarOpen(true);
      }
    };
    checkDesktop();
  }, [showAuthModal]);

  function handleLogout() {
    clearAuth();
    setUser(null);
  }

  async function startScan(
    collect: () => Promise<CollectResult>
  ) {
    const scanCheck = canScan();
    if (!scanCheck.allowed) {
      setShowAuthModal(true);
      setError(scanCheck.reason || "Sign in to continue scanning.");
      return;
    }

    setError(null);
    setReport(null);
    setScanning(true);
    setScanStartedAt(Date.now());
    setProgress(0);
    setPhase("Collecting files");
    setLastScanMode(scanMode);

    try {
      const result = await collect();
      setWarnings(result.warnings);

      if (result.files.length === 0) {
        throw new Error(
          result.warnings[0] ??
            "No source files found. Upload a folder with application code."
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
        },
        scanMode,
        defaultScannerConfig,
        result.allFilePaths
      );

      setReport(scanResult.report);

      // Save report for authenticated users
      if (isAuthenticated()) {
        try {
          const saved = await saveReport(projectName, scanResult.report, scanMode);
          setCurrentReportId(saved.id);
        } catch (error) {
          console.error("Failed to save report:", error);
        }
      } else {
        await incrementScanCount();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
      setScanStartedAt(undefined);
    }
  }

  function handleSelectReport(savedReport: SavedReport) {
    setReport(savedReport.report);
    setProjectName(savedReport.projectName);
    setLastScanMode(savedReport.scanMode);
    setCurrentReportId(savedReport.id);
    setWarnings([]);
    setError(null);
  }

  function handleResetScan() {
    setReport(null);
    setCurrentReportId(null);
    setWarnings([]);
    setError(null);
  }

  const scanQuota = canScan();

  return (
    <main className="container">
      {/* Reports History Sidebar */}
      {mounted && isAuthenticated() && (
        <ReportsHistory
          currentReportId={currentReportId}
          onSelectReport={handleSelectReport}
        />
      )}

      <header className="site-header">
        <a href="/" className="brand">
          <span className="brand-mark">V</span>
          <span className="brand-text">
            <span className="brand-name">Vettcode Engine</span>
            <span className="brand-tag">Open source scanner</span>
          </span>
        </a>

        <div className="header-actions">
          {user ? (
            <>
              <span className="user-pill">{user.name}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAuthModal(true)}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {!report && (
        <>
          <section className="hero">
            <p className="hero-eyebrow">
              <strong>Open source</strong> · security & production readiness
            </p>
            <h1>
              Vet your codebase with{" "}
              <span className="gradient">confidence</span>
            </h1>
            <p className="hero-lead">
              Static analysis plus targeted AI review. Strict scoring, verified
              findings, and actionable remediation — built for teams who ship
              with discipline.
            </p>
            <div className="hero-features">
              <span>Security & injection risks</span>
              <span>Production failure patterns</span>
              <span>Logic & data integrity</span>
              <span>0–100 strict score</span>
            </div>
          </section>

          <PrivacyBanner />

          {mounted && !isAuthenticated() && scanQuota.remaining != null && (
            <p className="tier-note">
              Guest scans remaining: {scanQuota.remaining}.{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => setShowAuthModal(true)}
              >
                Create a free account
              </button>{" "}
              for unlimited scans.
            </p>
          )}

          <div className="scan-mode-panel">
            <p className="scan-mode-label">Analysis mode</p>
            <div className="scan-mode-grid">
              <label
                className={`scan-mode-option ${scanMode === "quick" ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="scanMode"
                  value="quick"
                  checked={scanMode === "quick"}
                  disabled={scanning}
                  onChange={() => setScanMode("quick")}
                />
                <div className="scan-mode-title">Quick scan</div>
                <div className="scan-mode-desc">
                  Full static pass plus AI on priority surfaces — routes, auth,
                  config, and high-risk regions. Typically 1–4 minutes.
                </div>
                <div className="scan-mode-eta">Recommended for first pass</div>
              </label>

              <label
                className={`scan-mode-option ${scanMode === "deep" ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="scanMode"
                  value="deep"
                  checked={scanMode === "deep"}
                  disabled={scanning}
                  onChange={() => setScanMode("deep")}
                />
                <div className="scan-mode-title">Deep scan</div>
                <div className="scan-mode-desc">
                  Broader AI coverage with parallel workers (3 API lanes). Best for
                  release gates; large repos may take longer.
                </div>
                <div className="scan-mode-eta">Up to ~48 targeted AI segments</div>
              </label>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1rem" }}>
            <label htmlFor="project-name" className="field-label">
              Project name
            </label>
            <input
              id="project-name"
              type="text"
              className="field-input"
              value={projectName}
              onChange={(e) => setProjectName(sanitizeProjectName(e.target.value))}
              disabled={scanning}
              placeholder="my-project"
              maxLength={100}
            />
          </div>

          <RepoUrlInput
            disabled={scanning}
            onScan={(url) =>
              startScan(async () => {
                setPhase("Fetching repository");
                setDetail("Downloading source from remote…");
                const result = await collectFromRemoteUrl(url);
                setProjectName(result.projectName);
                return result;
              })
            }
          />

          <p className="upload-divider">or upload from your computer</p>

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
        <ScanProgress
          phase={phase}
          progress={progress}
          detail={detail}
          scanMode={lastScanMode}
          startedAt={scanStartedAt}
        />
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
          scanMode={lastScanMode}
          onReset={handleResetScan}
        />
      )}

      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
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
