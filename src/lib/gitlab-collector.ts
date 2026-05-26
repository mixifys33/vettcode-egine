import { formatRepoLabel, type ParsedGitLabRepo } from "./repo-url";
import { downloadAndCollectZip } from "./remote-repo-fetch";
import type { RemoteCollectResult } from "./remote-repo-types";

function apiBase(host: string): string {
  return `${host.replace(/\/$/, "")}/api/v4`;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const token = process.env.GITLAB_TOKEN?.trim();
  if (token) h["PRIVATE-TOKEN"] = token;
  return h;
}

async function defaultBranch(parsed: ParsedGitLabRepo): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const encoded = encodeURIComponent(parsed.path);
    const res = await fetch(`${apiBase(parsed.host)}/projects/${encoded}`, {
      headers: headers(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (res.status === 404) throw new Error("GitLab project not found.");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Private GitLab project — set GITLAB_TOKEN.");
    }
    if (!res.ok) throw new Error(`GitLab API error (${res.status})`);
    const data = (await res.json()) as { default_branch?: string };
    return data.default_branch ?? "main";
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('GitLab API request timed out after 10 seconds');
      }
      // Log error for debugging
      console.error(`[GitLab Collector] Error fetching default branch: ${error.message}`);
    }
    throw error;
  }
}

export async function collectFromGitLab(
  parsed: ParsedGitLabRepo
): Promise<RemoteCollectResult> {
  const ref = parsed.ref ?? (await defaultBranch(parsed));
  const encoded = encodeURIComponent(parsed.path);
  const zipUrl = `${apiBase(parsed.host)}/projects/${encoded}/repository/archive.zip?sha=${encodeURIComponent(ref)}`;
  return downloadAndCollectZip(
    zipUrl,
    headers(),
    formatRepoLabel({ ...parsed, ref }, ref),
    ref,
    "GitLab",
    `Branch "${ref}" not found on ${parsed.path}.`
  );
}
