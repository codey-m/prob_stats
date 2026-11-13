/* Integrals of one variable: content and checks (no DOM). Catalog topic R5.
   Seam with integration-bounds (R6): that page sets limits; this one evaluates, including an inner integral with variable limits. */
(function (root) {
  'use strict';
  // Case A: f(x) = c(4 − x²) on 0 ≤ x ≤ 2. ∫ (4 − x²) dx = [4x − x³/3] from 0 to 2 = 16/3, so c = 3/16.
  // Case C: f(x) = c·x(3 − x) on 0 ≤ x ≤ 3. ∫ (3x − x²) dx = [3x²/2 − x³/3] from 0 to 3 = 9/2, so c = 2/9.
  function area(total) {
    return function (c) {
      if (!(c > 0)) return 'A density is never negative, so c must be positive.';
      var a = c * total;
      return a > 1 ? 'With your c the total area under f is more than 1.' : 'With your c the total area under f is less than 1.';
    };
  }
  var X = [0.3, 0.8, 1.3, 1.9, 2.6, 3.4].map(function (v) { return { x: v }; });
  var A = {
    kind: 'number', answer: 3 / 16, decimals: 4,
    good: 'Right. With this c the area under f from 0 to 2 is exactly 1.',
    consequence: area(16 / 3),
    slips: [
      { value: 1 / 8, msg: 'This uses the area under 4 alone. Subtract the area under x².' },
      { value: 1 / 4, msg: 'An antiderivative of x² is x³/3. Differentiating instead gives 2x.' },
      { value: 16 / 3, msg: 'This is the area itself. c has to scale the area to 1.' },
      { value: 3 / 8, msg: 'Check the antiderivative of x² at the upper limit: (2)³/3 = 8/3.' }
    ]
  };
  var C = {
    kind: 'number', answer: 2 / 9, decimals: 4,
    good: 'Right. With this c the area under f from 0 to 3 is exactly 1.',
    consequence: area(9 / 2),
    slips: [
      { value: 2 / 27, msg: 'This uses the area under 3x alone. Subtract the area under x².' },
      { value: 9 / 2, msg: 'This is the area itself. c has to scale the area to 1.' },
      { value: 1 / 9, msg: 'An antiderivative of 3x is 3x²/2. Check the factor 1/2.' }
    ]
  };
  var ladder = [
    { kind: 'expr', vars: ['x'], samples: X, target: function (e) { return 4 * e.x - Math.pow(e.x, 3) / 3; },
      miss: 'Find a function whose derivative is 4 − x². Raise each power by one and divide by the new power.',
      slips: [{ fn: function (e) { return 4 * e.x - 2 * e.x; }, msg: 'This differentiates x². Integrate it instead: x³/3.' },
              { fn: function (e) { return 4 * e.x - Math.pow(e.x, 3); }, msg: 'Divide by the new power: an antiderivative of x² is x³/3.' }] },
    { kind: 'number', answer: 16 / 3, decimals: 4, miss: 'Evaluate your antiderivative at 2, then subtract its value at 0.',
      slips: [{ value: 8, msg: 'Include the −x³/3 term when you evaluate at 2.' }] },
    { kind: 'number', answer: 3 / 16, decimals: 4, miss: 'The total area under f must be 1, so c times the area you found equals 1.',
      slips: [{ value: 16 / 3, msg: 'c times the area equals 1, so divide 1 by the area.' }] }
  ];
  var XI = {
    X1: { kind: 'number', answer: 3 / 4, decimals: 4,
          good: 'Right. E[X] = (3/16) ∫ x(4 − x²) dx from 0 to 2 = (3/16)(8 − 4) = 3/4.',
          consequence: function (v) { return v < 0 || v > 2 ? 'The mean of a density on [0, 2] lies between 0 and 2.' : ''; },
          miss: 'E[X] is the integral of x f(x). Multiply first, then integrate term by term.',
          slips: [{ value: 1, msg: 'This is the midpoint of the range. The density is larger near 0, which pulls the mean down.' },
                  { value: 3 / 16, msg: 'This is c. Integrate x f(x) to get the mean.' }] },
    X2: { kind: 'expr', vars: ['x'], samples: X, target: function (e) { return 1.5 * e.x * e.x; },
          good: 'Right. Treat x as a constant while integrating in y: [y²/2] from x to 2x = 2x² − x²/2 = 3x²/2.',
          miss: 'Integrate y with respect to y, then evaluate at the upper limit 2x and subtract the value at the lower limit x.',
          slips: [{ fn: function (e) { return 2 * e.x * e.x; }, msg: 'This uses the upper limit only. Subtract the value at y = x as well.' },
                  { fn: function (e) { return e.x; }, msg: 'This integrates 1, giving the length of the interval. The integrand here is y.' },
                  { fn: function (e) { return e.x * e.x / 2; }, msg: 'Check the upper limit: at y = 2x, y²/2 = (2x)²/2 = 2x².' }] },
    X3: { kind: 'number', answer: 1 / 2, decimals: 4,
          good: 'Right. ∫ dx/x from 1 to e² is ln(e²) − ln 1 = 2, so c = 1/2.',
          consequence: area(2),
          slips: [{ value: 2, msg: 'This is the area under 1/x. c has to scale the area to 1.' },
                  { value: 1 / (Math.exp(2) - 1), msg: 'This treats 1/x as a constant. An antiderivative of 1/x is ln x.' }] }
  };
  var HINTS = [
    'A density integrates to 1 over the range where it is positive. Here that range is 0 to 2.',
    'An antiderivative of 4 − x² is 4x − x³/3. Evaluate it at 2 and at 0, and subtract.',
    'c times the area you found must equal 1.'
  ];
  var STEPS = [
    'The total area under a density is 1: <span class="math">∫<sub>0</sub><sup>2</sup> <i>c</i>(4 − <i>x</i>²) d<i>x</i> = 1</span>. The constant <i>c</i> comes outside the integral.',
    'Find an antiderivative term by term: <span class="math">∫(4 − <i>x</i>²) d<i>x</i> = 4<i>x</i> − <i>x</i>³/3</span>. Differentiating it gives back 4 − <i>x</i>².',
    'Evaluate at the limits: <span class="math">(8 − 8/3) − (0 − 0) = 16/3</span>.',
    'So <span class="math"><i>c</i> · 16/3 = 1</span>, giving <span class="math"><i>c</i> = 3/16</span>.'
  ];
  root.DensityModel = { A: A, C: C, ladder: ladder, fill: 2, X: XI, hints: HINTS, steps: STEPS };
})(typeof window !== 'undefined' ? window : globalThis);
