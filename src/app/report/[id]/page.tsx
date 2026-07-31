"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ReportView } from "@/components/ReportView";
import { getReportById, type SavedReport } from "@/lib/report-storage";

export default function SharedReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [savedReport, setSavedReport] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    // Try to load from localStorage first (web app saved reports)
    try {
      const report = getReportById(reportId);
      if (report) {
        setSavedReport(report);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Error loading from localStorage:", err);
    }

    // If not in localStorage, try to fetch from server (CLI uploaded reports)
    fetch(`/api/cli-report/${reportId}`)
      .then(res => {
        if (!res.ok) throw new Error("Report not found");
        return res.json();
      })
      .then(data => {
        if (data.success && data.report) {
          setSavedReport(data.report);
        } else {
          setError("Report not found");
        }
      })
      .catch(err => {
        setError("Report not found");
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reportId]);

  if (loading) {
    return (
      <main className="container">
        <header className="site-header">
          <a href="/" className="brand">
            <span className="brand-mark">V</span>
            <span className="brand-text">
              <span className="brand-name">Vettcode Engine</span>
              <span className="brand-tag">Open source scanner</span>
            </span>
          </a>
        </header>
        
        <div className="card" style={{ marginTop: "2rem", textAlign: "center", padding: "3rem" }}>
          <div className="loading-spinner" style={{ margin: "0 auto 1rem" }}>Loading report...</div>
        </div>
      </main>
    );
  }

  if (error || !savedReport) {
    return (
      <main className="container">
        <header className="site-header">
          <a href="/" className="brand">
            <span className="brand-mark">V</span>
            <span className="brand-text">
              <span className="brand-name">Vettcode Engine</span>
              <span className="brand-tag">Open source scanner</span>
            </span>
          </a>
        </header>
        
        <div className="card" style={{ 
          marginTop: "2rem", 
          textAlign: "center", 
          padding: "3rem",
          borderColor: "var(--danger)",
          color: "var(--danger)"
        }}>
          <h2 style={{ marginBottom: "1rem" }}>Report Not Found</h2>
          <p>{error || "This report may have expired or been deleted."}</p>
          <a href="/" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>
            Go to Scanner
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="site-header">
        <a href="/" className="brand">
          <span className="brand-mark">V</span>
          <span className="brand-text">
            <span className="brand-name">Vettcode Engine</span>
            <span className="brand-tag">Open source scanner</span>
          </span>
        </a>
        
        <div className="header-actions">
          <a href="/" className="btn btn-ghost btn-sm">
            New Scan
          </a>
        </div>
      </header>

      <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>{savedReport.projectName}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              Scanned: {new Date(savedReport.savedAt || savedReport.report.metadata?.scannedAt || Date.now()).toLocaleString()}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <span className={`scan-mode-badge ${savedReport.scanMode}`}>
              {savedReport.scanMode === "quick" ? "Quick Scan" : "Deep Scan"}
            </span>
          </div>
        </div>
      </div>

      <ReportView
        report={savedReport.report}
        warnings={[]}
        scanMode={savedReport.scanMode}
        onReset={() => window.location.href = "/"}
      />
    </main>
  );
}
