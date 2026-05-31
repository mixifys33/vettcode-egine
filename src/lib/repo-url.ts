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

  // SSRF Protection: Block private IP ranges and localhost
  const isPrivateOrLocalhost = (hostname: string): boolean => {
    // Remove port if present
    const host = hostname.split(':')[0].toLowerCase();
    
    // Block localhost variations
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return true;
    }
    
    // Block IPv6 localhost
    if (host === '::1' || host === '::' || host.startsWith('fe80:')) {
      return true;
    }
    
    // Block private IPv4 ranges
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, a, b, c, d] = ipv4Match.map(Number);
      // 10.0.0.0/8
      if (a === 10) return true;
      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true;
      // 192.168.0.0/16
      if (a === 192 && b === 168) return true;
      // 169.254.0.0/16 (link-local)
      if (a === 169 && b === 254) return true;
    }
    
    // Block internal domains
    if (host.endsWith('.local') || host.endsWith('.internal')) {
      return true;
    }
    
    return false;
  };

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
    
    // SSRF Protection: Validate hostname
    if (isPrivateOrLocalhost(url.hostname)) {
      console.warn(`[SSRF Protection] Blocked private/internal URL: ${url.hostname}`);
      return null;
    }
    
    const host = normalizeHost(url.hostname);
    const hostname = url.hostname.replace(/^www\./, "");

    // Only allow known public Git hosting providers
    const allowedHosts = ['github.com', 'gitlab.com', 'bitbucket.org'];
    const isAllowedHost = allowedHosts.some(allowed => 
      hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
    
    // Also allow self-hosted GitLab/Bitbucket instances (but still block private IPs)
    const isGitHost = hostname.includes('gitlab') || hostname.includes('bitbucket');
    
    if (!isAllowedHost && !isGitHost) {
      console.warn(`[SSRF Protection] Blocked non-Git hosting URL: ${hostname}`);
      return null;
    }

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
