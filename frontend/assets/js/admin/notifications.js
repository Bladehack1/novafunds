// ================================================================
//  NOVAFUNDS — admin/notifications.js
//  Gestion des notifications envoyées aux utilisateurs
//  Emplacement : frontend/assets/js/admin/notifications.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de la session admin
//   2. Chargement des notifications envoyées
//   3. Envoi d'une nouvelle notification globale ou ciblée
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

const notifForm    = document.getElementById('send-notif-form');
const notifTbody   = document.getElementById('notifications-tbody');
const notifError   = document.getElementById('notif-error');
const notifSuccess = document.getElementById('notif-success');
const notifBtn     = document.getElementById('notif-submit-btn');

// ---------------------------------------------------------------
// CHARGEMENT DES NOTIFICATIONS ENVOYÉES
// ---------------------------------------------------------------

async function loadAdminNotifications(token) {
  if (!notifTbody) return;
  notifTbody.innerHTML = '<tr><td colspan="5">Chargement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/notifications?limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les notifications.');

    const notifications = await response.json();

    if (!notifications.length) {
      notifTbody.innerHTML = '<tr><td colspan="5">Aucune notification envoyée.</td></tr>';
      return;
    }

    notifTbody.innerHTML = '';
    notifications.forEach(n => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(n.id)}</td>
        <td>${escapeHtml(n.target === 'all' ? 'Tous les utilisateurs' : n.target_username)}</td>
        <td>${escapeHtml(n.title)}</td>
        <td>${escapeHtml(n.message)}</td>
        <td>${formatDate(n.sent_at)}</td>
      `;
      notifTbody.appendChild(row);
    });
  } catch (err) {
    if (notifTbody) notifTbody.innerHTML = `<tr><td colspan="5" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------------------------------------------------------------
// ENVOI D'UNE NOUVELLE NOTIFICATION
// ---------------------------------------------------------------

if (notifForm) {
  notifForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (notifError)   notifError.style.display   = 'none';
    if (notifSuccess) notifSuccess.style.display = 'none';

    const session = requireAdmin();
    if (!session) return;

    const formData = new FormData(notifForm);
    const payload  = Object.fromEntries(formData.entries());

    if (!payload.title || !payload.message) {
      if (notifError) { notifError.textContent = 'Le titre et le message sont obligatoires.'; notifError.style.display = 'block'; }
      return;
    }

    if (notifBtn) { notifBtn.disabled = true; notifBtn.textContent = 'Envoi…'; }

    try {
      const response = await fetch(`${API_BASE}/admin/notifications`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:    JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur d\'envoi.');

      if (notifSuccess) { notifSuccess.textContent = 'Notification envoyée avec succès ! ✅'; notifSuccess.style.display = 'block'; }
      notifForm.reset();
      loadAdminNotifications(session.token);

    } catch (err) {
      if (notifError) { notifError.textContent = err.message; notifError.style.display = 'block'; }
    } finally {
      if (notifBtn) { notifBtn.disabled = false; notifBtn.textContent = 'Envoyer la notification'; }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

(function init() {
  const session = requireAdmin();
  if (!session) return;
  loadAdminNotifications(session.token);
})();
