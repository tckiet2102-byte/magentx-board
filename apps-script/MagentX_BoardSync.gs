/**
 * MagentX Board ↔ Job Register
 *
 * Dán file này vào Apps Script của sheet "[MagentX] Job Register" (Extensions › Apps Script, thêm file mới),
 * rồi deploy thành Web app. Hướng dẫn đầy đủ: docs/register-sync.md trong repo magentx-board.
 *
 * - GET  ?op=list&token=…   trả danh sách job (không có Quote, Credits, Notes) và tab Clients.
 * - POST {token, op:'add', job:{kickoff, cc, project, type, parent, status, pic, deadline, notes}}
 *        thêm một dòng vào tab Jobs, chỉ ghi các cột nhập tay (B, C, E–J, P);
 *        cột A, D, N là ARRAYFORMULA nên không đụng tới. Trả về Job ID ở cột A.
 *
 * Token đặt ở Project Settings › Script properties, tên BOARD_TOKEN. Không ghi token vào code.
 * Script chạy dưới quyền chủ sheet (Execute as: Me) nên ghi được vào vùng đang khóa.
 */
var MXB = {
  jobs: 'Jobs',
  clients: 'Clients',
  types: ['TVC', 'Social', 'MV', 'Show intro', 'Brand film', 'Pitch', 'Internal'],
  status: ['Lead', 'Quoting', 'Confirmed', 'Pre-pro', 'Production', 'Review', 'Delivered', 'Invoiced', 'Paid', 'Cancelled']
};

function mxbOut_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function mxbAuth_(t) {
  var k = PropertiesService.getScriptProperties().getProperty('BOARD_TOKEN');
  return !!k && k.length >= 16 && t === k;
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!mxbAuth_(p.token)) return mxbOut_({ ok: false, error: 'auth' });
  if (p.op === 'list') return mxbOut_(mxbList_());
  return mxbOut_({ ok: false, error: 'op' });
}

function doPost(e) {
  var b = {};
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { b = {}; }
  if (!mxbAuth_(b.token)) return mxbOut_({ ok: false, error: 'auth' });
  if (b.op === 'add') return mxbOut_(mxbAdd_(b.job || {}));
  return mxbOut_({ ok: false, error: 'op' });
}

/** Dòng cuối có dữ liệu ở cột B (cột A là ARRAYFORMULA nên getLastRow không dùng được). */
function mxbLastRow_(sh) {
  var v = sh.getRange('B:B').getValues();
  for (var i = v.length - 1; i >= 0; i--) if (String(v[i][0]) !== '') return i + 1;
  return 1;
}

function mxbList_() {
  var ss = SpreadsheetApp.getActive(), js = ss.getSheetByName(MXB.jobs), cs = ss.getSheetByName(MXB.clients);
  var tz = ss.getSpreadsheetTimeZone();
  var d = function (v) { return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : ''; };
  var last = mxbLastRow_(js);
  var rows = last > 1 ? js.getRange(2, 1, last - 1, 16).getValues() : [];
  var jobs = [];
  rows.forEach(function (r, i) {
    if (!String(r[0])) return;
    jobs.push({
      id: String(r[0]), kickoff: String(r[1]), cc: String(r[2]), client: String(r[3]), project: String(r[4]),
      type: String(r[5]), parent: String(r[6]), status: String(r[7]), pic: String(r[8]),
      deadline: d(r[9]), delivered: d(r[10]), folder: String(r[14]), row: i + 2
    });
  });
  var cn = cs.getLastRow();
  var clients = cn > 1 ? cs.getRange(2, 1, cn - 1, 3).getValues().filter(function (r) { return String(r[0]); })
    .map(function (r) { return { code: String(r[0]), name: String(r[1]), note: String(r[2]) }; }) : [];
  return { ok: true, jobs: jobs, clients: clients, at: Date.now() };
}

function mxbAdd_(j) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActive(), js = ss.getSheetByName(MXB.jobs), cs = ss.getSheetByName(MXB.clients);
    var kick = String(j.kickoff || ''), cc = String(j.cc || ''), pr = String(j.project || '');
    if (!/^\d{4}$/.test(kick)) return { ok: false, error: 'Kick-off cần 4 chữ số YYMM' };
    if (!/^[A-Za-z0-9-]+$/.test(pr)) return { ok: false, error: 'Project chỉ gồm chữ không dấu, số và gạch ngang' };
    var cn = cs.getLastRow();
    var codes = cn > 1 ? cs.getRange(2, 1, cn - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    if (codes.indexOf(cc) < 0) return { ok: false, error: 'Client code ' + cc + ' chưa có trong tab Clients' };
    var id = kick + '_' + cc + '_' + pr;
    var last = mxbLastRow_(js);
    var ids = last > 1 ? js.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    if (ids.indexOf(id) >= 0) return { ok: false, error: 'Job ID ' + id + ' đã có trong Job Register', id: id, exists: true };
    var type = MXB.types.indexOf(j.type) >= 0 ? j.type : (cc === 'MX' ? 'Internal' : '');
    var status = MXB.status.indexOf(j.status) >= 0 ? j.status : 'Quoting';
    var parent = j.parent && ids.indexOf(String(j.parent)) >= 0 ? String(j.parent) : '';
    var row = last + 1;
    js.getRange(row, 2, 1, 2).setValues([[kick, cc]]);
    js.getRange(row, 5, 1, 5).setValues([[pr, type, parent, status, String(j.pic || '')]]);
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(j.deadline || ''));
    if (m) js.getRange(row, 10).setValue(new Date(+m[1], +m[2] - 1, +m[3]));
    if (j.notes) js.getRange(row, 16).setValue(String(j.notes).slice(0, 500));
    SpreadsheetApp.flush();
    return { ok: true, id: String(js.getRange(row, 1).getValue() || id), row: row };
  } finally {
    lock.releaseLock();
  }
}
