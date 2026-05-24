"use client";

import type { Finding, VettReport, FileTreeNode } from "@/lib/types";
import type { ScanMode } from "@/lib/smart-scan-orchestrator";
import { useState } from "react";

function FileTreeItem({ node, level = 0 }: { node: FileTreeNode; level?: number }) {
  const [isOpen, setIsOpen] = useState(level < 2);

  if (node.type === "file") {
    return (
      <div
        className="file-tree-item"
        style={{ paddingLeft: `${level * 16}px` }}
      >
        {node.name}
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
        {isOpen ? "▾" : "▸"} {node.name}
        {node.children?.length ? ` (${node.children.length})` : ""}
      </div>
      {isOpen &&
        node.children?.map((child, i) => (
          <FileTreeItem key={`${child.path}-${i}`} node={child} level={level + 1} />
        ))}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--accent)";
  if (score >= 60) return "#a8e06a";
  if (score >= 40) return "var(--warning)";
  return "var(--danger)";
}

function FindingItem({ f }: { f: Finding }) {
  return (
    <article className={`finding-card severity-${f.severity}`}>
      <div className="finding-meta">
        <span className={`badge badge-${f.severity}`}>{f.severity}</span>
        <span className="badge badge-info">{f.category}</span>
        {f.file && (
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            {f.file}
            {f.line ? `:${f.line}` : ""}
          </span>
        )}
      </div>
      <h3 className="finding-title">{f.title}</h3>
      <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>{f.description}</p>
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
  
  // Filter findings by selected severities
  const filteredFindings = sorted.filter(f => selectedSeverities.includes(f.severity));
  
  // Limit critical blockers display
  const BLOCKERS_PREVIEW_LIMIT = 5;
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
          <h3 className="section-heading">Structure</h3>
          <div className="file-tree">
            {report.metadata.fileTree.map((node, i) => (
              <FileTreeItem key={i} node={node} />
            ))}
          </div>
        </div>
      )}

      {report.criticalBlockers.length > 0 && (
        <div className="card alert-card" style={{ marginTop: "1rem" }}>
          <h3>Critical blockers ({report.criticalBlockers.length})</h3>
          <ul style={{ paddingLeft: "1.2rem", fontSize: "0.9rem" }}>
            {displayedBlockers.map((b, i) => (
              <li key={i} style={{ marginBottom: "0.3rem" }}>
                {b}
              </li>
            ))}
          </ul>
          {hasMoreBlockers && (
            <button
              type="button"
              onClick={() => setShowAllBlockers(!showAllBlockers)}
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
              {showAllBlockers 
                ? "Show less" 
                : `Show ${report.criticalBlockers.length - BLOCKERS_PREVIEW_LIMIT} more`}
            </button>
          )}
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
          {displayedFindings.map((f) => <FindingItem key={f.id} f={f} />)}
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
        modeling, and professional review before release.
        {scanMode === "quick" &&
          " Quick scan prioritizes high-signal surfaces — run deep scan before major releases."}
      </p>
    </div>
  );
}
