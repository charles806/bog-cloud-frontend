import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById('userEmail').textContent = user.email;
  } else {
    showMessage('Session expired. Please login again.', true);
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
  }
});

function showMessage(msg, isError = true) {
  errorDiv.textContent = msg;
  errorDiv.style.color = isError ? 'var(--error)' : 'var(--success)';
  errorDiv.style.display = 'block';
}

// DEV MODE: Accepts any 6 digits
window.verifyMFA = () => {
  const code = document.getElementById('otpCode').value.trim();
  errorDiv.style.display = 'none';
  
  if(!code || code.length !== 6) {
    showMessage('Please enter a 6-digit code', true);
    return;
  }
  if(!/^\d{6}$/.test(code)){
    showMessage('Code must be 6 numbers only', true);
    return;
  }
  
  // TODO: Replace this with API call to your backend to verify real OTP
  showMessage('MFA Verified! Redirecting...', false);
  setTimeout(() => { window.location.href = '/dashboard/dashboard.html'; }, 1000); 
}

window.resendCode = async () => {
  errorDiv.style.display = 'none';
  // TODO: Call your backend/Cloud Function to send new OTP to currentUser.email
  showMessage('New code sent to your email!', false);
}
