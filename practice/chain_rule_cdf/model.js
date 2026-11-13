/* Chain rule, PSDA copy: content and checks (no DOM). Catalog topic R3, for differentiating a CDF of a transformed variable.
   The DL copy (gradient-paths) uses a computation graph instead. */
(function (root) {
  'use strict';
  var Y = [0.3, 0.55, 0.8, 1.05, 1.3, 1.6].map(function (v) { return { y: v, t: v, u: v, x: v }; });
  var FA = function (y) { return 1 - Math.exp(-y * y * y); };
  var dFA = function (y) { return 3 * y * y * Math.exp(-y * y * y); };
  var FC = function (t) { return Math.pow(1 + t * t, 3); };
  var dFC = function (t) { return 6 * t * Math.pow(1 + t * t, 2); };
  // What a learner's derivative does: compare it with the curve's slope at one point, by finite difference.
  function slope(F, at, label) {
    return function (fn) {
      var v = fn({ y: at, t: at, x: at }), s = (F(at + 1e-6) - F(at - 1e-6)) / 2e-6;
      if (!isFinite(v)) return 'Your expression has no value at ' + label + ' = ' + at + '.';
      if (Math.abs(v - s) < 1e-6 * Math.max(1, Math.abs(s))) return 'At ' + label + ' = ' + at + ' your expression matches the slope, but not everywhere else.';
      return 'At ' + label + ' = ' + at + ' your expression gives ' + (v > s ? 'more' : 'less') + ' than the slope of the curve there.';
    };
  }
  var A = {
    kind: 'expr', vars: ['y'], samples: Y, target: function (e) { return dFA(e.y); },
    good: 'Right. The outer derivative e^(−u), evaluated at u = y³, times the inner derivative 3y².',
    consequence: slope(FA, 1, 'y'),
    slips: [
      { fn: function (e) { return Math.exp(-Math.pow(e.y, 3)); }, msg: 'This is the outer derivative alone. Multiply by the derivative of the inner function y³.' },
      { fn: function (e) { return -dFA(e.y); }, msg: 'Check the sign: the derivative of −e^(−u) with respect to u is +e^(−u).' },
      { fn: function (e) { return 3 * e.y * e.y * Math.exp(-3 * e.y * e.y); }, msg: 'Evaluate the outer derivative at the inner function y³, not at the inner derivative.' },
      { fn: function (e) { return 3 * e.y * Math.exp(-Math.pow(e.y, 3)); }, msg: 'The derivative of y³ is 3y².' },
      { fn: function (e) { return -Math.exp(-Math.pow(e.y, 3)); }, msg: 'Two things: the outer derivative of −e^(−u) is +e^(−u), and it is multiplied by the derivative of y³.' }
    ]
  };
  var C = {
    kind: 'expr', vars: ['t'], samples: Y, target: function (e) { return dFC(e.t); },
    good: 'Right. The outer derivative 3u², evaluated at u = 1 + t², times the inner derivative 2t.',
    consequence: slope(FC, 1, 't'),
    slips: [
      { fn: function (e) { return 3 * Math.pow(1 + e.t * e.t, 2); }, msg: 'This is the outer derivative alone. Multiply by the derivative of 1 + t².' },
      { fn: function (e) { return 2 * e.t * Math.pow(1 + e.t * e.t, 2); }, msg: 'The power 3 comes down in front: the outer derivative is 3u².' },
      { fn: function (e) { return 6 * e.t * Math.pow(1 + e.t * e.t, 3); }, msg: 'Lower the power by one: the outer derivative of u³ is 3u².' }
    ]
  };
  var ladder = [
    { kind: 'expr', vars: ['y'], samples: Y, target: function (e) { return Math.pow(e.y, 3); }, miss: 'The inner function is what the exponential is applied to, without its minus sign.' },
    { kind: 'expr', vars: ['y'], samples: Y, target: function (e) { return 3 * e.y * e.y; }, miss: 'Differentiate the inner function: the power comes down and drops by one.' },
    { kind: 'expr', vars: ['u'], samples: Y, target: function (e) { return Math.exp(-e.u); }, miss: 'Differentiate 1 − e^(−u) with respect to u. The 1 has derivative 0.',
      slips: [{ fn: function (e) { return -Math.exp(-e.u); }, msg: 'd/du e^(−u) = −e^(−u), and there is a minus sign in front, so the two cancel.' }] },
    { kind: 'expr', vars: ['y'], samples: Y, target: function (e) { return dFA(e.y); }, miss: 'Multiply line 3, with y³ put in for u, by line 2.' }
  ];
  var X = {
    X1: { kind: 'choice', answer: 'right', good: 'Right. d/dy F(y³) = F′(y³) · 3y² = f(y³) · 3y².',
          msgs: { outer: 'This is the outer derivative alone. Multiply by the derivative of y³.', cdf: 'Differentiating F gives f. Only the inner derivative 3y² multiplies it.', swap: 'Evaluate f at the inner function y³, not at its derivative.' } },
    X2: { kind: 'choice', answer: 'neg', good: 'Right. The inner function 2 − y has derivative −1, so d/dy F(2 − y) = −f(2 − y).',
          msgs: { pos: 'The inner function 2 − y decreases as y grows: its derivative is −1.', cdf: 'Differentiating F gives f; F itself does not appear.' } },
    X3: { kind: 'expr', vars: ['x'], samples: Y, target: function (e) { return (2 * e.x - e.x * e.x) * Math.exp(-e.x); },
          good: 'Right. Product rule: (x²)′e^(−x) + x²(e^(−x))′ = 2x e^(−x) − x² e^(−x).',
          miss: 'Use the product rule: (fg)′ = f′g + fg′.',
          slips: [{ fn: function (e) { return -2 * e.x * Math.exp(-e.x); }, msg: 'This multiplies the two derivatives. The product rule adds two terms: f′g + fg′.' },
                  { fn: function (e) { return 2 * e.x * Math.exp(-e.x); }, msg: 'This is only the first term, f′g. Add fg′ as well.' }] }
  };
  var HINTS = [
    'Write the function as an outer function applied to an inner one: 1 − e^(−u), with u = y³.',
    'Differentiate the outer function with respect to u, then put y³ back in for u.',
    'Multiply by the derivative of the inner function, 3y².'
  ];
  var STEPS = [
    'Name the inner function: <span class="math"><i>u</i> = <i>y</i>³</span>, so the function is <span class="math">1 − <i>e</i><sup>−<i>u</i></sup></span>.',
    'Outer derivative: <span class="math">d/d<i>u</i> (1 − <i>e</i><sup>−<i>u</i></sup>) = <i>e</i><sup>−<i>u</i></sup></span>. Put the inner function back: <span class="math"><i>e</i><sup>−<i>y</i>³</sup></span>.',
    'Inner derivative: <span class="math">d<i>u</i>/d<i>y</i> = 3<i>y</i>²</span>.',
    'Multiply: <span class="math">d/d<i>y</i> [1 − <i>e</i><sup>−<i>y</i>³</sup>] = 3<i>y</i>² <i>e</i><sup>−<i>y</i>³</sup></span>.'
  ];
  root.ChainCdfModel = { A: A, C: C, ladder: ladder, fill: 3, X: X, hints: HINTS, steps: STEPS, FA: FA, dFA: dFA, FC: FC, dFC: dFC };
})(typeof window !== 'undefined' ? window : globalThis);
