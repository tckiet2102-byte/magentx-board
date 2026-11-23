/* Trung chuyển video từ Google Drive cho player duyệt.
   Google chặn phát thẳng file Drive trên web khác (trả 403 cho yêu cầu cross-site), nên trình duyệt
   gọi /api/drive?id=<fileId> cùng tên miền; hàm này lấy file công khai từ Drive và truyền lại.
   Hai cách dùng:
   - Phát trực tiếp: /api/drive?id=… (giữ header Range để tua).
   - Tải sẵn theo khúc: /api/drive?id=…&part=N&ps=<bytes>&k=<khóa bản> trả về đúng một khúc, kèm
     x-total-size. Khúc có URL cố định nên được giữ ở cache (cdn-cache-control: trên Cloudflare do functions/api/drive.js
     đặt vào Cache API, trước đây là CDN của Vercel), lần xem sau nhanh hơn.
   - Kiểm tra: /api/drive?id=…&check=1 → {ok, reason: 'private'|'missing'|'drive'} để player báo đúng lý do.
   - Trang khách: /api/drive?s=<dự án>.<mã link> thay cho id. Máy chủ tự tra mã file trong dự án
     (projects.shares.<mã>), chỉ phục vụ khi link còn bật và chưa hết hạn, nên trình duyệt của khách
     không bao giờ thấy mã file Drive (không mở được Drive để tải về).
   Chỉ dùng được với file chia sẻ "Bất kỳ ai có đường liên kết". File để chế độ hạn chế thì Drive chuyển sang
   trang đăng nhập (HTML): trả 403 kèm x-drive-error: private. */
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
const bad = (msg, status, code) => new Response(msg, { status, headers: Object.assign({ 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }, code ? { 'x-drive-error': code } : {}) });
/* Drive trả HTML (trang đăng nhập) khi file không chia sẻ công khai */
const PRIV = 'File trên Google Drive đang để chế độ hạn chế. Đổi sang "Bất kỳ ai có đường liên kết" để player phát được.';
function upErr(up) {
  if (!up) return bad('Không kết nối được Google Drive.', 502, 'drive');
  if (up.status === 404) return bad('Không tìm thấy file trên Google Drive.', 404, 'missing');
  if (/text\/html/i.test(up.headers.get('content-type') || '') || up.status === 401 || up.status === 403) return bad(PRIV, 403, 'private');
  return bad('Không lấy được file từ Google Drive.', 502, 'drive');
}

