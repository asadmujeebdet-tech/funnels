const PACKAGE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;
const MAX_LISTING_BYTES = 8 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;

class GooglePlayLookupError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GooglePlayLookupError";
  }
}

function assertPlayListingUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GooglePlayLookupError("Enter a valid Google Play Store listing URL.", 400);
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "play.google.com" ||
    url.pathname !== "/store/apps/details" ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new GooglePlayLookupError("Enter a Google Play Store app listing URL.", 400);
  }
  const packageName = url.searchParams.get("id") ?? "";
  if (!PACKAGE_NAME_PATTERN.test(packageName)) {
    throw new GooglePlayLookupError("The Google Play URL does not contain a valid package ID.", 400);
  }
  return url;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#0*39;|&#x0*27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function getAttribute(tag: string, name: string): string | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return value ? decodeHtmlAttribute(value) : undefined;
}

function extractIconUrl(html: string): string | undefined {
  const images = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (getAttribute(tag, "property") ?? getAttribute(tag, "name") ?? getAttribute(tag, "itemprop") ?? "").toLowerCase();
    const content = getAttribute(tag, "content");
    if (content && ["og:image", "og:image:url", "twitter:image", "image"].includes(key)) images.set(key, content);
  }
  return images.get("og:image") ?? images.get("og:image:url") ?? images.get("twitter:image") ?? images.get("image");
}

function assertGoogleImageUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GooglePlayLookupError("Google Play did not return a valid app icon URL.", 502);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    (url.hostname !== "googleusercontent.com" && !url.hostname.endsWith(".googleusercontent.com"))
  ) {
    throw new GooglePlayLookupError("Google Play returned an icon hosted outside Google's image domain.", 502);
  }
  return url;
}

async function fetchListingHtml(url: URL): Promise<string> {
  let current = url;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        headers: { "user-agent": "JourneyAnalytics/1.0", accept: "text/html" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new GooglePlayLookupError("Could not reach the Google Play listing. Try again or upload an icon.", 502);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new GooglePlayLookupError("The Google Play listing redirected to an invalid page.", 502);
      }
      const redirect = new URL(location, current);
      if (redirect.protocol !== "https:" || redirect.hostname !== "play.google.com") {
        throw new GooglePlayLookupError("The Google Play listing redirected outside Play Store.", 502);
      }
      current = redirect;
      continue;
    }
    if (!response.ok) {
      throw new GooglePlayLookupError("The Google Play listing is unavailable. Try again or upload an icon.", 502);
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_LISTING_BYTES) {
      throw new GooglePlayLookupError("The Google Play listing response was too large to inspect.", 502);
    }
    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > MAX_LISTING_BYTES) {
      throw new GooglePlayLookupError("The Google Play listing response was too large to inspect.", 502);
    }
    return html;
  }
  throw new GooglePlayLookupError("The Google Play listing redirected too many times.", 502);
}

async function verifyIconLoads(value: string): Promise<string> {
  let current = assertGoogleImageUrl(value);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        headers: { accept: "image/*", range: "bytes=0-0" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new GooglePlayLookupError("The app icon could not be loaded. Try again or upload an icon.", 502);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new GooglePlayLookupError("The app icon returned an invalid redirect.", 502);
      }
      current = assertGoogleImageUrl(new URL(location, current).toString());
      continue;
    }
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!response.ok || !contentType?.startsWith("image/")) {
      await response.body?.cancel();
      throw new GooglePlayLookupError("The app icon could not be loaded. Try again or upload an icon.", 502);
    }
    await response.body?.cancel();
    return current.toString();
  }
  throw new GooglePlayLookupError("The app icon redirected too many times.", 502);
}

export async function getGooglePlayIcon(appUrl: string): Promise<{ packageName: string; appIconUrl: string }> {
  const listingUrl = assertPlayListingUrl(appUrl);
  const packageName = listingUrl.searchParams.get("id")!;
  const html = await fetchListingHtml(listingUrl);
  const iconUrl = extractIconUrl(html);
  if (!iconUrl) {
    throw new GooglePlayLookupError("No app icon metadata was found on the Google Play listing. Upload an icon instead.", 404);
  }
  return { packageName, appIconUrl: await verifyIconLoads(iconUrl) };
}
