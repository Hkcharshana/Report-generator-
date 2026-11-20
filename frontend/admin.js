// Super Admin Console Client Logic - NeoSys Medical Laboratory
let adminAuthToken = sessionStorage.getItem('adminAuthToken') || '';
let currentConfig = null;
let loadedPackagesList = [];

const $ = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

// Cross-tab real-time sync broadcaster
const neosysChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('neosys_security_sync') : null;

function notifyMainApp() {
  if (neosysChannel) {
    try { neosysChannel.postMessage({ timestamp: Date.now() }); } catch {}
  }
  try {
    localStorage.setItem('neosys_security_ping', String(Date.now()));
  } catch {}
}

function showToast(msg, isError = false) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = isError ? 'admin-toast error show' : 'admin-toast success show';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.className = 'admin-toast';
  }, 3500);
}

// 1. Check Authentication on Load
window.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupResultTypeWatcher();
  setupExportPoliciesWatchers();
  setupSearchFilters();
  setupTicketsDashboard();
  if (adminAuthToken) {
    loadDashboard();
  } else {
    showLoginView();
  }
});

function showLoginView() {
  const loginView = $('#loginView');
  const dashView = $('#dashboardView');
  const logoutBtn = $('#logoutBtn');
  if (loginView) loginView.style.display = 'flex';
  if (dashView) dashView.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'none';
  const userInput = $('#loginUsername');
  const passInput = $('#loginPassword');
  if (userInput) {
    userInput.value = '';
    userInput.focus();
  }
  if (passInput) passInput.value = '';
}

// 2. Tab Navigation (Supports both data-pane and data-tab, switches active-pane)
function switchTab(paneId) {
  $$('.tab-btn').forEach(b => {
    const match = (b.dataset.pane === paneId || b.dataset.tab === paneId);
    b.classList.toggle('active', match);
  });
  $$('.tab-pane').forEach(p => {
    const isTarget = (p.id === paneId);
    p.classList.toggle('active', isTarget);
    p.classList.toggle('active-pane', isTarget);
    p.style.display = isTarget ? 'block' : 'none';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchTab = switchTab;

function setupTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const paneId = btn.dataset.pane || btn.dataset.tab;
      if (paneId) switchTab(paneId);
    });
  });

  // Wire up Quick Laboratory Controls
  $('#btnQuickManageTests')?.addEventListener('click', () => switchTab('paneTests'));
  $('#btnQuickManagePackages')?.addEventListener('click', () => switchTab('panePackages'));
  $('#btnQuickManageUsers')?.addEventListener('click', () => switchTab('paneUsers'));
  $('#btnQuickChangePassword')?.addEventListener('click', () => switchTab('paneCredentials'));

  // Wire up Topbar interactive pills
  $('#systemStatusPill')?.addEventListener('click', () => switchTab('paneCredentials'));
  $('#topbarTestsPill')?.addEventListener('click', () => switchTab('paneTests'));
  $('#topbarPackagesPill')?.addEventListener('click', () => switchTab('panePackages'));
}

// ==========================================
// LABORATORY PATIENT RECORDS & LOOKUPS
// ==========================================
let ticketsHistoryList = [];
let filteredTicketsList = [];
let ticketCurrentPage = 1;
const ticketPageSize = 8;
let currentTicketFilter = 'all';
let currentTicketSearch = '';

function setupTicketsDashboard() {
  loadTicketsHistory();

  // Search input debounced
  let searchTimer = null;
  $('#ticketsSearchInput')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentTicketSearch = (e.target.value || '').trim().toLowerCase();
      ticketCurrentPage = 1;
      applyTicketsFilters();
    }, 200);
  });

  // Filter dropdown toggle & items
  const filterPill = $('#filterTestTypePill');
  const filterMenu = $('#filterDropdownMenu');
  const filterLabel = $('#filterTestTypeLabel');

  filterPill?.addEventListener('click', e => {
    e.stopPropagation();
    if (filterMenu) {
      filterMenu.style.display = filterMenu.style.display === 'block' ? 'none' : 'block';
    }
  });

  document.addEventListener('click', e => {
    if (filterMenu && !filterPill?.contains(e.target)) {
      filterMenu.style.display = 'none';
    }
  });

  $$('#filterDropdownMenu .filter-opt-item').forEach(item => {
    item.addEventListener('click', () => {
      const filterVal = item.dataset.filter || 'all';
      currentTicketFilter = filterVal;
      if (filterLabel) filterLabel.textContent = `Filter: ${item.textContent.trim()}`;
      if (filterMenu) filterMenu.style.display = 'none';
      ticketCurrentPage = 1;
      applyTicketsFilters();
    });
  });

  // Refresh records
  $('#btnRefreshTickets')?.addEventListener('click', async () => {
    await loadTicketsHistory();
    showToast('Patient records updated');
  });

  // Export CSV
  $('#btnExportTickets')?.addEventListener('click', () => {
    exportTicketsToCSV(filteredTicketsList.length > 0 ? filteredTicketsList : ticketsHistoryList);
  });

  // Pagination prev/next
  $('#btnPagePrev')?.addEventListener('click', () => {
    if (ticketCurrentPage > 1) {
      ticketCurrentPage--;
      renderTicketsTable(filteredTicketsList);
    }
  });

  $('#btnPageNext')?.addEventListener('click', () => {
    const maxPage = Math.ceil(filteredTicketsList.length / ticketPageSize) || 1;
    if (ticketCurrentPage < maxPage) {
      ticketCurrentPage++;
      renderTicketsTable(filteredTicketsList);
    }
  });

  // Modal close handlers
  $('#closeRecordModalBtn')?.addEventListener('click', () => {
    const m = $('#recordDetailModal');
    if (m) m.style.display = 'none';
  });
  $('#modalCloseActionBtn')?.addEventListener('click', () => {
    const m = $('#recordDetailModal');
    if (m) m.style.display = 'none';
  });
  $('#recordDetailModal')?.addEventListener('click', e => {
    if (e.target.id === 'recordDetailModal') {
      e.target.style.display = 'none';
    }
  });
}

async function loadTicketsHistory() {
  try {
    const res = await fetch('/api/reports/history');
    if (!res.ok) return;
    const data = await res.json();
    ticketsHistoryList = data.records || [];

    // Update KPI card counters
    const kpiReports = $('#kpiTotalReports');
    if (kpiReports) {
      kpiReports.textContent = (1200 + ticketsHistoryList.length).toLocaleString() + '+';
    }
    const kpiPatients = $('#kpiTotalPatients');
    if (kpiPatients) {
      kpiPatients.textContent = (data.totalPatients || 960).toLocaleString() + '+';
    }

    applyTicketsFilters();
  } catch (err) {
    console.error('Failed to load tickets history:', err);
  }
}

function applyTicketsFilters() {
  let list = ticketsHistoryList;

  // Filter by category / test
  if (currentTicketFilter && currentTicketFilter !== 'all') {
    list = list.filter(r => (r.specimen || '').toLowerCase().includes(currentTicketFilter));
  }

  // Filter by search query
  if (currentTicketSearch) {
    const q = currentTicketSearch;
    list = list.filter(r =>
      (r.ref && r.ref.toLowerCase().includes(q)) ||
      (r.patientName && r.patientName.toLowerCase().includes(q)) ||
      (r.passport && r.passport.toLowerCase().includes(q)) ||
      (r.agency && r.agency.toLowerCase().includes(q)) ||
      (r.generatedBy && r.generatedBy.toLowerCase().includes(q)) ||
      (r.specimen && r.specimen.toLowerCase().includes(q))
    );
  }

  filteredTicketsList = list;
  renderTicketsTable(filteredTicketsList);
}

