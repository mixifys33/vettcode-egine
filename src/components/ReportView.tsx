"use client";

import type { Finding, VettReport, FileTreeNode } from "@/lib/types";
import type { ScanMode } from "@/lib/smart-scan-orchestrator";
import { useState, useEffect } from "react";
import { PreListModal, type PreListFormData } from "./PreListModal";
import { AutoPreListSettings } from "./AutoPreListSettings";
import { AuthModal } from "./AuthModal";

function FileTreeItem({ node, level = 0 }: { node: FileTreeNode; level?: number }) {
  const [isOpen, setIsOpen] = useState(level < 2);

  if (node.type === "file") {
    return (
      <div
        className="file-tree-item"
        style={{ paddingLeft: `${level * 16}px` }}
      >
        📄 {node.name}
      </div>
    );
  }

  return (
    <div>
      <div
        className="file-tree-item file-tree-folder"
        style={{ paddingLeft: `${level * 16}px` }}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen(!isOpen);
        }}
      >
        {isOpen ? "📂" : "📁"} {node.name}
        {node.children?.length ? ` (${node.children.length})` : ""}
      </div>
      {isOpen &&
        node.children?.map((child, i) => (
          <FileTreeItem key={`${child.path}-${i}`} node={child} level={level + 1} />
        ))}
    </div>
  );
}

// Helper to build flat file tree for JSON export
function buildFlatFileTree(nodes: FileTreeNode[], prefix = ""): string[] {
  const result: string[] = [];
  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";
    
    result.push(prefix + connector + node.name);
    
    if (node.type === "folder" && node.children) {
      result.push(...buildFlatFileTree(node.children, prefix + childPrefix));
    }
  });
  return result;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--accent)";
  if (score >= 60) return "#a8e06a";
  if (score >= 40) return "var(--warning)";
  return "var(--danger)";
}

function FindingItem({ f, isExpanded, onToggle }: { f: Finding; isExpanded: boolean; onToggle: () => void }) {
  return (
    <article id={`finding-${f.id}`} className={`finding-card severity-${f.severity}`}>
      <div className="finding-meta">
        <span className={`badge badge-${f.severity}`}>{f.severity}</span>
        <span className="badge badge-info">{f.category}</span>
        {f.source && (
          <span style={{
            fontSize: "0.7rem",
            padding: "0.2rem 0.5rem",
            borderRadius: "999px",
            fontWeight: 600,
            background: f.source === "verified" ? "var(--accent)" : f.source === "ai" ? "#8b5cf6" : "var(--muted)",
            color: f.source === "static" ? "var(--text)" : "#fff"
          }}>
            {f.source === "verified" ? "✓ VERIFIED" : f.source === "ai" ? "🤖 AI" : "STATIC"}
          </span>
        )}
        {f.file && (
          <span style={{ fontSize: "0.78rem", color: "var(--muted)", wordBreak: "break-all" }}>
            {f.file}
            {f.line ? `:${f.line}` : ""}
          </span>
        )}
      </div>
      <h3 className="finding-title">{f.title}</h3>
      <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "0.75rem" }}>{f.description}</p>
      
      <button
        type="button"
        onClick={onToggle}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "0.85rem",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          color: "var(--primary)",
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: isExpanded ? "0.75rem" : "0"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-secondary)";
          e.currentTarget.style.borderColor = "var(--primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        {isExpanded ? "Hide Details ▲" : "Show Details ▼"}
      </button>
      
      {isExpanded && (
        <>
          {f.evidence && (
            <div className="finding-section">
              <strong>Evidence</strong>
              <pre className="evidence">{f.evidence}</pre>
            </div>
          )}
          <div className="finding-section">
            <strong>Mitigation</strong>
            <p>{f.mitigation}</p>
          </div>
          <div className="finding-section">
            <strong>Prevention</strong>
            <p>{f.prevention}</p>
          </div>
        </>
      )}
    </article>
  );
}

interface ReportViewProps {
  report: VettReport;
  warnings?: string[];
  scanMode?: ScanMode;
  onReset: () => void;
}

