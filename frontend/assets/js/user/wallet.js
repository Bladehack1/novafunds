// ================================================================
//  NOVAFUNDS — user/wallet.js
//  Portefeuille et résumé financier de l'utilisateur
//  Emplacement : frontend/assets/js/user/wallet.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Chargement des soldes (total, disponible, gains tâches, parrainage)
//   3. Affichage de l'historique des transactions
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

const txTbody = document.getElementById('transactions-tbody');

// ---------------------------------------------------------------
// CHARGEMENT DU PORTEFEUILLE
// ---------------------------------------------------------------

/**
 * Récupère les données financières de l'utilisateur depuis l'API
 * et met à jour les éléments de la page.
 * @param {string} token
 */
async function loadWallet(token) {
  try {
    const response = await fetch(`${API_BASE}/user/wallet`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger le portefeuille.');

    const wallet = await response.json();

    // Mise à jour des soldes affichés
    setTextById('wallet-balance-total',     `${wallet.balance_total     ?? '0.00'} USD`);
    setTextById('wallet-balance-available', `${wallet.balance_available ?? '0.00'} USD`);
    setTextById('wallet-task-income',       `${wallet.task_income       ?? '0.00'} USD`);
    setTextById('wallet-referral-income',   `${wallet.referral_income   ?? '0.00'} USD`);
    setTextById('wallet-total-withdrawn',   `${wallet.total_withdrawn   ?? '0.00'} USD`);

  } catch (err) {
    console.error('[Wallet] Erreur :', err.message);
  }
}

// ---------------------------------------------------------------
// CHARGEMENT DE L'HISTORIQUE DES TRANSACTIONS
// ---------------------------------------------------------------

/**
 * Charge et affiche les dernières transactions de l'utilisateur.
 * @param {string} token
 */
async function loadTransactions(token) {
  if (!txTbody) return;
  txTbody.innerHTML = '<tr><td colspan="4">Chargement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/user/wallet/transactions?limit=30`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les transactions.');

    const transactions = await response.json();

    if (!transactions.length) {
      txTbody.innerHTML = '<tr><td colspan="4">Aucune transaction pour le moment.</td></tr>';
      return;
    }

    txTbody.innerHTML = '';

    transactions.forEach(tx => {
      const row  = document.createElement('tr');
      // Montant positif = crédit (vert), négatif = débit (rouge)
      const color = tx.amount >= 0 ? 'green' : 'red';
      const sign  = tx.amount >= 0 ? '+' : '';

      row.innerHTML = `
        <td>${formatDate(tx.created_at)}</td>
        <td>${escapeHtml(tx.type_label)}</td>
        <td><strong style="color:${color};">${sign}${tx.amount} USD</strong></td>
        <td>${escapeHtml(tx.description || '—')}</td>
      `;
      txTbody.appendChild(row);
    });

  } catch (err) {
    console.error('[Transactions] Erreur :', err.message);
    if (txTbody) txTbody.innerHTML = `<tr><td colspan="4" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------------------------------------------------------------
// FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
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
  loadWallet(session.token);
  loadTransactions(session.token);
})();