function renderTicketsTable(records) {
  const tbody = $('#ticketsTableBody');
  const summary = $('#ticketsPaginationSummary');
  const pagesWrap = $('#pageNumbersWrap');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:36px; color:#94a3b8; font-style:italic;">No patient report records found matching your search.</td></tr>`;
    if (summary) summary.textContent = 'Showing 0 records';
    if (pagesWrap) pagesWrap.innerHTML = '<button class="page-btn active" data-page="1">1</button>';
    return;
  }

  const total = records.length;
  const maxPage = Math.ceil(total / ticketPageSize) || 1;
  if (ticketCurrentPage > maxPage) ticketCurrentPage = maxPage;

  const startIdx = (ticketCurrentPage - 1) * ticketPageSize;
  const endIdx = Math.min(startIdx + ticketPageSize, total);
  const pageItems = records.slice(startIdx, endIdx);

  tbody.innerHTML = pageItems.map(r => {
    const initial = (r.generatedBy || 'C').charAt(0).toUpperCase();
    const format = r.format || 'PDF';
    const formatClass = format === 'PDF' ? 'badge-red' : (format === 'Excel' ? 'badge-green' : 'badge-teal');

    return `
      <tr data-record-id="${escapeHtml(r.id)}" style="cursor:pointer;" title="Click to view full report record details">
        <td class="td-booking-id">${escapeHtml(r.ref || '0000')}</td>
        <td class="td-name"><strong>${escapeHtml(r.patientName || 'Patient Record')}</strong></td>
        <td><span style="font-family:monospace; font-size:12px; background:#f1f5f9; padding:2px 7px; border-radius:4px; color:#334155;">${escapeHtml(r.passport || '-')}</span></td>
        <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(r.agency || '-')}">${escapeHtml(r.agency || '-')}</td>
        <td style="white-space:nowrap; color:#64748b; font-size:12.5px;">${escapeHtml(r.date || '-')}</td>
        <td>
          <span style="font-weight:600; color:#0f172a;">${escapeHtml(r.specimen || 'General Test')}</span>
          <span class="badge ${formatClass}" style="margin-left:6px; font-size:10px; padding:1px 6px;">${escapeHtml(format)}</span>
        </td>
        <td>
          <div style="display:inline-flex; align-items:center; gap:6px; background:#f3e8ff; border:1px solid #e9d5ff; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; color:#7e22ce;">
            <span style="width:18px; height:18px; border-radius:50%; background:#9333ea; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">${initial}</span>
            <span>${escapeHtml(r.generatedBy || 'Chathura (Super Admin)')}</span>
          </div>
        </td>
        <td>
          <span class="status-pill-minted"><span class="status-dot-green"></span>${escapeHtml(r.status || 'Verified')}</span>
        </td>
      </tr>
    `;
  }).join('');

  // Row click event -> open detail modal
  tbody.querySelectorAll('tr[data-record-id]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-record-id');
      const rec = records.find(x => x.id === id);
      if (rec) openRecordDetailModal(rec);
    });
  });

  // Update summary
  if (summary) {
    summary.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${total} generated patient reports`;
  }

  // Update pagination controls
  if (pagesWrap) {
    let pagesHtml = '';
    for (let p = 1; p <= maxPage; p++) {
      if (p === 1 || p === maxPage || (p >= ticketCurrentPage - 1 && p <= ticketCurrentPage + 1)) {
        pagesHtml += `<button class="page-btn ${p === ticketCurrentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
      } else if (p === ticketCurrentPage - 2 || p === ticketCurrentPage + 2) {
        pagesHtml += `<span style="color:#94a3b8; padding:0 3px;">...</span>`;
      }
    }
    pagesWrap.innerHTML = pagesHtml;
    pagesWrap.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ticketCurrentPage = parseInt(btn.dataset.page, 10) || 1;
        renderTicketsTable(filteredTicketsList);
      });
    });
  }

  // Prev / Next button state
  const prevBtn = $('#btnPagePrev');
  const nextBtn = $('#btnPageNext');
  if (prevBtn) prevBtn.disabled = (ticketCurrentPage <= 1);
  if (nextBtn) nextBtn.disabled = (ticketCurrentPage >= maxPage);
}

function openRecordDetailModal(rec) {
  const modal = $('#recordDetailModal');
  const pName = $('#modalPatientName');
  const body = $('#modalDetailsBody');
  if (!modal || !body) return;

  if (pName) pName.textContent = rec.patientName || 'Patient Record';

  body.innerHTML = `
    <div>
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Reference Number</div>
      <div style="font-size:15px; font-weight:700; color:#0f766e; margin-top:2px;">${escapeHtml(rec.ref)}</div>
    </div>
    <div>
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Passport / NIC</div>
      <div style="font-size:14px; font-weight:600; color:#0f172a; margin-top:2px; font-family:monospace;">${escapeHtml(rec.passport)}</div>
    </div>
    <div>
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Medical Test / Specimen</div>
      <div style="font-size:13.5px; font-weight:600; color:#0f172a; margin-top:2px;">${escapeHtml(rec.specimen)}</div>
    </div>
    <div>
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Export Format</div>
      <div style="margin-top:2px;"><span class="badge ${rec.format === 'PDF' ? 'badge-red' : (rec.format === 'Excel' ? 'badge-green' : 'badge-teal')}">${escapeHtml(rec.format || 'PDF')}</span></div>
    </div>
    <div style="grid-column: 1 / -1;">
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Agency / Corporate Client</div>
      <div style="font-size:13.5px; color:#334155; margin-top:2px;">${escapeHtml(rec.agency)}</div>
    </div>
    <div>
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Generated By (Logged User)</div>
      <div style="margin-top:4px;">
        <span style="display:inline-flex; align-items:center; gap:6px; background:#f3e8ff; border:1px solid #e9d5ff; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; color:#7e22ce;">
          👤 ${escapeHtml(rec.generatedBy || 'Chathura')}
        </span>
      </div>
    </div>
    <div>
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Generated Date &amp; Time</div>
      <div style="font-size:12.5px; color:#334155; margin-top:2px;">${escapeHtml(rec.date)}</div>
    </div>
    <div style="grid-column: 1 / -1;">
      <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Status &amp; Verification</div>
      <div style="margin-top:4px;">
        <span class="status-pill-minted"><span class="status-dot-green"></span>${escapeHtml(rec.status || 'Verified')} - Authenticated Laboratory Report</span>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function exportTicketsToCSV(records) {
  if (!records || records.length === 0) {
    showToast('No records to export', true);
    return;
  }
  const headers = ['Ref No', 'Patient Name', 'Passport / NIC', 'Agency', 'Date', 'Specimen / Test', 'Format', 'Generated By', 'Branch', 'Status'];
  const rows = records.map(r => [
    `"${(r.ref || '').replace(/"/g, '""')}"`,
    `"${(r.patientName || '').replace(/"/g, '""')}"`,
    `"${(r.passport || '').replace(/"/g, '""')}"`,
    `"${(r.agency || '').replace(/"/g, '""')}"`,
    `"${(r.date || '').replace(/"/g, '""')}"`,
    `"${(r.specimen || '').replace(/"/g, '""')}"`,
    `"${(r.format || '').replace(/"/g, '""')}"`,
    `"${(r.generatedBy || '').replace(/"/g, '""')}"`,
    `"${(r.branch || '').replace(/"/g, '""')}"`,
    `"${(r.status || '').replace(/"/g, '""')}"`
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neosys_patient_reports_history_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Patient report history exported to CSV successfully');
}

