// Staff portal logic (API_BASE provided by auth.js)
let currentUser = null;
let activeRequest = null;
let cachedRequests = [];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Institutional status flow rules
const STATUS_TRANSITIONS = {
  'Submitted': ['In Progress'],
  'In Progress': ['Approved', 'Rejected', 'Completed'],
  'Approved': ['Ready for Collection', 'Completed'],
  'Ready for Collection': ['Completed'],
  'Rejected': [],
  'Completed': [],
};

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
    case 'Completed':
      return 'badge-completed';
    default:
      return 'badge-submitted';
  }
}

function renderTable(requests) {
  const tbody = document.getElementById('staffTableBody');
  const countSpan = document.getElementById('requestsCount');
  if (!tbody) return;

  if (countSpan) {
    countSpan.innerText = `Total: ${requests.length}`;
  }

  if (requests.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <strong>No requests found.</strong>
          <p>Try adjusting your search query or filter criteria.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = requests.map((req) => {
    const dateStr = new Date(req.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const isTerminal = req.status === 'Rejected' || req.status === 'Ready for Collection';
    const actionBtnLabel = isTerminal ? 'Update Remarks' : 'Update Status';

    return `
      <tr>
        <td><span class="req-id-tag">${req.requestId}</span></td>
        <td>
          <strong>${escapeHtml(req.studentName)}</strong>
          <div style="font-size: 0.775rem; color: #64748b;">${req.studentRollNo ? escapeHtml(req.studentRollNo) : escapeHtml(req.studentEmail)}</div>
        </td>
        <td>${escapeHtml(req.requestType)}</td>
        <td style="max-width: 240px; word-break: break-word;">${escapeHtml(req.description)}</td>
        <td style="white-space: nowrap; font-size: 0.85rem; color: #64748b;">${dateStr}</td>
        <td><span class="badge ${getBadgeClass(req.status)}">${req.status}</span></td>
        <td style="font-size: 0.85rem; color: #475569; max-width: 200px; word-break: break-word;">
          ${req.remarks ? escapeHtml(req.remarks) : '<span style="color: #94a3b8;">&mdash;</span>'}
        </td>
        <td style="white-space: nowrap;">
          <button
            class="btn btn-secondary btn-sm"
            onclick="openUpdateModal('${req.requestId}')"
          >
            ${actionBtnLabel}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadAllRequests() {
  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  const searchInput = document.getElementById('searchInput')?.value.trim() || '';

  const queryParams = new URLSearchParams();
  if (statusFilter && statusFilter !== 'all') {
    queryParams.append('status', statusFilter);
  }
  if (searchInput) {
    queryParams.append('search', searchInput);
  }

  try {
    const res = await fetch(`${API_BASE}/api/requests?${queryParams.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await res.json();
    cachedRequests = data.requests || [];
    renderTable(cachedRequests);
  } catch (err) {
    const tbody = document.getElementById('staffTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center" style="color: #ef4444; padding: 2rem;">
            Failed to load requests: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }
}

function resetFilters() {
  const statusFilter = document.getElementById('statusFilter');
  const searchInput = document.getElementById('searchInput');
  if (statusFilter) statusFilter.value = 'all';
  if (searchInput) searchInput.value = '';
  loadAllRequests();
}

async function openUpdateModal(requestId) {
  const modal = document.getElementById('updateModal');
  const alertBox = document.getElementById('modalAlert');
  if (!modal) return;
  if (alertBox) alertBox.innerHTML = '';

  // Use cached data immediately for 0ms modal opening
  let req = cachedRequests.find((r) => r.requestId === requestId);

  if (!req) {
    try {
      const res = await fetch(`${API_BASE}/api/requests/${requestId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch request.');
      req = data.request;
    } catch (err) {
      alert('Error opening request: ' + err.message);
      return;
    }
  }

  activeRequest = req;

  document.getElementById('modalRequestId').innerText = activeRequest.requestId;
  document.getElementById('modalCurrentStatus').innerHTML = `
    <span class="badge ${getBadgeClass(activeRequest.status)}">${activeRequest.status}</span>
  `;
  document.getElementById('modalStudentName').innerText = `${activeRequest.studentName} (${activeRequest.studentRollNo || activeRequest.studentEmail})`;
  document.getElementById('modalRequestType').innerText = activeRequest.requestType;
  document.getElementById('modalRemarks').value = activeRequest.remarks || '';

  const auditContainer = document.getElementById('modalLastUpdatedByContainer');
  const auditText = document.getElementById('modalLastUpdatedBy');
  if (auditContainer && auditText) {
    if (activeRequest.lastUpdatedBy) {
      auditContainer.style.display = 'flex';
      auditText.innerText = activeRequest.lastUpdatedBy;
    } else {
      auditContainer.style.display = 'none';
    }
  }

  const nextStatusSelect = document.getElementById('modalNextStatus');
  const helpText = document.getElementById('statusFlowHelp');
  const allowedNext = STATUS_TRANSITIONS[activeRequest.status] || [];

  nextStatusSelect.innerHTML = '';

  const keepOption = document.createElement('option');
  keepOption.value = activeRequest.status;
  keepOption.innerText = `Keep Current Status (${activeRequest.status})`;
  nextStatusSelect.appendChild(keepOption);

  if (allowedNext.length === 0) {
    helpText.innerText = `Terminal status reached (${activeRequest.status}). You can update remarks, but status cannot be changed further.`;
  } else {
    allowedNext.forEach((targetStatus) => {
      const opt = document.createElement('option');
      opt.value = targetStatus;
      opt.innerText = `Advance to: ${targetStatus}`;
      nextStatusSelect.appendChild(opt);
    });
    helpText.innerText = `Allowed workflow transition: ${allowedNext.join(' or ')}`;
  }

  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('updateModal');
  if (modal) modal.classList.remove('active');
  activeRequest = null;
}

function initStaff() {
  currentUser = checkAuth('staff');
  if (!currentUser) return;

  const staffBadge = document.getElementById('staffBadge');
  if (staffBadge) {
    staffBadge.innerText = `${currentUser.name} (Staff)`;
  }

  // Load immediately
  loadAllRequests();

  // Instant filter on input & change
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadAllRequests, 150);
    });
  }

  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', loadAllRequests);
  }

  const updateForm = document.getElementById('updateStatusForm');
  if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeRequest) return;

      const alertBox = document.getElementById('modalAlert');
      const saveBtn = document.getElementById('modalSaveBtn');
      if (alertBox) alertBox.innerHTML = '';

      const newStatus = document.getElementById('modalNextStatus').value;
      const remarks = document.getElementById('modalRemarks').value;

      // Security confirmation for terminal status transitions
      if ((newStatus === 'Rejected' || newStatus === 'Completed') && newStatus !== activeRequest.status) {
        const confirmMsg = `Security Confirmation:\nAdvancing this request to '${newStatus}' is a permanent action and cannot be undone.\n\nDo you want to proceed?`;
        if (!window.confirm(confirmMsg)) {
          return;
        }
      }

      saveBtn.disabled = true;
      saveBtn.innerText = 'Updating...';

      try {
        const res = await fetch(`${API_BASE}/api/requests/${activeRequest.requestId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: newStatus, remarks }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to update request.');
        }

        closeModal();
        await loadAllRequests();
      } catch (err) {
        if (alertBox) {
          alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
        }
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Update Request';
      }
    });
  }

  // Security: Background verify staff role against backend
  verifyStaffSession();

  // Security: Start idle inactivity auto-lock monitor (15 minutes)
  initStaffInactivityLock();
}

// Security: Verify JWT and role directly with backend
async function verifyStaffSession() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Session invalid');
    const data = await res.json();
    if (!data.user || data.user.role !== 'staff') {
      throw new Error('Role mismatch');
    }
  } catch (e) {
    clearSession();
    if (typeof alert === 'function') {
      alert('Staff Security Alert: Your session is invalid or unauthorized. Redirecting to login.');
    }
    window.location.href = 'login.html';
  }
}

// Security: 15-minute inactivity auto-logout to protect unattended terminals
const STAFF_INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
let staffInactivityTimer = null;

function resetStaffInactivity() {
  clearTimeout(staffInactivityTimer);
  staffInactivityTimer = setTimeout(() => {
    clearSession();
    if (typeof alert === 'function') {
      alert('Staff Security Alert: Your session has been locked due to 15 minutes of inactivity.');
    }
    window.location.href = 'login.html';
  }, STAFF_INACTIVITY_LIMIT_MS);
}

function initStaffInactivityLock() {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach((event) => {
      window.addEventListener(event, resetStaffInactivity, { passive: true });
    });
  }
  resetStaffInactivity();
}

// Immediate load detection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStaff);
} else {
  initStaff();
}
