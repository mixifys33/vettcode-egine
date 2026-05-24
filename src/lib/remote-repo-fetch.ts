import { MAX_ARCHIVE_ZIP_BYTES } from "./collect-limits";
import { collectFromZipBuffer } from "./zip-collector";
import type { RemoteCollectResult } from "./remote-repo-types";

const USER_AGENT = "Vettcode-Engine";

export async function downloadAndCollectZip(
  zipUrl: string,
  headers: Record<string, string>,
  projectName: string,
  ref: string,
  provider: string,
  notFoundMessage: string
): Promise<RemoteCollectResult> {
  const zipRes = await fetch(zipUrl, {
    headers: { "User-Agent": USER_AGENT, ...headers },
    redirect: "follow",
  });

  if (zipRes.status === 404) throw new Error(notFoundMessage);
  if (zipRes.status === 401 || zipRes.status === 403) {
    throw new Error(
      `Cannot access this ${provider} repo. Configure an API token on the server for private repositories.`
    );
  }
  if (!zipRes.ok) {
    throw new Error(`Failed to download from ${provider} (${zipRes.status}).`);
  }

  const buffer = await zipRes.arrayBuffer();
  if (buffer.byteLength > MAX_ARCHIVE_ZIP_BYTES) {
    throw new Error(
      `Archive too large (${Math.round(buffer.byteLength / 1_000_000)}MB). Upload a smaller folder instead.`
    );
  }

  const collected = await collectFromZipBuffer(buffer);
  return { ...collected, projectName, ref, provider };
}
