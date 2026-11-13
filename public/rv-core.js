/* Dùng chung cho player nội bộ (index.html) và trang duyệt của khách (review.html).
   RV.preload tải sẵn cả file video Drive về máy theo từng khúc 8 MB (qua /api/drive?part=…),
   chạy 3 khúc song song, mỗi khúc thử lại tối đa 5 lần khi mạng chập chờn. Tải xong thì player
   chuyển sang bản trong máy: tua tức thì, không phụ thuộc mạng nữa. */
(function () {
  var PS = 8 * 1024 * 1024;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function small() {
    try { if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true; } catch (e) {}
    try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  }
  function getPart(id, n, key, signal) {
    var url = '/api/drive?id=' + encodeURIComponent(id) + '&part=' + n + '&ps=' + PS + '&k=' + encodeURIComponent(key || '');
    var tries = 0;
    function go() {
      return fetch(url, { signal: signal }).then(function (r) {
        if (r.status === 416) return { buf: new ArrayBuffer(0), total: 0, end: true };
        if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
        var total = +(r.headers.get('x-total-size') || 0);
        return r.arrayBuffer().then(function (buf) { return { buf: buf, total: total }; });
      }).catch(function (e) {
        if (signal && signal.aborted) throw e;
        if (e && (e.status === 403 || e.status === 404 || e.status === 400)) throw e;
        if (++tries > 5) throw e;
        return sleep(Math.min(8000, 600 * Math.pow(2, tries))).then(go);
      });
    }
    return go();
  }
  /* opts: {key, onProgress(loaded, total), maxBytes} → {promise: Promise<Blob>, cancel()} */
  function preload(id, opts) {
    opts = opts || {};
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var signal = ctl ? ctl.signal : undefined;
    var maxBytes = opts.maxBytes || (small() ? 260 : 900) * 1024 * 1024;
    var promise = getPart(id, 0, opts.key, signal).then(function (first) {
      var total = first.total || first.buf.byteLength;
      if (total > maxBytes) { var e = new Error('too_big'); e.code = 'too_big'; e.total = total; throw e; }
      var count = Math.max(1, Math.ceil(total / PS));
      var parts = new Array(count); parts[0] = first.buf;
      var loaded = first.buf.byteLength;
      if (opts.onProgress) opts.onProgress(loaded, total);
      var next = 1;
      function worker() {
        if (next >= count) return Promise.resolve();
        var n = next++;
        return getPart(id, n, opts.key, signal).then(function (p) {
          parts[n] = p.buf; loaded += p.buf.byteLength;
          if (opts.onProgress) opts.onProgress(Math.min(loaded, total), total);
          return worker();
        });
      }
      var ws = []; for (var i = 0; i < 3; i++) ws.push(worker());
      return Promise.all(ws).then(function () { return new Blob(parts, { type: 'video/mp4' }); });
    });
    return { promise: promise, cancel: function () { if (ctl) ctl.abort(); } };
  }
  function mb(n) { return (n / 1048576).toFixed(n < 10485760 ? 1 : 0).replace('.', ',') + ' MB'; }
  window.RV = { preload: preload, PS: PS, mb: mb };
})();
