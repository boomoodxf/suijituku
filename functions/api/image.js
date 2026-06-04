export async function onRequestGet() {
  const upstream = await fetch("https://boudoir.ortlinde.com/random", {
    cf: { cacheTtl: 0, cacheEverything: false },
  });

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { ok: false, status: upstream.status, error: "Upstream image API failed" },
      { status: upstream.status || 502 },
    );
  }

  const headers = new Headers();
  headers.set("content-type", upstream.headers.get("content-type") || "image/jpeg");
  headers.set("cache-control", "no-store");
  headers.set("x-image-source", upstream.headers.get("x-image-source") || "unknown");
  headers.set("x-original-content-length", upstream.headers.get("content-length") || "");
  headers.set(
    "access-control-expose-headers",
    "content-type,x-image-source,x-original-content-length",
  );

  return new Response(upstream.body, { headers });
}
