"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { VettReport } from "@/lib/types";

// Named constants for magic numbers
const SEVERITY_DEDUCTIONS = {
  critical: 15,
  high: 10,
  medium: 5,
  low: 2,
  info: 1,
} as const;

const STYLES = {
  PADDING: "2rem",
  MAX_WIDTH: "500px",
  FONT_SIZE_HEADING: "1.5rem",
  FONT_SIZE_BODY: "0.9rem",
  MARGIN_BOTTOM_HEADING: "1rem",
  MARGIN_BOTTOM_BODY: "2rem",
} as const;

// Sanitize text to prevent XSS
function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function AIAnalysisContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [report, setReport] = useState<VettReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get report from sessionStorage (passed from main report page)
    const reportData = sessionStorage.getItem("vettcode_current_report");
    if (reportData) {
      try {
        const parsedReport = JSON.parse(reportData);
        setReport(parsedReport);
      } catch (error) {
        console.error("Failed to parse report:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "var(--bg)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: "40px",
            height: "40px",
            border: "3px solid var(--border)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 1rem"
          }} />
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Loading analysis data...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: STYLES.PADDING
      }}>
        <div style={{ textAlign: "center", maxWidth: STYLES.MAX_WIDTH }}>
          <h1 style={{ fontSize: STYLES.FONT_SIZE_HEADING, marginBottom: STYLES.MARGIN_BOTTOM_HEADING, fontWeight: 600 }}>No Report Available</h1>
          <p style={{ color: "var(--muted)", marginBottom: STYLES.MARGIN_BOTTOM_BODY, fontSize: STYLES.FONT_SIZE_BODY }}>
            Run a security scan to generate AI analysis data.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn btn-primary"
          >
            Return to Scanner
          </button>
        </div>
      </div>
    );
  }

  const aiFindings = report.findings.filter(f => f.source === "ai" || f.source === "verified");
  const verifiedFindings = aiFindings.filter(f => f.source === "verified");
  const aiOnlyFindings = aiFindings.filter(f => f.source === "ai");

  // Calculate AI-specific score (brutal honesty)
  const calculateAIScore = (): number => {
    if (aiFindings.length === 0) return 100;

    let deductions = 0;
    
    aiFindings.forEach(finding => {
      switch (finding.severity) {
        case "critical":
          deductions += SEVERITY_DEDUCTIONS.critical;
          break;
        case "high":
          deductions += SEVERITY_DEDUCTIONS.high;
          break;
        case "medium":
          deductions += SEVERITY_DEDUCTIONS.medium;
          break;
        case "low":
          deductions += SEVERITY_DEDUCTIONS.low;
          break;
        case "info":
          deductions += SEVERITY_DEDUCTIONS.info;
          break;
      }
    });

    // Extra deduction for verified findings (AI + static both found it = definitely real)
    deductions += verifiedFindings.length * 5;

    const score = Math.max(0, 100 - deductions);
    return Math.round(score);
  };

  const aiScore = calculateAIScore();

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "var(--accent)";
    if (score >= 60) return "#a8e06a";
    if (score >= 40) return "var(--warning)";
    return "var(--danger)";
  };

  const getScoreGrade = (score: number): string => {
    if (score >= 90) return "A+";
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "F";
  };

  const getAIVerdict = (score: number): string => {
    if (score >= 90) return "AI found minimal issues. Code quality is excellent.";
    if (score >= 80) return "AI found some minor issues. Overall quality is good.";
    if (score >= 70) return "AI found several issues that should be addressed.";
    if (score >= 60) return "AI found multiple concerning issues. Improvements needed.";
    if (score >= 50) return "AI found significant problems. Major refactoring recommended.";
    return "AI found critical issues. Code requires immediate attention.";
  };

  const severityCounts = aiFindings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "var(--bg)",
      padding: "2rem 1rem"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <button
            onClick={() => router.back()}
            className="btn btn-ghost"
            style={{ marginBottom: "1rem" }}
          >
            ← Back to Report
          </button>
          
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "1rem",
            marginBottom: "0.5rem"
          }}>
            <div style={{ 
              width: "48px",
              height: "48px",
              background: "var(--primary)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#fff"
            }}>
              AI
            </div>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Deep Analysis Report
              </h1>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                Comprehensive AI-powered security and quality assessment
              </p>
            </div>
          </div>
        </div>

        {/* AI Score Card */}
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "2rem",
          marginBottom: "2rem"
        }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "auto 1fr",
            gap: "2rem",
            alignItems: "center"
          }}>
            {/* Score Ring */}
            <div style={{
              width: "140px",
              height: "140px",
              borderRadius: "50%",
              border: `6px solid ${getScoreColor(aiScore)}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg)"
            }}>
              <div style={{ 
                fontSize: "2.5rem", 
                fontWeight: 700, 
                color: getScoreColor(aiScore),
                lineHeight: 1
              }}>
                {aiScore}
              </div>
              <div style={{ 
                fontSize: "1rem", 
                fontWeight: 600, 
                color: "var(--muted)",
                marginTop: "0.25rem"
              }}>
                Grade {getScoreGrade(aiScore)}
              </div>
            </div>

            {/* Score Details */}
            <div>
              <h2 style={{ 
                fontSize: "1.25rem", 
                fontWeight: 600, 
                marginBottom: "0.5rem",
                color: "var(--text)"
              }}>
                AI Quality Assessment
              </h2>
              <p style={{ 
                fontSize: "0.95rem", 
                color: "var(--muted)", 
                marginBottom: "1.5rem",
                lineHeight: "1.5"
              }}>
                {getAIVerdict(aiScore)}
              </p>
              
              <div style={{ 
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "1rem"
              }}>
                <div style={{
                  background: "var(--bg)",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)"
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)" }}>
                    {aiFindings.length}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                    Total Findings
                  </div>
                </div>
                
                <div style={{
                  background: "var(--bg)",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)"
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
                    {verifiedFindings.length}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                    Verified
                  </div>
                </div>
                
                <div style={{
                  background: "var(--bg)",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)"
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>
                    {aiOnlyFindings.length}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                    AI Only
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Severity Breakdown */}
        {Object.keys(severityCounts).length > 0 && (
          <div className="card" style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1rem" }}>
              Severity Breakdown
            </h3>
            <div style={{ 
              display: "flex", 
              gap: "0.5rem", 
              flexWrap: "wrap" 
            }}>
              {(["critical", "high", "medium", "low", "info"] as const).map((severity) => {
                const count = severityCounts[severity] || 0;
                if (count === 0) return null;
                
                return (
                  <span key={severity} className={`badge badge-${severity}`}>
                    {severity}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Findings - Full Details */}
        <div>
          <h2 style={{ 
            fontSize: "1.25rem", 
            fontWeight: 600, 
            marginBottom: "1rem",
            color: "var(--text)"
          }}>
            Detailed Findings ({aiFindings.length})
          </h2>

          {aiFindings.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                No Issues Detected
              </h3>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                AI analysis found no security or quality issues in the scanned codebase.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {aiFindings.map((finding, index) => (
                <article 
                  key={finding.id} 
                  className={`finding-card severity-${finding.severity}`}
                  style={{ position: "relative" }}
                >
                  {/* Finding Number */}
                  <div style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    background: "var(--bg-secondary)",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)",
                    border: "1px solid var(--border)"
                  }}>
                    #{index + 1}
                  </div>

                  <div className="finding-meta">
                    <span className={`badge badge-${finding.severity}`}>{finding.severity}</span>
                    <span className="badge badge-info">{finding.category}</span>
                    {finding.source === "verified" && (
                      <span style={{
                        background: "var(--accent)",
                        color: "#06080d",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        Verified
                      </span>
                    )}
                    {finding.source === "ai" && (
                      <span style={{
                        background: "var(--primary)",
                        color: "#fff",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px"
                      }}>
                        AI
                      </span>
                    )}
                    {finding.file && (
                      <span style={{ fontSize: "0.78rem", color: "var(--muted)", wordBreak: "break-all" }}>
                        {finding.file}
                        {finding.line ? `:${finding.line}` : ""}
                      </span>
                    )}
                  </div>

                  <h3 className="finding-title">{sanitizeText(finding.title)}</h3>
                  
                  <p style={{ fontSize: "0.9rem", color: "var(--text)", marginBottom: "1rem", lineHeight: "1.6" }}>
                    {sanitizeText(finding.description)}
                  </p>

                  {finding.evidence && (
                    <div className="finding-section">
                      <strong>Evidence</strong>
                      <pre className="evidence">{sanitizeText(finding.evidence)}</pre>
                    </div>
                  )}

                  <div className="finding-section">
                    <strong>Remediation</strong>
                    <p>{sanitizeText(finding.mitigation)}</p>
                  </div>

                  <div className="finding-section">
                    <strong>Prevention</strong>
                    <p>{sanitizeText(finding.prevention)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: "3rem",
          padding: "1.25rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          borderLeft: "3px solid var(--primary)"
        }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text)" }}>
            Analysis Methodology
          </h4>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: "1.6" }}>
            This analysis uses advanced AI models to examine code context, business logic, data flow patterns, 
            and security vulnerabilities. Findings are scored based on severity and impact, with verified issues 
            confirmed by both static analysis and AI detection.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AIAnalysisPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "var(--bg)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: "40px",
            height: "40px",
            border: "3px solid var(--border)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 1rem"
          }} />
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Loading...</p>
        </div>
      </div>
    }>
      <AIAnalysisContent />
    </Suspense>
  );
}
