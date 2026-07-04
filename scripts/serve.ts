import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const port = Number(process.env.PORT || 4173);
const root = resolve(".");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function getFilePath(requestUrl = "/"): string | null {
  const url = new URL(requestUrl, `http://127.0.0.1:${port}`);
  const requestedPath = normalize(decodeURIComponent(url.pathname));
  const filePath = join(root, requestedPath === sep ? "index.html" : requestedPath);
  const resolvedPath = resolve(filePath);

  if (!resolvedPath.startsWith(root)) {
    return null;
  }

  if (!existsSync(resolvedPath)) {
    return null;
  }

  const stats = statSync(resolvedPath);
  return stats.isDirectory() ? join(resolvedPath, "index.html") : resolvedPath;
}

const server = createServer((request, response) => {
  const filePath = getFilePath(request.url);

  if (!filePath) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Music link converter: http://127.0.0.1:${port}`);
});
