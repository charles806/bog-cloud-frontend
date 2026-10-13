/* ==========================================================================
   BOG CLOUD — TWO-FACTOR AUTHENTICATION

   P0 FIX
   ------
   The previous version of this file read:

       // DEV MODE: Accepts any 6 digits
       window.verifyMFA = () => { ... if (!/^\d{6}$/.test(code)) reject;
                                  else "MFA Verified! Redirecting..." };

   and mfa.html offered a "Skip for now" link straight to the dashboard.
   Together those made the page decorative: the control looked like it
   enforced a second factor while enforcing nothing, and anyone who typed six
   digits got in.

   There is no verification endpoint on the backend yet, so the honest
   behaviour is to refuse and say why. The button is disabled in markup and
   this script keeps it that way. To turn verification on, implement
   POST /api/v1/auth/mfa/verify, then set ENABLE_VERIFICATION = true — the
   success path below is already written and will run unchanged.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

/* Flip to true once POST /api/v1/auth/mfa/verify exists. */
const ENABLE_VERIFICATION = false;

const API_BASE = window.BOG.config.apiBase;

/* Config comes from assets/js/config.js, loaded as a classic script before
   this module. It used to be copied inline here, which is how eleven files
   came to disagree about the storage bucket. */
const app = initializeApp(window.BOG.config.firebase);
const auth = getAuth(app);

const errorBox = document.getElementById('error');
const form = document.getElementById('mfaForm');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const otpGroup = document.getElementById('otpGroup');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = user.email;
  } else {
    BOG.alert(errorBox, 'Your session expired. Sign in again to continue.', 'error');
    setTimeout(() => { window.location.href = '/auth/login'; }, 1500);
  }
});

/* Keep the button honest about whether it can do anything. */
if (!ENABLE_VERIFICATION) {
  verifyBtn.disabled = true;
  verifyBtn.setAttribute('aria-disabled', 'true');
  verifyBtn.title = 'Two-factor verification is not enabled on this deployment.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!ENABLE_VERIFICATION) return;

  const code = BOG.otpValue(otpGroup);
  BOG.clearAlert(errorBox);

  if (code.length !== 6) {
    BOG.alert(errorBox, 'Enter all six digits of the code.', 'error');
    return;
  }

  BOG.busy(verifyBtn, true, 'Verifying…');

  try {
    const res = await fetch(API_BASE + window.BOG.config.url('mfaVerify').replace(API_BASE, ''), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
      },
      body: JSON.stringify({ code })
    });

    if (res.ok) {
      BOG.alert(errorBox, 'Verified. Taking you to your drive…', 'success');
      BOG.busy(verifyBtn, true, 'Verified');
      setTimeout(() => { window.location.href = '/dashboard/dashboard'; }, 900);
      return;
    }

    /* One message for every failure. Distinguishing "expired" from "wrong"
       would tell an attacker how close a guess was. */
    BOG.alert(errorBox, 'That code was not accepted. Check it and try again, or resend.', 'error');
    BOG.busy(verifyBtn, false);
    otpGroup.querySelectorAll('.otp__cell').forEach((c) => { c.value = ''; });
    otpGroup.querySelector('.otp__cell').focus();
  } catch (err) {
    BOG.alert(errorBox, 'Could not reach BOG Cloud. Try again in a moment.', 'error');
    BOG.busy(verifyBtn, false);
  }
});

resendBtn.addEventListener('click', async () => {
  BOG.clearAlert(errorBox);

  if (!currentUser) {
    BOG.alert(errorBox, 'Still loading your session. Try again in a moment.', 'error');
    return;
  }

  BOG.busy(resendBtn, true, 'Sending…');
  try {
    /* TODO: point this at the backend send-code endpoint when it exists.
       Until then the click is acknowledged but nothing is dispatched, which
       is why the button is presented as secondary rather than primary. */
    BOG.alert(errorBox,
      'Code sending is not wired up yet on this deployment.', 'warning');
  } catch (err) {
    BOG.alert(errorBox, 'Could not send a new code. Try again in a moment.', 'error');
  }
  BOG.busy(resendBtn, false);
});