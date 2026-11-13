/* API cho trang duyệt của khách (/r/<dự án>/<mã link>).
   Khách không đăng nhập và không đọc thẳng database: hàm này đọc dự án qua Firestore REST,
   kiểm tra mã link còn hiệu lực, rồi chỉ trả về đúng video, tên bước và ghi chú của khách.
   Ghi chú của khách lưu chung chỗ với ghi chú của team (steps.<bước>.vn.<id>, src = 'client')
   để team thấy ngay trong player nội bộ; phản hồi Đồng ý / Cần sửa lưu ở shares.<mã link>.dec. */
export const config = { runtime: 'edge' };

const PROJECT = 'magentx-board';
const KEY = (typeof process !== 'undefined' && process.env && process.env.FIREBASE_API_KEY) || 'AIzaSyColNZZrCvNtN4Uy8zRtc2wT1yJH4XckWI';
/* FIRESTORE_BASE chỉ dùng khi chạy thử với Firestore emulator trên máy */
const BASE = (typeof process !== 'undefined' && process.env && process.env.FIRESTORE_BASE) || 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/';

const RE_PID = /^[A-Za-z0-9_-]{1,64}$/, RE_TOK = /^[A-Za-z][A-Za-z0-9]{15,40}$/, RE_SID = /^s\d\d[a-z]?$/, RE_NID = /^k[a-z0-9]{6,24}$/;

