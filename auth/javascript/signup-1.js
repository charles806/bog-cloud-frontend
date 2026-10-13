/* ==========================================================================
   BOG CLOUD — SIGN UP

   Behaviour preserved from the previous signup-1.js:
     - POST /api/v1/auth/register with { email, password, firstName, lastName,
       accountType: "trial" }
     - the same password policy regex
     - redirect to login.html on success

   What changed:
     - inline-style error and success rendering replaced with BOG.alert(), so
       both are announced instead of merely drawn
     - real <label for> on every field (the form had four inputs and zero
       labels; the placeholder was doing the label's job)
     - password strength shown while typing, via the shared meter
     - autocomplete="given-name" / "family-name" / "email" / "new-password",
       which is what lets a password manager offer to generate one
   ========================================================================== */

/* Backend address comes from assets/js/config.js — see that file for why
   this was inlined here before. */
const API_BASE = window.BOG.config.apiBase;

const form = document.getElementById('signupForm');
const errorBox = document.getElementById('error');
const successBox = document.getElementById('success');
const signupBtn = document.getElementById('signupBtn');

const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const email = document.getElementById('email');
const password = document.getElementById('password');

/* Unchanged from the original: at least 8 characters with an uppercase letter,
   a lowercase letter, a digit and one of @$!%*?&. */
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  BOG.clearAlert(errorBox);
  BOG.clearAlert(successBox);
  [firstName, lastName, email, password].forEach((f) => BOG.setFieldError(f, ''));

  const values = {
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    email: email.value.trim(),
    password: password.value
  };

  if (!values.firstName) { BOG.setFieldError(firstName, 'Enter your first name.'); firstName.focus(); return; }
  if (!values.lastName)  { BOG.setFieldError(lastName, 'Enter your last name.');  lastName.focus();  return; }
  if (!values.email)     { BOG.setFieldError(email, 'Enter your email address.'); email.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    BOG.setFieldError(email, 'That does not look like an email address.');
    email.focus();
    return;
  }
  if (!PASSWORD_POLICY.test(values.password)) {
    BOG.setFieldError(password,
      'Use at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.');
    password.focus();
    return;
  }

  BOG.busy(signupBtn, true, 'Creating account…');

  try {
    const res = await fetch(API_BASE + window.BOG.config.url('register').replace(API_BASE, ''), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        accountType: 'trial'
      })
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      BOG.alert(successBox, 'Account created. Taking you to sign in…', 'success');
      BOG.busy(signupBtn, true, 'Created');
      setTimeout(() => { window.location.href = '/auth/login.html'; }, 1400);
      return;
    }

    if (res.status === 409 || /already/i.test(data.message || '')) {
      BOG.setFieldError(email, 'An account already uses this email address.');
      email.focus();
    } else if (res.status === 429) {
      BOG.alert(errorBox, 'Too many attempts from this address. Wait a minute, then try again.', 'error');
    } else {
      BOG.alert(errorBox,
        data.message || data.title || data.errors?.[0]?.description || 'Sign-up failed. Try again.',
        'error');
    }
    BOG.busy(signupBtn, false);
  } catch (err) {
    BOG.alert(errorBox, 'Could not reach BOG Cloud. Check your connection and try again.', 'error');
    BOG.busy(signupBtn, false);
  }
});