"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { ScanProgress } from "@/components/ScanProgress";
import { ReportView } from "@/components/ReportView";
import { collectFromFileList, collectFromZip } from "@/lib/file-collector";
import { runFullScan } from "@/lib/scan-orchestrator";
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

  async function startScan(
    collect: () => Promise<{
      files: import("@/lib/types").CodeFile[];
      ignoredCount: number;
      warnings: string[];
    }>
  ) {
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

      const finalReport = await runFullScan(
        projectName,
        result.files,
        result.ignoredCount,
        (p, pct, d) => {
          setPhase(p);
          setProgress(pct);
          setDetail(d);
        }
      );

      setReport(finalReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="container">
      <header className="hero">
        <h1>
          <span>Vettcode</span> Engine
        </h1>
        <p>
          Upload any codebase. AI vets security holes, production failures, typing
          mistakes, database risks, and logic that can break your system — then
          scores it harshly from 0–100 with zero sugar-coating.
        </p>
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

          <p className="disclaimer">
            API keys stay on the server (Vercel env vars). Uses up to 3 OpenRouter keys
            in parallel for speed. Free models via OpenRouter — rate limits apply.
          </p>
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
    </main>
  );
}
