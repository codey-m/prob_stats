/* Finding a maximum or minimum: page behaviour. The plot is support: it sits inside the reminder. */
(function () {
  'use strict';
  var K = window.RefresherKit, M = window.MaxMinModel, $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, text) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; return e; }
  var X0 = 40, X1 = 500, Y0 = 190, Y1 = 20, TMAX = 10, GMAX = 2;
  var px = function (t) { return X0 + t / TMAX * (X1 - X0); }, py = function (v) { return Y0 - v / GMAX * (Y0 - Y1); };
  function draw() {
    var svg = $('plot-A'); svg.textContent = '';
    svg.appendChild(s('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, class: 'axis' }));
    svg.appendChild(s('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, class: 'axis' }));
    // Text is sized in viewBox units so it stays at least 12 px when the figure scales down to a phone width.
    var F = 'font-size:22px';
    [0, 2, 4, 6, 8, 10].forEach(function (t) { svg.appendChild(s('text', { x: px(t), y: Y0 + 26, 'text-anchor': 'middle', style: F }, String(t))); });
    svg.appendChild(s('text', { x: X1, y: Y0 - 10, 'text-anchor': 'end', style: F }, 'θ'));
    svg.appendChild(s('text', { x: X0 + 8, y: Y1 + 6, style: F }, 'g(θ)'));
    var d = ''; for (var i = 0; i <= 200; i++) { var t = TMAX * i / 200; d += (i ? 'L' : 'M') + px(t).toFixed(1) + ',' + py(M.g(t)).toFixed(1); }
    svg.appendChild(s('path', { d: d, class: 'curve' }));
    var r = K.number(K.normalize($('entry-A').querySelector('input').value)), note = $('plot-A-learner');
    if (r.ok && r.value > 0 && r.value <= TMAX) {
      svg.appendChild(s('line', { x1: px(r.value), y1: Y0, x2: px(r.value), y2: py(M.g(r.value)), class: 'marker' }));
      svg.appendChild(s('circle', { cx: px(r.value), cy: py(M.g(r.value)), r: 6, class: 'marker-dot' }));
      note.textContent = 'Your answer θ = ' + K.fmt(r.value) + ' is marked: there the graph is ' + (M.dlng(r.value) > 0 ? 'still rising.' : (Math.abs(M.dlng(r.value)) < 1e-6 ? 'at its peak.' : 'already falling.'));
    } else note.textContent = 'Enter an answer in the task above to mark it on the graph.';
  }
  K.wire(M, { open: draw, checkA: draw });
  $('entry-A').addEventListener('input', function () { if (!$('recovery-A').hidden) draw(); });
})();
