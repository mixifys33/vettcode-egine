export type RepoProvider = "github" | "gitlab" | "bitbucket";

export interface ParsedGitHubRepo {
  provider: "github";
  host: string;
  owner: string;
  repo: string;
  ref?: string;
}

export interface ParsedGitLabRepo {
  provider: "gitlab";
  host: string;
  path: string;
  ref?: string;
}

export interface ParsedBitbucketRepo {
  provider: "bitbucket";
  host: string;
  workspace: string;
  repo: string;
  ref?: string;
}

export type ParsedRemoteRepo =
  | ParsedGitHubRepo
  | ParsedGitLabRepo
  | ParsedBitbucketRepo;

function normalizeHost(hostname: string): string {
  return `https://${hostname.replace(/^www\./, "")}`;
}

export function formatRepoLabel(parsed: ParsedRemoteRepo, ref: string): string {
  switch (parsed.provider) {
    case "github":
      return `${parsed.owner}/${parsed.repo}@${ref}`;
    case "gitlab":
      return `${parsed.path}@${ref}`;
    case "bitbucket":
      return `${parsed.workspace}/${parsed.repo}@${ref}`;
  }
}

export function parseRepoUrl(input: string): ParsedRemoteRepo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith("gitlab:") && !trimmed.startsWith("bitbucket:")) {
    const gh = trimmed.match(
      /^(?:github:)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:#([a-zA-Z0-9_./-]+))?$/
    );
    if (gh) {
      return {
        provider: "github",
        host: "https://github.com",
        owner: gh[1],
        repo: gh[2].replace(/\.git$/, ""),
        ref: gh[3],
      };
    }
  }

  const gl = trimmed.match(/^gitlab:([a-zA-Z0-9_.-/]+)(?:#([a-zA-Z0-9_./-]+))?$/);
  if (gl) {
    return {
      provider: "gitlab",
      host: "https://gitlab.com",
      path: gl[1].replace(/\.git$/, ""),
      ref: gl[2],
    };
  }

  const bb = trimmed.match(
    /^bitbucket:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:#([a-zA-Z0-9_./-]+))?$/
  );
  if (bb) {
    return {
      provider: "bitbucket",
      host: "https://bitbucket.org",
      workspace: bb[1],
      repo: bb[2].replace(/\.git$/, ""),
      ref: bb[3],
    };
  }

  try {
    const url = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    const host = normalizeHost(url.hostname);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "github.com") return parseGitHubPath(host, url);
    if (hostname === "gitlab.com" || hostname.includes("gitlab"))
      return parseGitLabPath(host, url);
    if (hostname === "bitbucket.org" || hostname.includes("bitbucket"))
      return parseBitbucketPath(host, url);
    if (url.pathname.includes("/-/")) return parseGitLabPath(host, url);

    return null;
  } catch {
    return null;
  }
}

function parseGitHubPath(host: string, url: URL): ParsedGitHubRepo | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  let ref: string | undefined;
  if (parts[2] === "tree") ref = parts.slice(3).join("/") || undefined;
  else if (parts[2] === "blob" && parts[3]) ref = parts[3];
  const hashRef = url.hash.replace(/^#/, "");
  if (hashRef) ref = hashRef;
  return { provider: "github", host, owner, repo, ref };
}

function parseGitLabPath(host: string, url: URL): ParsedGitLabRepo | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const dashIdx = parts.indexOf("-");
  let path: string;
  let ref: string | undefined;
  if (dashIdx !== -1 && parts[dashIdx + 1] === "tree") {
    path = parts.slice(0, dashIdx).join("/");
    ref = parts.slice(dashIdx + 2).join("/") || undefined;
  } else if (dashIdx !== -1 && parts[dashIdx + 1] === "blob" && parts[dashIdx + 2]) {
    path = parts.slice(0, dashIdx).join("/");
    ref = parts[dashIdx + 2];
  } else {
    path = parts.join("/").replace(/\.git$/, "");
  }
  if (url.hash.replace(/^#/, "")) ref = url.hash.replace(/^#/, "");
  if (!path) return null;
  return { provider: "gitlab", host, path, ref };
}

function parseBitbucketPath(host: string, url: URL): ParsedBitbucketRepo | null {
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const workspace = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  let ref: string | undefined;
  if (parts[2] === "src" && parts[3]) ref = parts[3];
  if (url.hash.replace(/^#/, "")) ref = url.hash.replace(/^#/, "");
  return { provider: "bitbucket", host, workspace, repo, ref };
}
