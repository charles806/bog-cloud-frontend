/* ==========================================================================
   BOG CLOUD — SIGN IN

   Behaviour preserved from the previous login-1.js:
     - POST /api/v1/auth/login with { email, password }
     - stores the session under localStorage['token'] and ['user']
       (shell.js reads 'token' first and falls back to 'bog_token')
     - redirects to /dashboard/dashboard.html

   What changed:
     - error and success text goes through BOG.alert() so it is announced;
       the old code set textContent and style.display inline, which drew a
       message a screen reader never heard
     - password visibility toggle
     - the form no longer carries autocomplete="off", which stopped password
       managers from working on the sign-in form specifically. It is now
       username / current-password.
   ========================================================================== */

/* Backend address comes from assets/js/config.js — see that file for why
   this was inlined here before. */
const API_BASE = window.BOG.config.apiBase;

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('alert');
const loginBtn = document.getElementById('loginBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  BOG.clearAlert(alertBox);
  BOG.setFieldError(emailInput, '');
  BOG.setFieldError(passwordInput, '');
  BOG.busy(loginBtn, true, 'Signing in…');

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    BOG.setFieldError(emailInput, 'Enter your email address.');
    BOG.busy(loginBtn, false);
    emailInput.focus();
    return;
  }
  if (!password) {
    BOG.setFieldError(passwordInput, 'Enter your password.');
    BOG.busy(loginBtn, false);
    passwordInput.focus();
    return;
  }

  try {
    const res = await fetch(API_BASE + window.BOG.config.url('login').replace(API_BASE, ''), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json().catch(() => ({}));

    /* The backend wraps the payload under `data` (accessToken/refreshToken/user).
       Accept that shape and the older flat shape so one missing field cannot
       turn a successful sign-in into a "did not match" error. */
    const body = data && data.data ? data.data : data;
    const token = body.accessToken || body.token;
    const user = body.user;

    if (res.ok && token) {
      localStorage.setItem('token', token);
      if (user) localStorage.setItem('user', JSON.stringify(user));

      BOG.alert(alertBox, 'Signed in. Taking you to your drive…', 'success');
      setTimeout(() => { window.location.href = '/dashboard/dashboard.html'; }, 900);
      return;
    }

    /* Deliberately identical for unknown-email and wrong-password. Distinguishing
       them would confirm which addresses hold an account. */
    const message = res.status === 429
      ? 'Too many attempts. Wait a minute, then try again.'
      : 'That email and password combination did not match an account.';
    BOG.alert(alertBox, message, 'error');
    BOG.busy(loginBtn, false);
    passwordInput.focus();
  } catch (error) {
    BOG.alert(alertBox, 'Could not reach BOG Cloud. Check your connection and try again.', 'error');
    BOG.busy(loginBtn, false);
  }
});