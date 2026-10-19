/**
 * PipFrame usage intake (Google Apps Script, bound to a Google Sheet).  Version 2.
 * Tab "usage":  one row per install per day (device, time, counts).
 * Tab "events": one row per button or screen use (time + event name only, never content).
 * It validates every field, stores only what is listed here, and refuses anything else.
 */
var MAX_ROWS = 50000, MAX_EVENT_ROWS = 100000, MAX_BODY = 30000;
var COUNT_KEYS = ["calc","log","exit","plan","card","imp","csv","bak","rst","v_calc","v_journal","v_review","v_settings","v_plan"];
var HEAD = ["key","received_utc","id","day","app","since","days_active","installed","os","browser","model","tz","utc_offset_min","local_time","central_time","screen","lang","trades","closed","plans","active_sec_today","sessions_today","active_sec_total"].concat(COUNT_KEYS);
var EV_HEAD = ["key","id","time_utc","event"];

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : "";
    if (!raw || raw.length > MAX_BODY) return out("rejected");
    var d = JSON.parse(raw);
    if (!d || d.v !== 2 || typeof d.counts !== "object" || d.counts === null) return out("rejected");
    var id = String(d.id), day = String(d.day), app = String(d.app), since = String(d.since || "");
    if (!/^[a-z0-9]{16}$/.test(id) || !/^\d{4}-\d\d-\d\d$/.test(day) || !/^v\d{1,3}$/.test(app)) return out("rejected");
    if (since && !/^\d{4}-\d\d-\d\d$/.test(since)) since = "";
    function pick(v, re, fallback) { v = String(v == null ? "" : v); return re.test(v) ? v : fallback; }
    function num(v) { v = Number(v); return isFinite(v) && v >= 0 ? Math.min(Math.floor(v), 100000) : 0; }
    function cap(v, m) { v = Number(v); return isFinite(v) && v >= 0 ? Math.min(Math.floor(v), m) : 0; }
    var os = pick(d.os, /^[A-Za-z][A-Za-z0-9 ._()-]{0,39}$/, "Other");
    var br = pick(d.browser, /^[A-Za-z][A-Za-z0-9 ._()-]{0,39}$/, "Other");
    var model = pick(d.model, /^[A-Za-z0-9][A-Za-z0-9 ._()\/+-]{0,39}$/, "");
    var tz = pick(d.tz, /^[A-Za-z][A-Za-z0-9_\/+-]{0,39}$/, "");
    var off = Number(d.utc_offset_min); off = isFinite(off) && Math.abs(off) <= 840 ? Math.round(off) : "";
    var local = pick(d.local_time, /^\d{4}-\d\d-\d\dT\d\d:\d\d[+-]\d\d:\d\d$/, "");
    var central = pick(d.central_time, /^\d{4}-\d\d-\d\d \d\d:\d\d CT$/, "");
    var screenSize = pick(d.screen, /^\d{2,5}x\d{2,5}$/, "");
    var lang = pick(d.lang, /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, "");
    var row = [id + "|" + day, new Date().toISOString(), id, day, app, since, num(d.days_active), d.installed === true ? "yes" : "no", os, br, model, tz, off, local, central, screenSize, lang, num(d.trades), num(d.closed), num(d.plans), cap(d.active_sec_today, 86400), cap(d.sessions_today, 500), cap(d.active_sec_total, 100000000)];
    COUNT_KEYS.forEach(function (k) { row.push(num(d.counts[k])); });

    var evRows = [], evs = Array.isArray(d.events) ? d.events.slice(0, 300) : [];
    var ok = {}; COUNT_KEYS.forEach(function (k) { ok[k] = 1; });
    evs.forEach(function (x) {
      var m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ) ([a-z_]{2,12})$/.exec(String(x));
      if (m && ok[m[2]]) evRows.push([id + "|" + m[1] + "|" + m[2], id, m[1], m[2]]);
    });

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sh = ss.getSheetByName("usage") || ss.insertSheet("usage");
      if (sh.getLastRow() === 0) sh.appendRow(HEAD);
      var hit = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).createTextFinder(row[0]).matchEntireCell(true).findNext();
      if (hit) sh.getRange(hit.getRow(), 1, 1, row.length).setValues([row]);
      else if (sh.getLastRow() < MAX_ROWS) sh.appendRow(row);
      else return out("full");

      if (evRows.length) {
        var es = ss.getSheetByName("events") || ss.insertSheet("events");
        if (es.getLastRow() === 0) es.appendRow(EV_HEAD);
        var last = es.getLastRow(), seen = {};
        if (last > 1) {
          es.getRange(Math.max(2, last - 4999), 1, Math.min(last - 1, 5000), 1).getValues().forEach(function (r) { seen[r[0]] = 1; });
        }
        var fresh = evRows.filter(function (r) { return !seen[r[0]]; });
        if (fresh.length && last + fresh.length <= MAX_EVENT_ROWS) es.getRange(last + 1, 1, fresh.length, 4).setValues(fresh);
      }
    } finally { lock.releaseLock(); }
    return out("ok");
  } catch (err) {
    return out("error");
  }
}

function doGet() { return out("PipFrame intake is running"); }
function out(t) { return ContentService.createTextOutput(t); }