export function ReportView({
  report,
  warnings,
  scanMode = "quick",
  onReset,
}: ReportViewProps) {
  const [showAllBlockers, setShowAllBlockers] = useState(false);
  const [showAllStrengths, setShowAllStrengths] = useState(false);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [showFileTree, setShowFileTree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showPreListModal, setShowPreListModal] = useState(false);
  const [showAutoPreListSettings, setShowAutoPreListSettings] = useState(false);
  const [autoPreListEnabled, setAutoPreListEnabled] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Check auto pre-list setting on mount
  useEffect(() => {
    const saved = localStorage.getItem("vettcode_auto_prelist");
    setAutoPreListEnabled(saved === "true");
  }, []);
  
  // Auto-open modal if setting is enabled and score >= 60 - DISABLED as per user request
  // User does not want auto-open, only manual button click
  useEffect(() => {
    // Auto pre-list setting is saved but not auto-triggered
    // Modal only opens on explicit button click
  }, []);
  
  // This useEffect is no longer needed since we use local AuthModal instead of redirects
  useEffect(() => {
    // Previously handled redirect returns from external login
    // Now handled by AuthModal internally
  }, []);
  
  const sorted = [...report.findings].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.severity] - order[b.severity];
  });

  const counts = sorted.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  
  // Smart default severity filter: show highest severity available
  const getDefaultSeverities = (): string[] => {
    if (counts.critical > 0) return ['critical'];
    if (counts.high > 0) return ['high'];
    if (counts.medium > 0) return ['medium'];
    if (counts.low > 0) return ['low'];
    if (counts.info > 0) return ['info'];
    return ['critical', 'high', 'medium', 'low', 'info']; // Show all if none found
  };
  
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(getDefaultSeverities());
  
  // Toggle severity filter
  const toggleSeverity = (severity: string) => {
    setSelectedSeverities(prev => {
      if (prev.includes(severity)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== severity);
      } else {
        return [...prev, severity];
      }
    });
  };
  
  // Toggle finding expansion
  const toggleFinding = (id: string) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Filter findings by selected severities
  const filteredFindings = sorted.filter(f => selectedSeverities.includes(f.severity));
  
  // Limit critical blockers display
  const BLOCKERS_PREVIEW_LIMIT = 3;
  const hasMoreBlockers = report.criticalBlockers.length > BLOCKERS_PREVIEW_LIMIT;
  const displayedBlockers = showAllBlockers 
    ? report.criticalBlockers 
    : report.criticalBlockers.slice(0, BLOCKERS_PREVIEW_LIMIT);
  
  // Limit strengths display
  const STRENGTHS_PREVIEW_LIMIT = 5;
  const hasMoreStrengths = report.strengths.length > STRENGTHS_PREVIEW_LIMIT;
  const displayedStrengths = showAllStrengths
    ? report.strengths
    : report.strengths.slice(0, STRENGTHS_PREVIEW_LIMIT);
  
  // Limit findings display
  const FINDINGS_PREVIEW_LIMIT = 10;
  const hasMoreFindings = filteredFindings.length > FINDINGS_PREVIEW_LIMIT;
  const displayedFindings = showAllFindings
    ? filteredFindings
    : filteredFindings.slice(0, FINDINGS_PREVIEW_LIMIT);
  
  // Download file tree as JSON
  const downloadFileTree = () => {
    if (!report.metadata?.fileTree) return;
    
    const treeLines = buildFlatFileTree(report.metadata.fileTree);
    const treeText = treeLines.join('\n');
    
    const blob = new Blob([treeText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vettcode-file-tree-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Handle monetize button click - check auth and open modal
  const handleMonetizeClick = () => {
    // Check if user has valid seller token
    const token = localStorage.getItem("sellerToken") || localStorage.getItem("vettcode_seller_token") || localStorage.getItem("seller_token");
    
    if (!token) {
      // No token - show auth modal instead of redirecting
      setShowAuthModal(true);
      return;
    }
    
    // Validate token freshness
    try {
      const tokenParts = token.split('_');
      if (tokenParts.length >= 3) {
        const timestamp = parseInt(tokenParts[2], 10);
        const tokenAge = Date.now() - timestamp;
        const MAX_TOKEN_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (tokenAge > MAX_TOKEN_AGE) {
          // Token expired - clear and show auth modal
          console.warn('[Monetize] Token expired, showing login');
          localStorage.removeItem("sellerToken");
          localStorage.removeItem("vettcode_seller_token");
          localStorage.removeItem("seller_token");
          setShowAuthModal(true);
          return;
        }
      }
    } catch (error) {
      console.error('[Monetize] Token validation error:', error);
      // Invalid token format - show auth modal
      localStorage.removeItem("sellerToken");
      localStorage.removeItem("vettcode_seller_token");
      localStorage.removeItem("seller_token");
      setShowAuthModal(true);
      return;
    }

    // User is authenticated with fresh token, open pre-list form directly
    setShowPreListModal(true);
  };
  
  // Handle successful authentication
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Open pre-list modal after successful login
    setShowPreListModal(true);
  };

  // Handle settings save
  const handleAutoPreListSave = (enabled: boolean) => {
    setAutoPreListEnabled(enabled);
    if (enabled) {
      // Show success message
      alert("✅ Auto pre-list enabled! The form will open automatically after each scan (score ≥ 60).");
    }
  };

  // Handle form submission from modal
  const handlePreListSubmit = async (formData: PreListFormData) => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const token = localStorage.getItem("sellerToken") || localStorage.getItem("vettcode_seller_token") || localStorage.getItem("seller_token");
      
      if (!token) {
        throw new Error("Authentication required");
      }

      // Prepare form data for multipart/form-data
      const submitData = new FormData();
      
      // Add text fields
      submitData.append("projectName", formData.projectName);
      submitData.append("projectDescription", formData.projectDescription);
      submitData.append("detailedDescription", formData.detailedDescription);
      submitData.append("vettScore", report.score.toString());
      submitData.append("vettGrade", report.grade);
      submitData.append("executiveVerdict", report.executiveVerdict);
      submitData.append("scanReport", JSON.stringify(report));
      submitData.append("fileTree", JSON.stringify(report.metadata?.fileTree || null));
      submitData.append("languages", JSON.stringify(extractLanguages(report)));
      submitData.append("frameworks", JSON.stringify(extractFrameworks(report)));
      submitData.append("hasTests", String(report.strengths?.some(s => s.toLowerCase().includes("test")) || false));
      submitData.append("hasDocumentation", String(report.strengths?.some(s => s.toLowerCase().includes("documentation")) || false));
      submitData.append("category", formData.category);
      submitData.append("subCategory", formData.subCategory);
      submitData.append("tags", formData.tags);
      submitData.append("regularPrice", formData.regularPrice);
      submitData.append("salePrice", formData.salePrice);
      submitData.append("licenseType", formData.licenseType);
      submitData.append("demoUrl", formData.demoUrl);
      submitData.append("documentationUrl", formData.documentationUrl);
      submitData.append("videoUrl", formData.videoUrl);
      submitData.append("features", JSON.stringify(formData.features.filter(f => f.trim())));
      
      // Add images
      formData.images.forEach((image) => {
        submitData.append("images", image);
      });

      // Submit to backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      const response = await fetch(`${backendUrl}/api/pre-listed-code/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submitData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to pre-list code");
      }

      // Redirect to success page
      const params = new URLSearchParams({
        projectName: data.data.projectName,
        vettScore: data.data.vettScore.toString(),
        vettGrade: data.data.vettGrade,
      });

      window.location.href = `/pre-list-success?${params.toString()}`;
    } catch (error: any) {
      console.error("Monetization error:", error);
      throw error; // Re-throw to be handled by modal
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper: Extract languages from report
  const extractLanguages = (report: VettReport): string[] => {
    const languages = new Set<string>();
    
    // Extract from file extensions
    report.findings.forEach((finding) => {
      if (finding.file) {
        const ext = finding.file.split('.').pop()?.toLowerCase();
        if (ext) {
          const langMap: Record<string, string> = {
            'js': 'JavaScript',
            'jsx': 'JavaScript',
            'ts': 'TypeScript',
            'tsx': 'TypeScript',
            'py': 'Python',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'cs': 'C#',
            'go': 'Go',
            'rb': 'Ruby',
            'php': 'PHP',
            'swift': 'Swift',
            'kt': 'Kotlin',
            'rs': 'Rust',
          };
          if (langMap[ext]) {
            languages.add(langMap[ext]);
          }
        }
      }
    });
    
    return Array.from(languages);
  };

  // Helper: Extract frameworks from report
  const extractFrameworks = (report: VettReport): string[] => {
    const frameworks = new Set<string>();
    const codeText = report.findings.map(f => f.evidence?.toLowerCase() || "").join(" ");
    
    const frameworkPatterns = [
      { name: "React", pattern: /react/i },
      { name: "Next.js", pattern: /next/i },
      { name: "Vue", pattern: /vue/i },
      { name: "Angular", pattern: /angular/i },
      { name: "Express", pattern: /express/i },
      { name: "Django", pattern: /django/i },
      { name: "Flask", pattern: /flask/i },
      { name: "Laravel", pattern: /laravel/i },
      { name: "Spring", pattern: /spring/i },
      { name: "Node.js", pattern: /node/i },
    ];

    frameworkPatterns.forEach(({ name, pattern }) => {
      if (pattern.test(codeText)) frameworks.add(name);
    });

    return Array.from(frameworks);
  };

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div className="card report-header-card">
        <div
          className="score-ring"
          style={{ borderColor: scoreColor(report.score) }}
        >
          <span
            className="score-value"
            style={{ color: scoreColor(report.score) }}
          >
            {report.score}
          </span>
          <span className="score-grade">{report.grade}</span>
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p className="report-title">Vetting report</p>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {report.executiveVerdict}
          </p>
          <p style={{ marginTop: "0.6rem", fontSize: "0.85rem" }}>
            {report.summary}
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.75rem",
              color: "var(--muted)",
            }}
          >
            {scanMode === "quick" ? "Quick scan" : "Deep scan"} ·{" "}
            {report.metadata?.scannedAt
              ? new Date(report.metadata.scannedAt).toLocaleString()
              : "Just now"}
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-value">
            {report.metadata?.filesScanned ?? report.scannedFiles ?? 0}
          </div>
          <div className="stat-label">Files</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">
            {(report.metadata?.linesScanned ?? report.scannedLines ?? 0).toLocaleString()}
          </div>
          <div className="stat-label">Lines</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">
            {report.metadata?.ignoredPaths ?? report.ignoredPaths ?? 0}
          </div>
          <div className="stat-label">Ignored</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{sorted.length}</div>
          <div className="stat-label">Findings</div>
        </div>
        {report.metadata?.reportConfidence != null && (
          <div className="stat-box">
            <div className="stat-value">{report.metadata.reportConfidence}%</div>
            <div className="stat-label">Confidence</div>
          </div>
        )}
      </div>

      {report.metadata?.fileTree && report.metadata.fileTree.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            gap: "0.5rem"
          }}>
            <h3 className="section-heading" style={{ margin: 0 }}>
              📁 Project Structure
            </h3>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowFileTree(!showFileTree)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  background: showFileTree ? "var(--primary)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: showFileTree ? "#fff" : "var(--text)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {showFileTree ? "Hide Tree" : "Show Tree"}
              </button>
              <button
                type="button"
                onClick={downloadFileTree}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--accent)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                📥 Download Tree
              </button>
            </div>
          </div>
          {showFileTree && (
            <div className="file-tree">
              {report.metadata.fileTree.map((node, i) => (
                <FileTreeItem key={i} node={node} />
              ))}
            </div>
          )}
          {!showFileTree && (
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Click "Show Tree" to view the complete folder structure, or download it as a text file.
            </p>
          )}
        </div>
      )}

      {report.criticalBlockers.length > 0 && (
        <div style={{ 
          marginTop: "1rem",
          background: "linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(251, 113, 133, 0.05))",
          border: "2px solid var(--danger)",
          borderRadius: "12px",
          padding: "1.5rem",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Decorative corner accent */}
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100px",
            height: "100px",
            background: "radial-gradient(circle at top right, rgba(244, 63, 94, 0.2), transparent)",
            pointerEvents: "none"
          }} />
          
          <div style={{ 
            display: "flex", 
            alignItems: "flex-start", 
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap"
          }}>
            <div style={{
              fontSize: "2.5rem",
              lineHeight: 1,
              flexShrink: 0
            }}>
              🚨
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <h3 style={{ 
                color: "var(--danger)", 
                fontSize: "1.25rem", 
                fontWeight: 700,
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap"
              }}>
                Critical Blockers
                <span style={{
                  background: "var(--danger)",
                  color: "#fff",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.85rem",
                  fontWeight: 600
                }}>
                  {report.criticalBlockers.length}
                </span>
              </h3>
              <p style={{ 
                fontSize: "0.9rem", 
                color: "var(--muted)",
                marginBottom: "1rem"
              }}>
                These issues must be fixed before production deployment. They represent serious security vulnerabilities or critical bugs.
              </p>
            </div>
          </div>
          
          <div style={{
            background: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            padding: "1rem",
            border: "1px solid rgba(244, 63, 94, 0.3)"
          }}>
            <ul style={{ 
              paddingLeft: "1.5rem", 
              fontSize: "0.95rem",
              lineHeight: "1.8",
              margin: 0
            }}>
              {displayedBlockers.map((b, i) => (
                <li key={i} style={{ 
                  marginBottom: "0.75rem",
                  color: "var(--text)",
                  position: "relative"
                }}>
                  <span style={{
                    position: "absolute",
                    left: "-1.5rem",
                    color: "var(--danger)",
                    fontWeight: "bold"
                  }}>
                    ⚠
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          
          {hasMoreBlockers && (
            <button
              type="button"
              onClick={() => setShowAllBlockers(!showAllBlockers)}
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1.5rem",
                fontSize: "0.9rem",
                background: "var(--danger)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.2s ease",
                width: "100%"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(244, 63, 94, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {showAllBlockers 
                ? "Show Less ▲" 
                : `⚠ Show ${report.criticalBlockers.length - BLOCKERS_PREVIEW_LIMIT} More Critical Issues`}
            </button>
          )}
          
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "6px",
            fontSize: "0.85rem",
            color: "var(--muted)",
            borderLeft: "3px solid var(--warning)"
          }}>
            💡 <strong style={{ color: "var(--warning)" }}>Pro Tip:</strong> Fix these issues first to dramatically improve your security score. Each critical blocker can reduce your score by 10-15 points.
          </div>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="disclaimer" style={{ marginTop: "1rem" }}>
          <strong>Scan notes</strong>
          <ul style={{ marginTop: "0.35rem", paddingLeft: "1.2rem" }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "0.45rem",
          flexWrap: "wrap",
          margin: "1.25rem 0 0.85rem",
        }}
      >
        {(["critical", "high", "medium", "low", "info"] as const).map((s) =>
          counts[s] ? (
            <span key={s} className={`badge badge-${s}`}>
              {s}: {counts[s]}
            </span>
          ) : null
        )}
      </div>

      {report.strengths.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <h3 className="section-heading">Strengths ({report.strengths.length})</h3>
          <ul
            style={{
              paddingLeft: "1.2rem",
              color: "var(--muted)",
              fontSize: "0.9rem",
            }}
          >
            {displayedStrengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {hasMoreStrengths && (
            <button
              type="button"
              onClick={() => setShowAllStrengths(!showAllStrengths)}
              style={{
                marginTop: "0.75rem",
                padding: "0.5rem 1rem",
                fontSize: "0.85rem",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-secondary)";
                e.currentTarget.style.borderColor = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              {showAllStrengths 
                ? "Show less" 
                : `Show ${report.strengths.length - STRENGTHS_PREVIEW_LIMIT} more`}
            </button>
          )}
        </div>
      )}

      {/* AI Analysis Section */}
      {(() => {
        const aiFindings = sorted.filter(f => f.source === "ai" || f.source === "verified");
        const staticFindings = sorted.filter(f => f.source === "static");
        const verifiedFindings = sorted.filter(f => f.source === "verified");
        
        const hasAIAnalysis = aiFindings.length > 0 || report.metadata?.aiFindings || report.metadata?.verifiedFindings;
        
        if (!hasAIAnalysis) return null;
        
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
        
        const handleViewFullAnalysis = () => {
          // Store report in sessionStorage for AI analysis page
          sessionStorage.setItem("vettcode_current_report", JSON.stringify(report));
          // Navigate to AI analysis page
          window.location.href = "/ai-analysis";
        };
        
        return (
          <div style={{
            marginBottom: "1.5rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "1.5rem"
          }}>
            
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap"
            }}>
              <div style={{ 
                width: "40px",
                height: "40px",
                background: "var(--primary)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0
              }}>
                AI
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "0.5rem",
                  flexWrap: "wrap"
                }}>
                  <h3 style={{
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: 0
                  }}>
                    Deep Analysis
                  </h3>
                  
                  {/* AI Score Badge */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    background: "var(--bg)",
                    padding: "0.4rem 0.9rem",
                    borderRadius: "4px",
                    border: `1px solid ${getScoreColor(aiScore)}`
                  }}>
                    <span style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: getScoreColor(aiScore)
                    }}>
                      {aiScore}
                    </span>
                    <span style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--muted)"
                    }}>
                      Grade {getScoreGrade(aiScore)}
                    </span>
                  </div>
                  
                  <span style={{
                    background: "var(--bg)",
                    color: "var(--text)",
                    padding: "0.4rem 0.9rem",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    border: "1px solid var(--border)"
                  }}>
                    {aiFindings.length} findings
                  </span>
                </div>
                <p style={{
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                  marginBottom: "1rem",
                  lineHeight: "1.5"
                }}>
                  Advanced analysis using context-aware AI models to identify security vulnerabilities and code quality issues.
                </p>
              </div>
            </div>
            
            {/* AI Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1rem"
            }}>
              <div style={{
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "8px",
                padding: "0.75rem",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>
                  {report.metadata?.staticFindings ?? staticFindings.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  Static Analysis
                </div>
              </div>
              <div style={{
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "8px",
                padding: "0.75rem",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#8b5cf6" }}>
                  {report.metadata?.aiFindings ?? aiFindings.filter(f => f.source === "ai").length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  AI Discovered
                </div>
              </div>
              <div style={{
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "8px",
                padding: "0.75rem",
                border: "1px solid rgba(34, 211, 165, 0.3)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
                  {report.metadata?.verifiedFindings ?? verifiedFindings.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                  AI Verified
                </div>
              </div>
            </div>
            
            {/* AI Findings List */}
            {aiFindings.length > 0 && (
              <div style={{
                background: "rgba(0, 0, 0, 0.2)",
                borderRadius: "8px",
                padding: "1rem",
                border: "1px solid rgba(99, 102, 241, 0.3)"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem"
                }}>
                  <h4 style={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: 0
                  }}>
                    🔍 AI-Discovered Issues
                  </h4>
                  <span style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    fontStyle: "italic"
                  }}>
                    {aiFindings.length} total
                  </span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {aiFindings.slice(0, 5).map((finding) => (
                    <div
                      key={finding.id}
                      style={{
                        padding: "0.75rem",
                        background: "rgba(0, 0, 0, 0.3)",
                        borderRadius: "6px",
                        border: `1px solid ${finding.source === "verified" ? "rgba(34, 211, 165, 0.3)" : "rgba(139, 92, 246, 0.3)"}`,
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onClick={() => {
                        // Scroll to the finding in the main findings section
                        const element = document.getElementById(`finding-${finding.id}`);
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth", block: "center" });
                          // Highlight the finding briefly
                          element.style.boxShadow = "0 0 0 3px var(--primary)";
                          setTimeout(() => {
                            element.style.boxShadow = "";
                          }, 2000);
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.4)";
                        e.currentTarget.style.borderColor = finding.source === "verified" ? "var(--accent)" : "#8b5cf6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.3)";
                        e.currentTarget.style.borderColor = finding.source === "verified" ? "rgba(34, 211, 165, 0.3)" : "rgba(139, 92, 246, 0.3)";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span className={`badge badge-${finding.severity}`} style={{ fontSize: "0.7rem" }}>
                          {finding.severity}
                        </span>
                        {finding.source === "verified" && (
                          <span style={{
                            background: "var(--accent)",
                            color: "#06080d",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                            fontSize: "0.65rem",
                            fontWeight: 600
                          }}>
                            ✓ VERIFIED
                          </span>
                        )}
                        {finding.source === "ai" && (
                          <span style={{
                            background: "#8b5cf6",
                            color: "#fff",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                            fontSize: "0.65rem",
                            fontWeight: 600
                          }}>
                            🤖 AI
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>
                        {finding.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {finding.description.length > 120 
                          ? finding.description.substring(0, 120) + "..." 
                          : finding.description}
                      </div>
                      {finding.file && (
                        <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.25rem", fontFamily: "monospace" }}>
                          📄 {finding.file}{finding.line ? `:${finding.line}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {aiFindings.length > 5 && (
                  <p style={{
                    marginTop: "0.75rem",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    textAlign: "center",
                    fontStyle: "italic"
                  }}>
                    + {aiFindings.length - 5} more AI findings below in the main findings section
                  </p>
                )}
              </div>
            )}
            
            <div style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "6px",
              fontSize: "0.85rem",
              color: "var(--muted)",
              borderLeft: "3px solid var(--primary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <div>
                💡 <strong style={{ color: "var(--primary)" }}>How AI Analysis Works:</strong> Our AI examines your code's context, understands business logic, traces data flow, and identifies subtle vulnerabilities that pattern-based scanners miss.
              </div>
              <button
                type="button"
                onClick={handleViewFullAnalysis}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "0.9rem",
                  background: "var(--primary)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                📊 View Full AI Analysis
              </button>
            </div>
          </div>
        );
      })()}

      <h2 className="section-heading" style={{ marginBottom: "0.75rem" }}>
        Findings ({filteredFindings.length} of {sorted.length})
      </h2>
      
      {/* Severity Filter Toggles */}
      <div style={{ 
        marginBottom: "1rem", 
        padding: "1rem",
        background: "var(--bg-secondary)",
        borderRadius: "8px",
        border: "1px solid var(--border)"
      }}>
        <p style={{ 
          fontSize: "0.85rem", 
          color: "var(--muted)", 
          marginBottom: "0.75rem",
          fontWeight: 500
        }}>
          Filter by severity:
        </p>
        <div style={{ 
          display: "flex", 
          gap: "0.5rem", 
          flexWrap: "wrap" 
        }}>
          {(["critical", "high", "medium", "low", "info"] as const).map((severity) => {
            const count = counts[severity] || 0;
            const isSelected = selectedSeverities.includes(severity);
            const isDisabled = count === 0;
            
            return (
              <button
                key={severity}
                type="button"
                onClick={() => !isDisabled && toggleSeverity(severity)}
                disabled={isDisabled}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  border: `2px solid ${isSelected ? `var(--${severity === 'critical' ? 'danger' : severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : severity === 'low' ? 'accent' : 'muted'})` : 'var(--border)'}`,
                  borderRadius: "6px",
                  background: isSelected 
                    ? `var(--${severity === 'critical' ? 'danger' : severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : severity === 'low' ? 'accent' : 'muted'})` 
                    : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text)',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.4 : 1,
                  transition: "all 0.2s ease",
                  textTransform: "capitalize"
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled && !isSelected) {
                    e.currentTarget.style.borderColor = `var(--${severity === 'critical' ? 'danger' : severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : severity === 'low' ? 'accent' : 'muted'})`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled && !isSelected) {
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }
                }}
              >
                {severity} ({count})
              </button>
            );
          })}
        </div>
        <p style={{ 
          fontSize: "0.75rem", 
          color: "var(--muted)", 
          marginTop: "0.75rem",
          fontStyle: "italic"
        }}>
          {selectedSeverities.length === 1 
            ? `Showing only ${selectedSeverities[0]} severity findings` 
            : `Showing ${selectedSeverities.length} severity levels`}
        </p>
      </div>
      
      {filteredFindings.length === 0 ? (
        <p className="card" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
          No findings match the selected severity filters.
        </p>
      ) : sorted.length === 0 ? (
        <p className="card" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
          No issues reported. Validate with tests and manual review before
          production — automated scans can miss context-specific risks.
        </p>
      ) : (
        <>
          {displayedFindings.map((f) => (
            <FindingItem 
              key={f.id} 
              f={f} 
              isExpanded={expandedFindings.has(f.id)}
              onToggle={() => toggleFinding(f.id)}
            />
          ))}
          {hasMoreFindings && (
            <button
              type="button"
              onClick={() => setShowAllFindings(!showAllFindings)}
              className="btn btn-ghost"
              style={{
                marginTop: "1rem",
                width: "100%",
              }}
            >
              {showAllFindings 
                ? "Show less findings" 
                : `Show ${filteredFindings.length - FINDINGS_PREVIEW_LIMIT} more findings`}
            </button>
          )}
        </>
      )}

      {/* Monetize on VETTCODE Section - Score >= 60 */}
      {report.score >= 60 && (
        <div style={{
          marginTop: "1.5rem",
          padding: "1.5rem",
          background: "linear-gradient(135deg, rgba(34, 211, 165, 0.1), rgba(91, 124, 250, 0.1))",
          border: "2px solid var(--accent)",
          borderRadius: "12px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "120px",
            height: "120px",
            background: "radial-gradient(circle at top right, rgba(34, 211, 165, 0.2), transparent)",
            pointerEvents: "none"
          }} />
          
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap"
          }}>
            <div style={{ fontSize: "2.5rem", lineHeight: 1, flexShrink: 0 }}>
              💰
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginBottom: "0.5rem",
                    background: "linear-gradient(90deg, var(--accent), var(--primary))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent"
                  }}>
                    Ready to Earn from Your Code?
                  </h3>
                  <p style={{ fontSize: "0.95rem", color: "var(--muted)", marginBottom: "1rem" }}>
                    Your code scored <span style={{ fontWeight: 700, color: "var(--accent)" }}>{report.grade}</span>! 
                    Pre-list it on VETTCODE and get notified when corporate buyers can purchase it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAutoPreListSettings(true)}
                  title="Auto Pre-List Settings"
                  style={{
                    padding: "0.5rem",
                    background: "rgba(99, 102, 241, 0.1)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    borderRadius: "6px",
                    color: "var(--primary)",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    transition: "all 0.2s ease",
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)";
                    e.currentTarget.style.borderColor = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                  }}
                >
                  ⚙️
                </button>
              </div>
            </div>
          </div>
          
          <div style={{
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
            border: "1px solid rgba(34, 211, 165, 0.3)"
          }}>
            <ul style={{ 
              listStyle: "none", 
              padding: 0, 
              margin: 0,
              fontSize: "0.9rem",
              lineHeight: "1.8"
            }}>
              {[
                { icon: "✓", text: "No public listing yet - your code stays private" },
                { icon: "💵", text: "Set your own price when the platform launches" },
                { icon: "📧", text: "Get notified the moment buyers can purchase" },
                { icon: "🏆", text: "Early pre-listers get priority placement & badges" }
              ].map((item, idx) => (
                <li key={idx} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  marginBottom: idx < 3 ? "0.5rem" : "0"
                }}>
                  <span style={{ color: "var(--accent)", fontWeight: "bold", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span style={{ color: "var(--text)" }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {submitError && (
            <div style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              background: "rgba(244, 63, 94, 0.1)",
              border: "1px solid var(--danger)",
              borderRadius: "8px",
              color: "var(--danger)",
              fontSize: "0.9rem"
            }}>
              {submitError}
            </div>
          )}
          
          <button
            onClick={handleMonetizeClick}
            disabled={isSubmitting}
            style={{
              display: "block",
              width: "100%",
              padding: "1rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 700,
              textAlign: "center",
              background: isSubmitting 
                ? "var(--muted)" 
                : "linear-gradient(135deg, var(--accent), #14b88a)",
              color: "#06080d",
              border: "none",
              borderRadius: "8px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 12px rgba(34, 211, 165, 0.3)",
              opacity: isSubmitting ? 0.6 : 1
            }}
            onMouseEnter={(e: any) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(34, 211, 165, 0.4)";
              }
            }}
            onMouseLeave={(e: any) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(34, 211, 165, 0.3)";
              }
            }}
          >
            {isSubmitting ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <span style={{ 
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  border: "2px solid #06080d",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite"
                }} />
                Pre-Listing Your Code...
              </span>
            ) : (
              "🚀 Start Earning from Your Code on VETTCODE"
            )}
          </button>
          
          <p style={{
            marginTop: "0.75rem",
            fontSize: "0.75rem",
            color: "var(--muted)",
            textAlign: "center"
          }}>
            Free to pre-list • No commitment • Set your price later
          </p>
        </div>
      )}

      {/* Missing Out Section - Score < 60 */}
      {report.score < 60 && (
        <div style={{
          marginTop: "1.5rem",
          padding: "1.5rem",
          background: "linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05))",
          border: "2px solid var(--warning)",
          borderRadius: "12px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "120px",
            height: "120px",
            background: "radial-gradient(circle at top right, rgba(251, 191, 36, 0.2), transparent)",
            pointerEvents: "none"
          }} />
          
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap"
          }}>
            <div style={{ fontSize: "2.5rem", lineHeight: 1, flexShrink: 0 }}>
              ⚠️
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <h3 style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
                color: "var(--warning)"
              }}>
                You're Missing Out on Earning Potential!
              </h3>
              <p style={{ fontSize: "0.95rem", color: "var(--muted)", marginBottom: "1rem" }}>
                Your code scored <span style={{ fontWeight: 700, color: "var(--warning)" }}>{report.grade} ({report.score}/100)</span>. 
                To monetize on VETTCODE, you need a minimum score of <span style={{ fontWeight: 700, color: "var(--accent)" }}>60/100</span>.
              </p>
            </div>
          </div>
          
          <div style={{
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
            border: "1px solid rgba(251, 191, 36, 0.3)"
          }}>
            <p style={{ 
              fontSize: "0.9rem", 
              fontWeight: 600, 
              marginBottom: "0.75rem",
              color: "var(--text)"
            }}>
              🎯 How to Reach 60+ Score:
            </p>
            <ul style={{ 
              listStyle: "none", 
              padding: 0, 
              margin: 0,
              fontSize: "0.9rem",
              lineHeight: "1.8"
            }}>
              {[
                { icon: "🔴", text: `Fix ${report.criticalBlockers.length} critical blocker${report.criticalBlockers.length !== 1 ? 's' : ''} (highest priority!)` },
                { icon: "🟠", text: "Address high-severity security vulnerabilities" },
                { icon: "🟡", text: "Improve error handling and input validation" },
                { icon: "🟢", text: "Add tests and documentation for better quality" }
              ].map((item, idx) => (
                <li key={idx} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  marginBottom: idx < 3 ? "0.5rem" : "0"
                }}>
                  <span style={{ flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span style={{ color: "var(--text)" }}>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div style={{
            padding: "0.75rem 1rem",
            background: "rgba(34, 211, 165, 0.1)",
            border: "1px solid var(--accent)",
            borderRadius: "8px",
            fontSize: "0.85rem",
            color: "var(--text)",
            borderLeft: "3px solid var(--accent)"
          }}>
            💡 <strong style={{ color: "var(--accent)" }}>Good News:</strong> You're only {60 - report.score} points away! 
            Fix the issues above, rescan your code, and start earning from VETTCODE.
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "1.75rem",
          display: "flex",
          gap: "0.65rem",
          flexWrap: "wrap",
        }}
      >
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          Scan another project
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const blob = new Blob([JSON.stringify(report, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `vettcode-report-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export JSON
        </button>
      </div>

      <p className="disclaimer" style={{ marginTop: "1rem" }}>
        Scores are strict estimates. Use findings alongside tests, threat
        modeling, and professional review before release because if we score your application poor then its poor according to the industrial standards
        {scanMode === "quick" &&
          " Quick scan prioritizes high-signal surfaces — run deep scan before major releases."}
      </p>

      {/* Pre-List Modal */}
      <PreListModal
        isOpen={showPreListModal}
        onClose={() => setShowPreListModal(false)}
        report={report}
        onSubmit={handlePreListSubmit}
      />

      {/* Auto Pre-List Settings Modal */}
      <AutoPreListSettings
        isOpen={showAutoPreListSettings}
        onClose={() => setShowAutoPreListSettings(false)}
        onSave={handleAutoPreListSave}
      />

      {/* Seller Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
