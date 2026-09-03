// ================================================================
//  NOVAFUNDS — admin/withdrawals.js
//  Gestion des demandes de retrait des utilisateurs
//  Emplacement : frontend/assets/js/admin/withdrawals.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de la session admin
//   2. Chargement des demandes de retrait en attente
//   3. Actions : Approuver ou Rejeter un retrait
//   4. Affichage des retraits traités (historique)
//
// ================================================================

const API_BASE = '/api';

function requireAdmin() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    window.location.href = '../public/login.html';
    return null;
  }
  return { token, user };
}

// ---------------------------------------------------------------
// RÉFÉRENCES DOM
// ---------------------------------------------------------------

const pendingTbody  = document.getElementById('withdrawals-pending-tbody');  // Retraits en attente
const historyTbody  = document.getElementById('withdrawals-history-tbody');  // Historique

// ---------------------------------------------------------------
// CHARGEMENT DES RETRAITS EN ATTENTE
// ---------------------------------------------------------------

/**
 * Récupère les demandes de retrait en attente depuis l'API.
 * @param {string} token
 */
async function loadPendingWithdrawals(token) {
  if (!pendingTbody) return;
  pendingTbody.innerHTML = '<tr><td colspan="7">Chargement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/withdrawals?status=pending`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les retraits.');

    const withdrawals = await response.json();
    renderWithdrawalsTable(pendingTbody, withdrawals, token, true);

  } catch (err) {
    if (pendingTbody) pendingTbody.innerHTML = `<tr><td colspan="7" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

/**
 * Récupère l'historique des retraits traités (approuvés/rejetés).
 * @param {string} token
 */
async function loadWithdrawalHistory(token) {
  if (!historyTbody) return;
  historyTbody.innerHTML = '<tr><td colspan="7">Chargement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/withdrawals?status=processed&limit=30`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger l\'historique.');

    const withdrawals = await response.json();
    renderWithdrawalsTable(historyTbody, withdrawals, token, false);

  } catch (err) {
    if (historyTbody) historyTbody.innerHTML = `<tr><td colspan="7" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------------------------------------------------------------
// RENDU DU TABLEAU
// ---------------------------------------------------------------

/**
 * Génère les lignes du tableau des retraits.
 * @param {HTMLElement} tbody       - Le corps du tableau cible
 * @param {Array}       withdrawals - Liste des retraits
 * @param {string}      token
 * @param {boolean}     showActions - Affiche les boutons d'action si true
 */
function renderWithdrawalsTable(tbody, withdrawals, token, showActions) {
  if (!withdrawals || withdrawals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">Aucune demande trouvée.</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  withdrawals.forEach(w => {
    const row = document.createElement('tr');
    const statusColor = { pending: 'orange', approved: 'green', rejected: 'red' }[w.status] || 'black';

    row.innerHTML = `
      <td>${escapeHtml(w.id)}</td>
      <td>${escapeHtml(w.username)}</td>
      <td>${w.amount} USD</td>
      <td>${escapeHtml(w.payment_method)}</td>
      <td>${escapeHtml(w.payment_details)}</td>
      <td><strong style="color:${statusColor};">${escapeHtml(w.status.toUpperCase())}</strong></td>
      <td>${formatDate(w.requested_at)}</td>
      ${showActions ? `
        <td>
          <button class="btn-approve-withdrawal" data-id="${w.id}" data-amount="${w.amount}">✅ Approuver</button>
          <button class="btn-reject-withdrawal"  data-id="${w.id}">❌ Rejeter</button>
        </td>
      ` : '<td>—</td>'}
    `;
    tbody.appendChild(row);
  });

  if (showActions) attachWithdrawalEvents(token);
}

// ---------------------------------------------------------------
// ACTIONS SUR LES RETRAITS
// ---------------------------------------------------------------

function attachWithdrawalEvents(token) {
  document.querySelectorAll('.btn-approve-withdrawal').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wId    = btn.dataset.id;
      const amount = btn.dataset.amount;
      if (!confirm(`Approuver le retrait de ${amount} USD (#${wId}) ?\nAssurez-vous d'avoir effectué le virement.`)) return;
      await processWithdrawal(wId, 'approve', null, token);
    });
  });

  document.querySelectorAll('.btn-reject-withdrawal').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wId    = btn.dataset.id;
      const reason = prompt('Raison du rejet :');
      if (reason === null) return;
      await processWithdrawal(wId, 'reject', reason, token);
    });
  });
}

/**
 * Envoie la décision d'approbation ou de rejet au serveur.
 * @param {string}      wId      - ID du retrait
 * @param {string}      decision - 'approve' | 'reject'
 * @param {string|null} reason   - Raison du rejet
 * @param {string}      token
 */
async function processWithdrawal(wId, decision, reason, token) {
  try {
    const response = await fetch(`${API_BASE}/admin/withdrawals/${wId}/review`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ decision, reason }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erreur.');
    alert(`Retrait #${wId} : ${decision === 'approve' ? 'Approuvé ✅' : 'Rejeté ❌'}`);
    loadPendingWithdrawals(token);
    loadWithdrawalHistory(token);
  } catch (err) {
    alert(`Erreur : ${err.message}`);
  }
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
  const session = requireAdmin();
  if (!session) return;
  loadPendingWithdrawals(session.token);
  loadWithdrawalHistory(session.token);
})();
