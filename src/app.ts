const SONG_LINK_ENDPOINT = "https://api.song.link/v1-alpha.1/links";
const ITUNES_SEARCH_ENDPOINT = "https://itunes.apple.com/search";
const PREFERRED_PLATFORM_KEY = "music-link-converter:preferred-platform";

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
  platformLinks: Partial<Record<PlatformId, string>>;
  confidence: "high" | "fallback";
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
} = {
  currentSourceUrl: "",
  isLoading: false,
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
const preferredPlatformSelect = queryElement<HTMLSelectElement>("#preferred-platform");
const resolveButton = queryElement<HTMLButtonElement>("#resolve-button");
const statusEl = queryElement<HTMLParagraphElement>("#status");
const resultEl = queryElement<HTMLElement>("#result");
const artworkEl = queryElement<HTMLImageElement>("#result-artwork");
const titleEl = queryElement<HTMLHeadingElement>("#result-title");
const artistEl = queryElement<HTMLParagraphElement>("#result-artist");
const labelEl = queryElement<HTMLParagraphElement>("#result-label");
const linksEl = queryElement<HTMLElement>("#links");
const shareEl = queryElement<HTMLElement>("#share");
const shareUrlInput = queryElement<HTMLInputElement>("#share-url");
const copyShareButton = queryElement<HTMLButtonElement>("#copy-share-url");

function isPlatformId(value: string): value is PlatformId {
  return Object.prototype.hasOwnProperty.call(PLATFORM_LABELS, value);
}

function getPreferredPlatform(): PlatformId {
  return isPlatformId(preferredPlatformSelect.value)
    ? preferredPlatformSelect.value
    : "spotify";
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

function getShareUrl(sourceUrl: string, platformId: PlatformId): string {
  const shareUrl = new URL(window.location.href);
  shareUrl.search = "";
  shareUrl.searchParams.set("url", sourceUrl);
  shareUrl.searchParams.set("to", platformId);
  return shareUrl.toString();
}

function renderResult(result: ResolveResult): void {
  const preferredPlatform = getPreferredPlatform();
  const platformEntries = Object.entries(result.platformLinks) as Array<[PlatformId, string]>;

  platformEntries.sort(([left], [right]) => {
    if (left === preferredPlatform) return -1;
    if (right === preferredPlatform) return 1;
    return PLATFORM_LABELS[left].localeCompare(PLATFORM_LABELS[right]);
  });

  titleEl.textContent = result.title || "Track found";
  artistEl.textContent = result.artist || "Artist unavailable";
  labelEl.textContent = result.confidence === "fallback" ? "Song found with fallback" : "Song found";

  if (result.artworkUrl) {
    artworkEl.src = result.artworkUrl;
    artworkEl.hidden = false;
  } else {
    artworkEl.removeAttribute("src");
    artworkEl.hidden = true;
  }

  resultEl.hidden = false;
  linksEl.innerHTML = "";

  platformEntries.forEach(([platformId, url]) => {
    const link = document.createElement("a");
    const marker = document.createElement("span");
    const label = document.createElement("span");
    const isPreferred = platformId === preferredPlatform;

    link.className = `button platform-link${isPreferred ? " platform-link--preferred" : ""}`;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.platform = platformId;

    marker.className = "platform-link__mark";
    label.textContent = `Open in ${PLATFORM_LABELS[platformId]}`;

    link.append(marker, label);
    linksEl.appendChild(link);
  });

  if (platformEntries.length === 0) {
    setStatus("No supported destination links were found for this URL.", "error");
    return;
  }

  const preferredFound = Boolean(result.platformLinks[preferredPlatform]);
  setStatus(
    preferredFound
      ? `Ready to open in ${PLATFORM_LABELS[preferredPlatform]}.`
      : "Your preferred platform was not found, but other links are available.",
  );

  shareUrlInput.value = getShareUrl(state.currentSourceUrl, preferredPlatform);
  shareEl.hidden = false;
}

async function resolveSongLink(sourceUrl: string): Promise<SongLinkResponse> {
  const apiBase = getApiBase();
  const requestUrl = new URL(apiBase ? `${apiBase}/links` : SONG_LINK_ENDPOINT);
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
  setStatus("Searching available platforms...");

  try {
    const result = await resolveMusicUrl(sourceUrl);
    renderResult(result);
    updateBrowserUrl(sourceUrl, getPreferredPlatform());
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

function updateBrowserUrl(sourceUrl: string, platformId: PlatformId): void {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("url", sourceUrl);
  nextUrl.searchParams.set("to", platformId);
  window.history.replaceState({}, "", nextUrl);
}

function restoreInitialState(): void {
  const savedPlatform = localStorage.getItem(PREFERRED_PLATFORM_KEY);
  const params = new URLSearchParams(window.location.search);
  const queryUrl = params.get("url");
  const queryPlatform = params.get("to");
  const initialPlatform = queryPlatform || savedPlatform;

  if (initialPlatform && isPlatformId(initialPlatform)) {
    preferredPlatformSelect.value = initialPlatform;
  }

  if (queryUrl) {
    urlInput.value = queryUrl;
    void handleResolve();
  }
}

preferredPlatformSelect.addEventListener("change", () => {
  const preferredPlatform = getPreferredPlatform();
  localStorage.setItem(PREFERRED_PLATFORM_KEY, preferredPlatform);

  if (state.currentSourceUrl) {
    shareUrlInput.value = getShareUrl(state.currentSourceUrl, preferredPlatform);
    updateBrowserUrl(state.currentSourceUrl, preferredPlatform);

    const activeLink = linksEl.querySelector(".platform-link--preferred");
    activeLink?.classList.remove("platform-link--preferred");

    const nextActiveLink = linksEl.querySelector(`[data-platform="${preferredPlatform}"]`);
    nextActiveLink?.classList.add("platform-link--preferred");

    setStatus(
      nextActiveLink
        ? `Ready to open in ${PLATFORM_LABELS[preferredPlatform]}.`
        : "Your preferred platform was not found, but other links are available.",
    );
  }
});

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
