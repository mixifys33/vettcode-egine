import type { CollectResult } from "./file-collector";

export async function collectFromRemoteUrl(
  url: string
): Promise<CollectResult & { projectName: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const res = await fetch("/api/repo/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
      allFilePaths: data.allFilePaths,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Repository fetch timed out after 30 seconds');
      }
      // Log error for debugging
      console.error(`[Remote Collector] Error fetching repository: ${error.message}`);
    }
    throw error;
  }
}
