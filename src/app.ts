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
    '<svg viewBox="0 0 24 24"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 001.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.045-1.773-.6-1.943-1.536a1.88 1.88 0 011.038-2.022c.323-.16.67-.25 1.018-.324.378-.082.758-.153 1.134-.24.274-.063.457-.23.51-.516a.904.904 0 00.02-.193c0-1.815 0-3.63-.002-5.443a.725.725 0 00-.026-.185c-.04-.15-.15-.243-.304-.234-.16.01-.318.035-.475.066-.76.15-1.52.303-2.28.456l-2.325.47-1.374.278c-.016.003-.032.01-.048.013-.277.077-.377.203-.39.49-.002.042 0 .086 0 .13-.002 2.602 0 5.204-.003 7.805 0 .42-.047.836-.215 1.227-.278.64-.77 1.04-1.434 1.233-.35.1-.71.16-1.075.172-.96.036-1.755-.6-1.92-1.544-.14-.812.23-1.685 1.154-2.075.357-.15.73-.232 1.108-.31.287-.06.575-.116.86-.177.383-.083.583-.323.6-.714v-.15c0-2.96 0-5.922.002-8.882 0-.123.013-.25.042-.37.07-.285.273-.448.546-.518.255-.066.515-.112.774-.165.733-.15 1.466-.296 2.2-.444l2.27-.46c.67-.134 1.34-.27 2.01-.403.22-.043.442-.088.663-.106.31-.025.523.17.554.482.008.073.012.148.012.223.002 1.91.002 3.822 0 5.732z"/></svg>',
  tidal:
    '<svg viewBox="0 0 24 24"><path d="M12.012 3.992 8.008 7.996 4.004 3.992 0 7.996l4.004 4.004L8.008 8l4.004 4.004L8.008 16.01l4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zm7.984 0-4.004 4.004L20 12l4-4.004-4.004-4.004z"/></svg>',
  youtubeMusic:
    '<svg viewBox="0 0 24 24"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/></svg>',
  deezer:
    '<svg viewBox="0 0 24 24"><path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027h-5.19zm6.271 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.271 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/></svg>',
  amazonMusic:
    '<svg viewBox="0 0 24 24"><path d="M18.6 2 10.8 3.7a.76.76 0 0 0-.6.74v9.6a3.28 3.28 0 0 0-1.55-.39c-1.66 0-3 1.14-3 2.55s1.34 2.55 3 2.55 3-1.14 3-2.55V8.16l6.8-1.5v5.63a3.3 3.3 0 0 0-1.54-.38c-1.66 0-3 1.14-3 2.55s1.34 2.54 3 2.54 3-1.14 3-2.54V2.74A.76.76 0 0 0 18.6 2zM2.06 18.9a.42.42 0 0 0-.14.3c0 .12.06.22.17.32C4.6 21.7 8 23 11.63 23c2.6 0 5.62-.82 7.7-2.36.34-.26.05-.65-.3-.5-2.34.98-4.88 1.46-7.19 1.46-3.42 0-6.73-.94-9.41-2.5-.13-.08-.26-.05-.37-.2z"/></svg>',
};

const SEARCH_MARK =
  '<svg class="platform-link__search-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>';

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
const hintEl = queryElement<HTMLParagraphElement>("#hint");
const loaderEl = queryElement<HTMLElement>("#loader");
const statusEl = queryElement<HTMLParagraphElement>("#status");
const resultEl = queryElement<HTMLElement>("#result");
const artworkEl = queryElement<HTMLImageElement>("#result-artwork");
const sourceBadgeEl = queryElement<HTMLElement>("#result-source");
const titleEl = queryElement<HTMLHeadingElement>("#result-title");
const artistEl = queryElement<HTMLParagraphElement>("#result-artist");
const linksEl = queryElement<HTMLElement>("#links");
const shareEl = queryElement<HTMLElement>("#share");
const shareButton = queryElement<HTMLButtonElement>("#share-button");
const shareButtonLabel = queryElement<HTMLElement>("#share-button-label");

function isPlatformId(value: string): value is PlatformId {
  return Object.prototype.hasOwnProperty.call(PLATFORM_LABELS, value);
}

const PREFERRED_PLATFORM_KEY = "music-link:preferred-platform";

function getPreferredPlatform(): PlatformId | null {
  try {
    const stored = window.localStorage.getItem(PREFERRED_PLATFORM_KEY);
    return stored && isPlatformId(stored) ? stored : null;
  } catch {
    return null;
  }
}

