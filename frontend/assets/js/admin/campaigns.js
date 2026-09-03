// ================================================================
//  NOVAFUNDS — admin/campaigns.js
//  Gestion des campagnes publicitaires
//  Emplacement : frontend/assets/js/admin/campaigns.js
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

const createCampaignForm = document.getElementById('create-campaign-form');
const campaignsTbody     = document.getElementById('campaigns-tbody');
const campaignError      = document.getElementById('campaign-error');
const campaignSuccess    = document.getElementById('campaign-success');
const campaignBtn        = document.getElementById('campaign-submit-btn');

// ---------------------------------------------------------------
// CHARGEMENT DES CAMPAGNES
// ---------------------------------------------------------------

async function loadCampaigns(token) {
  if (!campaignsTbody) return;
  campaignsTbody.innerHTML = '<tr><td colspan="6">Chargement…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/campaigns`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les campagnes.');
    const campaigns = await response.json();
    renderCampaignsTable(campaigns, token);
  } catch (err) {
    if (campaignsTbody) campaignsTbody.innerHTML = `<tr><td colspan="6" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderCampaignsTable(campaigns, token) {
  if (!campaignsTbody) return;
  if (!campaigns || !campaigns.length) {
    campaignsTbody.innerHTML = '<tr><td colspan="6">Aucune campagne.</td></tr>';
    return;
  }
  campaignsTbody.innerHTML = '';
  campaigns.forEach(c => {
    const row = document.createElement('tr');
    const activeColor = c.is_active ? 'green' : 'red';
    row.innerHTML = `
      <td>${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.title)}</td>
      <td>${escapeHtml(c.type)}</td>
      <td>${c.reward_per_view} USD / vue</td>
      <td><strong style="color:${activeColor};">${c.is_active ? 'Active' : 'Inactive'}</strong></td>
      <td>
        <button class="btn-toggle-campaign" data-id="${c.id}" data-active="${c.is_active}">
          ${c.is_active ? 'Désactiver' : 'Activer'}
        </button>
      </td>
    `;
    campaignsTbody.appendChild(row);
  });

  // Attacher les événements de toggle
  document.querySelectorAll('.btn-toggle-campaign').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id     = btn.dataset.id;
      const action = btn.dataset.active === 'true' ? 'deactivate' : 'activate';
      try {
        const res = await fetch(`${API_BASE}/admin/campaigns/${id}/toggle`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body:    JSON.stringify({ action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        loadCampaigns(token);
      } catch (err) {
        alert(`Erreur : ${err.message}`);
      }
    });
  });
}

// ---------------------------------------------------------------
// CRÉATION D'UNE CAMPAGNE
// ---------------------------------------------------------------

if (createCampaignForm) {
  createCampaignForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const session = requireAdmin();
    if (!session) return;

    if (campaignError)   campaignError.style.display   = 'none';
    if (campaignSuccess) campaignSuccess.style.display = 'none';

    const payload = Object.fromEntries(new FormData(createCampaignForm).entries());
    if (campaignBtn) { campaignBtn.disabled = true; campaignBtn.textContent = 'Création…'; }

    try {
      const res = await fetch(`${API_BASE}/admin/campaigns`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur.');
      if (campaignSuccess) { campaignSuccess.textContent = 'Campagne créée ! ✅'; campaignSuccess.style.display = 'block'; }
      createCampaignForm.reset();
      loadCampaigns(session.token);
    } catch (err) {
      if (campaignError) { campaignError.textContent = err.message; campaignError.style.display = 'block'; }
    } finally {
      if (campaignBtn) { campaignBtn.disabled = false; campaignBtn.textContent = 'Créer la campagne'; }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

(function init() {
  const session = requireAdmin();
  if (!session) return;
  loadCampaigns(session.token);
})();
