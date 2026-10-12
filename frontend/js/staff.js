// Staff portal logic

let currentUser = null;
let activeRequest = null;

// Institutional status flow rules
const STATUS_TRANSITIONS = {
  'Submitted': ['In Progress'],
  'In Progress': ['Approved', 'Rejected'],
  'Approved': ['Ready for Collection'],
  'Rejected': [],
  'Ready for Collection': [],
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
    default:
      return 'badge-submitted';
  }
}

async function loadAllRequests() {
  const tbody = document.getElementById('staffTableBody');
  const countSpan = document.getElementById('requestsCount');
  const statusFilter = document.getElementById('statusFilter').value;
  const searchInput = document.getElementById('searchInput').value.trim();

  const queryParams = new URLSearchParams();
  if (statusFilter && statusFilter !== 'all') {
    queryParams.append('status', statusFilter);
  }
  if (searchInput) {
    queryParams.append('search', searchInput);
  }

  try {
    const res = await fetch(`/api/requests?${queryParams.toString()}`, {
      headers: getAuthHeaders(),
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return;
    }

    const data = await res.json();
    const requests = data.requests || [];

    countSpan.innerText = `Total: ${requests.length}`;

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
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="color: #ef4444; padding: 2rem;">
          Failed to load requests: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

function resetFilters() {
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('searchInput').value = '';
  loadAllRequests();
}

async function openUpdateModal(requestId) {
  const modal = document.getElementById('updateModal');
  const alertBox = document.getElementById('modalAlert');
  alertBox.innerHTML = '';

  try {
    const res = await fetch(`/api/requests/${requestId}`, {
      headers: getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch request.');

    activeRequest = data.request;

    document.getElementById('modalRequestId').innerText = activeRequest.requestId;
    document.getElementById('modalCurrentStatus').innerHTML = `
      <span class="badge ${getBadgeClass(activeRequest.status)}">${activeRequest.status}</span>
    `;
    document.getElementById('modalStudentName').innerText = `${activeRequest.studentName} (${activeRequest.studentRollNo || activeRequest.studentEmail})`;
    document.getElementById('modalRequestType').innerText = activeRequest.requestType;
    document.getElementById('modalRemarks').value = activeRequest.remarks || '';

    // Build Allowed Next Status Options based on Institutional Status Flow
    const nextStatusSelect = document.getElementById('modalNextStatus');
    const helpText = document.getElementById('statusFlowHelp');
    const allowedNext = STATUS_TRANSITIONS[activeRequest.status] || [];

    nextStatusSelect.innerHTML = '';

    // Always include option to keep current status (for remarks-only update)
    const keepOption = document.createElement('option');
    keepOption.value = activeRequest.status;
    keepOption.innerText = `Keep Current Status (${activeRequest.status})`;
    nextStatusSelect.appendChild(keepOption);

    if (allowedNext.length === 0) {
      helpText.innerText = `Terminal status reached (${activeRequest.status}). You can update remarks, but status cannot be changed further.`;
      nextStatusSelect.disabled = false;
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
  } catch (err) {
    alert('Error opening request: ' + err.message);
  }
}

function closeModal() {
  const modal = document.getElementById('updateModal');
  modal.classList.remove('active');
  activeRequest = null;
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

document.addEventListener('DOMContentLoaded', () => {
  currentUser = checkAuth('staff');
  if (!currentUser) return;

  const staffBadge = document.getElementById('staffBadge');
  if (staffBadge) {
    staffBadge.innerText = `${currentUser.name} (Staff)`;
  }

  loadAllRequests();

  // Search input on Enter
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        loadAllRequests();
      }
    });
  }

  // Handle Update Status form submit
  const updateForm = document.getElementById('updateStatusForm');
  if (updateForm) {
    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeRequest) return;

      const alertBox = document.getElementById('modalAlert');
      const saveBtn = document.getElementById('modalSaveBtn');
      alertBox.innerHTML = '';

      const newStatus = document.getElementById('modalNextStatus').value;
      const remarks = document.getElementById('modalRemarks').value;

      saveBtn.disabled = true;
      saveBtn.innerText = 'Updating...';

      try {
        const res = await fetch(`/api/requests/${activeRequest.requestId}`, {
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
        alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Update Request';
      }
    });
  }
});
