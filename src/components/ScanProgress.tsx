"use client";

interface ScanProgressProps {
  phase: string;
  progress: number;
  detail?: string;
}

export function ScanProgress({ phase, progress, detail }: ScanProgressProps) {
  return (
    <div className="card" style={{ marginTop: "1.5rem" }}>
      <p style={{ fontWeight: 600 }}>{phase}</p>
      {detail && (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
          {detail}
        </p>
      )}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
      </div>
      <p style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.35rem" }}>
        {Math.round(progress)}%
      </p>
    </div>
  );
}
