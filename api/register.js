/* Trung chuyển tới Job Register (Apps Script web app trong sheet, xem apps-script/MagentX_BoardSync.gs).
   Token nằm ở biến môi trường của nơi chạy (Cloudflare › board › Settings › Variables and secrets; trước đây Vercel),
   không lộ ra trình duyệt hay repo:
   - REGISTER_URL: URL web app (https://script.google.com/macros/s/…/exec)
   - REGISTER_TOKEN: chuỗi trùng với Script property BOARD_TOKEN
   GET  /api/register         → {configured, ok, jobs, clients}
   POST /api/register {op:'add', job:{…}} → {ok, id, row} hoặc {ok:false, error}
   POST /api/register {op:'credit', items:[{id, n}]} → {ok, updated, missing}: ghi tổng credit đã log vào cột Credits Higgsfield
   Chưa đặt biến môi trường thì trả {configured:false, missing:[tên biến]} để bảng chạy chế độ nhập tay và báo thiếu gì
   (chỉ tên biến, không trả giá trị). */
export const config = { runtime: 'edge' };

const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const TYPES = ['TVC', 'Social', 'MV', 'Show intro', 'Brand film', 'Pitch', 'Internal'];
const STATUS = ['Lead', 'Quoting', 'Confirmed', 'Pre-pro', 'Production', 'Review', 'Delivered', 'Invoiced', 'Paid', 'Cancelled'];

async function call(url, init) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, Object.assign({ redirect: 'follow' }, init));
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { return { ok: false, error: 'Job Register trả về dữ liệu lạ (' + r.status + '). Kiểm tra lại bản deploy web app.' }; }
    } catch (e) { if (i) return { ok: false, error: 'Không kết nối được Job Register.' }; }
  }
}

export default async function handler(req) {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return json({ ok: false, error: 'forbidden' }, 403);
  const URL0 = process.env.REGISTER_URL || '', TOKEN = process.env.REGISTER_TOKEN || '';
  if (!/^https?:\/\//.test(URL0) || TOKEN.length < 16) {
    const missing = [];
    if (!URL0) missing.push('REGISTER_URL'); else if (!/^https?:\/\//.test(URL0)) missing.push('REGISTER_URL (không phải link https)');
    if (!TOKEN) missing.push('REGISTER_TOKEN'); else if (TOKEN.length < 16) missing.push('REGISTER_TOKEN (ngắn hơn 16 ký tự)');
    return json({ configured: false, missing });
  }
  if (req.method === 'GET') {
    const u = URL0 + (URL0.indexOf('?') < 0 ? '?' : '&') + 'op=list&token=' + encodeURIComponent(TOKEN);
    const o = await call(u, { method: 'GET' });
    return json(Object.assign({ configured: true }, o, o && o.error === 'auth' ? { error: 'Token không khớp với BOARD_TOKEN của Apps Script.' } : {}));
  }
  if (req.method === 'POST') {
    let b = null; try { b = await req.json(); } catch (e) {}
    if (b && b.op === 'credit') {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 300)
        .map(x => ({ id: String((x && x.id) || '').slice(0, 90), n: Math.round(+(x && x.n)) }))
        .filter(x => /^[A-Za-z0-9_-]{3,90}$/.test(x.id) && Number.isFinite(x.n) && x.n >= 0 && x.n < 1e7);
      if (!items.length) return json({ ok: false, error: 'Thiếu dữ liệu credit.' }, 400);
      const o = await call(URL0, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: TOKEN, op: 'credit', items }) });
      if (o && o.error === 'op') o.error = 'Apps Script trong Job Register là bản cũ, chưa ghi được credit. Dán lại apps-script/MagentX_BoardSync.gs và deploy bản mới (xem docs/register-sync.md).';
      return json(Object.assign({ configured: true }, o));
    }
    const j = b && b.op === 'add' && b.job;
    if (!j) return json({ ok: false, error: 'Thiếu dữ liệu job.' }, 400);
    const job = {
      kickoff: String(j.kickoff || '').slice(0, 4), cc: String(j.cc || '').toUpperCase().slice(0, 5), project: String(j.project || '').slice(0, 60),
      type: TYPES.indexOf(j.type) >= 0 ? j.type : '', parent: String(j.parent || '').slice(0, 90), status: STATUS.indexOf(j.status) >= 0 ? j.status : 'Quoting',
      pic: String(j.pic || '').slice(0, 60), deadline: /^\d{4}-\d{2}-\d{2}$/.test(j.deadline || '') ? j.deadline : '', notes: String(j.notes || '').slice(0, 500),
    };
    if (!/^\d{4}$/.test(job.kickoff) || !/^[A-Z0-9]{2,5}$/.test(job.cc) || !/^[A-Za-z0-9-]+$/.test(job.project)) return json({ ok: false, error: 'Job ID chưa đúng dạng YYMM_CLIENTCODE_Project-Name.' }, 400);
    const o = await call(URL0, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: TOKEN, op: 'add', job }) });
    return json(Object.assign({ configured: true }, o));
  }
  return json({ ok: false, error: 'method' }, 405);
}
