// ================================================================
//  NOVAFUNDS — admin/announcements.js
//  Gestion des annonces publiques de la plateforme
//  Emplacement : frontend/assets/js/admin/announcements.js
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

const announceForm    = document.getElementById('create-announcement-form');
const announcesTbody  = document.getElementById('announcements-tbody');
const announceError   = document.getElementById('announcement-error');
const announceSuccess = document.getElementById('announcement-success');
const announceBtn     = document.getElementById('announcement-submit-btn');

// ---------------------------------------------------------------
// CHARGEMENT DES ANNONCES
// ---------------------------------------------------------------

async function loadAnnouncements(token) {
  if (!announcesTbody) return;
  announcesTbody.innerHTML = '<tr><td colspan="5">Chargement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/announcements?limit=30`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les annonces.');
    const items = await response.json();

    if (!items.length) {
      announcesTbody.innerHTML = '<tr><td colspan="5">Aucune annonce publiée.</td></tr>';
      return;
    }

    announcesTbody.innerHTML = '';
    items.forEach(a => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(a.id)}</td>
        <td><strong>${escapeHtml(a.title)}</strong></td>
        <td>${escapeHtml(a.content?.substring(0, 80))}…</td>
        <td>${formatDate(a.created_at)}</td>
        <td><button class="btn-delete-announce" data-id="${a.id}">🗑 Supprimer</button></td>
      `;
      announcesTbody.appendChild(row);
    });

    document.querySelectorAll('.btn-delete-announce').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Supprimer cette annonce ?')) return;
        const session = requireAdmin();
        if (!session) return;
        try {
          const res = await fetch(`${API_BASE}/admin/announcements/${btn.dataset.id}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${session.token}` },
          });
          if (!res.ok) throw new Error('Erreur.');
          loadAnnouncements(session.token);
        } catch (err) { alert(`Erreur : ${err.message}`); }
      });
    });

  } catch (err) {
    if (announcesTbody) announcesTbody.innerHTML = `<tr><td colspan="5" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------------------------------------------------------------
// CRÉATION D'UNE ANNONCE
// ---------------------------------------------------------------

if (announceForm) {
  announceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const session = requireAdmin();
    if (!session) return;
    if (announceError)   announceError.style.display   = 'none';
    if (announceSuccess) announceSuccess.style.display = 'none';

    const payload = Object.fromEntries(new FormData(announceForm).entries());
    if (announceBtn) { announceBtn.disabled = true; announceBtn.textContent = 'Publication…'; }

    try {
      const res = await fetch(`${API_BASE}/admin/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:   JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur.');
      if (announceSuccess) { announceSuccess.textContent = 'Annonce publiée ! ✅'; announceSuccess.style.display = 'block'; }
      announceForm.reset();
      loadAnnouncements(session.token);
    } catch (err) {
      if (announceError) { announceError.textContent = err.message; announceError.style.display = 'block'; }
    } finally {
      if (announceBtn) { announceBtn.disabled = false; announceBtn.textContent = 'Publier l\'annonce'; }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

(function init() {
  const session = requireAdmin();
  if (!session) return;
  loadAnnouncements(session.token);
})();
