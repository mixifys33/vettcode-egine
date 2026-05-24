import type { CollectResult } from "./file-collector";

export async function collectFromRemoteUrl(
  url: string
): Promise<CollectResult & { projectName: string }> {
  const res = await fetch("/api/repo/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Failed to fetch repository (${res.status})`);
  }

  return {
    files: data.files,
    ignoredCount: data.ignoredCount,
    totalBytes: data.totalBytes ?? 0,
    warnings: data.warnings ?? [],
    projectName: data.projectName,
  };
}