function savePreferredPlatform(platformId: PlatformId): void {
  try {
    window.localStorage.setItem(PREFERRED_PLATFORM_KEY, platformId);
  } catch {
    // Private mode without storage — the tap still opens the link.
  }
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
    case "spotify": {
      // Field filters make the exact track the top result instead of a fuzzy list.
      const filtered =
        title && artist ? `track:"${title}" artist:"${artist}"` : query;
      return `https://open.spotify.com/search/${encodeURIComponent(filtered)}`;
    }
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

  // The recipient's remembered platform becomes a full-width "Play on X"
  // CTA at the top of the grid, so a shared link is one tap to listen.
  const preferredPlatform = getPreferredPlatform();
  const featuredIndex = platformEntries.findIndex(
    (entry) =>
      entry.platformId === preferredPlatform && entry.platformId !== result.sourcePlatform,
  );

  if (featuredIndex > 0) {
    const [featured] = platformEntries.splice(featuredIndex, 1);
    platformEntries.unshift(featured);
  }

  platformEntries.forEach(({ platformId, url, isSearchFallback }, index) => {
    const link = document.createElement("a");
    const icon = document.createElement("span");
    const name = document.createElement("span");
    const isSource = platformId === result.sourcePlatform;
    const isFeatured = index === 0 && featuredIndex >= 0 && platformId === preferredPlatform;

    link.className = [
      "button",
      "platform-link",
      `platform-link--${platformId}`,
      isSearchFallback ? "platform-link--search" : "",
      isSource ? "platform-link--source" : "",
      isFeatured ? "platform-link--featured" : "",
    ]
      .filter(Boolean)
      .join(" ");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.platform = platformId;
    link.title = isSource
      ? `${PLATFORM_LABELS[platformId]} (original link)`
      : isSearchFallback
        ? `Search on ${PLATFORM_LABELS[platformId]}`
        : `Open in ${PLATFORM_LABELS[platformId]}`;

    icon.className = "platform-link__icon";
    icon.innerHTML = PLATFORM_ICONS[platformId];

    name.className = "platform-link__name";
    name.textContent = isFeatured
      ? `Play on ${PLATFORM_LABELS[platformId]}`
      : PLATFORM_LABELS[platformId];

    link.append(icon, name);

    if (isSearchFallback) {
      link.insertAdjacentHTML("beforeend", SEARCH_MARK);
    }

    link.addEventListener("click", () => {
      savePreferredPlatform(platformId);
    });

    linksEl.appendChild(link);
  });

  if (platformEntries.length === 0) {
    setStatus("No supported destination links were found for this URL.", "error");
    return;
  }

  setStatus("");

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
    const response = await fetch(requestUrl, { signal: AbortSignal.timeout(4000) });

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

  return {
    title: primaryEntity?.title,
    artist: primaryEntity?.artistName,
    artworkUrl: artworkEntity?.thumbnailUrl,
    sourcePlatform,
    platformLinks,
    confidence: "high",
  };
}

// Runs after the result is already on screen: swaps the Apple Music search
// button for a direct track link once the iTunes lookup resolves.
async function upgradeAppleMusicLink(result: ResolveResult): Promise<void> {
  const directUrl = await findAppleMusicFallback(result.title, result.artist);

  if (!directUrl || state.currentResult !== result) {
    return;
  }

  result.platformLinks.appleMusic = directUrl;

  const link = linksEl.querySelector<HTMLAnchorElement>('a[data-platform="appleMusic"]');

  if (!link || !link.classList.contains("platform-link--search")) {
    return;
  }

  link.href = directUrl;
  link.classList.remove("platform-link--search");
  link.title = `Open in ${PLATFORM_LABELS.appleMusic}`;
  link.querySelector(".platform-link__search-mark")?.remove();
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

    if (!result.platformLinks.appleMusic && result.sourcePlatform !== "appleMusic") {
      void upgradeAppleMusicLink(result);
    }
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

function renderHintIcons(): void {
  SUPPORTED_PLATFORMS.forEach((platform) => {
    const icon = document.createElement("span");
    icon.className = "hint__icon";
    icon.title = platform.label;
    icon.innerHTML = PLATFORM_ICONS[platform.id];
    hintEl.appendChild(icon);
  });
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
  // iOS shows a system paste prompt before resolving readText — give
  // instant feedback so the tap doesn't feel dead.
  pasteButton.disabled = true;
  setStatus("Reading clipboard…");

  try {
    const clipboardText = await navigator.clipboard.readText();

    if (clipboardText.trim()) {
      urlInput.value = clipboardText.trim();
      void handleResolve();
      return;
    }

    setStatus("");
  } catch {
    setStatus("");
  } finally {
    pasteButton.disabled = false;
  }

  urlInput.focus();
});

shareButton.addEventListener("click", async () => {
  const shareUrl = getShareUrl(state.currentSourceUrl);
  const title = state.currentResult?.title;
  const artist = state.currentResult?.artist;

  if (navigator.share) {
    try {
      await navigator.share({
        title: [title, artist].filter(Boolean).join(" — ") || "Music Link",
        url: shareUrl,
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    shareButton.classList.add("is-copied");
    shareButtonLabel.textContent = "Link copied!";
    window.setTimeout(() => {
      shareButton.classList.remove("is-copied");
      shareButtonLabel.textContent = "Share converter link";
    }, 1600);
  } catch {
    setStatus(shareUrl);
  }
});

renderHintIcons();
restoreInitialState();
