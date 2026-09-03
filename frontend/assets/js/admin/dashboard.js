// ================================================================
//  NOVAFUNDS — admin/dashboard.js
//  Tableau de bord de l'espace Administration
//  Emplacement : frontend/assets/js/admin/dashboard.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de l'authentification admin au chargement
//   2. Chargement des statistiques globales depuis l'API
//   3. Chargement des activités récentes du système
//   4. Chargement des alertes urgentes (retraits, validations...)
//   5. Déconnexion sécurisée
//
// ================================================================

const API_BASE = '/api';

// ---------------------------------------------------------------
// 1. VÉRIFICATION DE LA SESSION ADMIN
//    Toutes les pages admin doivent appeler cette fonction.
//    Si l'utilisateur n'est pas connecté ou n'est pas admin,
//    il est redirigé vers la page de connexion.
// ---------------------------------------------------------------

/**
 * Vérifie que l'utilisateur est connecté et a un rôle admin.
 * Redirige vers login si la session est invalide.
 *
 * @returns {{ token: string, user: object }|null}
 */
function requireAdmin() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');

  // Pas de session → redirection vers login
  if (!token || !user) {
    window.location.href = '../public/login.html';
    return null;
  }

  // Rôle insuffisant → redirection vers login
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    window.location.href = '../public/login.html';
    return null;
  }

  return { token, user };
}

// ---------------------------------------------------------------
// 2. EN-TÊTE : AFFICHER LE NOM DE L'ADMIN CONNECTÉ
// ---------------------------------------------------------------

/**
 * Affiche le nom de l'administrateur connecté dans l'en-tête de la page.
 * @param {object} user - L'objet utilisateur de la session
 */
function displayAdminName(user) {
  const nameEl = document.getElementById('admin-display-name');
  if (nameEl) nameEl.textContent = user.username || 'Administrateur';
}

// ---------------------------------------------------------------
// 3. CHARGEMENT DES STATISTIQUES GLOBALES
//    Affiche : utilisateurs inscrits, actifs, pending,
//    preuves en attente, activations à vérifier, retraits, CA
// ---------------------------------------------------------------

/**
 * Récupère les statistiques globales depuis l'API et met à jour le tableau.
 * @param {string} token - Le token JWT de l'admin connecté
 */
async function loadDashboardStats(token) {
  try {
    const response = await fetch(`${API_BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Impossible de charger les statistiques.');

    const stats = await response.json();

    // Mise à jour de chaque cellule du tableau des statistiques
    setTextById('stat-total-users',       stats.totalUsers       ?? '—');
    setTextById('stat-active-users',      stats.activeUsers      ?? '—');
    setTextById('stat-pending-users',     stats.pendingUsers     ?? '—');
    setTextById('stat-pending-proofs',    stats.pendingProofs    ?? '—');
    setTextById('stat-pending-payments',  stats.pendingPayments  ?? '—');
    setTextById('stat-pending-withdrawals', stats.pendingWithdrawals ?? '—');
    setTextById('stat-total-revenue',     `${stats.totalRevenue ?? '0'} USD`);

  } catch (err) {
    console.error('[Dashboard] Erreur statistiques :', err.message);
  }
}

// ---------------------------------------------------------------
// 4. CHARGEMENT DES ACTIVITÉS RÉCENTES
//    Remplit le tableau des logs d'actions administratives
// ---------------------------------------------------------------

/**
 * Récupère les dernières activités du système et les insère dans le tableau HTML.
 * @param {string} token
 */
async function loadRecentActivities(token) {
  const tbody = document.getElementById('activities-tbody');
  if (!tbody) return;

  try {
    const response = await fetch(`${API_BASE}/admin/activities?limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Impossible de charger les activités.');

    const activities = await response.json();

    // Vide le tableau avant d'insérer les nouvelles données
    tbody.innerHTML = '';

    if (!activities.length) {
      tbody.innerHTML = '<tr><td colspan="4">Aucune activité récente.</td></tr>';
      return;
    }

    // Insertion de chaque ligne d'activité
    activities.forEach(activity => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatDate(activity.created_at)}</td>
        <td>${escapeHtml(activity.admin_name)}</td>
        <td>${escapeHtml(activity.action)}</td>
        <td>${escapeHtml(activity.details)}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error('[Dashboard] Erreur activités :', err.message);
    if (tbody) tbody.innerHTML = '<tr><td colspan="4">Erreur de chargement.</td></tr>';
  }
}

// ---------------------------------------------------------------
// 5. DÉCONNEXION
// ---------------------------------------------------------------

/**
 * Supprime la session du localStorage et redirige vers la page de connexion.
 */
function logout() {
  localStorage.removeItem('nf_token');
  localStorage.removeItem('nf_user');
  window.location.href = '../public/login.html';
}

// Attache l'événement sur le bouton de déconnexion s'il existe
const logoutBtn = document.getElementById('admin-logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// ---------------------------------------------------------------
// 6. FONCTIONS UTILITAIRES PARTAGÉES
// ---------------------------------------------------------------

/**
 * Modifie le texte d'un élément HTML par son ID.
 * @param {string} id - L'ID de l'élément
 * @param {string|number} text - Le texte à afficher
 */
function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * Formate une date ISO en format lisible (JJ/MM/AAAA HH:MM).
 * @param {string} isoDate
 * @returns {string}
 */
function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------
// 7. INITIALISATION AU CHARGEMENT DE LA PAGE
// ---------------------------------------------------------------

(function init() {
  // Vérification de session obligatoire
  const session = requireAdmin();
  if (!session) return; // Redirection déjà effectuée

  const { token, user } = session;

  // Affichage du nom de l'admin
  displayAdminName(user);

  // Chargement des données du tableau de bord
  loadDashboardStats(token);
  loadRecentActivities(token);
})();
