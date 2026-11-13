/* Integration-bounds refresher: page behaviour. Logic lives in model.js. */
(function () {
  'use strict';
  var M = window.BoundsModel, NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  // recovery: reminder, hint or explanation opened on case A.  quick: A solved before any of that.
  var state = { recovery: false, aDone: false, quick: false, cDone: false, cSlice: false, bDone: false, bHelped: false, explained: false, hints: 0 };
  window.__refresherState = state; // read by the browser tests only

  var HINTS_A = [
    'Integrating over x first means holding y fixed. That is a horizontal slice. Move the slice above the limits and watch where it enters the region and where it leaves.',
    'The slice enters through the same edge every time, and leaves through the same edge every time. Find each edge’s equation on the figure. The inner variable is x, so solve each one for x.',
    'The outer limits are the lowest and the highest y at which a slice still crosses the region. They are numbers.'
  ];

  function svg(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function html(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function fmt(v) { var s = (Math.round(v * 100) / 100).toFixed(2); return s.replace(/\.?0+$/, '') || '0'; }

  // ---- Figure: region, axes, edge labels, learner overlay, slice.
  function Figure(c, mount) {
    var W = 360, H = 216, wx = c.window.x, wy = c.window.y;
    function X(x) { return (x - wx[0]) / (wx[1] - wx[0]) * W; }
    function Y(y) { return H - (y - wy[0]) / (wy[1] - wy[0]) * H; }
    var id = 'fig' + c.id;
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-labelledby': id + '-desc' });
    var defs = svg('defs', {});
    var hatch = svg('pattern', { id: id + '-hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    hatch.appendChild(svg('rect', { width: 8, height: 8, fill: '#d6ecee' }));
    hatch.appendChild(svg('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: '#0b6e75', 'stroke-width': 1.6 }));
    var dots = svg('pattern', { id: id + '-dots', width: 7, height: 7, patternUnits: 'userSpaceOnUse' });
    dots.appendChild(svg('circle', { cx: 3.5, cy: 3.5, r: 1.3, fill: '#9a4a00' }));
    var clip = svg('clipPath', { id: id + '-clip' });
    clip.appendChild(svg('rect', { x: 0, y: 0, width: W, height: H }));
    defs.appendChild(hatch); defs.appendChild(dots); defs.appendChild(clip);
    root.appendChild(defs);
    var axis = { stroke: '#33464c', 'stroke-width': 1.2 };
    root.appendChild(svg('line', Object.assign({ x1: X(wx[0]), y1: Y(0), x2: X(wx[1]), y2: Y(0) }, axis)));
    root.appendChild(svg('line', Object.assign({ x1: X(0), y1: Y(wy[0]), x2: X(0), y2: Y(wy[1]) }, axis)));
    [1, 2].forEach(function (t) {
      root.appendChild(svg('line', Object.assign({ x1: X(t), y1: Y(0) - 4, x2: X(t), y2: Y(0) + 4 }, axis)));
      root.appendChild(svg('text', { x: X(t), y: Y(0) + 18, 'text-anchor': 'middle', class: 'tick' }, String(t)));
    });
    root.appendChild(svg('line', Object.assign({ x1: X(0) - 4, y1: Y(1), x2: X(0) + 4, y2: Y(1) }, axis)));
    root.appendChild(svg('text', { x: X(0) - 8, y: Y(1) + 5, 'text-anchor': 'end', class: 'tick' }, '1'));
    root.appendChild(svg('text', { x: X(0) - 8, y: Y(0) + 18, 'text-anchor': 'end', class: 'tick' }, '0'));
    root.appendChild(svg('text', { x: X(wx[1]) - 6, y: Y(0) - 8, 'text-anchor': 'end', class: 'axisname' }, 'x'));
    root.appendChild(svg('text', { x: X(0) + 8, y: Y(wy[1]) + 14, class: 'axisname' }, 'y'));
    root.appendChild(svg('polygon', { points: c.vertices.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' '), fill: 'url(#' + id + '-hatch)', stroke: '#084f55', 'stroke-width': 2, class: 'region' }));
    var learner = svg('g', { class: 'learner', 'clip-path': 'url(#' + id + '-clip)' });
    root.appendChild(learner);
    c.edges.forEach(function (e) {
      root.appendChild(svg('text', { x: X(e.at[0]), y: Y(e.at[1]), 'text-anchor': e.anchor, class: 'edge' }, e.label));
    });
    var slice = svg('g', { class: 'slice' });
    root.appendChild(slice);
    var style = svg('style', {});
    style.textContent = 'text{font:14px system-ui,-apple-system,"Segoe UI",sans-serif;fill:#16242a}.tick{font-size:13px;fill:#33464c}.axisname{font-style:italic;font-size:15px}.edge{font-size:14px;font-weight:600;paint-order:stroke;stroke:#fff;stroke-width:3px}';
    root.appendChild(style);
    mount.appendChild(root);
    var desc = html('p', { id: id + '-desc', class: 'figdesc' }, 'Figure: ' + c.describe);
    mount.parentNode.insertBefore(desc, mount.nextSibling);
    var legend = html('p', { class: 'legend', hidden: '' }, 'Striped: the region. Dotted outline: the region your limits describe.');
    mount.parentNode.insertBefore(legend, desc.nextSibling);
    return {
      setLearner: function (polys) {
        while (learner.firstChild) learner.removeChild(learner.firstChild);
        legend.hidden = !polys || !polys.length;
        (polys || []).forEach(function (poly) {
          learner.appendChild(svg('polygon', { points: poly.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' '), fill: 'url(#' + id + '-dots)', 'fill-opacity': 0.75, stroke: '#9a4a00', 'stroke-width': 2.5, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round' }));
        });
      },
      setSlice: function (t) {
        while (slice.firstChild) slice.removeChild(slice.firstChild);
        if (t === null) return;
        var a = c.slice.enter(t), b = c.slice.exit(t), horiz = c.ask.inner === 'x';
        var p = horiz ? { x1: X(wx[0]), y1: Y(t), x2: X(wx[1]), y2: Y(t) } : { x1: X(t), y1: Y(wy[0]), x2: X(t), y2: Y(wy[1]) };
        slice.appendChild(svg('line', Object.assign({ stroke: '#5b6b70', 'stroke-width': 1, 'stroke-dasharray': '4 3' }, p)));
        var A = horiz ? [X(a), Y(t)] : [X(t), Y(a)], B = horiz ? [X(b), Y(t)] : [X(t), Y(b)];
        slice.appendChild(svg('line', { x1: A[0], y1: A[1], x2: B[0], y2: B[1], stroke: '#16242a', 'stroke-width': 4 }));
        slice.appendChild(svg('circle', { cx: A[0], cy: A[1], r: 6, fill: '#fff', stroke: '#16242a', 'stroke-width': 2.5 }));
        slice.appendChild(svg('rect', { x: B[0] - 6, y: B[1] - 6, width: 12, height: 12, fill: '#16242a' }));
      }
    };
  }

  // ---- Entry laid out as the notation.
  function integral(c, pieceIndex, count) {
    var o = c.ask.outer, i = c.ask.inner, suffix = count > 1 ? ', integral ' + (pieceIndex + 1) + ' of ' + count : '';
    var wrap = html('span', { class: 'integral', role: 'group', 'aria-label': 'Double integral of f of x and y, d' + i + ' d' + o + suffix });
    function one(which, v) {
      var box = html('span', { class: 'int' });
      function field(end) {
        return html('input', { class: 'lim', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'data-piece': pieceIndex, 'data-lim': which + end, 'aria-label': (which === 'outer' ? 'Outer integral (left sign)' : 'Inner integral (right sign)') + ', ' + (end === 'Hi' ? 'upper' : 'lower') + ' limit' + suffix });
      }
      box.appendChild(field('Hi')); box.appendChild(html('span', { class: 'sign', 'aria-hidden': 'true' }, '∫')); box.appendChild(field('Lo'));
      return box;
    }
    wrap.appendChild(one('outer', o)); wrap.appendChild(one('inner', i));
    var body = html('span', { class: 'integrand', 'aria-hidden': 'true' });
    body.innerHTML = '<i>f</i>(<i>x</i>, <i>y</i>) d<i>' + i + '</i> d<i>' + o + '</i>';
    wrap.appendChild(body);
    return wrap;
  }
  function buildEntry(c, count) {
    var mount = $('entry-' + c.id);
    mount.textContent = '';
    for (var p = 0; p < count; p++) {
      var g = integral(c, p, count);
      // The plus travels with the integral it introduces, so a wrapped sum never ends a line with "+".
      if (p) g.insertBefore(html('span', { class: 'plus', 'aria-hidden': 'true' }, '+'), g.firstChild);
      mount.appendChild(g);
    }
  }
  function readEntry(id) {
    var pieces = [];
    $('entry-' + id).querySelectorAll('input.lim').forEach(function (inp) {
      var p = +inp.getAttribute('data-piece');
      pieces[p] = pieces[p] || {};
      pieces[p][inp.getAttribute('data-lim')] = inp.value;
    });
    return pieces;
  }
  function clearResult(id) {
    var f = $('feedback-' + id);
    f.textContent = ''; f.className = 'feedback';
    figs[id].setLearner(null);
    $('entry-' + id).querySelectorAll('input.lim').forEach(function (inp) { inp.removeAttribute('aria-invalid'); });
  }
  function showResult(id, res) {
    var f = $('feedback-' + id);
    clearResult(id);
    if (!res.ok) {
      f.textContent = res.error; f.className = 'feedback miss';
      if (res.field) {
        var bad = $('entry-' + id).querySelector('input[data-piece="' + res.piece + '"][data-lim="' + res.field + '"]');
        if (bad && res.kind !== 'empty') bad.setAttribute('aria-invalid', 'true');
      }
      return false;
    }
    f.textContent = res.message; f.className = 'feedback ' + (res.match ? 'good' : 'miss');
    if (!res.match) figs[id].setLearner(M.outlines(res.pieces, M.CASES[id].ask, M.CASES[id].window));
    return res.match;
  }

  // ---- Slice controls.
  function wireSlice(id) {
    var c = M.CASES[id], range = $('slice-' + id), v = c.ask.outer, w = c.ask.inner;
    function text(t) {
      var a = c.slice.enter(t), b = c.slice.exit(t);
      if (b - a < 1e-9) return 'At ' + v + ' = ' + fmt(t) + ', the slice only touches a corner of the region.';
      return 'At ' + v + ' = ' + fmt(t) + ', the slice enters the region at ' + w + ' = ' + fmt(a) + ' (circle) and leaves at ' + w + ' = ' + fmt(b) + ' (square).';
    }
    function draw() {
      var t = parseFloat(range.value);
      $('slice-' + id + '-val').textContent = t.toFixed(2);
      $('slice-' + id + '-read').textContent = text(t);
      figs[id].setSlice(t);
    }
    range.addEventListener('input', draw);
    range.addEventListener('change', function () { $('slice-' + id + '-status').textContent = text(parseFloat(range.value)); });
    return function () { $('slicebox-' + id).hidden = false; draw(); range.focus(); };
  }

  // ---- Completion: recomputed from state every time anything changes.
  function complete() { return (state.aDone && state.quick) || state.cDone; }
  function render() {
    var p = $('progress'), done = complete();
    if (done && state.cDone) p.textContent = state.cSlice ? 'Done. You set the limits for a new region, using the slice.' : 'Done. You set the limits for a new region on your own.';
    else if (done) p.textContent = 'Done. You set these limits without the reminder. The extension at the end is optional.';
    else if (state.aDone || state.explained) p.textContent = 'One step left: the next case, on your own.';
    else if (state.recovery) p.textContent = 'Reminder open. Finish this case, then do one more on your own.';
    else p.textContent = 'Start with the task below. If you get it right, you are done.';
    // Once the quick route is earned, opening help afterwards is reference only: no new requirement appears.
    $('case-C').hidden = !(state.recovery && (state.aDone || state.explained) && !state.quick);
    $('done').hidden = !done;
    if (done) {
      $('done-text').textContent = state.cDone
        ? (state.cSlice ? 'You set these limits correctly for a region you had not seen, with the slice to help.' : 'You set these limits correctly for a region you had not seen, without the walkthrough.')
        : 'You set these limits correctly without the reminder.';
    }
    $('case-B').hidden = !done;
  }
  function invalidate(id) {
    clearResult(id);
    if (id === 'A') { state.aDone = false; state.quick = false; }
    if (id === 'C') state.cDone = false;
    if (id === 'B') state.bDone = false;
    render();
  }

  var figs = {};
  ['A', 'C', 'B'].forEach(function (id) { figs[id] = Figure(M.CASES[id], $('fig-' + id)); });
  buildEntry(M.CASES.A, 1);
  buildEntry(M.CASES.C, 1);
  // Fields widen to fit what is typed, so a limit such as min(x, 2 - x) stays readable.
  function fitField(inp) { inp.style.width = Math.max(2.6, Math.min(10, inp.value.length * 0.58 + 0.9)) + 'em'; }
  ['A', 'C', 'B'].forEach(function (id) {
    $('entry-' + id).addEventListener('input', function (ev) { if (ev.target.classList.contains('lim')) fitField(ev.target); invalidate(id); });
  });
  var showSliceA = wireSlice('A'), showSliceC = wireSlice('C'), showSliceB = wireSlice('B');

  function openRecovery() {
    state.recovery = true;
    $('recovery-A').hidden = false;
    $('remind-A').setAttribute('aria-expanded', 'true');
    $('remind-A').textContent = 'Hide the reminder';
    showSliceA();
  }
  $('check-A').addEventListener('click', function () {
    var ok = showResult('A', M.check('A', readEntry('A')));
    state.aDone = ok;
    state.quick = ok && !state.recovery;
    if (ok && state.recovery) {
      // Collapse the finished walkthrough so attention moves to the next case.
      $('recovery-A').hidden = true; $('slicebox-A').hidden = true; figs.A.setSlice(null);
      $('remind-A').setAttribute('aria-expanded', 'false');
      $('remind-A').textContent = 'Show the reminder again';
    }
    render();
    if (ok && state.recovery) $('hC').setAttribute('tabindex', '-1'), $('hC').focus();
  });
  $('remind-A').addEventListener('click', function () {
    if ($('recovery-A').hidden) { openRecovery(); render(); return; }
    $('recovery-A').hidden = true; $('slicebox-A').hidden = true; figs.A.setSlice(null);
    $('remind-A').setAttribute('aria-expanded', 'false');
    $('remind-A').textContent = 'Show the reminder again';
  });
  $('hint-A').addEventListener('click', function () {
    if (state.hints < HINTS_A.length) {
      $('hints-A').appendChild(html('li', {}, HINTS_A[state.hints++]));
      if (state.hints === HINTS_A.length) { $('hint-A').disabled = true; $('hint-A').textContent = 'No more hints'; }
    }
  });
  $('explain-A').addEventListener('toggle', function () {
    if ($('explain-A').open && !state.explained) { state.explained = true; state.recovery = true; render(); }
  });
  $('check-C').addEventListener('click', function () {
    state.cDone = showResult('C', M.check('C', readEntry('C')));
    render();
  });
  $('stuck-C').addEventListener('click', function () { state.cSlice = true; $('stuck-C').disabled = true; showSliceC(); render(); });

  // ---- Extension: two separate decisions, then the limits.
  function edgeAnswer() { var r = document.querySelector('input[name="edge-B"]:checked'); return r ? r.value : null; }
  $('edge-B').addEventListener('change', function () { invalidate('B'); });
  $('pieces-B').addEventListener('change', function (ev) {
    buildEntry(M.CASES.B, +ev.target.value);
    $('check-B').disabled = false;
    invalidate('B');
  });
  $('check-B').addEventListener('click', function () {
    var f = $('feedback-B');
    if (!edgeAnswer()) { clearResult('B'); f.textContent = 'Answer question 1 first.'; f.className = 'feedback miss'; return; }
    var ok = showResult('B', M.check('B', readEntry('B')));
    if (ok && edgeAnswer() !== 'changes') {
      ok = false;
      f.textContent = 'Your limits describe the region. Now compare them with your answer to question 1: which edge does a slice leave through on each side?';
      f.className = 'feedback miss';
    } else if (ok) {
      f.textContent = 'Right on both counts. The exit edge changes partway, and your limits handle it.' + (state.bHelped ? '' : ' You did this one without help.');
    }
    state.bDone = ok;
  });
  $('stuck-B').addEventListener('click', function () {
    state.bHelped = true;
    $('support-B').hidden = false;
    $('stuck-B').disabled = true;
    $('stuck-B').setAttribute('aria-expanded', 'true');
    showSliceB();
  });
  render();
  // Opened from a problem set's entry check after a miss: start with the reminder open (recovery route).
  if (/[?&]from=entry(&|$)/.test(location.search)) { openRecovery(); render(); }
})();