// 3. Login Form Submit
$('#adminLoginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const username = $('#loginUsername')?.value?.trim();
  const pass = $('#loginPassword')?.value?.trim();
  const errEl = $('#loginError');
  if (!username || !pass) return;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: pass })
    });
    const data = await res.json();
    if (!res.ok) {
      if (errEl) {
        errEl.textContent = data.error || 'Invalid Super Admin username or password';
        errEl.style.display = 'block';
      }
      return;
    }
    adminAuthToken = data.token;
    sessionStorage.setItem('adminAuthToken', adminAuthToken);
    if (data.user) {
      sessionStorage.setItem('adminUser', JSON.stringify(data.user));
    }
    if (errEl) errEl.style.display = 'none';
    showToast(data.message || 'Access granted');
    await loadDashboard();
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Server connection failed. Please ensure the backend is running.';
      errEl.style.display = 'block';
    }
  }
});

// 4. Load Dashboard Config
async function loadDashboard() {
  try {
    const res = await fetch('/api/admin/config', {
      headers: { 'Authorization': `Bearer ${adminAuthToken}` }
    });
    if (!res.ok) {
      sessionStorage.removeItem('adminAuthToken');
      adminAuthToken = '';
      showLoginView();
      return;
    }
    const data = await res.json();
    currentConfig = data.config;

    const loginView = $('#loginView');
    const dashView = $('#dashboardView');
    const logoutBtn = $('#logoutBtn');
    if (loginView) loginView.style.display = 'none';
    if (dashView) dashView.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';

    renderDashboard(currentConfig);

    // Update user profile display in sidebar
    const userStr = sessionStorage.getItem('adminUser');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        const initialEl = $('#sidebarAvatarInitial');
        const nameEl = $('.sidebar-profile-name');
        const roleEl = $('.sidebar-profile-role');
        if (initialEl) initialEl.textContent = (u.fullName || u.username || 'A').charAt(0).toUpperCase();
        if (nameEl) nameEl.textContent = u.fullName || u.username || 'Admin';
        if (roleEl) {
          const roleMap = {
            superadmin: 'Super Admin',
            admin: 'Administrator',
            technician: 'Lab Technician',
            operator: 'Data Operator'
          };
          roleEl.textContent = roleMap[u.role] || 'Administrator';
        }
      } catch (e) {}
    }

    await loadAndRenderUsers();
  } catch (err) {
    console.error('Failed to load admin config:', err);
    showToast('Failed to load configuration', true);
  }
}

// 5. Render All Components
function renderDashboard(config) {
  if (!config) return;

  // 5.1 Lockdown Status
  const isLocked = !!config.lockAllReports;
  const lockToggle = $('#lockdownToggle');
  const banner = $('#lockdownBanner');
  const lockTitle = $('#lockdownTitle');
  const lockBadge = $('#lockdownBadge');
  const reasonWrap = $('#lockReasonWrap');
  const reasonInput = $('#lockReasonInput');
  const pill = $('#systemStatusPill');
  const pillText = $('#systemStatusText');

  if (lockToggle) lockToggle.checked = isLocked;
  if (banner) {
    banner.className = isLocked ? 'lockdown-banner active' : 'lockdown-banner';
  }
  if (lockTitle) {
    lockTitle.textContent = isLocked ? 'System Lockdown Active' : 'System Operational & Unlocked';
    lockTitle.style.color = isLocked ? '#ef4444' : '#0f172a';
  }
  if (lockBadge) {
    lockBadge.className = isLocked ? 'badge badge-red' : 'badge badge-green';
    lockBadge.textContent = isLocked ? 'LOCKDOWN ACTIVE' : 'ALL SYSTEMS LIVE';
  }
  if (reasonWrap) reasonWrap.style.display = isLocked ? 'block' : 'none';
  if (reasonInput) reasonInput.value = config.lockReason || '';
  if (pill) {
    pill.className = isLocked ? 'status-pill locked' : 'status-pill normal';
  }
  if (pillText) {
    pillText.textContent = isLocked ? 'Lockdown Active' : 'System Live';
  }
  const dot = $('#systemStatusDot');
  if (pill) {
    pill.style.background = isLocked ? '#fef2f2' : '#f0fdf4';
    pill.style.borderColor = isLocked ? '#fecaca' : '#bbf7d0';
    pill.style.color = isLocked ? '#991b1b' : '#166534';
  }
  if (dot) {
    dot.style.background = isLocked ? '#ef4444' : '#22c55e';
  }

  // 5.2 Test Permissions Matrix
  renderTestPermissions(config.testPermissions || {});

  // 5.3 Custom Tests Table
  renderCustomTests(config.customTests || []);

  // 5.3b Medical Packages
  loadAndRenderPackages();
  renderPackageTestsChecklist(config.testPermissions || {}, config.customTests || []);

  // 5.4 Export Policies
  if ($('#allowPdfToggle')) $('#allowPdfToggle').checked = config.allowedExportFormats?.pdf !== false;
  if ($('#allowExcelToggle')) $('#allowExcelToggle').checked = config.allowedExportFormats?.excel !== false;
  if ($('#allowWordToggle')) $('#allowWordToggle').checked = config.allowedExportFormats?.word !== false;
  if ($('#allowNoLetterheadToggle')) $('#allowNoLetterheadToggle').checked = config.allowNoLetterhead !== false;

  // 5.5 Audit Log
  renderAuditLog(config.auditLog || []);

  // KPI stat counters
  const totalAudit = Array.isArray(config.auditLog) ? config.auditLog.length : 0;
  if ($('#statAuditLogs')) $('#statAuditLogs').textContent = String(totalAudit);
  if ($('#statCustomTests')) $('#statCustomTests').textContent = String((config.customTests || []).length);
}

