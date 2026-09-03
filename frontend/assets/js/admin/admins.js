// ================================================================
//  NOVAFUNDS — admin/admins.js
//  Gestion des comptes administrateurs (Super Admin uniquement)
//  Emplacement : frontend/assets/js/admin/admins.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session — accès réservé au super_admin
//   2. Chargement de la liste des administrateurs
//   3. Création d'un nouveau compte admin
//   4. Suppression d'un admin
//
// ================================================================

const API_BASE = '/api';

/** Seul le super_admin peut accéder à cette page. */
function requireSuperAdmin() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user || user.role !== 'super_admin') {
    alert('Accès refusé. Seul le Super Administrateur peut gérer les administrateurs.');
    window.location.href = 'dashboard.html';
    return null;
  }
  return { token, user };
}

const adminForm     = document.getElementById('create-admin-form');
const adminsTbody   = document.getElementById('admins-tbody');
const adminError    = document.getElementById('admin-form-error');
const adminSuccess  = document.getElementById('admin-form-success');
const adminBtn      = document.getElementById('admin-submit-btn');

// ---------------------------------------------------------------
// CHARGEMENT DES ADMINS
// ---------------------------------------------------------------

async function loadAdmins(token) {
  if (!adminsTbody) return;
  adminsTbody.innerHTML = '<tr><td colspan="5">Chargement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/admins`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les administrateurs.');
    const admins = await response.json();
    renderAdminsTable(admins, token);
  } catch (err) {
    if (adminsTbody) adminsTbody.innerHTML = `<tr><td colspan="5" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderAdminsTable(admins, token) {
  if (!adminsTbody) return;
  if (!admins || !admins.length) {
    adminsTbody.innerHTML = '<tr><td colspan="5">Aucun administrateur trouvé.</td></tr>';
    return;
  }
  adminsTbody.innerHTML = '';
  admins.forEach(a => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(a.id)}</td>
      <td><strong>${escapeHtml(a.username)}</strong></td>
      <td>${escapeHtml(a.email)}</td>
      <td>${escapeHtml(a.role)}</td>
      <td>
        ${a.role !== 'super_admin'
          ? `<button class="btn-delete-admin" data-id="${a.id}">🗑 Supprimer</button>`
          : '<em>Super Admin — non supprimable</em>'}
      </td>
    `;
    adminsTbody.appendChild(row);
  });

  document.querySelectorAll('.btn-delete-admin').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Supprimer l'administrateur #${btn.dataset.id} ?`)) return;
      const session = requireSuperAdmin();
      if (!session) return;
      try {
        const res = await fetch(`${API_BASE}/admin/admins/${btn.dataset.id}`, {
          method:  'DELETE',
          headers: { 'Authorization': `Bearer ${session.token}` },
        });
        if (!res.ok) throw new Error('Erreur lors de la suppression.');
        loadAdmins(session.token);
      } catch (err) {
        alert(`Erreur : ${err.message}`);
      }
    });
  });
}

// ---------------------------------------------------------------
// CRÉATION D'UN ADMIN
// ---------------------------------------------------------------

if (adminForm) {
  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const session = requireSuperAdmin();
    if (!session) return;

    if (adminError)   adminError.style.display   = 'none';
    if (adminSuccess) adminSuccess.style.display = 'none';

    const payload = Object.fromEntries(new FormData(adminForm).entries());

    if (!payload.username || !payload.email || !payload.password) {
      if (adminError) { adminError.textContent = 'Tous les champs sont obligatoires.'; adminError.style.display = 'block'; }
      return;
    }

    if (adminBtn) { adminBtn.disabled = true; adminBtn.textContent = 'Création…'; }

    try {
      const res = await fetch(`${API_BASE}/admin/admins`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur.');
      if (adminSuccess) { adminSuccess.textContent = 'Administrateur créé ! ✅'; adminSuccess.style.display = 'block'; }
      adminForm.reset();
      loadAdmins(session.token);
    } catch (err) {
      if (adminError) { adminError.textContent = err.message; adminError.style.display = 'block'; }
    } finally {
      if (adminBtn) { adminBtn.disabled = false; adminBtn.textContent = 'Créer l\'administrateur'; }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(function init() {
  const session = requireSuperAdmin();
  if (!session) return;
  loadAdmins(session.token);
})();
