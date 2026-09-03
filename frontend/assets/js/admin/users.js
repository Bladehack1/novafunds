// ================================================================
//  NOVAFUNDS — admin/users.js
//  Gestion des comptes utilisateurs (côté administrateur)
//  Emplacement : frontend/assets/js/admin/users.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de la session admin
//   2. Chargement et affichage de la liste des utilisateurs
//   3. Recherche / filtrage par username, email, statut, pays
//   4. Actions : Suspendre, Réactiver, Activer manuellement
//   5. Pagination des résultats
//
// ================================================================

const API_BASE = '/api';

// ---------------------------------------------------------------
// 1. VÉRIFICATION DE LA SESSION ADMIN
// ---------------------------------------------------------------

/**
 * Vérifie que l'utilisateur est admin. Redirige sinon.
 * @returns {{ token: string, user: object }|null}
 */
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
// 2. RÉFÉRENCES DOM
// ---------------------------------------------------------------

const searchForm    = document.getElementById('user-search-form');   // Formulaire de recherche
const usersTbody    = document.getElementById('users-tbody');        // Corps du tableau
const searchQuery   = document.getElementById('search-username');    // Champ de recherche
const searchStatus  = document.getElementById('search-status');      // Filtre statut
const searchCountry = document.getElementById('search-country');     // Filtre pays
const paginationEl  = document.getElementById('pagination');         // Zone de pagination

// ---------------------------------------------------------------
// 3. CHARGEMENT DES UTILISATEURS DEPUIS L'API
// ---------------------------------------------------------------

/** Page courante pour la pagination */
let currentPage = 1;

/**
 * Charge la liste des utilisateurs depuis l'API avec les filtres appliqués.
 * @param {string} token    - Token JWT admin
 * @param {number} page     - Numéro de page (défaut: 1)
 * @param {object} filters  - Filtres { query, status, country }
 */
async function loadUsers(token, page = 1, filters = {}) {
  if (!usersTbody) return;

  // Affichage d'un message de chargement pendant la requête
  usersTbody.innerHTML = '<tr><td colspan="9">Chargement des utilisateurs…</td></tr>';

  try {
    // Construction de l'URL avec les paramètres de recherche
    const params = new URLSearchParams({
      page,
      limit: 20,
      ...(filters.query   && { query:   filters.query }),
      ...(filters.status  && { status:  filters.status }),
      ...(filters.country && { country: filters.country }),
    });

    const response = await fetch(`${API_BASE}/admin/users?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Impossible de charger les utilisateurs.');

    const { users, total, pages } = await response.json();

    renderUsersTable(users, token);
    renderPagination(pages, page, token, filters);

  } catch (err) {
    console.error('[Users] Erreur chargement :', err.message);
    if (usersTbody) {
      usersTbody.innerHTML = `<tr><td colspan="9" style="color:red;">Erreur : ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

// ---------------------------------------------------------------
// 4. AFFICHAGE DU TABLEAU DES UTILISATEURS
// ---------------------------------------------------------------

/**
 * Génère les lignes du tableau HTML à partir du tableau d'utilisateurs.
 * @param {Array} users - La liste des utilisateurs retournée par l'API
 * @param {string} token
 */
function renderUsersTable(users, token) {
  if (!usersTbody) return;

  if (!users || users.length === 0) {
    usersTbody.innerHTML = '<tr><td colspan="9">Aucun utilisateur trouvé.</td></tr>';
    return;
  }

  usersTbody.innerHTML = ''; // Vide le tableau avant insertion

  users.forEach(user => {
    const row = document.createElement('tr');

    // Définit la couleur selon le statut
    const statusColor = {
      ACTIVE:    'green',
      PENDING:   'orange',
      SUSPENDED: 'red',
    }[user.status] || 'black';

    // Détermine les boutons d'action selon le statut actuel
    const actionButtons = buildActionButtons(user, token);

    row.innerHTML = `
      <td>${escapeHtml(user.id)}</td>
      <td><strong>${escapeHtml(user.username)}</strong></td>
      <td>${escapeHtml(user.email)}</td>
      <td>${escapeHtml(user.phone)}</td>
      <td>${escapeHtml(user.country)}</td>
      <td>${formatDate(user.created_at)}</td>
      <td>${user.balance ?? '0.00'} USD</td>
      <td><strong style="color:${statusColor};">${escapeHtml(user.status)}</strong></td>
      <td>${actionButtons}</td>
    `;
    usersTbody.appendChild(row);
  });

  // Attacher les événements sur les boutons d'action après insertion
  attachActionEvents(token);
}

// ---------------------------------------------------------------
// 5. BOUTONS D'ACTION PAR UTILISATEUR
// ---------------------------------------------------------------

/**
 * Génère les boutons HTML d'action selon le statut de l'utilisateur.
 * @param {object} user
 * @param {string} token
 * @returns {string} HTML des boutons
 */
function buildActionButtons(user, token) {
  const buttons = [];

  if (user.status === 'ACTIVE') {
    buttons.push(`<button class="btn-action" data-id="${user.id}" data-action="suspend">Suspendre</button>`);
  }
  if (user.status === 'SUSPENDED') {
    buttons.push(`<button class="btn-action" data-id="${user.id}" data-action="unsuspend">Réactiver</button>`);
  }
  if (user.status === 'PENDING') {
    buttons.push(`<button class="btn-action" data-id="${user.id}" data-action="activate" style="color:green;font-weight:bold;">Activer Manuellement</button>`);
  }

  buttons.push(`<button class="btn-history" data-id="${user.id}">Historique</button>`);

  return buttons.join(' ');
}

/**
 * Attache les événements de clic sur tous les boutons d'action du tableau.
 * @param {string} token
 */
function attachActionEvents(token) {
  // Boutons d'action admin (suspendre, réactiver, activer)
  document.querySelectorAll('.btn-action').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.id;
      const action = btn.dataset.action;

      if (!confirm(`Confirmer l'action "${action}" pour l'utilisateur #${userId} ?`)) return;

      await performUserAction(userId, action, token);
    });
  });

  // Bouton historique (placeholder — à adapter selon la page cible)
  document.querySelectorAll('.btn-history').forEach(btn => {
    btn.addEventListener('click', () => {
      alert(`Historique de l'utilisateur #${btn.dataset.id} (fonctionnalité à implémenter).`);
    });
  });
}