/* ---- mã link duyệt của khách → mã file Drive (đọc dự án qua Firestore REST như api/review.js) ---- */
const FS_KEY = (typeof process !== 'undefined' && process.env && process.env.FIREBASE_API_KEY) || 'AIzaSyColNZZrCvNtN4Uy8zRtc2wT1yJH4XckWI';
const FS_BASE = (typeof process !== 'undefined' && process.env && process.env.FIRESTORE_BASE) || 'https://firestore.googleapis.com/v1/projects/magentx-board/databases/(default)/documents/';
const fsVal = v => {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('mapValue' in v) { const o = {}, f = v.mapValue.fields || {}; for (const k in f) o[k] = fsVal(f[k]); return o; }
  return null;
};
function fileIdOf(u) {
  const s = String(u || '');
  const m = s.match(/(?:drive|docs)\.google\.com\/file\/d\/([\w-]{20,})/) || s.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]{20,})/) || s.match(/drive\.usercontent\.google\.com\/download\?(?:[^#]*&)?id=([\w-]{20,})/);
  return m ? m[1] : '';
}
const shareCache = new Map();
async function shareFile(s) {
  const m = /^([A-Za-z0-9_-]{1,64})\.([A-Za-z][A-Za-z0-9]{15,40})$/.exec(s || '');
  if (!m) return { err: 'Link không đúng.', status: 404 };
  const hit = shareCache.get(s);
  if (hit && hit.until > Date.now()) return hit.v;
  let v;
  const r = await fetch(FS_BASE + 'projects/' + m[1] + '?key=' + FS_KEY + '&mask.fieldPaths=' + encodeURIComponent('shares.' + m[2]));
  if (!r.ok && r.status !== 404) return { err: 'Máy chủ đang bận, thử lại sau.', status: 502 };
  const sh = r.ok ? fsVal((((await r.json()).fields || {}).shares || {})) : null;
  const x = sh && sh[m[2]];
  if (!x) v = { err: 'Link không đúng hoặc đã bị xóa.', status: 404 };
  else if (x.on === false) v = { err: 'Link này đã được tắt.', status: 410 };
  else if (x.exp && x.exp < Date.now()) v = { err: 'Link này đã hết hạn.', status: 410 };
  else { const id = fileIdOf(x.url); v = id ? { id } : { err: 'Link này không có video trên Google Drive.', status: 404 }; }
  shareCache.set(s, { v, until: Date.now() + 60000 });
  if (shareCache.size > 500) shareCache.delete(shareCache.keys().next().value);
  return v;
}

export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  /* chỉ phục vụ trang của chính app, không cho web khác nhúng nhờ */
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return bad('Forbidden', 403);
  const q = new URL(req.url).searchParams;
  const viaShare = q.get('s') !== null;
  let id = q.get('id') || '';
  if (viaShare) {
    const r = await shareFile(q.get('s'));
    if (r.err) return bad(r.err, r.status);
    id = r.id;
  }
  if (!/^[\w-]{20,100}$/.test(id)) return bad('Thiếu hoặc sai id file.', 400);
  /* khách không được hỏi tên file */
  if (viaShare && q.get('meta') !== null) return bad('Forbidden', 403);

  /* Tên file/folder để hiện thay cho đường link: /api/drive?meta=1&id=…&kind=file|folder */
  if (q.get('meta') !== null) {
    const kind = q.get('kind') === 'folder' ? 'folder' : 'file';
    let name = '', size = 0;
    if (kind === 'file') {
      const up = await fromDrive(id, 'GET', 'bytes=0-0');
      if (up && up.ok && !/text\/html/i.test(up.headers.get('content-type') || '')) {
        const cd = up.headers.get('content-disposition') || '';
        const star = cd.match(/filename\*=UTF-8''([^;]+)/i), plain = cd.match(/filename="([^"]*)"/i);
        try { name = star ? decodeURIComponent(star[1]) : plain ? plain[1] : ''; } catch (e) { name = plain ? plain[1] : ''; }
        if (/[\u0080-ÿ]/.test(name)) { try { name = new TextDecoder().decode(Uint8Array.from(name, c => c.charCodeAt(0))); } catch (e) {} }
        size = +((up.headers.get('content-range') || '').split('/')[1] || 0);
      }
      if (up && up.body) { try { await up.body.cancel(); } catch (e) {} }
    }
    if (!name) {
      try {
        const r = await fetch(kind === 'folder' ? 'https://drive.google.com/drive/folders/' + id : 'https://drive.google.com/file/d/' + id + '/view', { redirect: 'follow' });
        const m = r.ok ? (await r.text()).match(/<title>([\s\S]*?)<\/title>/i) : null;
        if (m) name = m[1].replace(/\s*-\s*Google Drive\s*$/i, '').replace(/&#(\d+);/g, (x, n) => String.fromCharCode(+n)).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
        if (/^(Google Drive|Sign-in|Đăng nhập)/i.test(name)) name = '';
      } catch (e) {}
    }
    return new Response(JSON.stringify({ name, size, kind }), { status: 200, headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': name ? 'public, max-age=600' : 'no-store',
      'cdn-cache-control': name ? 'public, s-maxage=3600' : 'no-store',
    } });
  }

  if (q.get('check') !== null) {
    const up = await fromDrive(id, 'GET', 'bytes=0-0');
    const ok = !!(up && up.ok && !/text\/html/i.test(up.headers.get('content-type') || ''));
    const e = ok ? null : upErr(up);
    if (up && up.body) { try { await up.body.cancel(); } catch (x) {} }
    return new Response(JSON.stringify(ok ? { ok: true, type: up.headers.get('content-type') || '' } : { ok: false, reason: e.headers.get('x-drive-error') }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }

  const part = q.get('part');
  if (part !== null) {
    const n = parseInt(part, 10), ps = Math.min(MAX_PS, Math.max(1024 * 1024, parseInt(q.get('ps') || '', 10) || 8 * 1024 * 1024));
    if (!(n >= 0 && n < 100000)) return bad('Sai số khúc.', 400);
    const up = await fromDrive(id, 'GET', 'bytes=' + (n * ps) + '-' + ((n + 1) * ps - 1));
    if (up && up.status === 416) return bad('Khúc nằm ngoài file.', 416);
    if (!up || !up.ok || /text\/html/i.test(up.headers.get('content-type') || '')) { if (up && up.body) { try { await up.body.cancel(); } catch (x) {} } return upErr(up); }
    const cr = up.headers.get('content-range') || '';
    const total = (cr.match(/\/(\d+)\s*$/) || [])[1] || up.headers.get('content-length') || '';
    const buf = await up.arrayBuffer();
    return new Response(buf, { status: 200, headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(buf.byteLength),
      'x-total-size': String(total),
      'access-control-expose-headers': 'x-total-size',
      /* khúc của link khách: giữ ngắn để tắt link là thôi phát sớm */
      'cache-control': viaShare ? 'private, max-age=900' : 'public, max-age=3600',
      'cdn-cache-control': viaShare ? 'public, s-maxage=900' : 'public, s-maxage=43200',
    } });
  }

  const range = req.headers.get('range');
  const up = await fromDrive(id, req.method, range);
  /* file chưa chia sẻ công khai hoặc không tồn tại: Drive trả trang HTML thay vì file */
  if (!up || !up.ok || /text\/html/i.test(up.headers.get('content-type') || '')) { if (up && up.body) { try { await up.body.cancel(); } catch (x) {} } return upErr(up); }
  const out = new Headers();
  for (const k of PASS) { const v = up.headers.get(k); if (v) out.set(k, v); }
  if (!out.has('accept-ranges')) out.set('accept-ranges', 'bytes');
  out.set('cache-control', 'private, max-age=3600');
  out.set('content-disposition', 'inline');
  return new Response(up.body, { status: up.status, headers: out });
}
