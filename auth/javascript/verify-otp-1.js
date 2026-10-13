/* ==========================================================================
   BOG CLOUD — EMAIL VERIFICATION

   Behaviour preserved from the previous verify-otp-1.js:
     - onAuthStateChanged guard that bounces an anonymous visitor to signup
     - checkVerification() calls currentUser.reload() to re-read the server
       rather than trusting the cached flag
     - resendEmail() calls sendEmailVerification
     - goToSignup() signs out before navigating, which is what stopped the
       redirect loop between this page and signup.html

   What changed:
     - the two buttons moved from inline onclick handlers to listeners
     - the dead "onclick + href" pairing is gone: the original had
       <a href="#" onclick="window.location.href='verify-otp'">, so the
       link's own destination and the script's destination were both present
       and the anchor's was a no-op that also jumped the scroll position
     - messages are announced through BOG.alert()
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, sendEmailVerification, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

/* Config comes from assets/js/config.js, loaded as a classic script before
   this module. It used to be copied inline here, which is how eleven files
   came to disagree about the storage bucket. */
const app = initializeApp(window.BOG.config.firebase);
const auth = getAuth(app);

const errorBox = document.getElementById('error');
const checkBtn = document.getElementById('checkBtn');
const resendBtn = document.getElementById('resendBtn');
const goSignup = document.getElementById('goSignup');

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = user.email;

    if (user.emailVerified) {
      BOG.alert(errorBox, 'Already verified. Taking you to your drive…', 'success');
      setTimeout(() => { window.location.href = '/dashboard/dashboard'; }, 1000);
    }
  } else {
    BOG.alert(errorBox, 'Your session expired. Sign up again to continue.', 'error');
    setTimeout(() => { window.location.href = '/auth/signup'; }, 1500);
  }
});

checkBtn.addEventListener('click', async () => {
  BOG.clearAlert(errorBox);

  if (!currentUser) {
    BOG.alert(errorBox, 'Still loading your session. Try again in a moment.', 'error');
    return;
  }

  BOG.busy(checkBtn, true, 'Checking…');

  try {
    /* reload() is what makes this honest: the cached emailVerified flag is
       stale until the server is asked again. */
    await currentUser.reload();

    if (currentUser.emailVerified) {
      BOG.alert(errorBox, 'Email verified. Taking you to your drive…', 'success');
      BOG.busy(checkBtn, true, 'Verified');
      setTimeout(() => { window.location.href = '/dashboard/dashboard'; }, 900);
    } else {
      BOG.alert(errorBox, 'Not verified yet. Open the link in the email, then check again.', 'warning');
      BOG.busy(checkBtn, false);
    }
  } catch (err) {
    BOG.alert(errorBox, 'Could not check right now. Try again in a moment.', 'error');
    BOG.busy(checkBtn, false);
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
    await sendEmailVerification(currentUser);
    BOG.alert(errorBox, 'Verification email sent. Check your inbox and spam folder.', 'success');
  } catch (err) {
    const tooMany = /too-many|rate/i.test(err.code || '');
    BOG.alert(errorBox,
      tooMany ? 'Too many requests. Wait a minute before asking for another.'
              : 'Could not send the email. Try again in a moment.',
      tooMany ? 'warning' : 'error');
  }
  BOG.busy(resendBtn, false);
});

/* Signing out first is what prevents this page bouncing straight back to
   itself after the redirect. */
goSignup.addEventListener('click', async (event) => {
  event.preventDefault();
  goSignup.setAttribute('aria-disabled', 'true');
  await signOut(auth);
  window.location.href = '/auth/signup';
});