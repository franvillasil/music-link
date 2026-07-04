# Music Link

Static web MVP for converting shared music links into direct platform links.

## Local

```bash
npm run serve
```

Open `http://127.0.0.1:4173`.

Public GitHub Pages deployments need an API proxy because `api.song.link` does not allow
browser requests from `github.io` origins. Deploy the included Cloudflare Worker and set
`window.MUSIC_LINK_API_BASE` in `config.js` to the Worker URL.

## Build Check

```bash
npm run check
```

## GitHub Pages

The `GitHub Pages` workflow builds `src/app.ts` and publishes the static site from this repo.

Run it manually from GitHub Actions or push changes to `main`.

The app uses query params for shared links:

```text
/?url=<encoded music url>&to=spotify
```

## API Proxy

### Cloudflare Worker

```bash
npx wrangler login
npx wrangler deploy
```

Then update `config.js`:

```js
window.MUSIC_LINK_API_BASE = "https://music-link-api.<your-subdomain>.workers.dev";
```

If Odesli rate-limits Cloudflare egress, deploy the included Vercel Function instead and use
the Vercel deployment URL as `MUSIC_LINK_API_BASE`.
