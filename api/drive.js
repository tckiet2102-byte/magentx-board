/* Trung chuyển video từ Google Drive cho player duyệt.
   Google chặn phát thẳng file Drive trên web khác (trả 403 cho yêu cầu cross-site), nên trình duyệt
   gọi /api/drive?id=<fileId> cùng tên miền; hàm này lấy file công khai từ Drive và truyền lại, giữ Range để tua.
   Chỉ dùng được với file chia sẻ "Bất kỳ ai có đường liên kết". */
export const config = { runtime: 'edge' };

const PASS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

export default async function handler(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  /* chỉ phục vụ trang của chính app, không cho web khác nhúng nhờ */
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return new Response('Forbidden', { status: 403 });
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!/^[\w-]{20,100}$/.test(id)) return new Response('Thiếu hoặc sai id file.', { status: 400 });

  const headers = {};
  const range = req.headers.get('range');
  if (range) headers.Range = range;
  let up;
  try {
    up = await fetch('https://drive.usercontent.google.com/download?id=' + id + '&export=download&confirm=t', { method: req.method, headers, redirect: 'follow' });
  } catch (e) {
    return new Response('Không kết nối được Google Drive.', { status: 502 });
  }
  const type = up.headers.get('content-type') || '';
  /* file chưa chia sẻ công khai hoặc không tồn tại: Drive trả trang HTML thay vì file */
  if (!up.ok || /text\/html/i.test(type)) {
    return new Response('Không lấy được file từ Google Drive. Kiểm tra file đã chia sẻ "Bất kỳ ai có đường liên kết".', { status: up.status === 404 ? 404 : 502, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  const out = new Headers();
  for (const k of PASS) { const v = up.headers.get(k); if (v) out.set(k, v); }
  if (!out.has('accept-ranges')) out.set('accept-ranges', 'bytes');
  out.set('cache-control', 'private, max-age=3600');
  return new Response(up.body, { status: up.status, headers: out });
}
