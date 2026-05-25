"use client";

import { useCallback, useRef, useState } from "react";

// File size limits (must match server-side limits in file-collector.ts)
const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ZIP_SIZE_MB = 50;

interface UploadZoneProps {
  disabled?: boolean;
  onFolderSelect: (files: FileList) => void;
  onZipSelect: (file: File) => void;
}

export function UploadZone({
  disabled,
  onFolderSelect,
  onZipSelect,
}: UploadZoneProps) {
  const [active, setActive] = useState(false);
  const folderRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setActive(false);
      if (disabled) return;

      const items = e.dataTransfer.items;
      if (items?.length) {
        for (const item of Array.from(items)) {
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file?.name.endsWith(".zip")) {
              // Validate file size
              if (file.size > MAX_ZIP_SIZE) {
                alert(`File too large. Maximum size is ${MAX_ZIP_SIZE_MB}MB. Your file is ${Math.round(file.size / 1024 / 1024)}MB.`);
                return;
              }
              onZipSelect(file);
              return;
            }
          }
        }
      }

      const files = e.dataTransfer.files;
      if (files.length) {
        const zip = Array.from(files).find((f) => f.name.endsWith(".zip"));
        if (zip) {
          // Validate file size
          if (zip.size > MAX_ZIP_SIZE) {
            alert(`File too large. Maximum size is ${MAX_ZIP_SIZE_MB}MB. Your file is ${Math.round(zip.size / 1024 / 1024)}MB.`);
            return;
          }
          onZipSelect(zip);
        }
      }
    },
    [disabled, onZipSelect]
  );

  return (
    <div
      className={`dropzone ${active ? "active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={onDrop}
    >
      <p className="dropzone-title">Upload your codebase</p>
      <p className="dropzone-hint">
        Folder or ZIP. Dependencies and build output are excluded automatically.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={disabled}
          onClick={() => folderRef.current?.click()}
        >
          Select folder
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={disabled}
          onClick={() => zipRef.current?.click()}
        >
          Upload ZIP
        </button>
      </div>

      <input
        ref={folderRef}
        type="file"
        hidden
        multiple
        // @ts-expect-error webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) onFolderSelect(list);
          e.target.value = "";
        }}
      />
      <input
        ref={zipRef}
        type="file"
        hidden
        accept=".zip,application/zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // Validate file size
            if (file.size > MAX_ZIP_SIZE) {
              alert(`File too large. Maximum size is ${MAX_ZIP_SIZE_MB}MB. Your file is ${Math.round(file.size / 1024 / 1024)}MB.`);
              e.target.value = "";
              return;
            }
            onZipSelect(file);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
