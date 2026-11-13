/* Problem Set 2 calculus check: one task per primer, checked by that primer's own model.
   A right answer marks the piece ready. A miss shows the primer's feedback and a link that opens the primer with its reminder open. */
(function () {
  'use strict';
  var K = window.RefresherKit, $ = function (id) { return document.getElementById(id); };
  var ITEMS = {
    bounds: { check: function () {
      var piece = {};
      $('entry-bounds').querySelectorAll('input.lim').forEach(function (i) { piece[i.getAttribute('data-lim')] = i.value; });
      var r = window.BoundsModel.check('A', [piece]);
      return r.ok ? { ok: true, match: r.match, message: r.message } : { ok: false, message: r.error };
    } },
    density: { check: function () { return K.checkItem(window.DensityModel.A, field('density')); } },
    maxmin: { check: function () { return K.checkItem(window.MaxMinModel.A, field('maxmin')); } },
    limits: { check: function () { return K.checkItem(window.LimitsModel.A, field('limits')); } }
  };
  var state = {};
  function field(name) { return document.querySelector('input[data-field="' + name + '"]').value; }
  function tag(id, text, kind) { var t = $('tag-' + id); t.textContent = text; t.className = 'status-tag' + (kind ? ' ' + kind : ''); }
  function summary() {
    var ids = Object.keys(ITEMS), tried = ids.filter(function (i) { return state[i] !== undefined; }), ready = ids.filter(function (i) { return state[i] === true; });
    $('summary').textContent = !tried.length ? 'Try any task, in any order.'
      : ready.length === ids.length ? 'Ready on all four. Go on to the problem set whenever you like.'
      : 'Ready on ' + ready.length + ' of ' + ids.length + '. ' + (tried.length < ids.length ? 'Some tasks are still untried.' : 'Open a refresher for any piece that is not ready.');
  }
  Object.keys(ITEMS).forEach(function (id) {
    $('go-' + id).hidden = true;
    $('check-' + id).addEventListener('click', function () {
      var r = ITEMS[id].check();
      if (!r.ok) { K.say('feedback-' + id, r.message, 'miss'); return; }
      state[id] = !!r.match;
      if (r.match) { K.say('feedback-' + id, 'Right. You are ready for this piece; its refresher is optional.', 'good'); tag(id, 'Ready', 'good'); $('go-' + id).hidden = true; }
      else { K.say('feedback-' + id, r.message, 'miss'); tag(id, 'Worth a refresher', 'open'); $('go-' + id).hidden = false; }
      summary();
    });
    $('item-' + id).addEventListener('input', function (ev) {
      if (ev.target.classList.contains('blank') || ev.target.classList.contains('lim')) ev.target.style.width = Math.max(2.6, Math.min(10, ev.target.value.length * 0.58 + 0.9)) + 'em';
      K.say('feedback-' + id, '');
      if (state[id] === true) { delete state[id]; tag(id, 'Not tried'); summary(); }
    });
  });
  if (typeof window !== 'undefined') window.__entryState = state;
})();
