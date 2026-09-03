// ================================================================
//  NOVAFUNDS — user/dashboard.js
//  Tableau de bord de l'espace utilisateur
//  Emplacement : frontend/assets/js/user/dashboard.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de l'authentification utilisateur
//   2. Affichage du nom de l'utilisateur dans l'en-tête
//   3. Chargement du statut du compte (ACTIVE / PENDING)
//   4. Chargement du résumé financier (solde, gains...)
//   5. Statistiques des tâches
//   6. Statistiques de parrainage
//   7. Dernière notification
//
// ================================================================

const API_BASE = '/api';

// ---------------------------------------------------------------
// 1. VÉRIFICATION DE SESSION UTILISATEUR
//    Redirige vers login si non connecté.
// ---------------------------------------------------------------

/**
 * Vérifie la session utilisateur et retourne les données de session.
 * Redirige vers la page de connexion si la session est invalide.
 *
 * @returns {{ token: string, user: object }|null}
 */
function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) {
    window.location.href = '../public/login.html';
    return null;
  }
  return { token, user };
}

// ---------------------------------------------------------------
// 2. AFFICHAGE DU NOM D'UTILISATEUR
// ---------------------------------------------------------------

/**
 * Affiche le nom de l'utilisateur connecté dans l'en-tête.
 * @param {object} user
 */
function displayUserName(user) {
  const nameEl = document.getElementById('user-display-name');
  if (nameEl) nameEl.textContent = user.username || 'Utilisateur';
}

// ---------------------------------------------------------------
// 3. CHARGEMENT DU TABLEAU DE BORD (résumé complet)
// ---------------------------------------------------------------

/**
 * Récupère toutes les données du tableau de bord depuis l'API
 * et met à jour les différentes sections de la page.
 * @param {string} token
 */
async function loadDashboard(token) {
  try {
    const response = await fetch(`${API_BASE}/user/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Impossible de charger le tableau de bord.');

    const data = await response.json();

    // --- Mise à jour du statut du compte ---
    updateAccountStatus(data.status);

    // --- Mise à jour du résumé financier ---
    setTextById('stat-balance-total',     `${data.balance_total ?? '0.00'} USD`);
    setTextById('stat-balance-available', `${data.balance_available ?? '0.00'} USD`);
    setTextById('stat-referral-income',   `${data.referral_income ?? '0.00'} USD`);
    setTextById('stat-task-income',       `${data.task_income ?? '0.00'} USD`);

    // --- Mise à jour des statistiques de tâches ---
    setTextById('stat-tasks-available',  data.tasks_available  ?? '0');
    setTextById('stat-tasks-pending',    data.tasks_pending    ?? '0');
    setTextById('stat-tasks-validated',  data.tasks_validated  ?? '0');
    setTextById('stat-tasks-rejected',   data.tasks_rejected   ?? '0');

    // --- Mise à jour des statistiques de parrainage ---
    setTextById('stat-referral-code',    data.referral_code    ?? '—');
    setTextById('stat-total-referrals',  data.total_referrals  ?? '0');
    setTextById('stat-active-referrals', data.active_referrals ?? '0');

    // --- Dernière notification ---
    setTextById('stat-last-notification', data.last_notification?.message ?? 'Aucune notification récente.');

  } catch (err) {
    console.error('[Dashboard User] Erreur :', err.message);
  }
}

// ---------------------------------------------------------------
// 4. GESTION DU STATUT DU COMPTE
// ---------------------------------------------------------------

/**
 * Met à jour l'affichage du statut du compte et affiche ou masque
 * le bouton d'activation selon le statut.
 * @param {string} status - 'ACTIVE' | 'PENDING' | 'SUSPENDED'
 */
function updateAccountStatus(status) {
  const statusEl     = document.getElementById('account-status');
  const activateSection = document.getElementById('activate-section'); // Section bouton activation

  if (statusEl) {
    const colors = { ACTIVE: 'green', PENDING: 'orange', SUSPENDED: 'red' };
    statusEl.textContent  = status || 'PENDING';
    statusEl.style.color  = colors[status] || 'orange';
  }

  // Affiche le bouton d'activation seulement si le compte est en PENDING
  if (activateSection) {
    activateSection.style.display = (status === 'PENDING') ? 'block' : 'none';
  }
}

// ---------------------------------------------------------------
// 5. DÉCONNEXION
// ---------------------------------------------------------------

/**
 * Supprime la session et redirige vers la page de connexion.
 */
function logout() {
  localStorage.removeItem('nf_token');
  localStorage.removeItem('nf_user');
  window.location.href = '../public/login.html';
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// ---------------------------------------------------------------
// 6. FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ---------------------------------------------------------------
// 7. INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAuth();
  if (!session) return;

  displayUserName(session.user);
  loadDashboard(session.token);
})();
