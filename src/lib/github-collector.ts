import { formatRepoLabel, type ParsedGitHubRepo } from "./repo-url";
import { downloadAndCollectZip } from "./remote-repo-fetch";
import type { RemoteCollectResult } from "./remote-repo-types";

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function defaultBranch(owner: string, repo: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: headers(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (res.status === 404) throw new Error("GitHub repository not found.");
    if (res.status === 403) {
      throw new Error("GitHub rate limit or private repo — set GITHUB_TOKEN.");
    }
    if (!res.ok) throw new Error(`GitHub API error (${res.status})`);
    const data = (await res.json()) as { default_branch?: string };
    return data.default_branch ?? "main";
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('GitHub API request timed out after 10 seconds');
      }
      // Log error for debugging
      console.error(`[GitHub Collector] Error fetching default branch: ${error.message}`);
    }
    throw error;
  }
}

export async function collectFromGitHub(
  parsed: ParsedGitHubRepo
): Promise<RemoteCollectResult> {
  const ref = parsed.ref ?? (await defaultBranch(parsed.owner, parsed.repo));
  const zipUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/zipball/${encodeURIComponent(ref)}`;
  return downloadAndCollectZip(
    zipUrl,
    headers(),
    formatRepoLabel({ ...parsed, ref }, ref),
    ref,
    "GitHub",
    `Branch "${ref}" not found on ${parsed.owner}/${parsed.repo}.`
  );
}
