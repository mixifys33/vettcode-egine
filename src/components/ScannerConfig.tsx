"use client";

import { useState } from "react";
import { Shield, Zap, Activity, AlertTriangle, Settings } from "lucide-react";
import type { ScannerConfig } from "@/lib/smart-scan-orchestrator";
import { defaultScannerConfig } from "@/lib/smart-scan-orchestrator";

interface ScannerConfigProps {
  config: ScannerConfig;
  onConfigChange: (config: ScannerConfig) => void;
}

export function ScannerConfigPanel({ config, onConfigChange }: ScannerConfigProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleScanner = (key: keyof ScannerConfig) => {
    onConfigChange({
      ...config,
      [key]: !config[key],
    });
  };

  const resetToDefaults = () => {
    onConfigChange(defaultScannerConfig);
  };

  return (
    <div className="scanner-config">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="config-toggle"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          backgroundColor: "#f3f4f6",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
        }}
      >
        <Settings size={18} />
        Scanner Configuration
      </button>

      {isOpen && (
        <div
          className="config-panel"
          style={{
            marginTop: "12px",
            padding: "16px",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
              Security Scanners
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={config.enableNpmAudit}
                  onChange={() => toggleScanner("enableNpmAudit")}
                />
                <Shield size={16} />
                <span>NPM Audit - Check for known vulnerabilities in dependencies</span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={config.enableSnyk}
                  onChange={() => toggleScanner("enableSnyk")}
                />
                <Shield size={16} />
                <span>Snyk - Industry-standard vulnerability scanner</span>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
              Performance & Code Quality
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={config.enableSonarJS}
                  onChange={() => toggleScanner("enableSonarJS")}
                />
                <Zap size={16} />
                <span>SonarJS - Deep static analysis for bugs and code smells</span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={config.enableClinic}
                  onChange={() => toggleScanner("enableClinic")}
                />
                <Activity size={16} />
                <span>Clinic.js - Performance diagnostics and bottleneck detection</span>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
              Stress Testing
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={config.enableArtillery}
                  onChange={() => toggleScanner("enableArtillery")}
                />
                <AlertTriangle size={16} />
                <span>Artillery - Load testing and stress testing for APIs</span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={config.enableAutocannon}
                  onChange={() => toggleScanner("enableAutocannon")}
                />
                <AlertTriangle size={16} />
                <span>Autocannon - HTTP benchmarking for traffic simulation</span>
              </label>
            </div>
          </div>

          <button
            onClick={resetToDefaults}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}
