// ================================================================
//  NOVAFUNDS — admin/validation.js
//  Validation des preuves de tâches soumises par les utilisateurs
//  Emplacement : frontend/assets/js/admin/validation.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de la session admin
//   2. Chargement des soumissions en attente de validation
//   3. Affichage des captures d'écran soumises
//   4. Actions : Approuver ou Rejeter une soumission
//   5. Filtrage par tâche (paramètre URL ?task_id=)
//
// ================================================================

const API_BASE = '/api';

// ---------------------------------------------------------------
// 1. VÉRIFICATION DE LA SESSION ADMIN
// ---------------------------------------------------------------

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

const submissionsTbody = document.getElementById('submissions-tbody'); // Corps du tableau
const filterTaskId     = new URLSearchParams(window.location.search).get('task_id'); // Filtre URL

// ---------------------------------------------------------------
// 3. CHARGEMENT DES SOUMISSIONS EN ATTENTE
// ---------------------------------------------------------------

/**
 * Récupère les soumissions de tâches en attente de validation.
 * Si un task_id est fourni en paramètre URL, filtre par tâche.
 * @param {string} token
 */
async function loadPendingSubmissions(token) {
  if (!submissionsTbody) return;
  submissionsTbody.innerHTML = '<tr><td colspan="7">Chargement des soumissions…</td></tr>';

  try {
    const params = new URLSearchParams({ status: 'pending', limit: 50 });
    if (filterTaskId) params.append('task_id', filterTaskId);

    const response = await fetch(`${API_BASE}/admin/submissions?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) throw new Error('Impossible de charger les soumissions.');

    const submissions = await response.json();
    renderSubmissionsTable(submissions, token);

  } catch (err) {
    console.error('[Validation] Erreur :', err.message);
    if (submissionsTbody) {
      submissionsTbody.innerHTML = `<tr><td colspan="7" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

// ---------------------------------------------------------------
// 4. AFFICHAGE DU TABLEAU DES SOUMISSIONS
// ---------------------------------------------------------------

/**
 * Génère et insère les lignes du tableau pour chaque soumission.
 * @param {Array} submissions - Liste des soumissions retournées par l'API
 * @param {string} token
 */
function renderSubmissionsTable(submissions, token) {
  if (!submissionsTbody) return;

  if (!submissions || submissions.length === 0) {
    submissionsTbody.innerHTML = '<tr><td colspan="7">Aucune soumission en attente. ✅</td></tr>';
    return;
  }

  submissionsTbody.innerHTML = '';

  submissions.forEach(sub => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(sub.id)}</td>
      <td>${escapeHtml(sub.username)}</td>
      <td>${escapeHtml(sub.task_title)}</td>
      <td>${formatDate(sub.submitted_at)}</td>
      <td>
        ${sub.screenshot_url
          ? `<a href="${escapeHtml(sub.screenshot_url)}" target="_blank">Voir la capture</a>`
          : '<em>Aucune capture</em>'}
      </td>
      <td><strong style="color:orange;">En attente</strong></td>
      <td>
        <button class="btn-approve" data-id="${sub.id}" data-reward="${sub.reward}">✅ Approuver</button>
        <button class="btn-reject"  data-id="${sub.id}">❌ Rejeter</button>
      </td>
    `;
    submissionsTbody.appendChild(row);
  });

  // Attache les événements sur les boutons d'action
  attachValidationEvents(token);
}

// ---------------------------------------------------------------
// 5. ACTIONS : APPROUVER OU REJETER UNE SOUMISSION
// ---------------------------------------------------------------

/**
 * Attache les événements de clic pour approuver ou rejeter.
 * @param {string} token
 */
function attachValidationEvents(token) {
  // Bouton APPROUVER
  document.querySelectorAll('.btn-approve').forEach(btn => {
    btn.addEventListener('click', async () => {
      const subId  = btn.dataset.id;
      const reward = btn.dataset.reward;
      if (!confirm(`Approuver la soumission #${subId} ?\n${reward} USD seront crédités à l'utilisateur.`)) return;
      await processSubmission(subId, 'approve', null, token);
    });
  });

  // Bouton REJETER
  document.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', async () => {
      const subId  = btn.dataset.id;
      const reason = prompt('Raison du rejet (visible par l\'utilisateur) :');
      if (reason === null) return; // L'admin a annulé
      await processSubmission(subId, 'reject', reason, token);
    });
  });
}

/**
 * Envoie la décision (approve/reject) à l'API pour une soumission.
 * @param {string} subId   - ID de la soumission
 * @param {string} decision - 'approve' ou 'reject'
 * @param {string|null} reason - Raison du rejet (optionnel)
 * @param {string} token
 */
async function processSubmission(subId, decision, reason, token) {
  try {
    const response = await fetch(`${API_BASE}/admin/submissions/${subId}/review`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ decision, reason }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erreur lors du traitement.');

    alert(`Soumission #${subId} : ${decision === 'approve' ? 'Approuvée ✅' : 'Rejetée ❌'}`);

    // Recharge la liste pour refléter le changement
    loadPendingSubmissions(token);

  } catch (err) {
    alert(`Erreur : ${err.message}`);
  }
}

// ---------------------------------------------------------------
// 6. FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('fr-FR', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
  });
}

// ---------------------------------------------------------------
// 7. INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAdmin();
  if (!session) return;
  loadPendingSubmissions(session.token);
})();
