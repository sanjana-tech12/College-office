// Student portal logic
const API_BASE = typeof getApiBase === 'function' ? getApiBase() : '';

let currentUser = null;

function getBadgeClass(status) {
  switch (status) {
    case 'Submitted':
      return 'badge-submitted';
    case 'In Progress':
      return 'badge-in-progress';
    case 'Approved':
      return 'badge-approved';
    case 'Rejected':
      return 'badge-rejected';
    case 'Ready for Collection':
      return 'badge-ready-for-collection';
    default:
      return 'badge-submitted';
  }
}

async function loadMyRequests() {
  const tbody = document.getElementById('requestsTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/requests/my`, {
      headers: getAuthHeaders(),
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await res.json();
    const requests = data.requests || [];

    if (requests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <strong>No requests submitted yet.</strong>
            <p>Select a certificate or service above to submit your first request.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = requests.map((req) => {
      const dateStr = new Date(req.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return `
        <tr>
          <td><span class="req-id-tag">${req.requestId}</span></td>
          <td><strong>${escapeHtml(req.requestType)}</strong></td>
          <td style="max-width: 280px; word-break: break-word;">${escapeHtml(req.description)}</td>
          <td style="white-space: nowrap; font-size: 0.85rem; color: #64748b;">${dateStr}</td>
          <td><span class="badge ${getBadgeClass(req.status)}">${req.status}</span></td>
          <td style="font-size: 0.85rem; color: #475569;">${req.remarks ? escapeHtml(req.remarks) : '<span style="color: #94a3b8;">&mdash;</span>'}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="color: #ef4444; padding: 2rem;">
          Failed to load requests: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

function initStudent() {
  currentUser = checkAuth('student');
  if (!currentUser) return;

  const studentBadge = document.getElementById('studentBadge');
  if (studentBadge) {
    const rollText = currentUser.studentId ? ` (${currentUser.studentId})` : '';
    studentBadge.innerText = `${currentUser.name}${rollText}`;
  }

  // Load requests immediately
  loadMyRequests();

  const form = document.getElementById('newRequestForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('requestAlert');
      const submitBtn = document.getElementById('submitBtn');
      if (alertBox) alertBox.innerHTML = '';

      const requestType = document.getElementById('requestType').value;
      const description = document.getElementById('description').value.trim();

      if (!requestType || !description) {
        if (alertBox) alertBox.innerHTML = `<div class="alert alert-danger">Please fill in all fields.</div>`;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Submitting...';

      try {
        const res = await fetch(`${API_BASE}/api/requests`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ requestType, description }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit request.');
        }

        form.reset();
        if (alertBox) {
          alertBox.innerHTML = `
            <div class="alert alert-success">
              Request submitted successfully! Generated Tracking ID: <strong>${data.request.requestId}</strong>
            </div>
          `;
        }

        await loadMyRequests();
      } catch (err) {
        if (alertBox) alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Submit Request';
      }
    });
  }
}

// Immediate load detection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudent);
} else {
  initStudent();
}