// 6. Render Categorized Test Permissions
function renderTestPermissions(permissions) {
  const container = $('#categorizedTestsGrid');
  if (!container) return;

  const categories = {};
  let total = 0;
  let active = 0;

  Object.entries(permissions).forEach(([name, spec]) => {
    const cat = spec.category || 'General Tests';
    if (!categories[cat]) categories[cat] = [];
    const isEnabled = spec.enabled !== false;
    categories[cat].push({ name, enabled: isEnabled });
    total++;
    if (isEnabled) active++;
  });

  const countBadge = $('#testsActiveCount');
  if (countBadge) countBadge.textContent = `${active} / ${total} Active`;
  const statTests = $('#statTotalTests');
  if (statTests) statTests.textContent = `${active} / ${total}`;
  const cardActive = $('#statActiveTestsCard');
  if (cardActive) cardActive.textContent = String(active);

  let html = '';
  Object.keys(categories).sort().forEach(cat => {
    const tests = categories[cat];
    const catActive = tests.filter(t => t.enabled).length;

    html += `
      <div class="category-card" data-cat-name="${cat.toLowerCase()}">
        <div class="category-header">
          <div class="category-info">
            <span class="category-name">${cat}</span>
            <span class="category-count">${catActive}/${tests.length} Active</span>
          </div>
        </div>
        <div class="test-list">
          ${tests.map(t => `
            <div class="test-item-row" data-test-name="${t.name.toLowerCase()}">
              <span class="test-name-txt" title="${t.name}">${t.name}</span>
              <label class="switch-toggle" title="Toggle ${t.name}">
                <input type="checkbox" class="perm-test-toggle" data-test="${t.name}" ${t.enabled ? 'checked' : ''}>
                <span class="toggle-track"></span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Auto-save on toggle change
  container.querySelectorAll('.perm-test-toggle').forEach(el => {
    el.addEventListener('change', () => {
      const all = container.querySelectorAll('.perm-test-toggle');
      const act = container.querySelectorAll('.perm-test-toggle:checked');
      if (countBadge) countBadge.textContent = `${act.length} / ${all.length} Active`;
      if (statTests) statTests.textContent = `${act.length} / ${all.length}`;
      if ($('#statActiveTestsCard')) $('#statActiveTestsCard').textContent = String(act.length);
      saveSecurityPolicy(true);
    });
  });
}

// Enable/Disable All Tests
$('#enableAllTestsBtn')?.addEventListener('click', () => {
  $$('#categorizedTestsGrid .perm-test-toggle').forEach(t => t.checked = true);
  const all = $$('#categorizedTestsGrid .perm-test-toggle').length;
  if ($('#testsActiveCount')) $('#testsActiveCount').textContent = `${all} / ${all} Active`;
  if ($('#statTotalTests')) $('#statTotalTests').textContent = `${all} / ${all}`;
  if ($('#statActiveTestsCard')) $('#statActiveTestsCard').textContent = String(all);
  saveSecurityPolicy(true);
  showToast('All tests enabled');
});

$('#disableAllTestsBtn')?.addEventListener('click', () => {
  $$('#categorizedTestsGrid .perm-test-toggle').forEach(t => t.checked = false);
  const all = $$('#categorizedTestsGrid .perm-test-toggle').length;
  if ($('#testsActiveCount')) $('#testsActiveCount').textContent = `0 / ${all} Active`;
  if ($('#statTotalTests')) $('#statTotalTests').textContent = `0 / ${all}`;
  if ($('#statActiveTestsCard')) $('#statActiveTestsCard').textContent = '0';
  saveSecurityPolicy(true);
  showToast('All tests disabled', true);
});

// Lockdown live toggle
$('#lockdownToggle')?.addEventListener('change', e => {
  const isLocked = e.target.checked;
  const banner = $('#lockdownBanner');
  const lockTitle = $('#lockdownTitle');
  const lockBadge = $('#lockdownBadge');
  const reasonWrap = $('#lockReasonWrap');
  const pill = $('#systemStatusPill');
  const pillText = $('#systemStatusText');
  const dot = $('#systemStatusDot');

  if (banner) banner.className = isLocked ? 'lockdown-banner active' : 'lockdown-banner';
  if (lockTitle) {
    lockTitle.textContent = isLocked ? 'System Lockdown Active' : 'System Operational & Unlocked';
    lockTitle.style.color = isLocked ? '#ef4444' : '#0f172a';
  }
  if (lockBadge) {
    lockBadge.className = isLocked ? 'badge badge-red' : 'badge badge-green';
    lockBadge.textContent = isLocked ? 'LOCKDOWN ACTIVE' : 'ALL SYSTEMS LIVE';
  }
  if (reasonWrap) reasonWrap.style.display = isLocked ? 'block' : 'none';
  if (pill) {
    pill.className = isLocked ? 'topbar-pill status-pill locked' : 'topbar-pill status-pill normal';
    pill.style.background = isLocked ? '#fef2f2' : '#f0fdf4';
    pill.style.borderColor = isLocked ? '#fecaca' : '#bbf7d0';
    pill.style.color = isLocked ? '#991b1b' : '#166534';
  }
  if (dot) dot.style.background = isLocked ? '#ef4444' : '#22c55e';
  if (pillText) pillText.textContent = isLocked ? 'Lockdown Active' : 'System Live';
  saveSecurityPolicy(true);
  showToast(isLocked ? 'Emergency System Lockdown Activated! (Logins Blocked)' : 'System Lockdown Released (Logins Allowed)');
});

$('#lockReasonInput')?.addEventListener('change', () => {
  saveSecurityPolicy(true);
});

// Export Policies live auto-save
function setupExportPoliciesWatchers() {
  ['allowPdfToggle', 'allowExcelToggle', 'allowWordToggle', 'allowNoLetterheadToggle'].forEach(id => {
    $(`#${id}`)?.addEventListener('change', () => saveSecurityPolicy(true));
  });
}

// Search filters
function setupSearchFilters() {
  // Test permissions search
  $('#testSearchInput')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    $$('#categorizedTestsGrid .category-card').forEach(card => {
      let anyMatch = false;
      const testRows = $$(card, '.test-item-row');
      testRows.forEach(row => {
        const name = row.getAttribute('data-test-name') || '';
        const match = !q || name.includes(q);
        row.style.display = match ? 'flex' : 'none';
        if (match) anyMatch = true;
      });
      card.style.display = (anyMatch || !q) ? 'block' : 'none';
    });
  });

  // Package test checklist search
  $('#pkgSearchTests')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    $$('#packageTestsChecklist .pkg-test-card').forEach(card => {
      const name = (card.getAttribute('data-test-name') || '').toLowerCase();
      const cat = (card.getAttribute('data-test-cat') || '').toLowerCase();
      const match = !q || name.includes(q) || cat.includes(q);
      card.style.display = match ? 'flex' : 'none';
    });
  });
}

// 7. Custom Tests: Result Type Dropdown Watcher
function setupResultTypeWatcher() {
  $('#ctType')?.addEventListener('change', e => {
    const type = e.target.value;
    const wrap = $('#ctOptionsWrap');
    const optInput = $('#ctOptions');
    if (type === 'pos_neg') {
      if (wrap) wrap.style.display = 'block';
      if (optInput) optInput.value = 'Negative, Positive';
    } else if (type === 'reactive_nonreactive') {
      if (wrap) wrap.style.display = 'block';
      if (optInput) optInput.value = 'Non-Reactive, Reactive';
    } else if (type === 'normal_abnormal') {
      if (wrap) wrap.style.display = 'block';
      if (optInput) optInput.value = 'Normal, Abnormal';
    } else if (type === 'numeric') {
      if (wrap) wrap.style.display = 'none';
    } else if (type === 'custom_options') {
      if (wrap) wrap.style.display = 'block';
      if (optInput) optInput.value = 'Negative, Positive, Weakly Positive';
    }
  });
}

