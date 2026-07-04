const DEEZER_SEARCH_ENDPOINT = "https://api.deezer.com/search";
const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SPOTIFY_SEARCH_ENDPOINT = "https://api.spotify.com/v1/search";

declare const process: { env: Record<string, string | undefined> };

type QueryValue = string | string[] | undefined;

type VercelRequest = {
  method?: string;
  query: Record<string, QueryValue>;
};

type VercelResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
  end(): void;
};

type MatchResult = {
  url: string | null;
  isrc?: string | null;
};

type DeezerSearchResponse = {
  data?: Array<{ link?: string; isrc?: string }>;
};

type SpotifyTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type SpotifySearchResponse = {
  tracks?: {
    items?: Array<{ external_urls?: { spotify?: string } }>;
  };
};

let spotifyToken: { value: string; expiresAt: number } | null = null;

function firstQueryValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function matchDeezer(title: string, artist: string): Promise<MatchResult> {
  const url = new URL(DEEZER_SEARCH_ENDPOINT);
  url.searchParams.set("q", `track:"${title}" artist:"${artist}"`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url);

  if (!response.ok) {
    return { url: null };
  }

  const data = (await response.json()) as DeezerSearchResponse;
  const track = data.data?.[0];
  return { url: track?.link || null, isrc: track?.isrc || null };
}

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (spotifyToken && spotifyToken.expiresAt > Date.now() + 30_000) {
    return spotifyToken.value;
  }

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as SpotifyTokenResponse;

  if (!data.access_token) {
    return null;
  }

  spotifyToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
  return spotifyToken.value;
}

async function searchSpotify(
  token: string,
  query: string,
  market: string,
): Promise<string | null> {
  const url = new URL(SPOTIFY_SEARCH_ENDPOINT);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);
  url.searchParams.set("market", market);

  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as SpotifySearchResponse;
  return data.tracks?.items?.[0]?.external_urls?.spotify || null;
}

async function matchSpotify(
  title: string,
  artist: string,
  isrc: string,
  market: string,
): Promise<MatchResult> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return { url: null };
  }

  const token = await getSpotifyToken(clientId, clientSecret);

  if (!token) {
    return { url: null };
  }

  // ISRC is an exact identifier — try it first, fall back to fielded search.
  if (isrc) {
    const byIsrc = await searchSpotify(token, `isrc:${isrc}`, market);

    if (byIsrc) {
      return { url: byIsrc };
    }
  }

  const byQuery = await searchSpotify(token, `track:"${title}" artist:"${artist}"`, market);
  return { url: byQuery };
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const platform = firstQueryValue(request.query.platform);
  const title = firstQueryValue(request.query.title) || "";
  const artist = firstQueryValue(request.query.artist) || "";
  const isrc = firstQueryValue(request.query.isrc) || "";
  const market = (firstQueryValue(request.query.market) || "US").slice(0, 2).toUpperCase();

  if (!platform || (!title && !isrc)) {
    response.status(400).json({ error: "missing_params" });
    return;
  }

  try {
    let result: MatchResult;

    if (platform === "deezer") {
      result = await matchDeezer(title, artist);
    } else if (platform === "spotify") {
      result = await matchSpotify(title, artist, isrc, market);
    } else {
      response.status(400).json({ error: "unsupported_platform" });
      return;
    }

    response.setHeader("cache-control", result.url ? "public, max-age=86400" : "no-store");
    response.status(200).json(result);
  } catch {
    response.setHeader("cache-control", "no-store");
    response.status(502).json({ url: null, error: "upstream_error" });
  }
}
