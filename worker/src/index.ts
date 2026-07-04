const SONG_LINK_ENDPOINT = "https://api.song.link/v1-alpha.1/links";

const corsHeaders = {
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-origin": "*",
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...init.headers,
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const requestUrl = new URL(request.url);

    if (request.method !== "GET" || requestUrl.pathname !== "/links") {
      return jsonResponse({ error: "not_found" }, { status: 404 });
    }

    const sourceUrl = requestUrl.searchParams.get("url");
    const userCountry = requestUrl.searchParams.get("userCountry") || "US";

    if (!sourceUrl) {
      return jsonResponse({ error: "missing_url" }, { status: 400 });
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

    return new Response(body, {
      status: upstreamResponse.status,
      headers: {
        "cache-control": "public, max-age=86400",
        "content-type": upstreamResponse.headers.get("content-type") || "application/json",
        ...corsHeaders,
      },
    });
  },
};
