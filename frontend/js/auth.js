// Authentication helpers & state management

const TOKEN_KEY = 'cot_auth_token';
const USER_KEY = 'cot_auth_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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

// Route guarding helper
function checkAuth(expectedRole) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return null;
  }

  if (expectedRole && user.role !== expectedRole) {
    // Redirect to the appropriate portal for the user's role
    if (user.role === 'staff') {
      window.location.href = 'staff.html';
    } else {
      window.location.href = 'student.html';
    }
    return null;
  }

  return user;
}

// Redirect already logged-in users away from login/register pages
function redirectIfLoggedIn() {
  const token = getToken();
  const user = getUser();
  if (token && user) {
    if (user.role === 'staff') {
      window.location.href = 'staff.html';
    } else {
      window.location.href = 'student.html';
    }
  }
}

// Handle Login Form
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    redirectIfLoggedIn();

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('alertBox');
      alertBox.innerHTML = '';

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.innerText = 'Logging in...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to log in.');
        }

        setSession(data.token, data.user);

        if (data.user.role === 'staff') {
          window.location.href = 'staff.html';
        } else {
          window.location.href = 'student.html';
        }
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        submitBtn.disabled = false;
        submitBtn.innerText = 'Log In';
      }
    });
  }

  // Handle Register Form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    redirectIfLoggedIn();

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('alertBox');
      alertBox.innerHTML = '';

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const studentId = document.getElementById('studentId').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      if (password !== confirmPassword) {
        alertBox.innerHTML = `<div class="alert alert-danger">Passwords do not match.</div>`;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Creating account...';

      try {
        const res = await fetch('/api/auth/register', {
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
        alertBox.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        submitBtn.disabled = false;
        submitBtn.innerText = 'Register Account';
      }
    });
  }
});
