import { NextRequest, NextResponse } from "next/server";
import { collectFromRemoteRepo } from "@/lib/remote-repo-collector";
import { parseRepoUrl } from "@/lib/repo-url";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!url) {
      return NextResponse.json({ error: "Repository URL is required" }, { status: 400 });
    }

    // Validate URL format and allowed domains
    const ALLOWED_DOMAINS = [
      'github.com',
      'gitlab.com',
      'bitbucket.org',
      'raw.githubusercontent.com',
    ];

    try {
      const urlObj = new URL(url);
      
      // Only allow HTTPS protocol
      if (urlObj.protocol !== 'https:') {
        return NextResponse.json(
          { error: "Only HTTPS URLs are allowed for security reasons" },
          { status: 400 }
        );
      }

      // Check if domain is in allowlist
      const isAllowed = ALLOWED_DOMAINS.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );

      if (!isAllowed) {
        return NextResponse.json(
          { error: `Only repositories from ${ALLOWED_DOMAINS.join(', ')} are allowed` },
          { status: 400 }
        );
      }

      // Validate URL length to prevent DoS
      if (url.length > 2048) {
        return NextResponse.json(
          { error: "URL is too long (max 2048 characters)" },
          { status: 400 }
        );
      }

    } catch (error) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const parsed = parseRepoUrl(url);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid URL. Use GitHub, GitLab, or Bitbucket (e.g. https://github.com/owner/repo).",
        },
        { status: 400 }
      );
    }

    const result = await collectFromRemoteRepo(parsed);

    return NextResponse.json({
      files: result.files,
      ignoredCount: result.ignoredCount,
      totalBytes: result.totalBytes,
      warnings: result.warnings,
      projectName: result.projectName,
      ref: result.ref,
      provider: result.provider,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch repository";
    console.error("repo/fetch error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
