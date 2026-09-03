// ================================================================
//  NOVAFUNDS — user/withdrawals.js
//  Demande de retrait des gains
//  Emplacement : frontend/assets/js/user/withdrawals.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Affichage du solde disponible
//   3. Soumission d'une demande de retrait
//   4. Validation : montant minimum, seuils, méthode de paiement
//   5. Historique des demandes de retrait
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

const withdrawForm     = document.getElementById('withdrawal-form');
const amountInput      = document.getElementById('withdrawal-amount');
const methodSelect     = document.getElementById('withdrawal-method');
const detailsInput     = document.getElementById('withdrawal-details');
const submitBtn        = document.getElementById('withdrawal-submit-btn');
const withdrawError    = document.getElementById('withdrawal-error');
const withdrawSuccess  = document.getElementById('withdrawal-success');
const historyTbody     = document.getElementById('withdrawals-history-tbody');
const balanceDisplayEl = document.getElementById('available-balance-display');

// ---------------------------------------------------------------
// AFFICHAGE DU SOLDE DISPONIBLE
// ---------------------------------------------------------------

/**
 * Récupère et affiche le solde disponible pour le retrait.
 * @param {string} token
 */
async function loadAvailableBalance(token) {
  try {
    const response = await fetch(`${API_BASE}/user/wallet`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const wallet = await response.json();
    if (balanceDisplayEl) {
      balanceDisplayEl.textContent = `${wallet.balance_available ?? '0.00'} USD`;
    }
  } catch (err) {
    console.error('[Withdrawals] Erreur solde :', err.message);
  }
}

// ---------------------------------------------------------------
// VALIDATION DU FORMULAIRE DE RETRAIT
// ---------------------------------------------------------------

/**
 * Valide les champs du formulaire de demande de retrait.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateWithdrawalForm() {
  const amount  = parseFloat(amountInput?.value  ?? 0);
  const method  = methodSelect?.value            ?? '';
  const details = detailsInput?.value.trim()     ?? '';

  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Veuillez saisir un montant valide.' };
  }
  if (amount < 10) {
    return { valid: false, error: 'Le montant minimum de retrait est de 10 USD.' };
  }
  if (!method) {
    return { valid: false, error: 'Veuillez sélectionner une méthode de paiement.' };
  }
  if (!details) {
    return { valid: false, error: 'Veuillez renseigner les détails de paiement (numéro, compte...).' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------
// SOUMISSION DE LA DEMANDE DE RETRAIT
// ---------------------------------------------------------------

if (withdrawForm) {
  withdrawForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (withdrawError)   withdrawError.style.display   = 'none';
    if (withdrawSuccess) withdrawSuccess.style.display = 'none';

    const { valid, error } = validateWithdrawalForm();
    if (!valid) {
      if (withdrawError) { withdrawError.textContent = error; withdrawError.style.display = 'block'; }
      return;
    }

    const session = requireAuth();
    if (!session) return;

    const payload = {
      amount:          parseFloat(amountInput.value),
      payment_method:  methodSelect.value,
      payment_details: detailsInput.value.trim(),
    };

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Envoi de la demande…'; }

    try {
      const response = await fetch(`${API_BASE}/user/withdrawals`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:    JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la demande.');

      if (withdrawSuccess) {
        withdrawSuccess.textContent = 'Demande de retrait envoyée ! Elle sera traitée dans les 24-48h. ✅';
        withdrawSuccess.style.display = 'block';
      }
      withdrawForm.reset();
      loadWithdrawalHistory(session.token);
      loadAvailableBalance(session.token);

    } catch (err) {
      if (withdrawError) { withdrawError.textContent = err.message; withdrawError.style.display = 'block'; }
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Soumettre la demande'; }
    }
  });
}

// ---------------------------------------------------------------
// HISTORIQUE DES RETRAITS
// ---------------------------------------------------------------

/**
 * Charge et affiche l'historique des demandes de retrait de l'utilisateur.
 * @param {string} token
 */
async function loadWithdrawalHistory(token) {
  if (!historyTbody) return;
  historyTbody.innerHTML = '<tr><td colspan="5">Chargement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/user/withdrawals?limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger l\'historique.');

    const withdrawals = await response.json();

    if (!withdrawals.length) {
      historyTbody.innerHTML = '<tr><td colspan="5">Aucune demande de retrait.</td></tr>';
      return;
    }

    historyTbody.innerHTML = '';
    withdrawals.forEach(w => {
      const row = document.createElement('tr');
      const statusColors = { pending: 'orange', approved: 'green', rejected: 'red' };
      const statusLabels = { pending: '⏳ En attente', approved: '✅ Approuvé', rejected: '❌ Rejeté' };
      const color = statusColors[w.status] || 'black';

      row.innerHTML = `
        <td>${formatDate(w.requested_at)}</td>
        <td>${w.amount} USD</td>
        <td>${escapeHtml(w.payment_method)}</td>
        <td><strong style="color:${color};">${statusLabels[w.status] || w.status}</strong></td>
        <td>${escapeHtml(w.rejection_reason || '—')}</td>
      `;
      historyTbody.appendChild(row);
    });
  } catch (err) {
    console.error('[Withdrawals History] Erreur :', err.message);
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
  const session = requireAuth();
  if (!session) return;
  loadAvailableBalance(session.token);
  loadWithdrawalHistory(session.token);
})();
