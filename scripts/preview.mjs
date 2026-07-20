import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function insideRoot(candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function resolveFile(requestPath) {
  const decodedPath = decodeURIComponent(requestPath.split("?")[0]);
  const relativePath = decodedPath.replace(/^\/+/, "");
  const directPath = path.resolve(root, relativePath);

  if (!insideRoot(directPath)) return null;

  const candidates = [];
  if (relativePath === "") {
    candidates.push(path.join(root, "index.html"));
  } else if (path.extname(relativePath) && path.extname(relativePath) !== ".da") {
    candidates.push(directPath);
  } else if (decodedPath.endsWith("/")) {
    candidates.push(path.join(directPath, "index.html"));
  } else {
    candidates.push(`${directPath}.html`);
    if (relativePath.endsWith(".da")) {
      candidates.push(path.join(root, relativePath.slice(0, -3), "index.da.html"));
    }
    candidates.push(path.join(directPath, "index.html"));
  }

  return candidates.find((candidate) => insideRoot(candidate) && fs.existsSync(candidate)) || null;
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }

  let filePath;
  try {
    filePath = resolveFile(request.url || "/");
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Cache-Control": "no-cache",
    "Content-Type": contentTypes[extension] || "application/octet-stream",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Preview available at http://${host}:${port}`);
});
