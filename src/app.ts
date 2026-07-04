const SONG_LINK_ENDPOINT = "https://api.song.link/v1-alpha.1/links";
const ITUNES_SEARCH_ENDPOINT = "https://itunes.apple.com/search";

type PlatformId =
  | "spotify"
  | "appleMusic"
  | "tidal"
  | "youtubeMusic"
  | "deezer"
  | "amazonMusic";

type Platform = {
  id: PlatformId;
  label: string;
};

type SongLinkEntity = {
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
};

type SongLinkPlatformLink = {
  url?: string;
  entityUniqueId?: string;
};

type SongLinkResponse = {
  entityUniqueId?: string;
  entitiesByUniqueId?: Record<string, SongLinkEntity>;
  linksByPlatform?: Partial<Record<PlatformId, SongLinkPlatformLink>> &
    Record<string, SongLinkPlatformLink>;
};

type ResolveResult = {
  title?: string;
  artist?: string;
  artworkUrl?: string;
  sourcePlatform: PlatformId | null;
  platformLinks: Partial<Record<PlatformId, string>>;
  confidence: "high" | "fallback";
};

type PlatformEntry = {
  platformId: PlatformId;
  url: string;
  isSearchFallback: boolean;
};

type ITunesSearchResponse = {
  results?: Array<{
    trackViewUrl?: string;
  }>;
};

const SUPPORTED_PLATFORMS: Platform[] = [
  { id: "spotify", label: "Spotify" },
  { id: "appleMusic", label: "Apple Music" },
  { id: "tidal", label: "TIDAL" },
  { id: "youtubeMusic", label: "YouTube Music" },
  { id: "deezer", label: "Deezer" },
  { id: "amazonMusic", label: "Amazon Music" },
];

const PLATFORM_LABELS = SUPPORTED_PLATFORMS.reduce(
  (labels, platform) => {
    labels[platform.id] = platform.label;
    return labels;
  },
  {} as Record<PlatformId, string>,
);

const state: {
  currentSourceUrl: string;
  isLoading: boolean;
  currentResult: ResolveResult | null;
} = {
  currentSourceUrl: "",
  isLoading: false,
  currentResult: null,
};

function queryElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element;
}

const form = queryElement<HTMLFormElement>("#resolver-form");
const urlInput = queryElement<HTMLInputElement>("#music-url");
const resolveButton = queryElement<HTMLButtonElement>("#resolve-button");
const statusEl = queryElement<HTMLParagraphElement>("#status");
const resultEl = queryElement<HTMLElement>("#result");
const artworkEl = queryElement<HTMLImageElement>("#result-artwork");
const titleEl = queryElement<HTMLHeadingElement>("#result-title");
const artistEl = queryElement<HTMLParagraphElement>("#result-artist");
const linksEl = queryElement<HTMLElement>("#links");
const shareEl = queryElement<HTMLElement>("#share");
const shareUrlInput = queryElement<HTMLInputElement>("#share-url");
const copyShareButton = queryElement<HTMLButtonElement>("#copy-share-url");

function isPlatformId(value: string): value is PlatformId {
  return Object.prototype.hasOwnProperty.call(PLATFORM_LABELS, value);
}

function getCountryCode(): string {
  const locale = navigator.language || "en-US";
  const country = locale.split("-")[1];
  return country && /^[A-Z]{2}$/i.test(country) ? country.toUpperCase() : "US";
}

function getApiBase(): string {
  const config = window as Window & { MUSIC_LINK_API_BASE?: string };
  return (config.MUSIC_LINK_API_BASE || "").replace(/\/$/, "");
}

function normalizeUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim();
  const parsedUrl = new URL(trimmedUrl);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("unsupported_url");
  }

  return parsedUrl.toString();
}

function detectPlatformFromUrl(sourceUrl: string): PlatformId | null {
  const url = new URL(sourceUrl);
  const host = url.hostname.replace(/^www\./, "");

  if (host.includes("spotify.com")) return "spotify";
  if (host.includes("music.apple.com") || host.includes("itunes.apple.com")) return "appleMusic";
  if (host.includes("tidal.com")) return "tidal";
  if (host.includes("music.youtube.com") || host.includes("youtu.be")) return "youtubeMusic";
  if (host.includes("deezer.com")) return "deezer";
  if (host.includes("music.amazon.")) return "amazonMusic";

  return null;
}

