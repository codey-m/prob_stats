/* Limits: content and checks (no DOM). Catalog topic R11.
   Seams: integrals to infinity belong to density-integrals; a function with no maximum is noted in max-min. */
(function (root) {
  'use strict';
  var fA = function (n) { return (2 * n * n + 3 * n) / (5 * n * n - 1); };   // → 2/5
  var fC = function (n) { return (4 * n * n * n - n) / (2 * n * n * n + 7 * n * n); };  // → 2
  function settle(f, lim) {
    return function (v) {
      if (Math.abs(v - lim) < 1e-9) return '';
      var far = f(1e7);
      return far < v ? 'Far along the sequence the values settle below your value.' : 'Far along the sequence the values settle above your value.';
    };
  }
  var N = [2, 5, 11, 40, 130, 900].map(function (v) { return { n: v }; });
  var A = {
    kind: 'number', answer: 2 / 5, decimals: 4,
    good: 'Right. Top and bottom both grow like n², and the ratio of their leading coefficients is what remains.',
    consequence: settle(fA, 2 / 5),
    slips: [
      { value: 0, msg: 'Top and bottom both grow. Compare how fast: their leading terms are both multiples of n².' },
      { value: 2, msg: 'The bottom grows too. Its leading coefficient matters as much as the top’s.' },
      { value: 5 / 2, msg: 'This is upside down: the top’s leading coefficient goes on top.' },
      { value: 3, msg: '3n grows more slowly than 2n². The n² terms decide the limit.' },
      { value: -3, msg: 'The lower-order terms 3n and −1 shrink in comparison as n grows. The n² terms decide.' }
    ]
  };
  var C = {
    kind: 'number', answer: 2, decimals: 4,
    good: 'Right. The n³ terms dominate top and bottom, leaving 4/2.',
    consequence: settle(fC, 2),
    slips: [
      { value: 4, msg: 'The bottom grows like 2n³. Divide by its leading coefficient too.' },
      { value: 1 / 2, msg: 'This is upside down: the top’s leading coefficient goes on top.' },
      { value: 0, msg: 'Top and bottom both grow like n³, so neither wins outright.' },
      { value: -1 / 7, msg: 'The lower-order terms −n and 7n² shrink in comparison as n grows. The n³ terms decide.' }
    ]
  };
  var ladder = [
    { kind: 'expr', vars: ['n'], samples: N, target: function (e) { return 2 + 3 / e.n; },
      miss: 'Divide each term of the top by n².', slips: [{ fn: function (e) { return 2 + 3 * e.n; }, msg: '3n divided by n² is 3/n.' }] },
    { kind: 'expr', vars: ['n'], samples: N, target: function (e) { return 5 - 1 / (e.n * e.n); },
      miss: 'Divide each term of the bottom by n².', slips: [{ fn: function (e) { return 5 - 1 / e.n; }, msg: '1 divided by n² is 1/n².' }] },
    { kind: 'number', answer: 0, decimals: 4, miss: 'As n grows, a fixed number divided by n gets as small as you like.' },
    { kind: 'number', answer: 2 / 5, decimals: 4, miss: 'With 3/n and 1/n² gone, what is left of the top and the bottom?',
      slips: [{ value: 5 / 2, msg: 'Top over bottom: 2 over 5.' }] }
  ];
  var X = {
    X1: { kind: 'number', answer: 0, decimals: 4, good: 'Right. e^x grows faster than any power of x, so the ratio x³/e^x shrinks to 0.',
          miss: 'Write it as x³/eˣ. Which grows faster as x grows: a power of x, or eˣ?',
          slips: [{ value: 1, msg: 'Neither factor settles at 1. Write it as x³/eˣ and compare how fast each grows.' }] },
    X2: { kind: 'choice', answer: 'grows', good: 'Right. (n + 1)/√n = √n + 1/√n, and √n grows without bound.',
          msgs: { zero: 'The top grows like n and the bottom like √n, so the top grows faster.', one: 'The top and bottom do not grow at the same rate: n against √n.' } }
  };
  var HINTS = [
    'Find the fastest-growing term on the top and on the bottom. Here both are multiples of n².',
    'Divide every term, top and bottom, by n². Terms like 3/n and 1/n² shrink to 0 as n grows.',
    'What is left is the ratio of the leading coefficients.'
  ];
  var STEPS = [
    'Both the top and the bottom grow without bound, so look at how fast. Their fastest-growing terms are <span class="math">2<i>n</i>²</span> and <span class="math">5<i>n</i>²</span>.',
    'Divide every term by <span class="math"><i>n</i>²</span>: <span class="math">(2 + 3/<i>n</i>)/(5 − 1/<i>n</i>²)</span>. This does not change the value of the fraction.',
    'As <span class="math"><i>n</i> → ∞</span>, <span class="math">3/<i>n</i> → 0</span> and <span class="math">1/<i>n</i>² → 0</span>.',
    'So the limit is <span class="math">2/5</span>.'
  ];
  root.LimitsModel = { A: A, C: C, ladder: ladder, fill: 3, X: X, hints: HINTS, steps: STEPS, fA: fA, fC: fC };
})(typeof window !== 'undefined' ? window : globalThis);
