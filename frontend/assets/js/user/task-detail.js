// ================================================================
//  NOVAFUNDS — user/task-detail.js
//  Détail d'une tâche + soumission de la preuve (capture d'écran)
//  Emplacement : frontend/assets/js/user/task-detail.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Lecture du task_id depuis l'URL (?task_id=...)
//   3. Chargement des détails de la tâche
//   4. Soumission de la preuve (capture d'écran)
//   5. Gestion du timer (délai limite)
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

// Lecture du paramètre task_id dans l'URL
const taskId = new URLSearchParams(window.location.search).get('task_id');

// Références DOM
const taskTitleEl    = document.getElementById('task-detail-title');
const taskCategoryEl = document.getElementById('task-detail-category');
const taskRewardEl   = document.getElementById('task-detail-reward');
const taskDescEl     = document.getElementById('task-detail-description');
const taskInstrEl    = document.getElementById('task-detail-instructions');
const proofForm      = document.getElementById('proof-submit-form');
const screenshotInput = document.getElementById('proof-screenshot');
const proofBtn       = document.getElementById('proof-submit-btn');
const proofError     = document.getElementById('proof-error');
const proofSuccess   = document.getElementById('proof-success');

// ---------------------------------------------------------------
// CHARGEMENT DES DÉTAILS DE LA TÂCHE
// ---------------------------------------------------------------

/**
 * Charge les informations d'une tâche et les affiche dans la page.
 * @param {string} token
 * @param {string} id - L'identifiant de la tâche
 */
async function loadTaskDetail(token, id) {
  if (!id) {
    if (taskTitleEl) taskTitleEl.textContent = 'Aucune tâche sélectionnée.';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/user/tasks/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Tâche introuvable.');

    const task = await response.json();

    // Affichage des informations de la tâche
    if (taskTitleEl)    taskTitleEl.textContent    = task.title      ?? '—';
    if (taskCategoryEl) taskCategoryEl.textContent = task.category   ?? '—';
    if (taskRewardEl)   taskRewardEl.textContent   = `${task.reward} USD`;
    if (taskDescEl)     taskDescEl.textContent     = task.description ?? '—';
    if (taskInstrEl)    taskInstrEl.textContent    = task.instructions ?? '—';

    // Met à jour le titre de la page
    document.title = `${task.title} — NovaFunds`;

  } catch (err) {
    console.error('[Task Detail] Erreur :', err.message);
    if (taskTitleEl) taskTitleEl.textContent = `Erreur : ${err.message}`;
  }
}

// ---------------------------------------------------------------
// SOUMISSION DE LA PREUVE (capture d'écran)
// ---------------------------------------------------------------

if (proofForm) {
  proofForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (proofError)   proofError.style.display   = 'none';
    if (proofSuccess) proofSuccess.style.display = 'none';

    if (!taskId) {
      if (proofError) { proofError.textContent = 'Identifiant de tâche manquant.'; proofError.style.display = 'block'; }
      return;
    }

    // Vérification qu'un fichier a bien été sélectionné
    if (!screenshotInput?.files[0]) {
      if (proofError) { proofError.textContent = 'Veuillez sélectionner une capture d\'écran.'; proofError.style.display = 'block'; }
      return;
    }

    const session = requireAuth();
    if (!session) return;

    // Utilisation de FormData pour envoyer le fichier image
    const formData = new FormData();
    formData.append('task_id',    taskId);
    formData.append('screenshot', screenshotInput.files[0]);

    if (proofBtn) { proofBtn.disabled = true; proofBtn.textContent = 'Envoi en cours…'; }

    try {
      const response = await fetch(`${API_BASE}/user/tasks/${taskId}/submit`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${session.token}` },
        // Ne pas définir Content-Type ici — le navigateur le fait automatiquement pour FormData
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la soumission.');

      // Affiche le message de succès
      if (proofSuccess) {
        proofSuccess.textContent = 'Preuve soumise ! Elle sera examinée par notre équipe dans les 24h. ✅';
        proofSuccess.style.display = 'block';
      }

      proofForm.reset();

    } catch (err) {
      if (proofError) { proofError.textContent = err.message; proofError.style.display = 'block'; }
    } finally {
      if (proofBtn) { proofBtn.disabled = false; proofBtn.textContent = 'Soumettre ma preuve'; }
    }
  });
}

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAuth();
  if (!session) return;

  if (!taskId) {
    alert('Aucune tâche sélectionnée. Retour à la liste des tâches.');
    window.location.href = 'tasks.html';
    return;
  }

  loadTaskDetail(session.token, taskId);
})();