function getPrimaryEntity(response: SongLinkResponse): SongLinkEntity | null {
  const entities = response.entitiesByUniqueId || {};
  const entity = response.entityUniqueId ? entities[response.entityUniqueId] : null;

  if (entity) {
    return entity;
  }

  const firstPlatform = Object.values(response.linksByPlatform || {})[0];
  return firstPlatform?.entityUniqueId ? entities[firstPlatform.entityUniqueId] || null : null;
}

function getArtworkEntity(
  response: SongLinkResponse,
  primaryEntity: SongLinkEntity | null,
): SongLinkEntity | null {
  if (primaryEntity?.thumbnailUrl) {
    return primaryEntity;
  }

  return (
    Object.values(response.entitiesByUniqueId || {}).find((entity) => entity.thumbnailUrl) || null
  );
}

function buildPlatformLinks(response: SongLinkResponse): Partial<Record<PlatformId, string>> {
  const linksByPlatform = response.linksByPlatform || {};

  return SUPPORTED_PLATFORMS.reduce<Partial<Record<PlatformId, string>>>((links, platform) => {
    const platformLink = linksByPlatform[platform.id];

    if (platformLink?.url) {
      links[platform.id] = platformLink.url;
    }

    return links;
  }, {});
}

function setLoading(isLoading: boolean): void {
  state.isLoading = isLoading;
  resolveButton.disabled = isLoading;
  resolveButton.textContent = isLoading ? "Searching..." : "Search links";
}

function setStatus(message: string, type: "info" | "error" = "info"): void {
  statusEl.textContent = message;
  statusEl.classList.toggle("status--error", type === "error");
}

function clearResult(): void {
  resultEl.hidden = true;
  linksEl.innerHTML = "";
  shareEl.hidden = true;
}

function getShareUrl(sourceUrl: string): string {
  const shareUrl = new URL(window.location.href);
  shareUrl.search = "";
  shareUrl.searchParams.set("url", sourceUrl);
  return shareUrl.toString();
}

function getSearchFallbackLink(
  platformId: PlatformId,
  title?: string,
  artist?: string,
): string | null {
  const query = [title, artist].filter(Boolean).join(" ").trim();

  if (!query) {
    return null;
  }

  const encodedQuery = encodeURIComponent(query);

  switch (platformId) {
    case "spotify":
      return `https://open.spotify.com/search/${encodedQuery}`;
    case "appleMusic":
      return `https://music.apple.com/search?term=${encodedQuery}`;
    case "tidal":
      return `https://tidal.com/search?q=${encodedQuery}`;
    case "youtubeMusic":
      return `https://music.youtube.com/search?q=${encodedQuery}`;
    case "deezer":
      return `https://www.deezer.com/search/${encodedQuery}`;
    case "amazonMusic":
      return `https://music.amazon.com/search/${encodedQuery}`;
    default:
      return null;
  }
}

function renderResult(result: ResolveResult): void {
  state.currentResult = result;

  const platformEntries: PlatformEntry[] = (
    Object.entries(result.platformLinks) as Array<[PlatformId, string]>
  ).map(([platformId, url]) => ({
    platformId,
    url,
    isSearchFallback: false,
  }));

  SUPPORTED_PLATFORMS.forEach((platform) => {
    if (platform.id === result.sourcePlatform || result.platformLinks[platform.id]) {
      return;
    }

    const searchUrl = getSearchFallbackLink(platform.id, result.title, result.artist);

    if (searchUrl) {
      platformEntries.push({
        platformId: platform.id,
        url: searchUrl,
        isSearchFallback: true,
      });
    }
  });

  platformEntries.sort((left, right) => {
    if (left.platformId === result.sourcePlatform) return 1;
    if (right.platformId === result.sourcePlatform) return -1;
    if (left.isSearchFallback !== right.isSearchFallback) return left.isSearchFallback ? 1 : -1;
    return PLATFORM_LABELS[left.platformId].localeCompare(PLATFORM_LABELS[right.platformId]);
  });

  titleEl.textContent = result.title || "Track found";
  artistEl.textContent = result.artist || "Artist unavailable";
  if (result.artworkUrl) {
    artworkEl.src = result.artworkUrl;
    artworkEl.hidden = false;
  } else {
    artworkEl.removeAttribute("src");
    artworkEl.hidden = true;
  }

  resultEl.hidden = false;
  linksEl.innerHTML = "";

  platformEntries.forEach(({ platformId, url, isSearchFallback }) => {
    const link = document.createElement("a");
    const marker = document.createElement("span");
    const label = document.createElement("span");
    const isSource = platformId === result.sourcePlatform;

    link.className = [
      "button",
      "platform-link",
      `platform-link--${platformId}`,
      isSearchFallback ? "platform-link--search" : "",
      isSource ? "platform-link--source" : "",
    ]
      .filter(Boolean)
      .join(" ");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.platform = platformId;

    marker.className = "platform-link__mark";
    label.textContent = `${isSource ? "Original" : isSearchFallback ? "Search" : "Open"} ${PLATFORM_LABELS[platformId]}`;

    link.append(marker, label);
    linksEl.appendChild(link);
  });

  if (platformEntries.length === 0) {
    setStatus("No supported destination links were found for this URL.", "error");
    return;
  }

  setStatus("");

  shareUrlInput.value = getShareUrl(state.currentSourceUrl);
  shareEl.hidden = false;
}

