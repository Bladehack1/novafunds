// ================================================================
//  NOVAFUNDS — admin/payments.js
//  Vérification des paiements d'activation de compte (10 USD)
//  Emplacement : frontend/assets/js/admin/payments.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de la session admin
//   2. Chargement des preuves de paiement en attente
//   3. Affichage des captures d'écran de paiement
//   4. Actions : Confirmer (activer le compte) ou Rejeter
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

const paymentsTbody = document.getElementById('payments-tbody');

// ---------------------------------------------------------------
// CHARGEMENT DES PREUVES D'ACTIVATION EN ATTENTE
// ---------------------------------------------------------------

/**
 * Récupère les preuves de paiement d'activation en attente de vérification.
 * @param {string} token
 */
async function loadPendingPayments(token) {
  if (!paymentsTbody) return;
  paymentsTbody.innerHTML = '<tr><td colspan="7">Chargement des preuves de paiement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/payments?status=pending`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les paiements.');

    const payments = await response.json();
    renderPaymentsTable(payments, token);

  } catch (err) {
    console.error('[Payments] Erreur :', err.message);
    if (paymentsTbody) paymentsTbody.innerHTML = `<tr><td colspan="7" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DU TABLEAU
// ---------------------------------------------------------------

/**
 * Insère les lignes du tableau pour chaque preuve de paiement en attente.
 * @param {Array}  payments - Liste des paiements
 * @param {string} token
 */
function renderPaymentsTable(payments, token) {
  if (!paymentsTbody) return;

  if (!payments || payments.length === 0) {
    paymentsTbody.innerHTML = '<tr><td colspan="7">Aucune preuve de paiement en attente. ✅</td></tr>';
    return;
  }

  paymentsTbody.innerHTML = '';

  payments.forEach(p => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(p.id)}</td>
      <td>${escapeHtml(p.username)}</td>
      <td>${escapeHtml(p.email)}</td>
      <td>10.00 USD</td>
      <td>${formatDate(p.submitted_at)}</td>
      <td>
        ${p.proof_url
          ? `<a href="${escapeHtml(p.proof_url)}" target="_blank">📷 Voir la preuve</a>`
          : '<em>Aucun fichier</em>'}
      </td>
      <td>
        <button class="btn-confirm-payment" data-id="${p.id}" data-user="${p.username}">✅ Confirmer & Activer</button>
        <button class="btn-reject-payment"  data-id="${p.id}">❌ Rejeter</button>
      </td>
    `;
    paymentsTbody.appendChild(row);
  });

  attachPaymentEvents(token);
}

// ---------------------------------------------------------------
// ACTIONS : CONFIRMER OU REJETER UN PAIEMENT
// ---------------------------------------------------------------

function attachPaymentEvents(token) {
  // Bouton CONFIRMER (active le compte de l'utilisateur)
  document.querySelectorAll('.btn-confirm-payment').forEach(btn => {
    btn.addEventListener('click', async () => {
      const payId    = btn.dataset.id;
      const username = btn.dataset.user;
      if (!confirm(`Confirmer le paiement #${payId} de l'utilisateur "${username}" ?\nSon compte sera immédiatement activé.`)) return;
      await reviewPayment(payId, 'confirm', null, token);
    });
  });

  // Bouton REJETER (renvoie le compte en PENDING)
  document.querySelectorAll('.btn-reject-payment').forEach(btn => {
    btn.addEventListener('click', async () => {
      const payId  = btn.dataset.id;
      const reason = prompt('Motif du rejet (envoyé à l\'utilisateur par notification) :');
      if (reason === null) return;
      await reviewPayment(payId, 'reject', reason, token);
    });
  });
}

/**
 * Envoie la décision de vérification du paiement à l'API.
 * @param {string}      payId    - ID du paiement
 * @param {string}      decision - 'confirm' | 'reject'
 * @param {string|null} reason   - Raison du rejet
 * @param {string}      token
 */
async function reviewPayment(payId, decision, reason, token) {
  try {
    const response = await fetch(`${API_BASE}/admin/payments/${payId}/review`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ decision, reason }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erreur.');
    alert(decision === 'confirm' ? 'Paiement confirmé. Compte activé ! ✅' : 'Paiement rejeté. ❌');
    loadPendingPayments(token);
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
  loadPendingPayments(session.token);
})();
