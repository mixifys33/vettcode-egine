import { formatRepoLabel, type ParsedBitbucketRepo } from "./repo-url";
import { downloadAndCollectZip } from "./remote-repo-fetch";
import type { RemoteCollectResult } from "./remote-repo-types";

function headers(): Record<string, string> {
  const h: Record<string, string> = {};
  const token = process.env.BITBUCKET_TOKEN?.trim();
  if (token) {
    // Avoid logging the token to prevent exposure in error messages
    h.Authorization = token.includes(":")
      ? `Basic ${Buffer.from(token).toString("base64")}`
      : `Bearer ${token}`;
  }
  return h;
}

async function defaultBranch(workspace: string, repo: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const res = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}`,
      { 
        headers: headers(),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    
    if (res.status === 404) throw new Error("Bitbucket repository not found.");
    if (res.status === 401 || res.status === 403) {
      throw new Error("Private Bitbucket repo — set BITBUCKET_TOKEN.");
    }
    if (!res.ok) throw new Error(`Bitbucket API error (${res.status})`);
    const data = (await res.json()) as { mainbranch?: { name?: string } };
    return data.mainbranch?.name ?? "main";
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Bitbucket API request timed out after 10 seconds');
      }
      // Log error for debugging
      console.error(`[Bitbucket Collector] Error fetching default branch: ${error.message}`);
    }
    throw error;
  }
}

export async function collectFromBitbucket(
  parsed: ParsedBitbucketRepo
): Promise<RemoteCollectResult> {
  const ref =
    parsed.ref ??
    (parsed.host.includes("bitbucket.org")
      ? await defaultBranch(parsed.workspace, parsed.repo)
      : "main");
  const base = parsed.host.replace(/\/$/, "");
  const zipUrl = `${base}/${parsed.workspace}/${parsed.repo}/get/${encodeURIComponent(ref)}.zip`;
  return downloadAndCollectZip(
    zipUrl,
    headers(),
    formatRepoLabel({ ...parsed, ref }, ref),
    ref,
    "Bitbucket",
    `Branch "${ref}" not found on ${parsed.workspace}/${parsed.repo}.`
  );
}
