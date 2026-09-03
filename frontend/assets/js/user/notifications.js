// ================================================================
//  NOVAFUNDS — user/notifications.js
//  Notifications de l'utilisateur
//  Emplacement : frontend/assets/js/user/notifications.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Chargement des notifications reçues
//   3. Marquage comme lues
//   4. Badge de notifications non lues
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

const notifContainer = document.getElementById('notifications-container'); // Zone d'affichage
const markAllBtn     = document.getElementById('mark-all-read-btn');        // Bouton tout lire
const unreadBadge    = document.getElementById('notif-unread-badge');       // Badge compteur

// ---------------------------------------------------------------
// CHARGEMENT DES NOTIFICATIONS
// ---------------------------------------------------------------

/**
 * Récupère les notifications de l'utilisateur depuis l'API.
 * @param {string} token
 */
async function loadNotifications(token) {
  if (!notifContainer) return;
  notifContainer.innerHTML = '<p>Chargement des notifications…</p>';

  try {
    const response = await fetch(`${API_BASE}/user/notifications?limit=30`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les notifications.');

    const notifications = await response.json();
    renderNotifications(notifications, token);

    // Mise à jour du badge de notifications non lues
    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (unreadBadge) {
      unreadBadge.textContent = unreadCount > 0 ? unreadCount : '';
      unreadBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }

  } catch (err) {
    console.error('[Notifications User] Erreur :', err.message);
    if (notifContainer) notifContainer.innerHTML = `<p style="color:red;">${escapeHtml(err.message)}</p>`;
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DES NOTIFICATIONS
// ---------------------------------------------------------------

/**
 * Génère et affiche les notifications dans le conteneur.
 * Les notifications non lues sont visuellement différenciées.
 * @param {Array}  notifications
 * @param {string} token
 */
function renderNotifications(notifications, token) {
  if (!notifContainer) return;

  if (!notifications.length) {
    notifContainer.innerHTML = '<p>Aucune notification pour le moment.</p>';
    return;
  }

  notifContainer.innerHTML = '';

  notifications.forEach(n => {
    const item = document.createElement('article');
    // Style différent pour les notifications non lues
    item.style.opacity    = n.is_read ? '0.7' : '1';
    item.style.fontWeight = n.is_read ? 'normal' : 'bold';

    item.innerHTML = `
      <p>
        ${n.is_read ? '' : '🔔 '}
        <strong>${escapeHtml(n.title)}</strong>
        <small style="float:right;">${formatDate(n.created_at)}</small>
      </p>
      <p>${escapeHtml(n.message)}</p>
      ${!n.is_read ? `<button class="btn-mark-read" data-id="${n.id}">Marquer comme lue</button>` : ''}
      <hr>
    `;
    notifContainer.appendChild(item);
  });

  // Attache les événements sur les boutons "marquer comme lue"
  document.querySelectorAll('.btn-mark-read').forEach(btn => {
    btn.addEventListener('click', async () => {
      await markAsRead(btn.dataset.id, token);
    });
  });
}

// ---------------------------------------------------------------
// MARQUER UNE NOTIFICATION COMME LUE
// ---------------------------------------------------------------

/**
 * Envoie une requête pour marquer une notification comme lue.
 * @param {string} notifId
 * @param {string} token
 */
async function markAsRead(notifId, token) {
  try {
    await fetch(`${API_BASE}/user/notifications/${notifId}/read`, {
      method:  'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    // Recharge la liste pour refléter le changement
    loadNotifications(token);
  } catch (err) {
    console.error('[Notifications] Erreur marquage :', err.message);
  }
}

/**
 * Marque toutes les notifications comme lues en une seule requête.
 * @param {string} token
 */
async function markAllAsRead(token) {
  try {
    await fetch(`${API_BASE}/user/notifications/read-all`, {
      method:  'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    loadNotifications(token);
  } catch (err) {
    console.error('[Notifications] Erreur marquage global :', err.message);
  }
}

// Bouton "Tout marquer comme lu"
if (markAllBtn) {
  markAllBtn.addEventListener('click', () => {
    const session = requireAuth();
    if (!session) return;
    markAllAsRead(session.token);
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
  loadNotifications(session.token);
})();
