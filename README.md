# Music Link

Static web MVP for converting shared music links into direct platform links.

## Local

```bash
npm run serve
```

Open `http://127.0.0.1:4173`.

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
