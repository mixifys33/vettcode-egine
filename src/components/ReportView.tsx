"use client";

import type { Finding, VettReport } from "@/lib/types";

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
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {f.file}
            {f.line ? `:${f.line}` : ""}
          </span>
        )}
      </div>
      <h3 className="finding-title">{f.title}</h3>
      <p>{f.description}</p>
      {f.evidence && (
        <div className="finding-section">
          <strong>Evidence</strong>
          <pre className="evidence">{f.evidence}</pre>
        </div>
      )}
      <div className="finding-section">
        <strong>Mitigation (fix now)</strong>
        <p>{f.mitigation}</p>
      </div>
      <div className="finding-section">
        <strong>Prevention (long-term)</strong>
        <p>{f.prevention}</p>
      </div>
    </article>
  );
}

interface ReportViewProps {
  report: VettReport;
  warnings?: string[];
  onReset: () => void;
}

export function ReportView({ report, warnings, onReset }: ReportViewProps) {
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

  return (
    <div style={{ marginTop: "2rem" }}>
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "center" }}>
        <div
          className="score-ring"
          style={{ borderColor: scoreColor(report.score) }}
        >
          <span className="score-value" style={{ color: scoreColor(report.score) }}>
            {report.score}
          </span>
          <span className="score-grade">{report.grade}</span>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            System vetting score
          </h2>
          <p style={{ color: "var(--muted)" }}>{report.executiveVerdict}</p>
          <p style={{ marginTop: "0.75rem" }}>{report.summary}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-value">{report.metadata?.filesScanned ?? report.scannedFiles ?? 0}</div>
          <div className="stat-label">Files scanned</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{(report.metadata?.linesScanned ?? report.scannedLines ?? 0).toLocaleString()}</div>
          <div className="stat-label">Lines analyzed</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{report.metadata?.ignoredPaths ?? report.ignoredPaths ?? 0}</div>
          <div className="stat-label">Paths ignored</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{sorted.length}</div>
          <div className="stat-label">Findings</div>
        </div>
        {report.metadata?.reportConfidence && (
          <div className="stat-box">
            <div className="stat-value">{report.metadata.reportConfidence}%</div>
            <div className="stat-label">Report confidence</div>
          </div>
        )}
      </div>

      {report.criticalBlockers.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem", borderColor: "var(--critical)" }}>
          <h3 style={{ color: "var(--critical)", marginBottom: "0.75rem" }}>
            Critical blockers — do not deploy
          </h3>
          <ul style={{ paddingLeft: "1.25rem" }}>
            {report.criticalBlockers.map((b, i) => (
              <li key={i} style={{ marginBottom: "0.35rem" }}>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="disclaimer">
          <strong>Scan notes:</strong>
          <ul style={{ marginTop: "0.35rem", paddingLeft: "1.25rem" }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "1.5rem 0 1rem" }}>
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
          <h3 style={{ marginBottom: "0.5rem" }}>Genuine strengths</h3>
          <ul style={{ paddingLeft: "1.25rem", color: "var(--muted)" }}>
            {report.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <h2 style={{ marginBottom: "1rem" }}>Full findings report</h2>
      {sorted.length === 0 ? (
        <p className="card">No issues reported — verify manually; AI may have missed problems.</p>
      ) : (
        sorted.map((f) => <FindingItem key={f.id} f={f} />)
      )}

      <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          Vet another codebase
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
          Download JSON report
        </button>
      </div>

      {report.modelUsed && (
        <p className="disclaimer" style={{ marginTop: "1rem" }}>
          Model: {report.modelUsed}. Scores are strict estimates — always validate with tests and
          professional review before production.
        </p>
      )}
    </div>
  );
}
