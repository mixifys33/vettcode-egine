"use client";

import { useState, useEffect } from "react";
import { BarChart3, Edit2, Trash2, X, Menu, Clock, FileText } from "lucide-react";
import type { SavedReport } from "@/lib/report-storage";
import { getSavedReports, deleteReport, updateReportName } from "@/lib/report-storage";
import { isAuthenticated } from "@/lib/auth";

interface ReportsHistoryProps {
  currentReportId?: string | null;
  onSelectReport: (report: SavedReport) => void;
  onClose?: () => void;
}

export function ReportsHistory({ currentReportId, onSelectReport, onClose }: ReportsHistoryProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      loadReports();
    }
    
    // Check screen size
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-open on desktop, closed on mobile
      if (!mobile) {
        setIsOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          top: "1rem",
          left: isOpen && !isMobile ? "340px" : "1rem",
          zIndex: 1002,
          padding: "0.75rem",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--text)",
          fontSize: "0.9rem",
          fontWeight: 500,
          transition: "all 0.3s ease",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--surface)";
          e.currentTarget.style.borderColor = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-elevated)";
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
        {!isMobile && <span>{isOpen ? "Hide" : "Show"} Reports</span>}
        {!isOpen && <span className="badge" style={{
          background: "var(--accent)",
          color: "#000",
          padding: "0.15rem 0.5rem",
          borderRadius: "12px",
          fontSize: "0.75rem",
          fontWeight: "bold"
        }}>{reports.length}</span>}
      </button>

      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            zIndex: 999,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Sidebar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: isOpen ? 0 : "-340px",
          width: "320px",
          height: "100vh",
          background: "var(--bg-elevated)",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          zIndex: 1000,
          transition: "left 0.3s ease",
          padding: "1rem",
          boxShadow: isOpen ? "4px 0 12px rgba(0,0,0,0.3)" : "none",
        }}
      >
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "1rem",
          paddingTop: "3.5rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BarChart3 size={20} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
              Saved Reports
            </h3>
          </div>
        </div>

        <p style={{ 
          fontSize: "0.85rem", 
          color: "var(--muted)",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <FileText size={14} />
          {reports.length} of 50 reports saved
        </p>

        {reports.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "var(--muted)",
            fontSize: "0.9rem"
          }}>
            <BarChart3 size={48} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
            <p style={{ fontWeight: 500 }}>No saved reports yet.</p>
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
                  if (isMobile) setIsOpen(false);
                }}
                style={{
                  padding: "0.75rem",
                  background: currentReportId === report.id ? "var(--surface)" : "transparent",
                  border: `1px solid ${currentReportId === report.id ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (currentReportId !== report.id) {
                    e.currentTarget.style.background = "var(--surface)";
                    e.currentTarget.style.borderColor = "var(--border-focus)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentReportId !== report.id) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "var(--border)";
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
                      padding: "0.5rem",
                      background: "var(--bg)",
                      border: "1px solid var(--accent)",
                      borderRadius: "6px",
                      color: "var(--text)",
                      fontSize: "0.9rem",
                      outline: "none",
                    }}
                  />
                ) : (
                  <>
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
                            padding: "0.25rem",
                            color: "var(--muted)",
                            display: "flex",
                            alignItems: "center",
                            borderRadius: "4px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--surface2)";
                            e.currentTarget.style.color = "var(--accent)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--muted)";
                          }}
                          title="Rename"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(report.id, e)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "0.25rem",
                            color: "var(--muted)",
                            display: "flex",
                            alignItems: "center",
                            borderRadius: "4px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--surface2)";
                            e.currentTarget.style.color = "var(--danger)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--muted)";
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{ 
                      display: "flex", 
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "0.5rem"
                    }}>
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        border: `3px solid ${getScoreColor(report.report.score)}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                        color: getScoreColor(report.report.score),
                        flexShrink: 0,
                      }}>
                        {report.report.score}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: "0.75rem", 
                          color: "var(--muted)",
                          marginBottom: "0.25rem"
                        }}>
                          {report.report.findings.length} findings · {report.scanMode}
                        </div>
                        <div style={{ 
                          fontSize: "0.7rem", 
                          color: "var(--muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem"
                        }}>
                          <Clock size={10} />
                          {formatDate(report.savedAt)}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
