const SONG_LINK_ENDPOINT = "https://api.song.link/v1-alpha.1/links";

type QueryValue = string | string[] | undefined;

type VercelRequest = {
  method?: string;
  query: Record<string, QueryValue>;
};

type VercelResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
  send(body: string): void;
  end(): void;
};

function firstQueryValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function setCors(response: VercelResponse): void {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  setCors(response);

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const sourceUrl = firstQueryValue(request.query.url);
  const userCountry = firstQueryValue(request.query.userCountry) || "US";

  if (!sourceUrl) {
    response.status(400).json({ error: "missing_url" });
    return;
  }

  const upstreamUrl = new URL(SONG_LINK_ENDPOINT);
  upstreamUrl.searchParams.set("url", sourceUrl);
  upstreamUrl.searchParams.set("userCountry", userCountry);

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      accept: "application/json",
    },
  });
  const body = await upstreamResponse.text();

  response.setHeader("cache-control", "public, max-age=86400");
  response.setHeader(
    "content-type",
    upstreamResponse.headers.get("content-type") || "application/json",
  );
  response.status(upstreamResponse.status).send(body);
}
