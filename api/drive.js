/* Trung chuyển video từ Google Drive cho player duyệt.
   Google chặn phát thẳng file Drive trên web khác (trả 403 cho yêu cầu cross-site), nên trình duyệt
   gọi /api/drive?id=<fileId> cùng tên miền; hàm này lấy file công khai từ Drive và truyền lại.
   Hai cách dùng:
   - Phát trực tiếp: /api/drive?id=… (giữ header Range để tua).
   - Tải sẵn theo khúc: /api/drive?id=…&part=N&ps=<bytes>&k=<khóa bản> trả về đúng một khúc, kèm
     x-total-size. Khúc có URL cố định nên CDN của Vercel giữ lại được, lần xem sau nhanh hơn.
   Chỉ dùng được với file chia sẻ "Bất kỳ ai có đường liên kết". */
export const config = { runtime: 'edge' };

const PASS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];
const MAX_PS = 16 * 1024 * 1024;

const sleep = ms => new Promise(r => setTimeout(r, ms));
/* Drive đôi khi trả 429/5xx hoặc rớt kết nối: thử lại vài lần trước khi báo lỗi */
async function fromDrive(id, method, range) {
  const url = 'https://drive.usercontent.google.com/download?id=' + id + '&export=download&confirm=t';
  let last = null;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { method, headers: range ? { Range: range } : {}, redirect: 'follow' });
      if (r.status === 429 || r.status >= 500) { last = r; if (r.body) r.body.cancel(); await sleep(400 * (i + 1)); continue; }
      return r;
    } catch (e) { last = null; await sleep(400 * (i + 1)); }
  }
  return last;
}
const bad = (msg, status) => new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  /* chỉ phục vụ trang của chính app, không cho web khác nhúng nhờ */
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return bad('Forbidden', 403);
  const q = new URL(req.url).searchParams;
  const id = q.get('id') || '';
  if (!/^[\w-]{20,100}$/.test(id)) return bad('Thiếu hoặc sai id file.', 400);

  const part = q.get('part');
  if (part !== null) {
    const n = parseInt(part, 10), ps = Math.min(MAX_PS, Math.max(1024 * 1024, parseInt(q.get('ps') || '', 10) || 8 * 1024 * 1024));
    if (!(n >= 0 && n < 100000)) return bad('Sai số khúc.', 400);
    const up = await fromDrive(id, 'GET', 'bytes=' + (n * ps) + '-' + ((n + 1) * ps - 1));
    if (!up) return bad('Không kết nối được Google Drive.', 502);
    const type = up.headers.get('content-type') || '';
    if (up.status === 416) return bad('Khúc nằm ngoài file.', 416);
    if (!up.ok || /text\/html/i.test(type)) return bad('Không lấy được file từ Google Drive. Kiểm tra file đã chia sẻ "Bất kỳ ai có đường liên kết".', up.status === 404 ? 404 : 502);
    const cr = up.headers.get('content-range') || '';
    const total = (cr.match(/\/(\d+)\s*$/) || [])[1] || up.headers.get('content-length') || '';
    const buf = await up.arrayBuffer();
    return new Response(buf, { status: 200, headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(buf.byteLength),
      'x-total-size': String(total),
      'access-control-expose-headers': 'x-total-size',
      'cache-control': 'public, max-age=3600',
      'cdn-cache-control': 'public, s-maxage=43200',
    } });
  }

  const range = req.headers.get('range');
  const up = await fromDrive(id, req.method, range);
  if (!up) return bad('Không kết nối được Google Drive.', 502);
  const type = up.headers.get('content-type') || '';
  /* file chưa chia sẻ công khai hoặc không tồn tại: Drive trả trang HTML thay vì file */
  if (!up.ok || /text\/html/i.test(type)) {
    return bad('Không lấy được file từ Google Drive. Kiểm tra file đã chia sẻ "Bất kỳ ai có đường liên kết".', up.status === 404 ? 404 : 502);
  }
  const out = new Headers();
  for (const k of PASS) { const v = up.headers.get(k); if (v) out.set(k, v); }
  if (!out.has('accept-ranges')) out.set('accept-ranges', 'bytes');
  out.set('cache-control', 'private, max-age=3600');
  return new Response(up.body, { status: up.status, headers: out });
}
