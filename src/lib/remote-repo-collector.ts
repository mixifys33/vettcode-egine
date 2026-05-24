import { collectFromBitbucket } from "./bitbucket-collector";
import { collectFromGitHub } from "./github-collector";
import { collectFromGitLab } from "./gitlab-collector";
import type { ParsedRemoteRepo } from "./repo-url";
import type { RemoteCollectResult } from "./remote-repo-types";

export async function collectFromRemoteRepo(
  parsed: ParsedRemoteRepo
): Promise<RemoteCollectResult> {
  switch (parsed.provider) {
    case "github":
      return collectFromGitHub(parsed);
    case "gitlab":
      return collectFromGitLab(parsed);
    case "bitbucket":
      return collectFromBitbucket(parsed);
  }
}
