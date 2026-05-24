"use client";

import { useState } from "react";
import { parseRepoUrl } from "@/lib/repo-url";

interface RepoUrlInputProps {
  disabled?: boolean;
  onScan: (url: string) => void;
}

export function RepoUrlInput({ disabled, onScan }: RepoUrlInputProps) {
  const [url, setUrl] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!parseRepoUrl(trimmed)) {
      setHint(
        "Enter a valid GitHub, GitLab, or Bitbucket URL (e.g. https://github.com/owner/repo)"
      );
      return;
    }

    setHint(null);
    onScan(trimmed);
  }

  return (
    <section className="card repo-source-card">
      <h2 className="repo-source-title">Scan from repository URL</h2>
      <p className="repo-source-sub">
        Paste a public repo link — no folder upload needed. Supports GitHub, GitLab,
        and Bitbucket.
      </p>

      <form onSubmit={handleSubmit} className="repo-url-form">
        <div className="repo-url-field">
          <label htmlFor="repo-url" className="field-label">
            Repository URL
          </label>
          <input
            id="repo-url"
            type="url"
            className="field-input"
            placeholder="https://github.com/owner/repo"
            value={url}
            disabled={disabled}
            onChange={(e) => {
              setUrl(e.target.value);
              setHint(null);
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary repo-url-submit"
          disabled={disabled || !url.trim()}
        >
          Scan repository
        </button>
      </form>

      {hint && <p className="repo-url-hint repo-url-hint-error">{hint}</p>}

      <details className="repo-examples">
        <summary>Example URLs</summary>
        <ul>
          <li>
            <code>https://github.com/owner/repo</code>
          </li>
          <li>
            <code>https://gitlab.com/group/project</code>
          </li>
          <li>
            <code>https://bitbucket.org/workspace/repo</code>
          </li>
          <li>
            Shorthand: <code>owner/repo</code> (GitHub)
          </li>
        </ul>
      </details>
    </section>
  );
}