// 8. Add Custom Test Form Submit
$('#customTestForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!adminAuthToken) return;

  const name = $('#ctName')?.value?.trim();
  const category = $('#ctCategory')?.value;
  const resultType = $('#ctType')?.value;
  const testLabel = $('#ctLabel')?.value?.trim() || name;
  const optionsRaw = $('#ctOptions')?.value?.trim();
  const unit = $('#ctUnit')?.value?.trim();
  const referenceRange = $('#ctRef')?.value?.trim();
  const method = $('#ctMethod')?.value?.trim() || 'Immunochromatography';
  const specimen = $('#ctSpecimen')?.value || 'Blood';

  let resultOptions = ['Negative', 'Positive'];
  if (resultType === 'reactive_nonreactive') {
    resultOptions = ['Non-Reactive', 'Reactive'];
  } else if (resultType === 'normal_abnormal') {
    resultOptions = ['Normal', 'Abnormal'];
  } else if (resultType === 'numeric') {
    resultOptions = [];
  } else if (optionsRaw) {
    resultOptions = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
  }

  try {
    const res = await fetch('/api/admin/custom-tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({
        name, category, testLabel, resultType, resultOptions, unit, referenceRange, method, specimen
      })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to create custom test');
      return;
    }
    showToast(`Custom test "${name}" created successfully!`);
    notifyMainApp();
    $('#ctName').value = '';
    $('#ctLabel').value = '';
    $('#ctUnit').value = '';
    $('#ctRef').value = '';
    await loadDashboard();
  } catch (err) {
    alert('Error connecting to server');
  }
});

// 9. Render Custom Tests Table
function renderCustomTests(tests) {
  const tbody = $('#customTestsTableBody');
  const countBadge = $('#customCountBadge');
  if (countBadge) countBadge.textContent = String((tests || []).length);
  if (!tbody) return;

  if (!Array.isArray(tests) || tests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#94a3b8; font-style:italic;">No custom test profiles created yet. Add one above!</td></tr>`;
    return;
  }

  tbody.innerHTML = tests.map(t => {
    const isEnabled = t.enabled !== false;
    const typeLabel = t.resultType === 'numeric' ? 'Numeric Value (with units & range)'
      : t.resultType === 'reactive_nonreactive' ? 'Non-Reactive / Reactive'
      : t.resultType === 'normal_abnormal' ? 'Normal / Abnormal'
      : (t.resultOptions ? t.resultOptions.join(', ') : 'Negative / Positive');

    return `
      <tr>
        <td>
          <div style="font-weight:700; color:#0f172a; font-size:13.5px;">${t.testLabel || t.name}</div>
          ${t.testLabel && t.testLabel !== t.name ? `<div style="font-size:11px; color:#64748b;">ID: ${t.name}</div>` : ''}
        </td>
        <td><span class="badge badge-blue">${t.category || 'General'}</span></td>
        <td>
          <div style="font-weight:600; color:#334155; font-size:12px;">${t.resultType || 'Options'}</div>
          <div style="font-size:11px; color:#64748b;">${typeLabel}</div>
        </td>
        <td>
          <div style="font-size:12px; font-weight:500;">${t.method || 'Rapid Test'}</div>
          <div style="font-size:11px; color:#64748b;">Specimen: ${t.specimen || 'Blood'}</div>
        </td>
        <td style="text-align:center;">
          <label class="switch-toggle" title="Toggle active status">
            <input type="checkbox" class="custom-test-toggle" data-id="${t.id}" ${isEnabled ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </td>
        <td style="text-align:right; white-space:nowrap;">
          <a href="/?test=${encodeURIComponent(t.name)}" target="_blank" class="btn btn-secondary btn-xs" style="margin-right:6px;" title="Open in Generator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Test
          </a>
          <button type="button" class="btn btn-danger btn-xs del-custom-btn" data-id="${t.id}" data-name="${t.name}" title="Delete test">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Toggle active state
  tbody.querySelectorAll('.custom-test-toggle').forEach(input => {
    input.addEventListener('change', async () => {
      const id = input.getAttribute('data-id');
      try {
        await fetch(`/api/admin/custom-tests/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminAuthToken}`
          },
          body: JSON.stringify({ enabled: input.checked })
        });
        showToast('Custom test updated');
        notifyMainApp();
      } catch {}
    });
  });

  // Delete test
  tbody.querySelectorAll('.del-custom-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      if (!confirm(`Are you sure you want to permanently delete custom test "${name}"?`)) return;
      try {
        const res = await fetch(`/api/admin/custom-tests/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminAuthToken}` }
        });
        if (res.ok) {
          showToast(`Custom test "${name}" deleted`);
          notifyMainApp();
          await loadDashboard();
        }
      } catch {}
    });
  });
}

// 10. Render Audit Log
function renderAuditLog(log) {
  const tbody = $('#auditTableBody');
  if (!tbody) return;

  if (!Array.isArray(log) || log.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#94a3b8; font-style:italic;">No security events recorded yet.</td></tr>`;
    return;
  }

  const reversed = [...log].reverse();
  tbody.innerHTML = reversed.slice(0, 100).map(entry => {
    const time = entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-GB') : '-';
    const isAllowed = entry.status === 'ALLOWED' || entry.status === 'SUCCESS';
    const badge = isAllowed ? '<span class="badge badge-green">SUCCESS</span>' : '<span class="badge badge-red">BLOCKED</span>';

    return `
      <tr>
        <td style="white-space:nowrap; color:#64748b; font-size:12px; font-family:monospace;">${time}</td>
        <td><strong style="color:#0f172a;">${entry.action || '-'}</strong></td>
        <td>${entry.test || entry.test_name || '-'}</td>
        <td style="color:#475569;">${entry.ref_no ? `Ref #${entry.ref_no}` : (entry.details || '-')}</td>
        <td style="text-align:center;">${badge}</td>
      </tr>
    `;
  }).join('');
}

// Clear Audit Log
$('#clearAuditBtn')?.addEventListener('click', async () => {
  if (!confirm('Clear all audit logs?')) return;
  try {
    const res = await fetch('/api/admin/clear-audit', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminAuthToken}` }
    });
    if (res.ok) {
      renderAuditLog([]);
      showToast('Audit log cleared');
      notifyMainApp();
    }
  } catch {}
});

// 11. Save Security Policy
async function saveSecurityPolicy(silent = false) {
  if (!adminAuthToken || !currentConfig) return;

  const updatedTestPermissions = { ...currentConfig.testPermissions };
  $$('#categorizedTestsGrid .perm-test-toggle').forEach(input => {
    const name = input.getAttribute('data-test');
    if (updatedTestPermissions[name]) {
      updatedTestPermissions[name].enabled = input.checked;
    } else {
      updatedTestPermissions[name] = { enabled: input.checked, category: 'General' };
    }
  });

  const payload = {
    lockAllReports: $('#lockdownToggle')?.checked ?? false,
    lockReason: $('#lockReasonInput')?.value?.trim() || 'Routine Maintenance / Security Review',
    allowedExportFormats: {
      pdf: $('#allowPdfToggle')?.checked ?? true,
      excel: $('#allowExcelToggle')?.checked ?? true,
      word: $('#allowWordToggle')?.checked ?? true
    },
    allowNoLetterhead: $('#allowNoLetterheadToggle')?.checked ?? true,
    testPermissions: updatedTestPermissions
  };

  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      if (!silent) showToast('Failed to save configuration', true);
      return;
    }
    const data = await res.json();
    currentConfig = data.config || currentConfig;
    currentConfig.testPermissions = updatedTestPermissions;
    notifyMainApp();

    if (!silent) {
      const notice = $('#saveStatusNotice');
      if (notice) {
        notice.style.display = 'inline-flex';
        setTimeout(() => { notice.style.display = 'none'; }, 4000);
      }
      showToast('Security policies & test permissions saved!');
    }
  } catch (err) {
    if (!silent) showToast('Error saving security policy', true);
  }
}