// ---------------------------------------------------------------
// 6. ACTIONS SUR UN UTILISATEUR (SUSPEND / UNSUSPEND / ACTIVATE)
// ---------------------------------------------------------------

/**
 * Envoie une action administrative sur un utilisateur via l'API.
 * @param {string} userId - L'ID de l'utilisateur cible
 * @param {string} action - 'suspend' | 'unsuspend' | 'activate'
 * @param {string} token
 */
async function performUserAction(userId, action, token) {
  try {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/action`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Action échouée.');

    alert(`Succès : ${data.message || 'Action effectuée.'}`);

    // Recharge la liste pour refléter le changement
    loadUsers(token, currentPage, getFilters());

  } catch (err) {
    alert(`Erreur : ${err.message}`);
  }
}

// ---------------------------------------------------------------
// 7. PAGINATION
// ---------------------------------------------------------------

/**
 * Génère les boutons de pagination et les attache à la zone de pagination.
 * @param {number} totalPages - Nombre total de pages
 * @param {number} activePage - Page actuellement affichée
 * @param {string} token
 * @param {object} filters
 */
function renderPagination(totalPages, activePage, token, filters) {
  if (!paginationEl) return;
  paginationEl.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.disabled    = (i === activePage);
    btn.addEventListener('click', () => {
      currentPage = i;
      loadUsers(token, i, filters);
    });
    paginationEl.appendChild(btn);
  }
}

// ---------------------------------------------------------------
// 8. FORMULAIRE DE RECHERCHE
// ---------------------------------------------------------------

/**
 * Lit les valeurs actuelles des filtres du formulaire.
 * @returns {{ query: string, status: string, country: string }}
 */
function getFilters() {
  return {
    query:   searchQuery?.value.trim()  ?? '',
    status:  searchStatus?.value        ?? '',
    country: searchCountry?.value.trim() ?? '',
  };
}

// Écoute la soumission du formulaire de recherche
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentPage = 1; // Retour en page 1 à chaque nouvelle recherche
    const session = requireAdmin();
    if (session) loadUsers(session.token, 1, getFilters());
  });
}

// ---------------------------------------------------------------
// 9. FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

/** Échappe les caractères HTML pour prévenir les injections XSS. */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Formate une date ISO en format lisible JJ/MM/AAAA HH:MM. */
function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('fr-FR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

// ---------------------------------------------------------------
// 10. INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAdmin();
  if (!session) return;

  // Chargement initial de tous les utilisateurs (sans filtre)
  loadUsers(session.token, 1, {});
})();
