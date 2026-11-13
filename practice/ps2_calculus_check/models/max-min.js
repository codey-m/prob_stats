/* Finding a maximum or minimum: content and checks (no DOM). Catalog topic R4. */
(function (root) {
  'use strict';
  var R2 = Math.SQRT2;
  // Case A: maximize g(θ) = θ e^{−θ²/18} over θ > 0. ln g = ln θ − θ²/18; derivative 1/θ − θ/9; zero at θ = 3.
  var g = function (t) { return t * Math.exp(-t * t / 18); };
  var dlng = function (t) { return 1 / t - t / 9; };
  // Case C: maximize h(x) = x² e^{−x²/4} over x > 0. ln h = 2 ln x − x²/4; derivative 2/x − x/2; zero at x = 2.
  var h = function (x) { return x * x * Math.exp(-x * x / 4); };
  var dlnh = function (x) { return 2 / x - x / 2; };
  function side(d, v, name) {
    if (!(v > 0)) return 'Your value is not in the allowed range: ' + name + ' must be positive.';
    return d(v) > 0 ? 'At your value the function is still rising, so a larger ' + name + ' gives a larger value.'
                    : 'At your value the function is already falling, so a smaller ' + name + ' gives a larger value.';
  }
  var T = [0.5, 1, 1.7, 2.4, 3.3, 4.1, 5.6].map(function (v) { return { theta: v, x: v, t: v }; });

  var A = {
    kind: 'number', answer: 3, decimals: 3,
    good: 'Right. The derivative of ln g changes from positive to negative there, so it is the maximum.',
    consequence: function (v) { return side(dlng, v, 'θ'); },
    slips: [
      { value: Math.sqrt(18), msg: 'Check the derivative of θ²/18: it is 2θ/18 = θ/9.' },
      { value: 9, msg: 'The derivative of ln θ is 1/θ, not 1.' },
      { value: 18, msg: 'Two derivatives need another look: ln θ gives 1/θ, and θ²/18 gives θ/9.' },
      { value: -3, msg: 'θ must be positive here. Of the two solutions of θ² = 9, keep the one in the allowed range.' },
      { value: 0, msg: 'g(0) = 0, the smallest value g takes on this range.' }
    ]
  };
  var C = {
    kind: 'number', answer: 2, decimals: 3,
    good: 'Right. The derivative of ln h changes from positive to negative at x = 2.',
    consequence: function (v) { return side(dlnh, v, 'x'); },
    slips: [
      { value: Math.sqrt(8), msg: 'Check the derivative of x²/4: it is 2x/4 = x/2.' },
      { value: R2, msg: 'ln(x²) = 2 ln x. Keep the 2: its derivative is 2/x.' },
      { value: 4, msg: 'The derivative of 2 ln x is 2/x, not 2.' },
      { value: -2, msg: 'x must be positive here. Keep the solution in the allowed range.' }
    ]
  };
  // Recovery ladder for case A, laid out as the working.
  var ladder = [
    { kind: 'expr', vars: ['theta'], samples: T, target: function (e) { return Math.log(e.theta) - e.theta * e.theta / 18; },
      miss: 'ln of a product is a sum of logs, and ln(e^u) = u.',
      slips: [{ fn: function (e) { return Math.log(e.theta) * (-e.theta * e.theta / 18); }, msg: 'ln turns a product into a sum, not a product of logs.' }] },
    { kind: 'expr', vars: ['theta'], samples: T, target: function (e) { return dlng(e.theta); },
      miss: 'Differentiate each term: ln θ gives 1/θ, and θ²/18 gives 2θ/18.',
      slips: [{ fn: function (e) { return 1 / e.theta - e.theta / 18; }, msg: 'The derivative of θ²/18 is 2θ/18 = θ/9.' },
              { fn: function (e) { return 1 - e.theta / 9; }, msg: 'The derivative of ln θ is 1/θ.' }] },
    { kind: 'number', answer: 3, decimals: 3, miss: 'Set 1/θ − θ/9 = 0 and solve: θ² = 9, with θ positive.',
      slips: [{ value: -3, msg: 'θ must be positive, so keep the positive root.' }, { value: 9, msg: 'θ² = 9, so θ is the square root of 9.' }] },
    { kind: 'choice', answer: 'sign', miss: 'Look at the sign of the derivative on each side of the point.',
      msgs: { zero: 'A zero derivative also happens at a minimum or a flat point. The sign change is what shows a maximum.',
              positive: 'g(3) > 0 is true for every positive θ, so it says nothing about where the maximum is.' } }
  ];
  var X = {
    X1: { kind: 'number', answer: 2, decimals: 3,
          good: 'Right. The derivative 1/(1 + θ) − 1/4 stays positive for θ < 3, so k rises across the whole allowed range and is largest at its right end.',
          consequence: function (v) { return v < 0 || v > 2 ? 'Your value is outside the allowed range 0 ≤ θ ≤ 2.' : 'k takes a larger value elsewhere in the allowed range.'; },
          slips: [{ value: 3, msg: 'θ = 3 is where the derivative is zero, but it lies outside the allowed range. Check where k is largest within 0 ≤ θ ≤ 2.' },
                  { value: 0, msg: 'k(0) = 0 is the smallest value on this range: k rises from there.' }] },
    X2: { kind: 'number', answer: 4, decimals: 3,
          good: 'Right. r′(t) = 1 − 16/t² is negative below 4 and positive above it, so t = 4 gives the minimum.',
          consequence: function (v) { return v > 0 ? (v < 4 ? 'At your value r is still falling.' : 'At your value r is already rising.') : 'Your value is not in the allowed range: t must be positive.'; },
          slips: [{ value: 16, msg: 'Setting 1 − 16/t² = 0 gives t² = 16.' }, { value: -4, msg: 't must be positive here.' }] }
  };
  var HINTS = [
    'g is a product, so maximize ln g instead. The log is increasing, so it has its largest value at the same θ.',
    'ln g(θ) = ln θ − θ²/18. Differentiate each term.',
    'Set the derivative to zero, solve for θ, and keep the solution with θ > 0. Then check the sign of the derivative on either side.'
  ];
  var STEPS = [
    'g(θ) = θ e<sup>−θ²/18</sup> is a product, so work with ln g, which has its largest value at the same θ: <span class="math">ln g(θ) = ln θ − θ²/18</span>.',
    'Differentiate: <span class="math">d/dθ ln g(θ) = 1/θ − θ/9</span>.',
    'Set it to zero: <span class="math">1/θ = θ/9</span>, so <span class="math">θ² = 9</span>. Only <span class="math">θ = 3</span> is positive.',
    'Check: at θ = 1 the derivative is 1 − 1/9 > 0, and at θ = 6 it is 1/6 − 2/3 < 0. It changes from positive to negative, so θ = 3 is the maximum. As θ → 0 or θ → ∞, g(θ) → 0, so no end of the range does better.'
  ];
  root.MaxMinModel = { A: A, C: C, ladder: ladder, fill: 2, X: X, hints: HINTS, steps: STEPS, g: g, dlng: dlng, h: h, dlnh: dlnh };
})(typeof window !== 'undefined' ? window : globalThis);