$('#savePolicyBtn')?.addEventListener('click', () => saveSecurityPolicy(false));

// 12. Password & PIN Update
$('#passwordChangeForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const notice = $('#passChangeNotice');
  const currentPassword = $('#currentPass')?.value;
  const newPassword = $('#newPass')?.value;
  const newPin = $('#newPin')?.value;
  const newUsername = $('#newUsernameInput')?.value?.trim();

  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ currentPassword, newPassword, newPin, newUsername })
    });
    const data = await res.json();
    if (!res.ok) {
      if (notice) {
        notice.textContent = data.error || 'Failed to update credentials';
        notice.className = 'notice-alert error';
        notice.style.display = 'block';
      }
      return;
    }
    if (notice) {
      let msg = 'Credentials updated successfully!';
      if (newUsername) msg = `Username changed to "${newUsername}" & credentials updated!`;
      notice.textContent = msg;
      notice.className = 'notice-alert success';
      notice.style.display = 'block';
    }
    $('#currentPass').value = '';
    $('#newPass').value = '';
    $('#newPin').value = '';
    if ($('#newUsernameInput')) $('#newUsernameInput').value = '';
    showToast('Credentials updated successfully');
  } catch (err) {
    if (notice) {
      notice.textContent = 'Server connection error';
      notice.className = 'notice-alert error';
      notice.style.display = 'block';
    }
  }
});

// 13. Logout
$('#logoutBtn')?.addEventListener('click', async () => {
  try {
    if (adminAuthToken) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminAuthToken}` }
      });
    }
  } catch (e) {}
  adminAuthToken = '';
  sessionStorage.removeItem('adminAuthToken');
  sessionStorage.removeItem('adminUser');
  showLoginView();
  showToast('Logged out securely');
});

// ==========================================
// 14. MEDICAL PACKAGES CONTROLLER
// ==========================================

async function loadAndRenderPackages() {
  if (!adminAuthToken) return;
  try {
    const res = await fetch('/api/admin/packages', {
      headers: { 'Authorization': `Bearer ${adminAuthToken}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    loadedPackagesList = data.packages || [];
    renderPackages(loadedPackagesList);
  } catch (err) {
    console.error('Failed to load packages:', err);
  }
}

function renderPackages(packages) {
  const tbody = $('#packagesTableBody');
  const countBadge = $('#pkgCountBadge');
  const statPkg = $('#statPackages');
  const total = (packages || []).length;
  if (countBadge) countBadge.textContent = String(total);
  if (statPkg) statPkg.textContent = String(total);
  if (!tbody) return;

  if (!packages || packages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#94a3b8; font-style:italic;">No medical packages configured. Create your first package above!</td></tr>`;
    return;
  }

  tbody.innerHTML = packages.map(pkg => {
    const isBuiltin = !!pkg.isBuiltin;
    const isEnabled = pkg.enabled !== false;
    const testList = pkg.tests || [];
    const testPills = testList.map(t => 
      `<span class="pkg-subtest-pill">${t}</span>`
    ).join('');

    return `
      <tr data-pkg-id="${pkg.id}" class="${isEnabled ? '' : 'row-disabled'}">
        <td>
          <div style="font-weight:700; color:#0f172a; font-size:14px;">${pkg.name}</div>
          <div style="font-size:11.5px; color:#64748b; font-family:monospace; margin-top:3px;">
            Code: <strong>${pkg.code || pkg.name}</strong>
          </div>
        </td>
        <td>
          ${isBuiltin 
            ? '<span class="badge badge-gray">Standard Built-in</span>' 
            : '<span class="badge badge-teal">Custom Package</span>'}
        </td>
        <td style="max-width:320px;">
          <div style="font-size:11px; font-weight:700; color:#0f766e; margin-bottom:4px;">
            ${testList.length} Tests Included:
          </div>
          <div class="pkg-pills-wrap">
            ${testPills || '<span style="color:#94a3b8; font-style:italic;">No tests assigned</span>'}
          </div>
        </td>
        <td style="color:#475569; font-size:12.5px; max-width:240px;">
          ${pkg.description || '-'}
        </td>
        <td style="text-align:center;">
          <label class="switch-toggle" title="${isEnabled ? 'Package Active' : 'Package Disabled'}">
            <input type="checkbox" class="admin-pkg-toggle" data-pkg-id="${pkg.id}" ${isEnabled ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </td>
        <td style="text-align:right; white-space:nowrap;">
          <a href="/?package=${encodeURIComponent(pkg.name)}" target="_blank" class="btn btn-secondary btn-xs" style="margin-right:6px;" title="Test package in Laboratory Generator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            Open
          </a>
          ${!isBuiltin ? `
            <button type="button" class="btn btn-danger btn-xs admin-delete-pkg-btn" data-pkg-id="${pkg.id}" data-pkg-name="${pkg.name}" title="Delete package">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          ` : '<span style="font-size:11px; color:#94a3b8; font-style:italic; padding-right:8px;">Standard</span>'}
        </td>
      </tr>
    `;
  }).join('');

  // Attach toggle listeners
  tbody.querySelectorAll('.admin-pkg-toggle').forEach(chk => {
    chk.addEventListener('change', async e => {
      const pkgId = e.target.dataset.pkgId;
      const enabled = e.target.checked;
      try {
        const res = await fetch(`/api/admin/packages/${pkgId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminAuthToken}`
          },
          body: JSON.stringify({ enabled })
        });
        if (!res.ok) {
          e.target.checked = !enabled;
          showToast('Failed to update package status', true);
          return;
        }
        showToast(`Package ${enabled ? 'Enabled' : 'Disabled'}`);
        notifyMainApp();
      } catch (err) {
        e.target.checked = !enabled;
        showToast('Connection error', true);
      }
    });
  });

  // Attach delete listeners
  tbody.querySelectorAll('.admin-delete-pkg-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      const btnEl = e.target.closest('button');
      const pkgId = btnEl.dataset.pkgId;
      const pkgName = btnEl.dataset.pkgName;
      if (!confirm(`Are you sure you want to delete medical package "${pkgName}"?`)) return;

      try {
        const res = await fetch(`/api/admin/packages/${pkgId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminAuthToken}` }
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to delete package');
          return;
        }
        showToast(`Package "${pkgName}" deleted`);
        notifyMainApp();
        await loadAndRenderPackages();
      } catch (err) {
        showToast('Connection error', true);
      }
    });
  });
}

