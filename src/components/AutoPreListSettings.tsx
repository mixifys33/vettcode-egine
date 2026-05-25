"use client";

import { useState, useEffect } from "react";

interface AutoPreListSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (enabled: boolean) => void;
}

export function AutoPreListSettings({ isOpen, onClose, onSave }: AutoPreListSettingsProps) {
  const [autoPreListEnabled, setAutoPreListEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load current setting from localStorage
      const saved = localStorage.getItem("vettcode_auto_prelist");
      setAutoPreListEnabled(saved === "true");
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("vettcode_auto_prelist", String(autoPreListEnabled));
    onSave(autoPreListEnabled);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10000,
      padding: "1rem"
    }}>
      <div style={{
        background: "var(--bg)",
        borderRadius: "12px",
        maxWidth: "500px",
        width: "100%",
        border: "2px solid var(--border)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem",
          borderBottom: "1px solid var(--border)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                ⚙️ Auto Pre-List Settings
              </h2>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                Configure automatic pre-listing behavior
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--muted)",
                padding: "0.5rem"
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem" }}>
          <div style={{
            padding: "1.5rem",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            marginBottom: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Auto Pre-List Scanned Codebases
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: "1.5" }}>
                  When enabled, the pre-list form will automatically open after scanning any codebase with a score of 60 or higher.
                </p>
              </div>
              <label style={{
                position: "relative",
                display: "inline-block",
                width: "60px",
                height: "34px",
                marginLeft: "1rem",
                flexShrink: 0
              }}>
                <input
                  type="checkbox"
                  checked={autoPreListEnabled}
                  onChange={(e) => setAutoPreListEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: autoPreListEnabled ? "var(--accent)" : "#ccc",
                  transition: "0.4s",
                  borderRadius: "34px"
                }}>
                  <span style={{
                    position: "absolute",
                    content: "",
                    height: "26px",
                    width: "26px",
                    left: autoPreListEnabled ? "30px" : "4px",
                    bottom: "4px",
                    background: "white",
                    transition: "0.4s",
                    borderRadius: "50%"
                  }} />
                </span>
              </label>
            </div>

            <div style={{
              padding: "1rem",
              background: autoPreListEnabled ? "rgba(34, 211, 165, 0.1)" : "rgba(255, 193, 7, 0.1)",
              border: `1px solid ${autoPreListEnabled ? "var(--accent)" : "var(--warning)"}`,
              borderRadius: "6px",
              fontSize: "0.85rem",
              color: "var(--text)"
            }}>
              <strong>{autoPreListEnabled ? "✅ Enabled:" : "⚠️ Disabled:"}</strong>
              {autoPreListEnabled ? (
                <span> The pre-list form will open automatically after each scan (score ≥ 60).</span>
              ) : (
                <span> You'll need to manually click "Monetize on VETTCODE" to pre-list your code.</span>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div style={{
            padding: "1rem",
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "8px",
            fontSize: "0.85rem",
            color: "var(--muted)",
            marginBottom: "1.5rem"
          }}>
            <strong style={{ color: "var(--primary)" }}>💡 Tip:</strong> You can change this setting anytime by clicking the settings icon in the monetize section.
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: "0.75rem 2rem",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: 600
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
