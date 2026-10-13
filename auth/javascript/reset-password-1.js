/* ==========================================================================
   BOG CLOUD — PASSWORD RESET

   P0 FIX — USER ENUMERATION
   -----------------------
   The previous version did this:

       if (e.code === 'auth/user-not-found') msg = 'No account found with this email.';

   and showed the error in red on the page. That turns the reset form into an
   oracle: anyone could type an address and learn whether it held an account
   on BOG Cloud. Firebase's own guidance is to return an identical response in
   every case, and that is what this does — one message, one style, one
   redirect, whether the address exists, does not exist, or was rate-limited.

   sendPasswordResetEmail() is still called exactly as before, so the mail
   itself is unchanged. Only the response shown to the browser differs.

   What else changed:
     - a real <label for> on the email field
     - the inline onclick handler is now a form submit
     - autocomplete="email" so the field is offered back to the user
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

/* Config comes from assets/js/config.js, loaded as a classic script before
   this module. It used to be copied inline here, which is how eleven files
   came to disagree about the storage bucket. */
const app = initializeApp(window.BOG.config.firebase);
const auth = getAuth(app);

const errorBox = document.getElementById('error');
const resetBtn = document.getElementById('resetBtn');
const emailInput = document.getElementById('email');
const form = document.getElementById('resetForm');

/* The single response every outcome resolves to. */
const NEUTRAL = 'If an account exists for that address, a reset link is on its way. Check your inbox and spam folder.';

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  BOG.clearAlert(errorBox);
  BOG.setFieldError(emailInput, '');

  const email = emailInput.value.trim();

  /* Local validation is shown as a field error, not as the neutral message.
     It reveals nothing about the account — it only says the input is not an
     email address, which the browser's own type=email has already checked. */
  if (!email) {
    BOG.setFieldError(emailInput, 'Enter your email address.');
    emailInput.focus();
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    BOG.setFieldError(emailInput, 'That does not look like an email address.');
    emailInput.focus();
    return;
  }

  BOG.busy(resetBtn, true, 'Sending…');

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    /* auth/user-not-found is intentionally NOT handled differently. It falls
       through to the same neutral response as everything else. Rate limiting
       is also not distinguished, because that too would tell an attacker they
       were probing a real account. */
    console.info('[reset-password] send failed, responding neutrally:', err.code || err);
  }

  BOG.alert(errorBox, NEUTRAL, 'success');
  BOG.busy(resetBtn, true, 'Sent');
  setTimeout(() => { window.location.href = '/auth/login.html'; }, 2600);
});