// Update selected count badge for package builder
function updateSelectedPackageTestsCount() {
  const selected = $$('#packageTestsChecklist input[name="pkg_tests"]:checked');
  const countEl = $('#pkgSelectedCount');
  if (countEl) {
    countEl.textContent = `${selected.length} tests selected`;
    countEl.className = selected.length > 0 ? 'badge badge-teal' : 'badge badge-gray';
  }
}

// Render test checkboxes for package builder
function renderPackageTestsChecklist(permissions, customTests) {
  const container = $('#packageTestsChecklist');
  if (!container) return;

  const standardTests = [
    { name: 'Urine Full Report', cat: 'Urinalysis' },
    { name: 'Full Blood Count', cat: 'Hematology' },
    { name: 'FBS', cat: 'Routine Chemistry' },
    { name: 'RBS', cat: 'Routine Chemistry' },
    { name: 'Total Cholesterol', cat: 'Lipid / Cardiac' },
    { name: 'Lipid Profile', cat: 'Lipid / Cardiac' },
    { name: 'SGPT', cat: 'Liver Function' },
    { name: 'SGOT', cat: 'Liver Function' },
    { name: 'SGPT & SGOT', cat: 'Liver Function' },
    { name: 'Total Bilirubine', cat: 'Liver Function' },
    { name: 'Serum Creatine', cat: 'Renal Function' },
    { name: 'Haemoglobin A1C', cat: 'Diabetes' },
    { name: 'Tuberculosis Rapid Test', cat: 'Infectious Disease' },
    { name: 'Brucellosis Test', cat: 'Infectious Disease' },
    { name: 'HIV Ag & Ab Test', cat: 'Infectious Disease' },
    { name: 'Urine Drug Screening (12 Drugs)', cat: 'Toxicology' },
    { name: 'Urine Drug Screening (5 Drugs)', cat: 'Toxicology' },
    { name: 'Total β - HCG Concentration', cat: 'Hormones / FIA' },
    { name: 'BETA H.C.G.', cat: 'Rapid Immunoassay' },
    { name: 'Gonorrhea', cat: 'Serology' },
    { name: 'Differential Count', cat: 'Hematology' }
  ];

  // Append any custom tests
  (customTests || []).forEach(ct => {
    if (!standardTests.some(t => t.name.toLowerCase() === ct.name.toLowerCase())) {
      standardTests.push({ name: ct.name, cat: ct.category || 'Custom Tests' });
    }
  });

  container.innerHTML = standardTests.map((t, idx) => `
    <label class="pkg-test-card" data-test-name="${t.name.toLowerCase()}" data-test-cat="${t.cat.toLowerCase()}">
      <input type="checkbox" name="pkg_tests" value="${t.name}">
      <div class="pkg-test-info">
        <span class="pkg-test-title">${t.name}</span>
        <span class="pkg-test-cat-tag">${t.cat}</span>
      </div>
      <div class="pkg-test-check-indicator">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </label>
  `).join('');

  // Add click/change listeners to update count and highlight active state
  container.querySelectorAll('input[name="pkg_tests"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const card = cb.closest('.pkg-test-card');
      if (card) {
        if (cb.checked) card.classList.add('selected');
        else card.classList.remove('selected');
      }
      updateSelectedPackageTestsCount();
    });
  });

  updateSelectedPackageTestsCount();
}

// Select All / Clear All buttons
$('#pkgSelectAllTestsBtn')?.addEventListener('click', () => {
  $$('#packageTestsChecklist input[name="pkg_tests"]').forEach(cb => {
    cb.checked = true;
    cb.closest('.pkg-test-card')?.classList.add('selected');
  });
  updateSelectedPackageTestsCount();
});

$('#pkgClearAllTestsBtn')?.addEventListener('click', () => {
  $$('#packageTestsChecklist input[name="pkg_tests"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.pkg-test-card')?.classList.remove('selected');
  });
  updateSelectedPackageTestsCount();
});

$('#refreshPackagesBtn')?.addEventListener('click', async () => {
  await loadAndRenderPackages();
  showToast('Packages refreshed');
});

// Create Package Form Submission
$('#packageForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!adminAuthToken) return;

  const name = $('#pkgName')?.value?.trim();
  const code = $('#pkgCode')?.value?.trim() || name;
  const description = $('#pkgDescription')?.value?.trim() || '';
  const selectedTests = $$('#packageTestsChecklist input[name="pkg_tests"]:checked').map(cb => cb.value);

  if (!name) {
    alert('Please enter a package name');
    $('#pkgName')?.focus();
    return;
  }
  if (selectedTests.length === 0) {
    alert('Please select at least one test to include in this medical package');
    return;
  }

  const submitBtn = $('#savePackageBtn') || e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Saving Package...';
  }

  try {
    const res = await fetch('/api/admin/packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({
        name,
        code,
        description,
        tests: selectedTests
      })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to create package');
      return;
    }

    showToast(`Medical package "${name}" created with ${selectedTests.length} reports!`);
    notifyMainApp();
    $('#pkgName').value = '';
    $('#pkgCode').value = '';
    $('#pkgDescription').value = '';
    $$('#packageTestsChecklist input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
      cb.closest('.pkg-test-card')?.classList.remove('selected');
    });
    updateSelectedPackageTestsCount();
    await loadAndRenderPackages();
  } catch (err) {
    alert('Server connection error. Please ensure the backend server is running.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
});

// ==========================================
// 15. USER MANAGEMENT CONTROLLER (CRYPTO-HARDENED)
// ==========================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let allUsersList = [];

async function loadAndRenderUsers() {
  if (!adminAuthToken) return;
  const tbody = $('#usersTableBody');
  const countBadge = $('#usersCountBadge');
  const totalCard = $('#statTotalUsersCard');
  const activeText = $('#activeUsersCountText');

  try {
    const res = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${adminAuthToken}` }
    });
    if (!res.ok) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#ef4444;">Access restricted. Super Admin permissions required to manage users.</td></tr>`;
      return;
    }
    const data = await res.json();
    allUsersList = data.users || [];

    if (countBadge) countBadge.textContent = allUsersList.length;
    if (totalCard) totalCard.textContent = allUsersList.length;

    const activeCount = allUsersList.filter(u => u.status === 'active').length;
    if (activeText) activeText.textContent = `${activeCount} Active / ${allUsersList.length} Total`;

    renderUsersTable(allUsersList);
  } catch (err) {
    console.error('Failed to load users:', err);
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#ef4444;">Server connection error while loading users.</td></tr>`;
  }
}

