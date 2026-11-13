/* Limits: page behaviour. The value table is support: it sits inside the reminder. */
(function () {
  'use strict';
  var K = window.RefresherKit, M = window.LimitsModel;
  var body = document.querySelector('#table-A tbody');
  [10, 100, 1000, 10000].forEach(function (n) {
    var tr = document.createElement('tr');
    tr.appendChild(K.el('td', {}, n.toLocaleString('en-US')));
    tr.appendChild(K.el('td', {}, M.fA(n).toFixed(5)));
    body.appendChild(tr);
  });
  K.wire(M);
})();
