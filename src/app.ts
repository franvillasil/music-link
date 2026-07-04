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

const PLATFORM_ICONS: Record<PlatformId, string> = {
  spotify:
    '<svg viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
  appleMusic:
    '<svg viewBox="0 0 24 24"><path d="M17.1 2 8.6 3.87a.83.83 0 0 0-.65.81v10.45a3.57 3.57 0 0 0-1.7-.43c-1.8 0-3.25 1.24-3.25 2.77S4.45 20.24 6.25 20.25c1.8 0 3.26-1.24 3.26-2.78V8.68l7.42-1.63v6.13a3.6 3.6 0 0 0-1.68-.41c-1.8 0-3.26 1.24-3.26 2.77s1.46 2.78 3.26 2.78S18.5 17.08 18.5 15.54V2.81A.83.83 0 0 0 17.1 2z"/></svg>',
  tidal:
    '<svg viewBox="0 0 24 24"><path d="M12.012 3.992 8.008 7.996 4.004 3.992 0 7.996l4.004 4.004L8.008 8l4.004 4.004L8.008 16.01l4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zm7.984 0-4.004 4.004L20 12l4-4.004-4.004-4.004z"/></svg>',
  youtubeMusic:
    '<svg viewBox="0 0 24 24"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm-2.316-3.564L15.816 12 9.684 8.46v7.08z"/></svg>',
  deezer:
    '<svg viewBox="0 0 24 24"><path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM0 12.594v3.027h5.19v-3.027H0zm6.27 0v3.027h5.189v-3.027h-5.19zm6.271 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.271 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/></svg>',
  amazonMusic:
    '<svg viewBox="0 0 24 24"><path d="M18.6 2 10.8 3.7a.76.76 0 0 0-.6.74v9.6a3.28 3.28 0 0 0-1.55-.39c-1.66 0-3 1.14-3 2.55s1.34 2.55 3 2.55 3-1.14 3-2.55V8.16l6.8-1.5v5.63a3.3 3.3 0 0 0-1.54-.38c-1.66 0-3 1.14-3 2.55s1.34 2.54 3 2.54 3-1.14 3-2.54V2.74A.76.76 0 0 0 18.6 2zM2.06 18.9a.42.42 0 0 0-.14.3c0 .12.06.22.17.32C4.6 21.7 8 23 11.63 23c2.6 0 5.62-.82 7.7-2.36.34-.26.05-.65-.3-.5-2.34.98-4.88 1.46-7.19 1.46-3.42 0-6.73-.94-9.41-2.5-.13-.08-.26-.05-.37-.2z"/></svg>',
};

const SEARCH_ICON =
  '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>';

const OUT_ICON =
  '<svg class="platform-link__out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';

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
const pasteButton = queryElement<HTMLButtonElement>("#paste-button");
const loaderEl = queryElement<HTMLElement>("#loader");
const statusEl = queryElement<HTMLParagraphElement>("#status");
const resultEl = queryElement<HTMLElement>("#result");
const artworkEl = queryElement<HTMLImageElement>("#result-artwork");
const sourceBadgeEl = queryElement<HTMLElement>("#result-source");
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

function normalizeUrl(rawInput: string): string {
  // Share sheets on mobile often paste "Song – Artist https://..." — pull the URL out of the text.
  const urlMatch = rawInput.match(/https?:\/\/[^\s<>"'）)\]]+/i);

  if (!urlMatch) {
    throw new Error("unsupported_url");
  }

  const parsedUrl = new URL(urlMatch[0]);

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
  resolveButton.querySelector(".button__label")!.textContent = isLoading
    ? "Searching…"
    : "Find song";
  loaderEl.hidden = !isLoading;
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
  sourceBadgeEl.textContent = result.sourcePlatform
    ? `From ${PLATFORM_LABELS[result.sourcePlatform]}`
    : "";
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
    const icon = document.createElement("span");
    const text = document.createElement("span");
    const name = document.createElement("span");
    const action = document.createElement("span");
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

    icon.className = "platform-link__icon";
    icon.innerHTML = isSearchFallback ? SEARCH_ICON : PLATFORM_ICONS[platformId];

    text.className = "platform-link__text";
    name.className = "platform-link__name";
    name.textContent = PLATFORM_LABELS[platformId];
    action.className = "platform-link__action";
    action.textContent = isSource
      ? "Original link"
      : isSearchFallback
        ? "Search for it"
        : "Open song";
    text.append(name, action);

    link.append(icon, text);
    link.insertAdjacentHTML("beforeend", OUT_ICON);
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

  let response: Response;

  try {
    response = await fetch(requestUrl);
  } catch {
    throw new Error("network_error");
  }

  if (!response.ok) {
    if (response.status === 404 || response.status === 400) {
      throw new Error("not_found");
    }
    if (response.status === 429) {
      throw new Error("rate_limited");
    }
    throw new Error(`provider_error_${response.status}`);
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

  // Best-effort: never let this secondary lookup break the main result.
  try {
    const response = await fetch(requestUrl);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as ITunesSearchResponse;
    const match = data.results?.[0];
    return match?.trackViewUrl || null;
  } catch {
    return null;
  }
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
    const code = error instanceof Error ? error.message : "unknown";
    let message: string;

    if (code === "not_found") {
      message = "No matching song was found for this link.";
    } else if (code === "rate_limited") {
      message = "The match service is busy right now. Wait a minute and try again.";
    } else if (code === "network_error") {
      message = "Could not reach the server. Check your connection and try again.";
    } else if (!getApiBase()) {
      message = "This site needs the music link API proxy configured before public links can be resolved.";
    } else {
      message = `Something went wrong resolving this link (${code}). Try again in a moment.`;
    }

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

urlInput.addEventListener("paste", () => {
  // Let the pasted value land in the input first, then resolve automatically.
  window.setTimeout(() => {
    if (urlInput.value.trim()) {
      void handleResolve();
    }
  }, 0);
});

pasteButton.addEventListener("click", async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();

    if (clipboardText.trim()) {
      urlInput.value = clipboardText.trim();
      void handleResolve();
      return;
    }
  } catch {
    // Clipboard read not allowed — fall through to manual focus.
  }

  urlInput.focus();
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