function renderUsersTable(users) {
  const tbody = $('#usersTableBody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:36px; color:#94a3b8;">No staff accounts registered. Click "Add New User" above.</td></tr>`;
    return;
  }

  const roleStyles = {
    superadmin: { label: 'Super Admin', color: '#9333ea', bg: '#f3e8ff' },
    admin: { label: 'Administrator', color: '#4f46e5', bg: '#e0e7ff' },
    technician: { label: 'Lab Technician', color: '#0284c7', bg: '#e0f2fe' },
    operator: { label: 'Data Operator', color: '#475569', bg: '#f1f5f9' }
  };

  tbody.innerHTML = users.map(u => {
    const r = roleStyles[u.role] || roleStyles.operator;
    const initial = (u.fullName || u.username || 'U').charAt(0).toUpperCase();
    const createdDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '-';
    const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' }) : 'Never';
    const isActive = u.status === 'active';
    const isSuper = u.role === 'superadmin';

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:50%; background:${r.bg}; color:${r.color}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0;">
              ${initial}
            </div>
            <div>
              <div style="font-weight:700; color:#0f172a; font-size:13.5px;">${escapeHtml(u.fullName || u.username)}</div>
              <div style="font-size:12px; color:#64748b; font-family:monospace;">@${escapeHtml(u.username)}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:50px; font-size:11.5px; font-weight:700; background:${r.bg}; color:${r.color};">
            ${r.label}
          </span>
        </td>
        <td>
          <span class="badge ${isActive ? 'badge-green' : 'badge-red'}">
            ${isActive ? '✓ Active' : '✕ Disabled'}
          </span>
        </td>
        <td style="color:#64748b; font-size:12.5px;">${createdDate}</td>
        <td style="color:#64748b; font-size:12.5px;">${lastLogin}</td>
        <td style="text-align:center;">
          <div style="display:inline-flex; gap:6px; align-items:center;">
            <button type="button" class="btn btn-secondary btn-xs edit-user-btn" data-id="${u.id}" title="Edit User">
              ✏️ Edit
            </button>
            <button type="button" class="btn ${isActive ? 'btn-secondary' : 'btn-success'} btn-xs toggle-user-btn" data-id="${u.id}" data-status="${u.status}" title="${isActive ? 'Disable User' : 'Enable User'}" ${isSuper ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
              ${isActive ? 'Disable' : 'Enable'}
            </button>
            <button type="button" class="btn btn-danger btn-xs delete-user-btn" data-id="${u.id}" title="Delete User" ${isSuper ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach button event listeners
  $$('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditUser(btn.dataset.id));
  });

  $$('.toggle-user-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleUserStatus(btn.dataset.id, btn.dataset.status));
  });

  $$('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.dataset.id));
  });
}

// Open Add User Card
$('#openAddUserBtn')?.addEventListener('click', () => {
  const card = $('#addUserCard');
  if (!card) return;
  card.style.display = 'block';
  $('#userFormTitle').textContent = 'Create New User Account';
  $('#editUserId').value = '';
  $('#newUName').value = '';
  $('#newUName').disabled = false;
  $('#newUFullName').value = '';
  $('#newURole').value = 'operator';
  $('#newUStatus').value = 'active';
  $('#newUPass').value = '';
  $('#newUPassConfirm').value = '';
  $('#newUPassReq').style.display = 'inline';
  $('#newUPassConfirmReq').style.display = 'inline';
  $('#newUPass').placeholder = 'Minimum 4 characters';
  $('#newUPassConfirm').placeholder = 'Re-enter password';
  const notice = $('#userFormNotice');
  if (notice) notice.style.display = 'none';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Close Add User Card
$('#closeAddUserBtn')?.addEventListener('click', () => {
  const card = $('#addUserCard');
  if (card) card.style.display = 'none';
});

// Edit user function
function openEditUser(userId) {
  const u = allUsersList.find(x => x.id === userId);
  if (!u) return;

  const card = $('#addUserCard');
  if (!card) return;
  card.style.display = 'block';
  $('#userFormTitle').textContent = `Edit Account: @${u.username}`;
  $('#editUserId').value = u.id;
  $('#newUName').value = u.username;
  $('#newUName').disabled = true; // username cannot be altered after creation
  $('#newUFullName').value = u.fullName || u.username;
  $('#newURole').value = u.role || 'operator';
  $('#newUStatus').value = u.status || 'active';
  $('#newUPass').value = '';
  $('#newUPassConfirm').value = '';
  $('#newUPassReq').style.display = 'none';
  $('#newUPassConfirmReq').style.display = 'none';
  $('#newUPass').placeholder = 'Leave blank to keep current password';
  $('#newUPassConfirm').placeholder = 'Leave blank to keep current password';

  const notice = $('#userFormNotice');
  if (notice) notice.style.display = 'none';
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Add/Edit user form submit
$('#addUserForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const notice = $('#userFormNotice');
  const editId = $('#editUserId')?.value;
  const username = $('#newUName')?.value?.trim();
  const fullName = $('#newUFullName')?.value?.trim();
  const role = $('#newURole')?.value;
  const status = $('#newUStatus')?.value;
  const pass = $('#newUPass')?.value;
  const confirmPass = $('#newUPassConfirm')?.value;

  // Validation
  if (!editId && (!pass || pass.length < 4)) {
    if (notice) {
      notice.textContent = 'Password must be at least 4 characters long';
      notice.className = 'notice-alert error';
      notice.style.display = 'block';
    }
    return;
  }

  if (pass && pass !== confirmPass) {
    if (notice) {
      notice.textContent = 'Passwords do not match. Please re-enter identical passwords.';
      notice.className = 'notice-alert error';
      notice.style.display = 'block';
    }
    return;
  }

  const saveBtn = $('#saveUserBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Securing & Saving...';
  }

  try {
    let res;
    if (editId) {
      // Update existing
      res = await fetch(`/api/admin/users/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          fullName,
          role,
          status,
          newPassword: pass || undefined
        })
      });
    } else {
      // Create new
      res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminAuthToken}`
        },
        body: JSON.stringify({
          username,
          fullName,
          role,
          status,
          password: pass
        })
      });
    }

    const data = await res.json();
    if (!res.ok) {
      if (notice) {
        notice.textContent = data.error || 'Failed to save user';
        notice.className = 'notice-alert error';
        notice.style.display = 'block';
      }
      return;
    }

    showToast(data.message || 'User account saved successfully!');
    $('#addUserCard').style.display = 'none';
    await loadAndRenderUsers();
  } catch (err) {
    if (notice) {
      notice.textContent = 'Server connection error. Please ensure the backend is running.';
      notice.className = 'notice-alert error';
      notice.style.display = 'block';
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
        Save User Account
      `;
    }
  }
});

// Toggle user active / disabled status
async function toggleUserStatus(userId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const actionText = newStatus === 'active' ? 'enable' : 'disable';

  if (!confirm(`Are you sure you want to ${actionText} this user account?`)) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminAuthToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || `Failed to ${actionText} user`);
      return;
    }
    showToast(`User status updated to ${newStatus}`);
    await loadAndRenderUsers();
  } catch (err) {
    alert('Server connection error');
  }
}

// Delete user account
async function deleteUser(userId) {
  const u = allUsersList.find(x => x.id === userId);
  const name = u ? u.username : 'this user';

  if (!confirm(`CAUTION: Are you sure you want to permanently delete user account "@${name}"? This action cannot be undone.`)) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminAuthToken}` }
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete user');
      return;
    }
    showToast(`User "@${name}" deleted successfully`);
    await loadAndRenderUsers();
  } catch (err) {
    alert('Server connection error');
  }
}

// Search users in table
$('#userSearchInput')?.addEventListener('input', e => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderUsersTable(allUsersList);
    return;
  }
  const filtered = allUsersList.filter(u =>
    (u.username && u.username.toLowerCase().includes(query)) ||
    (u.fullName && u.fullName.toLowerCase().includes(query)) ||
    (u.role && u.role.toLowerCase().includes(query))
  );
  renderUsersTable(filtered);
});
