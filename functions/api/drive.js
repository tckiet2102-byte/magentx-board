// Cloudflare Pages: chạy api/drive.js (viết cho Vercel Edge, nhận Request trả Response) không đổi logic.
// Biến môi trường của Cloudflare (Settings › Variables and secrets) được đưa vào process.env như trên Vercel.
import handler from "../../api/drive.js";

export function onRequest({ request, env }) {
  const p = (globalThis.process = globalThis.process || { env: {} });
  p.env = p.env || {};
  for (const k of ["REGISTER_URL", "REGISTER_TOKEN", "FIREBASE_API_KEY", "FIRESTORE_BASE"]) if (env[k]) p.env[k] = env[k];
  return handler(request);
}