/* ---- Firestore REST value <-> JS ---- */
function dec(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) { const o = {}, f = v.mapValue.fields || {}; for (const k in f) o[k] = dec(f[k]); return o; }
  return null;
}
function enc(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(enc) } };
  const fields = {}; for (const k in x) fields[k] = enc(x[k]); return { mapValue: { fields } };
}
async function getProject(pid) {
  const r = await fetch(BASE + 'projects/' + pid + '?key=' + KEY);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('read ' + r.status);
  const d = await r.json(), o = {};
  for (const k in (d.fields || {})) o[k] = dec(d.fields[k]);
  return o;
}
/* Ghi đúng các trường được nêu (field path), không đụng phần còn lại của dự án. Trường có trong paths nhưng không có giá trị = xóa. */
async function patch(pid, sets, dels) {
  const tree = {};
  for (const [path, val] of sets) { const seg = path.split('.'); let o = tree; seg.slice(0, -1).forEach(s => { o = o[s] = o[s] || {}; }); o[seg[seg.length - 1]] = val; }
  const paths = sets.map(s => s[0]).concat(dels || []);
  const qs = paths.map(p => 'updateMask.fieldPaths=' + encodeURIComponent(p)).join('&');
  const fields = {}; for (const k in tree) fields[k] = enc(tree[k]);
  const r = await fetch(BASE + 'projects/' + pid + '?key=' + KEY + '&currentDocument.exists=true&' + qs, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error('write ' + r.status + ' ' + (await r.text()).slice(0, 200));
}

const json = (o, status) => new Response(JSON.stringify(o), { status: status || 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (msg, status) => json({ error: msg }, status);
async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mx-ck|' + s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}
const clean = (s, n) => String(s || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
function driveId(u) {
  const s = String(u || '');
  const m = s.match(/(?:drive|docs)\.google\.com\/file\/d\/([\w-]{20,})/) || s.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]{20,})/) || s.match(/drive\.usercontent\.google\.com\/download\?(?:[^#]*&)?id=([\w-]{20,})/);
  return m ? m[1] : '';
}

/* Mở link: kiểm tra mã còn hiệu lực và trả về phần khách được xem */
async function load(pid, tok) {
  if (!RE_PID.test(pid) || !RE_TOK.test(tok)) return { err: fail('Link không đúng.', 404) };
  const doc = await getProject(pid);
  const sh = doc && doc.shares && doc.shares[tok];
  if (!sh || !RE_SID.test(sh.sid || '')) return { err: fail('Link không đúng hoặc đã bị xóa.', 404) };
  if (sh.on === false) return { err: fail('Link này đã được tắt. Liên hệ MagentX để nhận link mới.', 410) };
  if (sh.exp && sh.exp < Date.now()) return { err: fail('Link này đã hết hạn. Liên hệ MagentX để nhận link mới.', 410) };
  const st = (doc.steps || {})[sh.sid];
  if (!st) return { err: fail('Bước này không còn trong dự án.', 404) };
  return { doc, sh, st };
}
function view(doc, sh, st) {
  const vn = st.vn || {};
  const notes = Object.keys(vn).filter(k => vn[k] && vn[k].src === 'client' && typeof vn[k].t === 'number').map(k => {
    const n = vn[k];
    return { nid: k, t: n.t, text: n.text || '', name: n.cn || '', at: n.at || 0, ver: n.ver || 0, d: Array.isArray(n.d) ? n.d : [], ok: !!n.ok, ck: n.ck || '' };
  }).sort((a, b) => (a.t - b.t) || (a.at - b.at));
  const id = driveId(sh.url);
  return {
    project: doc.name || '', code: doc.code || '',
    step: { no: sh.sno || '', name: sh.sname || '' },
    ver: sh.ver || 0, video: { id, url: id ? '' : (sh.url || '') },
    notes, dec: sh.dec && (sh.dec.ver || 0) === (sh.ver || 0) ? sh.dec : null, exp: sh.exp || 0,
  };
}

export default async function handler(req) {
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return fail('Forbidden', 403);
  try {
    if (req.method === 'GET') {
      const q = new URL(req.url).searchParams;
      const r = await load(q.get('p') || '', q.get('t') || '');
      if (r.err) return r.err;
      const out = view(r.doc, r.sh, r.st);
      const ckh = q.get('ck') ? await sha(q.get('ck')) : '';
      out.notes.forEach(n => { n.mine = !!ckh && n.ck === ckh; delete n.ck; });
      return json(out);
    }
    if (req.method !== 'POST') return fail('Method not allowed', 405);
    let b; try { b = await req.json(); } catch (e) { return fail('Dữ liệu gửi lên không đúng.', 400); }
    const pid = String(b.p || ''), tok = String(b.t || '');
    const r = await load(pid, tok);
    if (r.err) return r.err;
    const sid = r.sh.sid, ver = r.sh.ver || 0;
    const name = clean(b.name, 60);
    const ck = clean(b.ck, 80);
    if (b.a === 'note') {
      const t = Number(b.time), text = clean(b.text, 2000);
      const d = Array.isArray(b.d) ? b.d.filter(x => typeof x === 'string' && /^[0-3]\|[0-9a-z]*$/.test(x)).slice(0, 24) : [];
      if (!(t >= 0 && t < 36000)) return fail('Thời điểm ghi chú không đúng.', 400);
      if (!text && !d.length) return fail('Ghi chú đang trống.', 400);
      if (d.join('').length > 14000) return fail('Nét vẽ quá nhiều, xóa bớt rồi gửi lại.', 400);
      if (!name) return fail('Nhập tên của bạn trước khi gửi ghi chú.', 400);
      if (!/^[A-Za-z0-9]{16,80}$/.test(ck)) return fail('Thiếu mã trình duyệt.', 400);
      const nid = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await patch(pid, [['steps.' + sid + '.vn.' + nid, { t: Math.round(t * 1000) / 1000, text, by: null, cn: name, src: 'client', at: Date.now(), ver, d, ck: await sha(ck) }]]);
    } else if (b.a === 'del') {
      const nid = String(b.nid || '');
      if (!RE_NID.test(nid)) return fail('Sai mã ghi chú.', 400);
      const n = ((r.st.vn || {})[nid]);
      if (!n || n.src !== 'client') return fail('Không tìm thấy ghi chú.', 404);
      if (!ck || n.ck !== await sha(ck)) return fail('Chỉ xóa được ghi chú do chính bạn gửi từ máy này.', 403);
      if (n.ok) return fail('Ghi chú này MagentX đã xử lý, không xóa được nữa.', 409);
      await patch(pid, [], ['steps.' + sid + '.vn.' + nid]);
    } else if (b.a === 'dec') {
      const text = clean(b.text, 2000);
      if (!name) return fail('Nhập tên của bạn trước khi gửi phản hồi.', 400);
      if (!b.ok && !text) return fail('Ghi rõ cần sửa gì.', 400);
      await patch(pid, [['shares.' + tok + '.dec', { ok: !!b.ok, name, text, ver, at: Date.now() }]]);
    } else return fail('Thao tác không đúng.', 400);
    const again = await load(pid, tok);
    if (again.err) return again.err;
    const out = view(again.doc, again.sh, again.st);
    const ckh = ck ? await sha(ck) : '';
    out.notes.forEach(n => { n.mine = !!ckh && n.ck === ckh; delete n.ck; });
    return json(out);
  } catch (e) {
    return fail('Máy chủ đang bận, thử lại sau ít phút.', 502);
  }
}
