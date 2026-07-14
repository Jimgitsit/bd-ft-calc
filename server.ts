// Dead-simple static server for bd-ft-calc. Serves files from ./public,
// falling back to index.html. Runs behind nginx at jimmcgowen.com/bd-ft-calc/
// (the trailing-slash proxy_pass strips the prefix, so this sees "/").
import { join, normalize } from "path";

const PORT = Number(process.env.PORT) || 58002;
const ROOT = join(import.meta.dir, "public");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function contentType(path: string): string {
  const dot = path.lastIndexOf(".");
  if (dot < 0) {
    return "application/octet-stream";
  }
  return TYPES[path.slice(dot)] || "application/octet-stream";
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === "/" || path === "") {
      path = "/index.html";
    }

    // Confine resolution to ROOT — reject any path that escapes it.
    const resolved = normalize(join(ROOT, path));
    if (!resolved.startsWith(ROOT)) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(resolved);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "content-type": contentType(resolved) },
      });
    }

    // SPA-style fallback so any unknown path still loads the app.
    return new Response(Bun.file(join(ROOT, "index.html")), {
      headers: { "content-type": TYPES[".html"] },
    });
  },
});

console.log(`bd-ft-calc serving on http://localhost:${PORT}`);
