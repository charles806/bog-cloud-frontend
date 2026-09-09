import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, sendEmailVerification, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7Ve_lk5waFwPNcQwHxM9DpYFkeEsQa74",
  authDomain: "bog-cloud.firebaseapp.com",
  projectId: "bog-cloud",
  storageBucket: "bog-cloud.firebasestorage.app",
  messagingSenderId: "219071508992",
  appId: "1:219071508992:web:42516a44ed5d2f6a59dee5",
  measurementId: "G-GBSSD1DLQC"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const errorDiv = document.getElementById('error');
let currentUser = null;

// FIX 1: AUTH GUARD - This stops the loop
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('userEmail').textContent = user.email;
    
    // If already verified, auto redirect to DASHBOARD
    if(user.emailVerified){
      showMessage('Email verified! Redirecting...', false);
      setTimeout(() => { window.location.href = '/dashboard/dashboard.html'; }, 1000);
    }
  } else {
    // No user = kick to signup
    showMessage('Session expired. Please sign up again.', true);
    setTimeout(() => { window.location.href = 'signup.html'; }, 1500);
  }
});

function showMessage(msg, isError = true) {
  errorDiv.textContent = msg;
  errorDiv.style.color = isError ? 'var(--error)' : 'var(--success)';
  errorDiv.style.display = 'block';
}

window.checkVerification = async () => {
  errorDiv.style.display = 'none';
  if(!currentUser){ showMessage('Loading user... please wait', true); return; }

  try {
    await currentUser.reload(); // IMPORTANT: refresh from Firebase server
    if(currentUser.emailVerified){
      showMessage('Email verified successfully!', false);
      setTimeout(() => { window.location.href = '/dashboard/dashboard.html'; }, 1200);
    } else {
      showMessage('Email not verified yet. Please check your inbox and click the link.', true);
    }
  } catch(e) { showMessage('Something went wrong. Try again.', true); }
}

window.resendEmail = async () => {
  errorDiv.style.display = 'none';
  if(!currentUser){ showMessage('No user found.', true); return; }
  try {
    await sendEmailVerification(currentUser);
    showMessage('Verification email resent! Check inbox + spam.', false);
  } catch(e) { showMessage('Too many requests. Wait 1 minute.', true); }
}

// FIX 2: Wrong email must signOut first
window.goToSignup = async () => {
  await signOut(auth);
  window.location.href = 'signup.html';
}
