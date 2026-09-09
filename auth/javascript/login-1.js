const API_BASE = 'https://bog-cloud-1.onrender.com';

const form = document.getElementById('loginForm');
const alertBox = document.getElementById('alert');
const loginBtn = document.getElementById('loginBtn');

function showAlert(msg, type) { 
  alertBox.textContent = msg; 
  alertBox.className = `alert ${type}`; 
  alertBox.style.display = 'block'; 
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginBtn.disabled = true; 
  loginBtn.textContent = 'Signing in...'; 
  alertBox.style.display = 'none';
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(API_BASE + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showAlert('Login successful! Redirecting...', 'success');
      // FIXED: Absolute path for Vercel
      setTimeout(() => window.location.href = '/dashboard/dashboard.html', 1000);
    } else {
      showAlert(data.message || 'Invalid email or password', 'error');
      loginBtn.disabled = false; 
      loginBtn.textContent = 'Login';
    }
  } catch (error) {
    showAlert('Network error. Is the backend awake?', 'error');
    loginBtn.disabled = false; 
    loginBtn.textContent = 'Login';
  }
});
