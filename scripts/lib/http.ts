// Small fetch wrapper: every error names the data source, so a failed run says exactly what broke.

const USER_AGENT = "co-kdybych-data-script/1.0";

export class SourceError extends Error {
  constructor(source: string, message: string) {
    super(`[${source}] ${message}`);
    this.name = "SourceError";
  }
}

async function request(source: string, url: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    throw new SourceError(source, `request failed: ${(error as Error).message} (${redact(url)})`);
  }
  if (!response.ok) {
    // APIs like ARAD explain the problem in the body (e.g. invalid key), so include the start of it.
    const body = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
    throw new SourceError(
      source,
      `HTTP ${response.status} ${response.statusText} (${redact(url)})${body ? `: ${redact(body)}` : ""}`,
    );
  }
  return response;
}

export async function fetchText(source: string, url: string, encoding = "utf-8"): Promise<string> {
  const response = await request(source, url);
  const bytes = await response.arrayBuffer();
  return new TextDecoder(encoding).decode(bytes);
}

export async function fetchBuffer(source: string, url: string): Promise<Buffer> {
  const response = await request(source, url);
  return Buffer.from(await response.arrayBuffer());
}

/** Hide API keys before a URL is printed. */
export function redact(url: string): string {
  return url.replace(/(api_?key=)[^&]+/gi, "$1***");
}
