// ================================================================
//  NOVAFUNDS — admin/referrals.js
//  Vue d'ensemble des parrainages et affiliations
//  Emplacement : frontend/assets/js/admin/referrals.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de la session admin
//   2. Chargement des statistiques globales de parrainage
//   3. Affichage de la liste des parrains et leurs filleuls
//   4. Recherche par parrain ou filleul
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

const referralsTbody = document.getElementById('referrals-tbody');
const searchForm     = document.getElementById('referral-search-form');
const searchInput    = document.getElementById('referral-search-input');

// ---------------------------------------------------------------
// CHARGEMENT DES DONNÉES DE PARRAINAGE
// ---------------------------------------------------------------

/**
 * Charge la liste des parrainages depuis l'API.
 * @param {string} token
 * @param {string} query - Terme de recherche optionnel
 */
async function loadReferrals(token, query = '') {
  if (!referralsTbody) return;
  referralsTbody.innerHTML = '<tr><td colspan="6">Chargement…</td></tr>';

  try {
    const params = new URLSearchParams({ limit: 50 });
    if (query) params.append('q', query);

    const response = await fetch(`${API_BASE}/admin/referrals?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les parrainages.');

    const referrals = await response.json();
    renderReferralsTable(referrals);

  } catch (err) {
    console.error('[Referrals Admin] Erreur :', err.message);
    if (referralsTbody) referralsTbody.innerHTML = `<tr><td colspan="6" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DU TABLEAU
// ---------------------------------------------------------------

/**
 * Génère les lignes du tableau des parrainages.
 * @param {Array} referrals
 */
function renderReferralsTable(referrals) {
  if (!referralsTbody) return;

  if (!referrals || referrals.length === 0) {
    referralsTbody.innerHTML = '<tr><td colspan="6">Aucun parrainage trouvé.</td></tr>';
    return;
  }

  referralsTbody.innerHTML = '';

  referrals.forEach(ref => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(ref.referrer_username)}</td>
      <td>${escapeHtml(ref.referral_code)}</td>
      <td>${escapeHtml(ref.referred_username)}</td>
      <td>${formatDate(ref.joined_at)}</td>
      <td>
        <span style="color:${ref.referred_active ? 'green' : 'orange'};">
          ${ref.referred_active ? 'Actif ✅' : 'En attente ⏳'}
        </span>
      </td>
      <td>${ref.bonus_earned ?? '0.00'} USD</td>
    `;
    referralsTbody.appendChild(row);
  });
}

// ---------------------------------------------------------------
// FORMULAIRE DE RECHERCHE
// ---------------------------------------------------------------

if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const session = requireAdmin();
    if (!session) return;
    loadReferrals(session.token, searchInput?.value.trim() ?? '');
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
  return new Date(isoDate).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAdmin();
  if (!session) return;
  loadReferrals(session.token);
})();
