"use client";

import { useState, useEffect } from "react";
import type { SavedReport } from "@/lib/report-storage";
import { getSavedReports, deleteReport, updateReportName } from "@/lib/report-storage";
import { isAuthenticated } from "@/lib/auth";

interface ReportsHistoryProps {
  currentReportId?: string;
  onSelectReport: (report: SavedReport) => void;
  onClose?: () => void;
}

export function ReportsHistory({ currentReportId, onSelectReport, onClose }: ReportsHistoryProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      loadReports();
    }
  }, []);

  const loadReports = () => {
    const savedReports = getSavedReports();
    setReports(savedReports);
  };

  const handleDelete = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this report?")) {
      deleteReport(reportId);
      loadReports();
    }
  };

  const handleRename = (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setEditingId(reportId);
      setEditName(report.projectName);
    }
  };

  const saveRename = (reportId: string) => {
    if (editName.trim()) {
      updateReportName(reportId, editName.trim());
      loadReports();
    }
    setEditingId(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#4ade80";
    if (score >= 60) return "#a8e06a";
    if (score >= 40) return "#fbbf24";
    return "#ef4444";
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          top: "1rem",
          left: "1rem",
          zIndex: 1001,
          padding: "0.5rem 1rem",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          cursor: "pointer",
          display: "none",
        }}
        className="mobile-reports-toggle"
      >
        📊 Reports ({reports.length})
      </button>

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: isOpen ? 0 : "-320px",
          width: "320px",
          height: "100vh",
          background: "var(--bg)",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          zIndex: 1000,
          transition: "left 0.3s ease",
          padding: "1rem",
        }}
        className="reports-sidebar"
      >
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "1rem"
        }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
            📊 Saved Reports
          </h3>
          {onClose && (
            <button
              onClick={() => {
                setIsOpen(false);
                onClose();
              }}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--muted)",
              }}
            >
              ×
            </button>
          )}
        </div>

        <p style={{ 
          fontSize: "0.85rem", 
          color: "var(--muted)",
          marginBottom: "1rem"
        }}>
          {reports.length} of 50 reports saved
        </p>

        {reports.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "2rem 1rem",
            color: "var(--muted)",
            fontSize: "0.9rem"
          }}>
            <p>No saved reports yet.</p>
            <p style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
              Scan a project to save your first report!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => {
                  onSelectReport(report);
                  setIsOpen(false);
                }}
                style={{
                  padding: "0.75rem",
                  background: currentReportId === report.id ? "var(--bg-secondary)" : "transparent",
                  border: `1px solid ${currentReportId === report.id ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (currentReportId !== report.id) {
                    e.currentTarget.style.background = "var(--bg-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentReportId !== report.id) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {editingId === report.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => saveRename(report.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(report.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "0.25rem 0.5rem",
                      background: "var(--bg)",
                      border: "1px solid var(--accent)",
                      borderRadius: "4px",
                      color: "var(--text)",
                      fontSize: "0.9rem",
                    }}
                  />
                ) : (
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.5rem"
                  }}>
                    <h4 style={{ 
                      margin: 0, 
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      flex: 1,
                      wordBreak: "break-word"
                    }}>
                      {report.projectName}
                    </h4>
                    <div style={{ 
                      display: "flex", 
                      gap: "0.25rem",
                      marginLeft: "0.5rem"
                    }}>
                      <button
                        onClick={(e) => handleRename(report.id, e)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          padding: "0.25rem",
                          color: "var(--muted)",
                        }}
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => handleDelete(report.id, e)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          padding: "0.25rem",
                          color: "var(--danger)",
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ 
                  display: "flex", 
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.25rem"
                }}>
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: `3px solid ${getScoreColor(report.report.score)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    color: getScoreColor(report.report.score),
                  }}>
                    {report.report.score}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: "0.75rem", 
                      color: "var(--muted)",
                      marginBottom: "0.15rem"
                    }}>
                      {report.report.findings.length} findings · {report.scanMode}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                      {formatDate(report.savedAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
            display: "none",
          }}
          className="reports-overlay"
        />
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-reports-toggle {
            display: block !important;
          }
          .reports-overlay {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .reports-sidebar {
            left: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
