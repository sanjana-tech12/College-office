// Authentication helpers & state management

const TOKEN_KEY = 'cot_auth_token';
const USER_KEY = 'cot_auth_user';

// Use same-origin relative path by default (instantaneous, zero CORS preflight)
// If frontend is hosted on a separate external port without backend, fallback to port 3000
function getApiBase() {
  if (typeof window !== 'undefined') {
    // Both 3000 and 5000 run Express natively; only external dev servers need absolute base
    if (window.location.port !== '3000' && window.location.port !== '5000' && window.location.port !== '') {
      return 'http://localhost:3000';
    }
  }
  return '';
}
var API_BASE = getApiBase();
if (typeof window !== 'undefined') {
  window.API_BASE = API_BASE;
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

function getUser() {
  try {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function setSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save session to localStorage', e);
  }
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Failed to clear session', e);
  }
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}

function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

// Route guarding helper with seamless cross-port transfer support
function checkAuth(expectedRole) {
  // Transfer session if passed via URL parameters without bouncing
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const paramToken = urlParams.get('token');
    const paramUser = urlParams.get('user');
    if (paramToken && paramUser) {
      try {
        setSession(paramToken, JSON.parse(decodeURIComponent(paramUser)));
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failed to parse URL session params', e);
      }
    }
  }

  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return null;
  }

  if (expectedRole && user.role !== expectedRole) {
    if (user.role === 'staff') {
      window.location.href = 'staff.html';
    } else {
      window.location.href = 'student.html';
    }
    return null;
  }

  return user;
}

// Render active session banner on login page instead of forced redirect loops
function checkLoginSessionPrompt() {
  const token = getToken();
  const user = getUser();
  const alertBox = document.getElementById('alertBox');
  if (token && user && alertBox) {
    const portalUrl = user.role === 'staff' ? 'staff.html' : 'student.html';
    const roleLabel = user.role === 'staff' ? 'Staff' : 'Student';
    alertBox.innerHTML = `
      <div class="alert alert-info" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>Signed in as <strong>${escapeHtml(user.name)}</strong> (${roleLabel})</div>
        <div style="display: flex; gap: 0.5rem;">
          <a href="${portalUrl}" class="btn btn-primary btn-sm">Go to Dashboard</a>
          <button type="button" class="btn btn-secondary btn-sm" onclick="logout()">Sign Out</button>
        </div>
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize Auth forms with instant execution
function initAuth() {
  checkLoginSessionPrompt();

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('alertBox');
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (alertBox) alertBox.innerHTML = '';

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) return;

      submitBtn.disabled = true;
      submitBtn.innerText = 'Logging in...';

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to log in.');
        }

        setSession(data.token, data.user);

        // Instant smooth transition based on user role
        if (data.user.role === 'staff') {
          window.location.href = 'staff.html';
        } else {
          window.location.href = 'student.html';
        }
      } catch (err) {
        if (alertBox) {
          alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
        }
        submitBtn.disabled = false;
        submitBtn.innerText = 'Log In';
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('alertBox');
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      if (alertBox) alertBox.innerHTML = '';

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const studentId = document.getElementById('studentId').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        if (alertBox) {
          alertBox.innerHTML = `<div class="alert alert-danger">Passwords do not match.</div>`;
        }
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Creating account...';

      try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, studentId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed.');
        }

        setSession(data.token, data.user);
        window.location.href = 'student.html';
      } catch (err) {
        if (alertBox) {
          alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
        }
        submitBtn.disabled = false;
        submitBtn.innerText = 'Register Account';
      }
    });
  }
}

// Immediate load detection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}
