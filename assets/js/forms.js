/* ==========================================================================
   BOG CLOUD — FORM PLUMBING

   Shared behaviour for every form, dialog and copyable value on the site.
   Before this existed, each of the 21 pages re-implemented the same four
   things with inline styles: showing an error, clearing an error, marking a
   field invalid, and toggling password visibility. The result was that error
   text was inserted but never announced, because none of it touched ARIA.

   Everything here is delegated from document, so a page gets the behaviour by
   including the file — no per-page wiring.

   Contract used by the stylesheet:
     alert    .alert + .alert--<kind> + .is-visible
     field    .field-input[aria-invalid] + .field-error + .is-visible
     button   [data-busy="true"]
   ========================================================================== */

(function (global) {
  'use strict';

  var BOG = global.BOG || {};
  global.BOG = BOG;

  /* ------------------------------------------------------------- alerts -- */

  /* The single place error and success text enters the DOM. Every call site
     used to set textContent and style.display by hand; because none of them
     touched aria-live, a screen reader stayed silent on a failed sign-in. */
  BOG.alert = function (el, message, kind) {
    if (!el) return;
    if (!message) { BOG.clearAlert(el); return; }
    el.textContent = message;
    el.className = 'alert alert--' + (kind || 'error') + ' is-visible';
    el.setAttribute('role', kind === 'success' ? 'status' : 'alert');
    if (kind === 'error') el.setAttribute('aria-live', 'assertive');
    else el.setAttribute('aria-live', 'polite');
  };

  BOG.clearAlert = function (el) {
    if (!el) return;
    el.textContent = '';
    el.className = 'alert';
    el.removeAttribute('role');
    el.removeAttribute('aria-live');
  };

  /* ------------------------------------------------------- field errors -- */

  /* Marks the input invalid and writes the message into the .field-error that
     its aria-describedby points at, so the message is announced with the field
     rather than only appearing next to it. */
  BOG.setFieldError = function (input, message) {
    if (!input) return;
    var describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/);
    var msgEl = null;
    for (var i = 0; i < describedBy.length; i++) {
      var candidate = document.getElementById(describedBy[i]);
      if (candidate && candidate.classList.contains('field-error')) { msgEl = candidate; break; }
    }
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (msgEl) { msgEl.textContent = message; msgEl.classList.add('is-visible'); }
    } else {
      input.removeAttribute('aria-invalid');
      if (msgEl) { msgEl.textContent = ''; msgEl.classList.remove('is-visible'); }
    }
  };

  /* Clearing the field clears its error, so the form does not accuse the user
     of something they have already corrected. */
  function clearErrorOnInput(e) {
    var t = e.target;
    if (t && t.matches && t.matches('[aria-invalid="true"]')) BOG.setFieldError(t, '');
  }

  /* ------------------------------------------------------- password show -- */

  function wireReveal(e) {
    var btn = e.target.closest('[data-reveal]');
    if (!btn) return;
    var input = document.getElementById(btn.getAttribute('data-reveal'));
    if (!input) return;
    var shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    var label = shown ? 'Show password' : 'Hide password';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    /* The caret must not jump to the start when the type flips. */
    var at = input.selectionStart;
    input.focus();
    try { input.setSelectionRange(at, at); } catch (err) {}
  }

  /* --------------------------------------------------------- busy button -- */

  /* Disables a submit button and shows progress without moving the layout.
     The label is kept as the accessible name via aria-busy so the button
     still announces itself while it is inert. */
  BOG.busy = function (btn, isBusy, busyLabel) {
    if (!btn) return;
    if (isBusy) {
      btn.dataset.idleLabel = btn.dataset.idleLabel || btn.textContent;
      btn.setAttribute('data-busy', 'true');
      btn.setAttribute('aria-busy', 'true');
      btn.disabled = true;
      if (busyLabel) btn.textContent = busyLabel;
    } else {
      btn.removeAttribute('data-busy');
      btn.removeAttribute('aria-busy');
      btn.disabled = false;
      if (btn.dataset.idleLabel) btn.textContent = btn.dataset.idleLabel;
    }
  };

  /* --------------------------------------------------------------- OTP -- */

  /* Six single-character inputs. Typing advances, backspace retreats, and a
     pasted six-digit code fills every box. The boxes are a skin; the value
     still lives in six real inputs, which keeps the platform keyboard and
     autofill working.
     The joined value is published to [data-otp-value] as a real event, so the
     page's own script does not have to poll. */
  function wireOtp(e) {
    var cell = e.target.closest('.otp__cell');
    if (!cell) return;
    var group = cell.closest('.otp');
    if (!group) return;
    var cells = [].slice.call(group.querySelectorAll('.otp__cell'));

    if (e.type === 'input') {
      cell.value = cell.value.replace(/\D/g, '').slice(-1);
      if (cell.value) {
        var next = cells[cells.indexOf(cell) + 1];
        if (next) next.focus();
      }
    } else if (e.type === 'keydown' && e.key === 'Backspace' && !cell.value) {
      var prev = cells[cells.indexOf(cell) - 1];
      if (prev) { prev.focus(); prev.value = ''; BOG.setFieldError(prev, ''); }
      return;
    } else if (e.type === 'paste') {
      var digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, cells.length);
      if (!digits) return;
      e.preventDefault();
      cells.forEach(function (c, i) { c.value = digits[i] || ''; });
      var focusAt = cells[Math.min(digits.length, cells.length - 1)];
      if (focusAt) focusAt.focus();
    }

    var joined = cells.map(function (c) { return c.value; }).join('');
    group.dispatchEvent(new CustomEvent('otp:input', {
      bubbles: true,
      detail: { value: joined, complete: joined.length === cells.length }
    }));
  }

  BOG.otpValue = function (group) {
    if (!group) return '';
    return [].slice.call(group.querySelectorAll('.otp__cell'))
      .map(function (c) { return c.value; }).join('');
  };

  /* --------------------------------------------------- password strength -- */

  /* Advisory only. The server is the authority on password policy; this exists
     so people are not told "too weak" after they submit. */
  function scorePassword(pw) {
    if (!pw) return 0;
    var score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^\w\s]/.test(pw)) score++;
    return Math.min(score, 4);
  }

  var STRENGTH = [
    { label: 'Too short', cls: 'is-on-weak' },
    { label: 'Weak',      cls: 'is-on-weak' },
    { label: 'Fair',      cls: 'is-on-fair' },
    { label: 'Good',      cls: 'is-on-good' },
    { label: 'Strong',    cls: 'is-on-strong' }
  ];

  function wireMeter(e) {
    var input = e.target.closest('[data-meter-for]');
    if (!input) return;
    var meter = document.getElementById(input.getAttribute('data-meter-for'));
    if (!meter) return;
    var score = scorePassword(input.value);
    var spec = STRENGTH[score];
    meter.querySelectorAll('.meter-meter__bar').forEach(function (bar, i) {
      bar.className = 'meter-meter__bar' + (i < score ? ' ' + spec.cls : '');
    });
    var label = meter.querySelector('.meter-meter__label');
    if (label) label.textContent = input.value ? spec.label : 'Password strength';
    /* Announced politely, and only when the verdict actually changes. */
    if (meter.dataset.score !== String(score)) {
      meter.dataset.score = String(score);
      if (input.value) label.setAttribute('aria-live', 'polite');
    }
  }

  /* ---------------------------------------------------------- copy button -- */

  function wireCopy(e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var target = document.getElementById(btn.getAttribute('data-copy'));
    var text = btn.getAttribute('data-copy-text') || (target && (target.value || target.textContent)) || '';
    if (!text.trim()) return;

    var restore = btn.textContent;
    var done = function (ok) {
      btn.textContent = ok ? 'Copied' : 'Press Ctrl+C';
      setTimeout(function () { btn.textContent = restore; }, 1600);
    };

    if (global.navigator.clipboard && global.isSecureContext) {
      global.navigator.clipboard.writeText(text.trim()).then(function () { done(true); },
                                                          function () { done(false); });
    } else {
      done(false);
    }
  }

  /* ---------------------------------------------------------------- tabs -- */

  /* Roving tabindex: arrow keys move between tabs, Home/End jump to the ends.
     Without this, a tab strip is 6 tab stops and the panel content is a 7th. */
  function wireTabs(e) {
    var tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    var strip = tab.closest('[role="tablist"]');
    if (!strip) return;
    var tabs = [].slice.call(strip.querySelectorAll('[role="tab"]'));
    var i = tabs.indexOf(tab);
    var target = null;

    if (e.type === 'click') target = tab;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = tabs[(i + 1) % tabs.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === 'Home') target = tabs[0];
    else if (e.key === 'End') target = tabs[tabs.length - 1];
    else return;

    e.preventDefault();
    tabs.forEach(function (t) {
      var on = t === target;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    target.focus();

    var panel = document.getElementById(target.getAttribute('aria-controls'));
    if (panel) {
      [].slice.call(strip.parentNode.querySelectorAll('[role="tabpanel"]')).forEach(function (p) {
        p.hidden = p !== panel;
      });
    }
  }

  /* ------------------------------------------------------------------ init */

  document.addEventListener('input', function (e) {
    clearErrorOnInput(e);
    wireOtp(e);
    wireMeter(e);
  }, true);

  document.addEventListener('change', function (e) { clearErrorOnInput(e); }, true);

  document.addEventListener('keydown', function (e) {
    wireOtp(e);
    wireTabs(e);
  });

  document.addEventListener('paste', wireOtp);

  document.addEventListener('click', function (e) {
    wireReveal(e);
    wireCopy(e);
  });

  /* ------------------------------------------------------------------ misc */

  /* Native constraint validation is left ON (no form carries novalidate), so
     required/type/pattern are enforced by the browser before submit and the
     page scripts only add what the platform cannot express — server errors,
     password complexity, and inline field messages. */

  /* ======================================================================
     CONFIRM DIALOG

     Replaces window.confirm(), which the dashboard, vault, trash and account
     pages all used for destructive actions. Three problems with confirm():
     it cannot be styled, it blocks the event loop so a screen reader may
     never announce it, and its wording cannot say WHICH item is being
     deleted.

     Returns a Promise<boolean>. Focus is trapped while open, Escape cancels,
     and focus returns to whatever was focused beforehand.
     ====================================================================== */

  var openDialog = null;

  BOG.confirm = function (opts) {
    opts = opts || {};

    /* One dialog at a time. A second request while one is open resolves the
       first as cancelled rather than stacking two panels. */
    if (openDialog) { openDialog.settle(false); }

    return new Promise(function (resolve) {
      var title   = opts.title   || 'Are you sure?';
      var body    = opts.body    || 'This cannot be undone.';
      var confirmLabel = opts.confirmLabel || 'Confirm';
      var cancelLabel  = opts.cancelLabel  || 'Cancel';
      var danger   = opts.danger !== false;

      var previousFocus = document.activeElement;

      var dialog = document.createElement('div');
      dialog.className = 'modal';
      dialog.hidden = true;

      var headingId = 'confirm-title-' + Date.now();
      var bodyId    = 'confirm-body-' + Date.now();

      var panel = document.createElement('div');
      panel.className = 'modal__panel';
      panel.setAttribute('role', 'alertdialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', headingId);
      panel.setAttribute('aria-describedby', bodyId);

      var head = document.createElement('div');
      head.className = 'modal__head';
      var h2 = document.createElement('h2');
      h2.id = headingId;
      h2.textContent = title;
      head.appendChild(h2);

      var p = document.createElement('p');
      p.id = bodyId;
      p.className = 'field-hint';
      p.textContent = body;
      /* Allow a caller-supplied element for richer content. */
      if (opts.node) { p.textContent = ''; p.appendChild(opts.node); }

      var actions = document.createElement('div');
      actions.className = 'modal__actions';

      var cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn--ghost';
      cancelBtn.textContent = cancelLabel;

      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'btn ' + (danger ? 'btn--danger' : 'btn--primary');
      okBtn.textContent = confirmLabel;
      if (opts.busyLabel) okBtn.dataset.busyLabel = opts.busyLabel;

      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      panel.appendChild(head);
      panel.appendChild(p);
      panel.appendChild(actions);
      dialog.appendChild(panel);
      document.body.appendChild(dialog);
      dialog.hidden = false;

      function settle(result) {
        if (!openDialog) return;
        openDialog = null;
        document.removeEventListener('keydown', onKey, true);
        dialog.hidden = true;
        if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
        if (previousFocus && previousFocus.focus) previousFocus.focus();
        resolve(result);
      }

      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); settle(false); return; }
        /* shell.js owns the focus trap; use it when available. */
        if (BOG.a11y && BOG.a11y.trap) BOG.a11y.trap(panel, e);
      }

      cancelBtn.addEventListener('click', function () { settle(false); });
      okBtn.addEventListener('click', function () {
        /* If the caller supplied a busy label, hold the dialog open while it
           works. onConfirm may return a promise; the dialog stays until it
           settles, then closes with that result. */
        if (!opts.onConfirm) { settle(true); return; }
        BOG.busy(okBtn, true);
        var result;
        try { result = opts.onConfirm(); }
        catch (err) { BOG.busy(okBtn, false); settle(false); throw err; }
        if (result && typeof result.then === 'function') {
          result.then(
            function (v) { BOG.busy(okBtn, false); settle(v !== false); },
            function () { BOG.busy(okBtn, false); settle(false); }
          );
        } else {
          BOG.busy(okBtn, false);
          settle(result !== false);
        }
      });

      document.addEventListener('keydown', onKey, true);
      /* Focus the safe choice, not the destructive one. */
      cancelBtn.focus();
      openDialog = { settle: settle };
    });
  };

  BOG.forms = { scorePassword: scorePassword, busy: BOG.busy };

})(window);