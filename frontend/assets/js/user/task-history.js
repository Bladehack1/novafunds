// ================================================================
//  NOVAFUNDS — user/task-history.js
//  Historique des tâches soumises par l'utilisateur
//  Emplacement : frontend/assets/js/user/task-history.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Chargement de l'historique des soumissions
//   3. Affichage avec statut (en attente, validée, refusée)
//   4. Filtrage par statut
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

const historyTbody = document.getElementById('task-history-tbody');
const filterStatus = document.getElementById('history-filter-status');

// ---------------------------------------------------------------
// CHARGEMENT DE L'HISTORIQUE
// ---------------------------------------------------------------

/**
 * Charge l'historique des tâches soumises par l'utilisateur.
 * @param {string} token
 * @param {string} status - Filtre de statut ('pending' | 'approved' | 'rejected' | '')
 */
async function loadTaskHistory(token, status = '') {
  if (!historyTbody) return;
  historyTbody.innerHTML = '<tr><td colspan="5">Chargement…</td></tr>';

  try {
    const params = new URLSearchParams({ limit: 50 });
    if (status) params.append('status', status);

    const response = await fetch(`${API_BASE}/user/tasks/history?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger l\'historique.');

    const submissions = await response.json();
    renderHistory(submissions);

  } catch (err) {
    console.error('[Task History] Erreur :', err.message);
    if (historyTbody) historyTbody.innerHTML = `<tr><td colspan="5" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DU TABLEAU
// ---------------------------------------------------------------

/**
 * Génère les lignes du tableau d'historique.
 * @param {Array} submissions
 */
function renderHistory(submissions) {
  if (!historyTbody) return;

  if (!submissions || submissions.length === 0) {
    historyTbody.innerHTML = '<tr><td colspan="5">Aucune soumission trouvée.</td></tr>';
    return;
  }

  historyTbody.innerHTML = '';

  submissions.forEach(s => {
    const row = document.createElement('tr');

    // Couleur selon le statut de la soumission
    const statusColors = { pending: 'orange', approved: 'green', rejected: 'red' };
    const color = statusColors[s.status] || 'black';
    const labels = { pending: '⏳ En attente', approved: '✅ Validée', rejected: '❌ Refusée' };
    const label  = labels[s.status] || s.status;

    row.innerHTML = `
      <td>${escapeHtml(s.task_title)}</td>
      <td>${formatDate(s.submitted_at)}</td>
      <td><strong style="color:${color};">${label}</strong></td>
      <td>${s.status === 'approved' ? `+${s.reward} USD` : '—'}</td>
      <td>${escapeHtml(s.rejection_reason || '—')}</td>
    `;
    historyTbody.appendChild(row);
  });
}

// ---------------------------------------------------------------
// FILTRE PAR STATUT
// ---------------------------------------------------------------

if (filterStatus) {
  filterStatus.addEventListener('change', () => {
    const session = requireAuth();
    if (!session) return;
    loadTaskHistory(session.token, filterStatus.value);
  });
}

// ---------------------------------------------------------------
// FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAuth();
  if (!session) return;
  loadTaskHistory(session.token);
})();
