/* Report importer: pure functions, no DOM except an optional DOMParser for HTML.
   parseReport(text, {parseHtml, symbols}) -> {rows:[...], format, warnings:[]}
   Each row: {ticket, symbol, side, lots, open, sl, tp, closePrice, openTime, closeTime, profit, fees}
   UNVERIFIED against real broker exports: built from the usual MT5 layout and common CSV headers. */
(function (root) {
  function num(v) {
    if (v == null) return null;
    var s = String(v).replace(/[\s  ]/g, "").replace(/[$€£]/g, "");
    if (s === "" || s === "-") return null;
    // 1,234.56 or 1.234,56 or 1234,56
    if (/,/.test(s) && /\./.test(s)) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    else if (/,/.test(s)) s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
    var x = parseFloat(s);
    return isFinite(x) ? x : null;
  }
  function time(v) {
    if (!v) return null;
    var m = String(v).trim().match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime();
    var t = Date.parse(v);
    return isFinite(t) ? t : null;
  }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  var ALIAS = {
    ticket: ["position", "ticket", "order", "deal", "positionid", "id"],
    symbol: ["symbol", "instrument", "pair", "item", "market"],
    side: ["type", "direction", "side", "action"],
    lots: ["volume", "lots", "lot", "size", "quantity", "qty"],
    open: ["openprice", "entryprice", "entry", "price"],
    sl: ["sl", "stoploss", "stop"],
    tp: ["tp", "takeprofit", "target"],
    closePrice: ["closeprice", "exitprice", "exit", "price2"],
    openTime: ["opentime", "entrytime", "time", "date", "opendate"],
    closeTime: ["closetime", "exittime", "time2", "closedate"],
    profit: ["profit", "pnl", "netprofit", "netpl", "pl", "realizedpnl", "result"],
    commission: ["commission", "fee", "fees"],
    swap: ["swap", "rollover"]
  };
  function mapHeader(cells) {
    var seen = {}, map = {};
    cells.forEach(function (c, i) {
      var k = norm(c); if (!k) return;
      seen[k] = (seen[k] || 0) + 1;
      var key = seen[k] > 1 ? k + seen[k] : k;       // duplicate names: time, price -> time2, price2
      Object.keys(ALIAS).forEach(function (f) {
        if (map[f] == null && ALIAS[f].indexOf(key) > -1) map[f] = i;
      });
      if (k === "sl" || k === "stoploss") map.sl = map.sl == null ? i : map.sl;
      if (k === "tp" || k === "takeprofit") map.tp = map.tp == null ? i : map.tp;
    });
    // MT5 labels "S / L" and "T / P" -> norm gives "sl" / "tp" (handled above)
    return map;
  }
  function side(v) {
    var s = String(v || "").toLowerCase();
    if (/^buy|^long/.test(s)) return "BUY";
    if (/^sell|^short/.test(s)) return "SELL";
    return null;
  }
  function rowsFromTable(table, fmt) {
    var warnings = [], out = [], map = null, skipped = 0;
    table.forEach(function (cells) {
      if (!map) {
        var m = mapHeader(cells);
        if (m.symbol != null && m.lots != null && m.profit != null && (m.side != null)) map = m;
        return;
      }
      if (cells.length < 5) return;
      var sd = side(cells[map.side]);
      var sym = (cells[map.symbol] || "").trim();
      if (!sd || !sym) { skipped++; return; }  // balance rows, totals, pending orders
      var fees = (num(cells[map.commission]) || 0) + (num(cells[map.swap]) || 0);
      out.push({
        ticket: map.ticket != null ? String(cells[map.ticket]).trim() : "",
        symbol: sym, side: sd, lots: num(cells[map.lots]),
        open: num(cells[map.open]), sl: map.sl != null ? num(cells[map.sl]) : null, tp: map.tp != null ? num(cells[map.tp]) : null,
        closePrice: map.closePrice != null ? num(cells[map.closePrice]) : null,
        openTime: time(cells[map.openTime]), closeTime: map.closeTime != null ? time(cells[map.closeTime]) : null,
        profit: num(cells[map.profit]), fees: fees
      });
    });
    if (!map) warnings.push("Could not find a table with Symbol, Type, Volume and Profit columns.");
    if (skipped) warnings.push(skipped + " non-trade row(s) skipped (balance, totals or pending orders).");
    return { rows: out, format: fmt, warnings: warnings };
  }
  function splitCsv(text) {
    var first = text.split(/\r?\n/).slice(0, 5).join("\n");
    var d = [";", "\t", ","].map(function (c) { return [c, first.split(c).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var rows = [], row = [], f = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === d) { row.push(f); f = ""; }
      else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
      else if (c !== "\r") f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function parseReport(text, opts) {
    opts = opts || {};
    text = String(text || "").replace(/^﻿/, "");
    if (/<table/i.test(text)) {
      var tables = [];
      if (opts.parseHtml) tables = opts.parseHtml(text);
      else tables = (text.match(/<tr[\s\S]*?<\/tr>/gi) || []).map(function (tr) {
        return (tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map(function (td) { return td.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim(); });
      });
      return rowsFromTable(tables, "html");
    }
    return rowsFromTable(splitCsv(text), "csv");
  }
  // Clean a broker symbol (EURUSD.m, EURUSDm, EURUSD+, #XAUUSD) down to a known code
  function cleanSymbol(s, known) {
    var u = String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (known(u)) return u;
    var aliases = { XAUUSD: ["GOLD"], US500: ["SPX500", "SP500", "US500CASH"], NAS100: ["USTEC", "NDX100", "NAS100CASH"], US30: ["DJ30", "WS30"], GER40: ["DE40", "DAX40", "GER30"], UK100: ["FTSE100"], JPN225: ["JP225", "NIKKEI225"] };
    for (var k in aliases) if (aliases[k].indexOf(u) > -1) return k;
    for (var n = u.length - 1; n >= 5; n--) { var p = u.slice(0, n); if (known(p)) return p; }
    return u;
  }
  var api = { parseReport: parseReport, cleanSymbol: cleanSymbol, num: num, time: time };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PFImport = api;
})(typeof self !== "undefined" ? self : this);
