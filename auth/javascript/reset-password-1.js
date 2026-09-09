import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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
const resetBtn = document.getElementById('resetBtn');

function showMessage(msg, isError = true) {
  errorDiv.textContent = msg;
  errorDiv.style.color = isError ? 'var(--error)' : 'var(--success)';
  errorDiv.style.display = 'block';
}

window.resetPassword = async () => {
  const email = document.getElementById('email').value.trim();
  errorDiv.style.display = 'none';
  
  if(!email) {
    showMessage('Please enter your email', true);
    return;
  }
  if(!/\S+@\S+\.\S+/.test(email)){
    showMessage('Please enter a valid email', true);
    return;
  }

  resetBtn.disabled = true;
  resetBtn.textContent = 'Sending...';

  try {
    await sendPasswordResetEmail(auth, email);
    showMessage('Password reset email sent! Check your inbox.', false);
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
  } catch(e) {
    let msg = e.message.replace('Firebase: Error ', '');
    if(e.code === 'auth/user-not-found') msg = 'No account found with this email.';
    showMessage(msg, true);
    resetBtn.disabled = false;
    resetBtn.textContent = 'Send Reset Link';
  }
}
