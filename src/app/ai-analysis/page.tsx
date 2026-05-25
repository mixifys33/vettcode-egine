"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { VettReport } from "@/lib/types";

export default function AIAnalysisPage() {
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
      }
    }
    setLoading(false);
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
            fontSize: "2rem", 
            marginBottom: "1rem",
            animation: "spin 1s linear infinite"
          }}>
            🤖
          </div>
          <p style={{ color: "var(--muted)" }}>Loading AI Analysis...</p>
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
        padding: "2rem"
      }}>
        <div style={{ textAlign: "center", maxWidth: "500px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>No Report Found</h1>
          <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
            Please run a scan first to view AI analysis.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn btn-primary"
          >
            Go to Scanner
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
          deductions += 15;
          break;
        case "high":
          deductions += 10;
          break;
        case "medium":
          deductions += 5;
          break;
        case "low":
          deductions += 2;
          break;
        case "info":
          deductions += 1;
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
            marginBottom: "1rem"
          }}>
            <div style={{ fontSize: "3rem" }}>🤖</div>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                AI Deep Analysis
              </h1>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
                Complete detailed analysis from AI engine - no sugarcoating, just facts
              </p>
            </div>
          </div>
        </div>

        {/* AI Score Card */}
        <div style={{
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))",
          border: "2px solid var(--primary)",
          borderRadius: "12px",
          padding: "2rem",
          marginBottom: "2rem",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "150px",
            height: "150px",
            background: "radial-gradient(circle at top right, rgba(99, 102, 241, 0.2), transparent)",
            pointerEvents: "none"
          }} />

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "auto 1fr",
            gap: "2rem",
            alignItems: "center"
          }}>
            {/* Score Ring */}
            <div style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              border: `8px solid ${getScoreColor(aiScore)}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0, 0, 0, 0.3)"
            }}>
              <div style={{ 
                fontSize: "3rem", 
                fontWeight: 700, 
                color: getScoreColor(aiScore),
                lineHeight: 1
              }}>
                {aiScore}
              </div>
              <div style={{ 
                fontSize: "1.2rem", 
                fontWeight: 600, 
                color: getScoreColor(aiScore),
                marginTop: "0.25rem"
              }}>
                {getScoreGrade(aiScore)}
              </div>
            </div>

            {/* Score Details */}
            <div>
              <h2 style={{ 
                fontSize: "1.5rem", 
                fontWeight: 700, 
                marginBottom: "0.5rem",
                color: "var(--text)"
              }}>
                AI Quality Score
              </h2>
              <p style={{ 
                fontSize: "1rem", 
                color: "var(--muted)", 
                marginBottom: "1rem" 
              }}>
                {getAIVerdict(aiScore)}
              </p>
              
              <div style={{ 
                display: "flex", 
                gap: "1rem", 
                flexWrap: "wrap",
                marginTop: "1rem"
              }}>
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(99, 102, 241, 0.3)"
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>
                    {aiFindings.length}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    Total AI Findings
                  </div>
                </div>
                
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(34, 211, 165, 0.3)"
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
                    {verifiedFindings.length}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    Verified by Both
                  </div>
                </div>
                
                <div style={{
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(139, 92, 246, 0.3)"
                }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#8b5cf6" }}>
                    {aiOnlyFindings.length}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
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
            fontSize: "1.5rem", 
            fontWeight: 700, 
            marginBottom: "1rem",
            color: "var(--text)"
          }}>
            Complete AI Findings ({aiFindings.length})
          </h2>

          {aiFindings.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✨</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                No AI Findings
              </h3>
              <p style={{ color: "var(--muted)" }}>
                AI analysis found no issues in your codebase. Excellent work!
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
                    background: "rgba(0, 0, 0, 0.5)",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "var(--muted)"
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
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 600
                      }}>
                        ✓ VERIFIED
                      </span>
                    )}
                    {finding.source === "ai" && (
                      <span style={{
                        background: "#8b5cf6",
                        color: "#fff",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 600
                      }}>
                        🤖 AI ONLY
                      </span>
                    )}
                    {finding.file && (
                      <span style={{ fontSize: "0.78rem", color: "var(--muted)", wordBreak: "break-all" }}>
                        {finding.file}
                        {finding.line ? `:${finding.line}` : ""}
                      </span>
                    )}
                  </div>

                  <h3 className="finding-title">{finding.title}</h3>
                  
                  <p style={{ fontSize: "0.95rem", color: "var(--text)", marginBottom: "1rem", lineHeight: "1.6" }}>
                    {finding.description}
                  </p>

                  {finding.evidence && (
                    <div className="finding-section">
                      <strong>Evidence</strong>
                      <pre className="evidence">{finding.evidence}</pre>
                    </div>
                  )}

                  <div className="finding-section">
                    <strong>How to Fix</strong>
                    <p>{finding.mitigation}</p>
                  </div>

                  <div className="finding-section">
                    <strong>Prevention Strategy</strong>
                    <p>{finding.prevention}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: "3rem",
          padding: "1.5rem",
          background: "rgba(99, 102, 241, 0.1)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: "8px",
          borderLeft: "4px solid var(--primary)"
        }}>
          <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--primary)" }}>
            💡 About AI Analysis
          </h4>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: "1.6" }}>
            Our AI examines your code's context, understands business logic, traces data flow, and identifies 
            subtle vulnerabilities that pattern-based scanners miss. The AI score is calculated based on the 
            severity and quantity of issues found, with no sugarcoating - just honest assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
