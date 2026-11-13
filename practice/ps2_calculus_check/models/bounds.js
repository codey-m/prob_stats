/* Integration-bounds refresher: pure logic (no DOM). Loaded as a classic script so the page also opens from disk. */
(function (root) {
  'use strict';

  // ---- Expression parser: numbers, x, y, + - * / ^, parentheses, implicit products (2y), min, max, sqrt.
  var FUNCS = { min: 2, max: 2, sqrt: 1 };
  function tokenize(src) {
    var s = String(src).replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/');
    var re = /\s*(\d+\.?\d*|\.\d+|[A-Za-z]+|[-+*\/^(),])/y, out = [], m;
    re.lastIndex = 0;
    while (re.lastIndex < s.length) {
      if (/^\s*$/.test(s.slice(re.lastIndex))) break;
      var at = re.lastIndex;
      m = re.exec(s);
      if (!m) throw new Error('I can’t read “' + s.slice(at).trim().charAt(0) + '”. Use numbers, x, y, + − * / and parentheses.');
      out.push(m[1]);
    }
    if (!out.length) throw new Error('This limit is empty.');
    return out;
  }
  function parseExpr(src) {
    var t = tokenize(src), i = 0, vars = {};
    function peek() { return t[i]; }
    function expr() {
      var a = term();
      while (peek() === '+' || peek() === '-') { var op = t[i++], b = term(); a = bin(op, a, b); }
      return a;
    }
    function startsAtom(tok) { return tok !== undefined && (/^[\d.]/.test(tok) || /^[A-Za-z]/.test(tok) || tok === '('); }
    function term() {
      var a = unary();
      for (;;) {
        if (peek() === '*' || peek() === '/') { var op = t[i++], b = unary(); a = bin(op, a, b); }
        else if (startsAtom(peek())) { a = bin('*', a, unary()); }
        else return a;
      }
    }
    function unary() { if (peek() === '-') { i++; var a = unary(); return function (e) { return -a(e); }; } if (peek() === '+') { i++; return unary(); } return power(); }
    function power() { var a = atom(); if (peek() === '^') { i++; var b = unary(); return function (e) { return Math.pow(a(e), b(e)); }; } return a; }
    function atom() {
      var tok = t[i++];
      if (tok === undefined) throw new Error('This limit stops partway through.');
      if (/^[\d.]/.test(tok)) { var v = parseFloat(tok); return function () { return v; }; }
      if (tok === '(') { var a = expr(); if (t[i++] !== ')') throw new Error('A parenthesis is not closed.'); return a; }
      if (/^[A-Za-z]/.test(tok)) {
        var name = tok.toLowerCase();
        if (name === 'x' || name === 'y') { vars[name] = true; return function (e) { return e[name]; }; }
        if (FUNCS[name]) {
          if (t[i++] !== '(') throw new Error('Write ' + name + '(…) with parentheses.');
          var args = [expr()];
          while (peek() === ',') { i++; args.push(expr()); }
          if (t[i++] !== ')') throw new Error('A parenthesis is not closed.');
          if (args.length !== FUNCS[name]) throw new Error(name + ' takes ' + FUNCS[name] + (FUNCS[name] === 1 ? ' value.' : ' values.'));
          var f = Math[name];
          return function (e) { return f.apply(null, args.map(function (a) { return a(e); })); };
        }
        if (/^[xy]+$/.test(name)) throw new Error('Write a product with *, for example x*y.');
        throw new Error('I don’t know “' + tok + '”. A limit can use numbers, x and y.');
      }
      throw new Error('I didn’t expect “' + tok + '” there.');
    }
    function bin(op, a, b) {
      if (op === '+') return function (e) { return a(e) + b(e); };
      if (op === '-') return function (e) { return a(e) - b(e); };
      if (op === '*') return function (e) { return a(e) * b(e); };
      return function (e) { return a(e) / b(e); };
    }
    var fn = expr();
    if (i < t.length) throw new Error('I didn’t expect “' + t[i] + '” there.');
    return { fn: fn, vars: Object.keys(vars) };
  }

  // ---- Cases. Each region is stated sliced one way; the task is to write it sliced the other way.
  // slice: the target region read along the asked slices: for outer value o in range, inner runs enter(o)..exit(o).
  var CASES = {
    A: {
      id: 'A',
      inside: function (x, y) { return x > 0 && x < 2 && y > x / 2 && y < 1; },
      ask: { inner: 'x', outer: 'y' },
      window: { x: [-0.5, 2.5], y: [-0.3, 1.5] },
      vertices: [[0, 0], [2, 1], [0, 1]],
      edges: [
        { label: 'x = 0', at: [-0.06, 0.62], anchor: 'end' },
        { label: 'y = 1', at: [0.9, 1.1], anchor: 'middle' },
        { label: 'y = x/2', at: [1.22, 0.42], anchor: 'start' }
      ],
      slice: { range: [0, 1], start: 0.4, enter: function () { return 0; }, exit: function (y) { return 2 * y; } },
      describe: 'A triangle with corners at (0, 0), (2, 1) and (0, 1). Its left edge is the line x = 0, its top edge is the line y = 1, and its slanted lower edge is the line y = x/2.'
    },
    C: {
      id: 'C',
      inside: function (x, y) { return y > 0 && y < 1 && x > 0 && x < 2 - 2 * y; },
      ask: { inner: 'y', outer: 'x' },
      window: { x: [-0.5, 2.5], y: [-0.3, 1.5] },
      vertices: [[0, 0], [2, 0], [0, 1]],
      edges: [
        { label: 'x = 0', at: [-0.06, 0.5], anchor: 'end' },
        { label: 'y = 0', at: [1.5, -0.17], anchor: 'middle' },
        { label: 'x = 2 \u2212 2y', at: [1.05, 0.62], anchor: 'start' }
      ],
      slice: { range: [0, 2], start: 0.6, enter: function () { return 0; }, exit: function (x) { return 1 - x / 2; } },
      describe: 'A triangle with corners at (0, 0), (2, 0) and (0, 1). Its left edge is the line x = 0, its bottom edge is the line y = 0, and its slanted upper edge is the line x = 2 \u2212 2y.'
    },
    B: {
      id: 'B',
      inside: function (x, y) { return y > 0 && y < 1 && x > y && x < 2 - y; },
      ask: { inner: 'y', outer: 'x' },
      window: { x: [-0.5, 2.5], y: [-0.3, 1.5] },
      vertices: [[0, 0], [2, 0], [1, 1]],
      edges: [
        { label: 'y = 0', at: [0.5, -0.17], anchor: 'middle' },
        { label: 'x = y', at: [0.42, 0.62], anchor: 'end' },
        { label: 'x = 2 \u2212 y', at: [1.58, 0.62], anchor: 'start' }
      ],
      breaks: [1],
      slice: { range: [0, 2], start: 0.5, enter: function () { return 0; }, exit: function (x) { return Math.min(x, 2 - x); } },
      describe: 'A triangle with corners at (0, 0), (2, 0) and (1, 1). Its bottom edge is the line y = 0, its left slanted edge is the line x = y, and its right slanted edge is the line x = 2 \u2212 y.'
    }
  };

  // Regions used by the linked graded problems (PSDA 2x Problem Sets 2 and 3). Used only by the leak test:
  // no practice case may describe the same region as a graded one.
  var GRADED_REGIONS = {
    'hw5-tab3 Model A': function (x, y) { return x > 0 && x < 1 && y > 0 && y < 1; },
    'hw5-tab3 Model B': function (x, y) { return x > 0 && x < 1 && y > 0 && y < x; },
    'hw5-tab3 Model C': function (x, y) { return x > 0 && x < 1 && y > x && y < x + 1; },
    'hw5-tab4 (scaled by 1/40)': function (x, y) { return x > 0 && x < 1 && y > 0 && y < 3 * x; },
    'hw5-tab4 event Y > X (scaled)': function (x, y) { return x > 0 && x < 1 && y > x && y < 3 * x; },
    'hw5-tab5 tail integral': function (x, y) { return y > 0 && x > y; }
  };

  // ---- Learner limits -> region.
  // piece = {outerLo, outerHi, innerLo, innerHi} as strings. Returns {ok, pieces|error, field}.
  function readPieces(rawPieces, ask) {
    var names = { outerLo: 'outer lower limit', outerHi: 'outer upper limit', innerLo: 'inner lower limit', innerHi: 'inner upper limit' };
    var out = [];
    for (var p = 0; p < rawPieces.length; p++) {
      var piece = {};
      for (var k in names) {
        var raw = rawPieces[p][k];
        if (raw === undefined || /^\s*$/.test(raw)) return { ok: false, kind: 'empty', piece: p, field: k, error: 'Fill in every limit before checking.' };
        var parsed;
        try { parsed = parseExpr(raw); } catch (err) { return { ok: false, kind: 'syntax', piece: p, field: k, error: 'In the ' + names[k] + ': ' + err.message }; }
        if (k.indexOf('outer') === 0 && parsed.vars.length) {
          return { ok: false, kind: 'outer-variable', piece: p, field: k, error: 'The outer limits must be numbers. Once the inner integral is done, ' + ask.inner + ' is gone, and nothing is left for the outer limits to depend on.' };
        }
        if (k.indexOf('inner') === 0 && parsed.vars.indexOf(ask.inner) !== -1) {
          return { ok: false, kind: 'inner-variable', piece: p, field: k, error: 'The inner limits can depend on ' + ask.outer + ', but not on ' + ask.inner + ': ' + ask.inner + ' is the variable being integrated there.' };
        }
        piece[k] = parsed.fn;
      }
      out.push(piece);
    }
    return { ok: true, pieces: out };
  }
  function memberFn(pieces, ask) {
    return function (x, y) {
      var e = { x: x, y: y }, o = e[ask.outer], inner = e[ask.inner];
      for (var p = 0; p < pieces.length; p++) {
        var q = pieces[p];
        if (o > q.outerLo(e) && o < q.outerHi(e) && inner > q.innerLo(e) && inner < q.innerHi(e)) return true;
      }
      return false;
    };
  }
  // Brute-force comparison on an offset grid (WP-8). Fractions are relative to the target region's sample count.
  function compare(targetInside, learnerInside, win) {
    var NX = 151, NY = 101, target = 0, missing = 0, extra = 0;
    var x0 = win.x[0] - 0.5, x1 = win.x[1] + 0.5, y0 = win.y[0] - 0.5, y1 = win.y[1] + 0.5;
    for (var i = 0; i < NX; i++) for (var j = 0; j < NY; j++) {
      var x = x0 + (i + 0.3719) / NX * (x1 - x0), y = y0 + (j + 0.6137) / NY * (y1 - y0);
      var a = targetInside(x, y), b = learnerInside(x, y);
      if (a) target++;
      if (a && !b) missing++;
      if (!a && b) extra++;
    }
    return { target: target, missing: missing / target, extra: extra / target, match: missing === 0 && extra === 0 };
  }
  // A sum of integrals equals the integral over the region, for every integrand, exactly when each point of the
  // region is counted once and every other point zero times, counting a reversed pair of limits as \u22121.
  // So the check reads every entered piece along each outer slice and adds up its signed coverage of the inner line.
  // On each sampled slice this is exact interval arithmetic; slices are sampled across the target's outer range and
  // every entered piece's outer range, plus points beside each endpoint and each known corner.
  function sliceCoverage(c, pieces, o) {
    var env = {}, segs = [], ends = [];
    env[c.ask.outer] = o;
    var r = c.slice.range;
    if (o > r[0] && o < r[1]) {
      var e0 = c.slice.enter(o), e1 = c.slice.exit(o);
      if (e1 > e0) { segs.push([e0, e1, 0, 1]); ends.push(e0, e1); }
    }
    for (var p = 0; p < pieces.length; p++) {
      var q = pieces[p], a = q.outerLo({}), b = q.outerHi({}), so = 0;
      if (o > a && o < b) so = 1; else if (o > b && o < a) so = -1;
      if (!so) continue;
      var lo = q.innerLo(env), hi = q.innerHi(env);
      if (!isFinite(lo) || !isFinite(hi)) return { undefinedAt: o };
      if (hi > lo) { segs.push([lo, hi, so, 0]); ends.push(lo, hi); }
      else if (lo > hi) { segs.push([hi, lo, -so, 0]); ends.push(lo, hi); }
    }
    ends.sort(function (u, v) { return u - v; });
    var out = { missing: 0, extra: 0, double: 0, negative: 0, target: 0 };
    for (var k = 0; k + 1 < ends.length; k++) {
      var u = ends[k], v = ends[k + 1], len = v - u;
      if (!(len > 1e-12)) continue;
      var mid = (u + v) / 2, m = 0, t = 0;
      for (var s2 = 0; s2 < segs.length; s2++) {
        if (mid > segs[s2][0] && mid < segs[s2][1]) { m += segs[s2][2]; t += segs[s2][3]; }
      }
      out.target += t * len;
      if (m === t) continue;
      if (m < 0) out.negative += len;
      else if (m > t) { if (t === 1) out.double += len; else out.extra += len; }
      else out.missing += len;
    }
    return out;
  }
  function outerSamples(c, pieces) {
    var lo = c.slice.range[0], hi = c.slice.range[1], marks = [lo, hi].concat(c.breaks || []);
    pieces.forEach(function (q) { var a = q.outerLo({}), b = q.outerHi({}); marks.push(a, b); lo = Math.min(lo, a, b); hi = Math.max(hi, a, b); });
    var pts = [], N = 600;
    for (var k = 0; k < N; k++) pts.push(lo + (k + 0.5) / N * (hi - lo));
    marks.forEach(function (b) { [b - 1e-6, b + 1e-6].forEach(function (v) { if (v > lo && v < hi) pts.push(v); }); });
    return pts;
  }
  function check(caseId, rawPieces) {
    var c = CASES[caseId], read = readPieces(rawPieces, c.ask);
    if (!read.ok) return read;
    for (var p = 0; p < read.pieces.length; p++) {
      var q = read.pieces[p], a = q.outerLo({}), b = q.outerHi({});
      if (!isFinite(a) || !isFinite(b)) return { ok: false, kind: 'outer-undefined', piece: p, field: isFinite(a) ? 'outerHi' : 'outerLo', error: 'An outer limit has no value. Outer limits must be numbers.' };
    }
    var tot = { missing: 0, extra: 0, double: 0, negative: 0, target: 0 }, pts = outerSamples(c, read.pieces);
    for (var k = 0; k < pts.length; k++) {
      var r = sliceCoverage(c, read.pieces, pts[k]);
      if (r.undefinedAt !== undefined) return { ok: false, kind: 'inner-undefined', error: 'One of your inner limits has no value on some slices (for example, a division by zero).' };
      for (var key in tot) tot[key] += r[key];
    }
    var T = tot.target || 1, eps = 1e-9 * pts.length;
    var res = { ok: true, pieces: read.pieces, missing: tot.missing / T, extra: tot.extra / T, double: tot.double / T, negative: tot.negative / T };
    res.match = tot.missing < eps && tot.extra < eps && tot.double < eps && tot.negative < eps;
    if (res.match) res.message = 'These limits describe the region: each point of it is counted once.';
    else if (tot.negative >= eps) res.message = 'On some slices a lower limit is above its upper limit, so that part counts negatively. Check the order of each pair of limits.';
    else if (tot.double >= eps) res.message = 'Part of the region is counted more than once: your integrals overlap there. The dotted outlines show what each one covers.';
    else if (tot.missing >= T - eps && tot.extra < eps) res.message = 'These limits describe no part of the region.';
    else if (tot.extra >= eps && tot.missing < eps) res.message = 'Your limits cover the whole region, and also part of the plane outside it. The dotted outline shows what they describe.';
    else if (tot.missing >= eps && tot.extra < eps) res.message = 'Your limits stay inside the region but leave part of it out. The dotted outline shows what they describe.';
    else res.message = 'Your limits describe a different region, shown by the dotted outline. Compare where its edges fall with the edges of the shaded region.';
    return res;
  }
  // Polygons (world coordinates) of the region the learner's limits describe, for the overlay.
  function outlines(pieces, ask, win) {
    var polys = [], N = 60, clampLo = Math.min(win.x[0], win.y[0]) - 1, clampHi = Math.max(win.x[1], win.y[1]) + 1;
    function clamp(v) { return Math.max(clampLo, Math.min(clampHi, v)); }
    pieces.forEach(function (q) {
      var e = {}, a = q.outerLo(e), b = q.outerHi(e);
      if (!(isFinite(a) && isFinite(b)) || a === b) return;
      if (b < a) { var sw = a; a = b; b = sw; }
      var lower = [], upper = [];
      function flush() {
        if (lower.length > 1) polys.push(lower.concat(upper.slice().reverse()));
        lower = []; upper = [];
      }
      for (var k = 0; k <= N; k++) {
        var o = a + (b - a) * k / N, env = {}; env[ask.outer] = o;
        var lo = q.innerLo(env), hi = q.innerHi(env);
        if (!(isFinite(lo) && isFinite(hi)) || lo === hi) { flush(); continue; }
        if (lo > hi) { var t2 = lo; lo = hi; hi = t2; }
        lo = clamp(lo); hi = clamp(hi);
        if (ask.outer === 'x') { lower.push([clamp(o), lo]); upper.push([clamp(o), hi]); }
        else { lower.push([lo, clamp(o)]); upper.push([hi, clamp(o)]); }
      }
      flush();
    });
    return polys;
  }

  root.BoundsModel = { parseExpr: parseExpr, CASES: CASES, GRADED_REGIONS: GRADED_REGIONS, readPieces: readPieces, memberFn: memberFn, compare: compare, check: check, sliceCoverage: sliceCoverage, outlines: outlines };
})(typeof window !== 'undefined' ? window : globalThis);
