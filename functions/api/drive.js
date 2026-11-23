// Cloudflare Pages: chạy api/drive.js (viết cho Vercel Edge, nhận Request trả Response) không đổi logic.
// Biến môi trường của Cloudflare (Settings › Variables and secrets) được đưa vào process.env như trên Vercel.
// Khúc tải sẵn (?part=N) được giữ ở cache của Cloudflare (Cache API) theo s-maxage trong cdn-cache-control
// mà api/drive.js đặt (12 giờ, link khách 15 phút), thay cho CDN của Vercel: lần xem sau không phải chờ Drive.
// Chỉ dùng cache cho yêu cầu cùng trang (hoặc không có sec-fetch-site), giống điều kiện của api/drive.js.
import handler from "../../api/drive.js";

export async function onRequest({ request, env, waitUntil }) {
  const p = (globalThis.process = globalThis.process || { env: {} });
  p.env = p.env || {};
  for (const k of ["REGISTER_URL", "REGISTER_TOKEN", "FIREBASE_API_KEY", "FIRESTORE_BASE"]) if (env[k]) p.env[k] = env[k];

  const url = new URL(request.url);
  const site = request.headers.get("sec-fetch-site");
  const cache = typeof caches !== "undefined" && caches.default;
  if (!cache || request.method !== "GET" || !url.searchParams.has("part") || (site && site !== "same-origin")) return handler(request);

  const key = new Request(url.toString(), { method: "GET" });
  const hit = await cache.match(key).catch(() => null);
  if (hit) {
    const h = new Headers(hit.headers);
    h.set("cache-control", h.get("x-browser-cache") || "public, max-age=3600");
    h.delete("x-browser-cache");
    h.set("x-edge-cache", "HIT");
    return new Response(hit.body, { status: hit.status, headers: h });
  }
  const res = await handler(request);
  const ttl = res.status === 200 && ((res.headers.get("cdn-cache-control") || "").match(/s-maxage=(\d+)/) || [])[1];
  if (!ttl) return res;
  const copy = res.clone();
  const h = new Headers(copy.headers);
  h.set("x-browser-cache", res.headers.get("cache-control") || "");
  h.set("cache-control", "public, max-age=" + ttl);
  h.delete("cdn-cache-control");
  const put = cache.put(key, new Response(copy.body, { status: 200, headers: h })).catch(() => {});
  if (waitUntil) waitUntil(put); else await put;
  const out = new Response(res.body, res);
  out.headers.set("x-edge-cache", "MISS");
  return out;
}