async function resolveSongLink(sourceUrl: string): Promise<SongLinkResponse> {
  const apiBase = getApiBase();
  const requestUrl = new URL(
    apiBase ? `${apiBase}/links` : SONG_LINK_ENDPOINT,
    window.location.origin,
  );
  requestUrl.searchParams.set("url", sourceUrl);
  requestUrl.searchParams.set("userCountry", getCountryCode());

  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(response.status === 404 ? "not_found" : "provider_error");
  }

  return response.json() as Promise<SongLinkResponse>;
}

async function findAppleMusicFallback(title?: string, artist?: string): Promise<string | null> {
  if (!title || !artist) {
    return null;
  }

  const requestUrl = new URL(ITUNES_SEARCH_ENDPOINT);
  requestUrl.searchParams.set("term", `${title} ${artist}`);
  requestUrl.searchParams.set("media", "music");
  requestUrl.searchParams.set("entity", "song");
  requestUrl.searchParams.set("limit", "1");
  requestUrl.searchParams.set("country", getCountryCode());

  const response = await fetch(requestUrl);

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as ITunesSearchResponse;
  const match = data.results?.[0];
  return match?.trackViewUrl || null;
}

async function resolveMusicUrl(sourceUrl: string): Promise<ResolveResult> {
  const response = await resolveSongLink(sourceUrl);
  const primaryEntity = getPrimaryEntity(response);
  const artworkEntity = getArtworkEntity(response, primaryEntity);
  const platformLinks = buildPlatformLinks(response);
  const sourcePlatform = detectPlatformFromUrl(sourceUrl);
  let confidence: ResolveResult["confidence"] = "high";

  if (!platformLinks.appleMusic) {
    const appleMusicUrl = await findAppleMusicFallback(
      primaryEntity?.title,
      primaryEntity?.artistName,
    );

    if (appleMusicUrl) {
      platformLinks.appleMusic = appleMusicUrl;
      confidence = "fallback";
    }
  }

  return {
    title: primaryEntity?.title,
    artist: primaryEntity?.artistName,
    artworkUrl: artworkEntity?.thumbnailUrl,
    sourcePlatform,
    platformLinks,
    confidence,
  };
}

async function handleResolve(event?: Event): Promise<void> {
  event?.preventDefault();
  clearResult();

  let sourceUrl: string;

  try {
    sourceUrl = normalizeUrl(urlInput.value);
  } catch {
    setStatus(
      "Paste a valid Spotify, Apple Music, TIDAL, YouTube Music, Deezer, or Amazon Music URL.",
      "error",
    );
    return;
  }

  state.currentSourceUrl = sourceUrl;
  setLoading(true);
  setStatus("Finding matches...");

  try {
    const result = await resolveMusicUrl(sourceUrl);
    renderResult(result);
    updateBrowserUrl(sourceUrl);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "not_found"
        ? "No matching song was found for this link."
        : getApiBase()
          ? "Could not resolve this link right now. Try again in a moment."
          : "This site needs the music link API proxy configured before public links can be resolved.";
    setStatus(message, "error");
  } finally {
    setLoading(false);
  }
}

function updateBrowserUrl(sourceUrl: string): void {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("url", sourceUrl);
  nextUrl.searchParams.delete("to");
  window.history.replaceState({}, "", nextUrl);
}

function restoreInitialState(): void {
  const params = new URLSearchParams(window.location.search);
  const queryUrl = params.get("url");

  if (queryUrl) {
    urlInput.value = queryUrl;
    void handleResolve();
  }
}

form.addEventListener("submit", (event) => {
  void handleResolve(event);
});

copyShareButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareUrlInput.value);
    copyShareButton.textContent = "Copied";
    window.setTimeout(() => {
      copyShareButton.textContent = "Copy";
    }, 1400);
  } catch {
    shareUrlInput.select();
    document.execCommand("copy");
  }
});

restoreInitialState();
