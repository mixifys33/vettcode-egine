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
  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const zipRes = await fetch(zipUrl, {
      headers: { "User-Agent": USER_AGENT, ...headers },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (zipRes.status === 404) throw new Error(notFoundMessage);
    if (zipRes.status === 401 || zipRes.status === 403) {
      throw new Error(
        `Cannot access this ${provider} repo. Configure an API token on the server for private repositories.`
      );
    }
    if (!zipRes.ok) {
      throw new Error(`Failed to download from ${provider} (${zipRes.status}).`);
    }

    // Check content-length header before downloading
    const contentLength = zipRes.headers.get('content-length');
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      if (sizeInBytes > MAX_ARCHIVE_ZIP_BYTES) {
        throw new Error(
          `Archive too large (${Math.round(sizeInBytes / 1_000_000)}MB). Maximum allowed is ${Math.round(MAX_ARCHIVE_ZIP_BYTES / 1_000_000)}MB. Upload a smaller folder instead.`
        );
      }
    }

    const buffer = await zipRes.arrayBuffer();
    
    // Double-check actual size after download
    if (buffer.byteLength > MAX_ARCHIVE_ZIP_BYTES) {
      throw new Error(
        `Archive too large (${Math.round(buffer.byteLength / 1_000_000)}MB). Upload a smaller folder instead.`
      );
    }

    const collected = await collectFromZipBuffer(buffer);
    return { ...collected, projectName, ref, provider };
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Log error for debugging
    if (error instanceof Error) {
      console.error(`[Remote Repo Fetch] Error downloading from ${provider}: ${error.message}`);
      
      if (error.name === 'AbortError') {
        throw new Error(`Download timeout: ${provider} repository took too long to download. Try a smaller repository.`);
      }
    }
    
    throw error;
  }
}
