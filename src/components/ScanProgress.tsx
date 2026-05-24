"use client";

import { useEffect, useState } from "react";

interface ScanProgressProps {
  phase: string;
  progress: number;
  detail?: string;
  scanMode?: "quick" | "deep";
  startedAt?: number;
}

export function ScanProgress({
  phase,
  progress,
  detail,
  scanMode = "quick",
  startedAt,
}: ScanProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const pct = Math.min(100, Math.round(progress));
  const eta =
    startedAt && progress > 8 && progress < 98
      ? Math.max(
          1,
          Math.round((elapsed / progress) * (100 - progress))
        )
      : null;

  return (
    <div className="scan-progress" role="status" aria-live="polite">
      <div className="scan-progress-header">
        <span className="scan-progress-phase">{phase}</span>
        <span className="scan-progress-pct">{pct}%</span>
      </div>
      {detail && <p className="scan-progress-detail">{detail}</p>}
      <div className="scan-progress-track">
        <div
          className="scan-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="scan-progress-meta">
        <span>
          {scanMode === "quick" ? "Quick scan" : "Deep scan"}
          {elapsed > 0 ? ` · ${elapsed}s elapsed` : ""}
        </span>
        {eta != null && <span>~{eta}s remaining</span>}
      </div>
      {progress < 100 && (
        <div className="scan-progress-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}
