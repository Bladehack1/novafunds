// ================================================================
//  NOVAFUNDS — admin/tasks.js
//  Gestion des tâches rémunérées (création, modification, activation)
//  Emplacement : frontend/assets/js/admin/tasks.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de la session admin
//   2. Création d'une nouvelle tâche via le formulaire
//   3. Chargement et affichage de la liste des tâches existantes
//   4. Actions : Modifier, Activer, Désactiver une tâche
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
// 2. RÉFÉRENCES DOM — FORMULAIRE DE CRÉATION
// ---------------------------------------------------------------

const createTaskForm    = document.getElementById('create-task-form');
const taskTitleInput    = document.getElementById('task-title');
const taskCategoryInput = document.getElementById('task-category');
const taskRewardInput   = document.getElementById('task-reward');
const taskBudgetInput   = document.getElementById('task-budget');
const taskDurationInput = document.getElementById('task-duration');
const taskDescInput     = document.getElementById('task-desc');
const taskInstrInput    = document.getElementById('task-instructions');
const taskScreenInput   = document.querySelector('input[name="require_screenshot"]');
const createSubmitBtn   = document.getElementById('create-task-btn');
const createErrorMsg    = document.getElementById('create-task-error');
const createSuccessMsg  = document.getElementById('create-task-success');
const tasksTbody        = document.getElementById('tasks-tbody');

// ---------------------------------------------------------------
// 3. UTILITAIRES D'AFFICHAGE
// ---------------------------------------------------------------

function showCreateError(msg) {
  if (createErrorMsg) { createErrorMsg.textContent = msg; createErrorMsg.style.display = 'block'; }
  if (createSuccessMsg) createSuccessMsg.style.display = 'none';
}
function showCreateSuccess(msg) {
  if (createSuccessMsg) { createSuccessMsg.textContent = msg; createSuccessMsg.style.display = 'block'; }
  if (createErrorMsg) createErrorMsg.style.display = 'none';
}
function clearCreateMessages() {
  if (createErrorMsg)   createErrorMsg.style.display   = 'none';
  if (createSuccessMsg) createSuccessMsg.style.display = 'none';
}
function setCreateLoading(loading) {
  if (!createSubmitBtn) return;
  createSubmitBtn.disabled    = loading;
  createSubmitBtn.textContent = loading ? 'Création en cours…' : 'Créer et activer la tâche';
}

// ---------------------------------------------------------------
// 4. VALIDATION DU FORMULAIRE DE CRÉATION
// ---------------------------------------------------------------

/**
 * Valide les champs du formulaire de création de tâche.
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCreateForm() {
  const title    = taskTitleInput?.value.trim()    ?? '';
  const category = taskCategoryInput?.value        ?? '';
  const reward   = parseFloat(taskRewardInput?.value ?? 0);
  const budget   = parseFloat(taskBudgetInput?.value ?? 0);
  const duration = parseInt(taskDurationInput?.value ?? 0);
  const desc     = taskDescInput?.value.trim()     ?? '';
  const instr    = taskInstrInput?.value.trim()    ?? '';

  if (!title)    return { valid: false, error: 'Le titre de la tâche est obligatoire.' };
  if (!category) return { valid: false, error: 'Veuillez sélectionner une catégorie.' };
  if (isNaN(reward) || reward <= 0) return { valid: false, error: 'La récompense doit être un montant positif.' };
  if (isNaN(budget) || budget <= 0) return { valid: false, error: 'Le budget doit être un montant positif.' };
  if (isNaN(duration) || duration < 1) return { valid: false, error: 'Le délai doit être d\'au moins 1 heure.' };
  if (!desc)  return { valid: false, error: 'La description courte est obligatoire.' };
  if (!instr) return { valid: false, error: 'Les instructions détaillées sont obligatoires.' };

  return { valid: true };
}

// ---------------------------------------------------------------
// 5. CRÉATION D'UNE TÂCHE (APPEL API)
// ---------------------------------------------------------------

/**
 * Envoie les données de la nouvelle tâche à l'API.
 * @param {object} payload - Les données de la tâche
 * @param {string} token
 */
async function createTaskRequest(payload, token) {
  const response = await fetch(`${API_BASE}/admin/tasks`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erreur lors de la création de la tâche.');
  return data;
}

// Écouteur sur le formulaire de création
if (createTaskForm) {
  createTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearCreateMessages();

    const { valid, error } = validateCreateForm();
    if (!valid) { showCreateError(error); return; }

    const session = requireAdmin();
    if (!session) return;

    const payload = {
      title:              taskTitleInput.value.trim(),
      category:           taskCategoryInput.value,
      reward:             parseFloat(taskRewardInput.value),
      budget:             parseFloat(taskBudgetInput.value),
      duration_hours:     parseInt(taskDurationInput.value),
      description:        taskDescInput.value.trim(),
      instructions:       taskInstrInput.value.trim(),
      require_screenshot: taskScreenInput?.checked ? 1 : 0,
    };

    setCreateLoading(true);
    try {
      await createTaskRequest(payload, session.token);
      showCreateSuccess('Tâche créée et activée avec succès !');
      createTaskForm.reset();
      loadTasks(session.token); // Recharge la liste
    } catch (err) {
      showCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  });
}

// ---------------------------------------------------------------
// 6. CHARGEMENT DE LA LISTE DES TÂCHES EXISTANTES
// ---------------------------------------------------------------

/**
 * Récupère toutes les tâches depuis l'API et les affiche dans le tableau.
 * @param {string} token
 */
async function loadTasks(token) {
  if (!tasksTbody) return;
  tasksTbody.innerHTML = '<tr><td colspan="8">Chargement des tâches…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les tâches.');

    const tasks = await response.json();
    renderTasksTable(tasks, token);

  } catch (err) {
    console.error('[Tasks] Erreur :', err.message);
    if (tasksTbody) tasksTbody.innerHTML = `<tr><td colspan="8" style="color:red;">Erreur : ${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------------------------------------------------------------
// 7. AFFICHAGE DU TABLEAU DES TÂCHES
// ---------------------------------------------------------------

/**
 * Génère les lignes du tableau pour chaque tâche.
 * @param {Array} tasks
 * @param {string} token
 */
function renderTasksTable(tasks, token) {
  if (!tasksTbody) return;

  if (!tasks || tasks.length === 0) {
    tasksTbody.innerHTML = '<tr><td colspan="8">Aucune tâche trouvée.</td></tr>';
    return;
  }

  tasksTbody.innerHTML = '';

  tasks.forEach(task => {
    const row = document.createElement('tr');
    const isActive = task.status === 'active';
    const statusColor = isActive ? 'green' : 'red';
    const statusLabel = isActive ? 'Actif' : 'Désactivé';

    row.innerHTML = `
      <td>${escapeHtml(task.id)}</td>
      <td><strong>${escapeHtml(task.title)}</strong></td>
      <td>${escapeHtml(task.category)}</td>
      <td>${task.reward} USD</td>
      <td>${task.budget} USD</td>
      <td>${task.submissions_count ?? 0} / ${Math.floor(task.budget / task.reward)}</td>
      <td><strong style="color:${statusColor};">${statusLabel}</strong></td>
      <td>
        <button class="btn-task-toggle" data-id="${task.id}" data-active="${isActive}">
          ${isActive ? 'Désactiver' : 'Activer'}
        </button>
        <button class="btn-task-subs" data-id="${task.id}">Soumissions</button>
      </td>
    `;
    tasksTbody.appendChild(row);
  });

  // Attache les événements sur les boutons d'action
  attachTaskEvents(token);
}

// ---------------------------------------------------------------
// 8. ACTIONS SUR LES TÂCHES (ACTIVER / DÉSACTIVER)
// ---------------------------------------------------------------

/**
 * Attache les événements de clic sur les boutons de la liste des tâches.
 * @param {string} token
 */
function attachTaskEvents(token) {
  // Bouton activer/désactiver
  document.querySelectorAll('.btn-task-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const taskId   = btn.dataset.id;
      const isActive = btn.dataset.active === 'true';
      const action   = isActive ? 'deactivate' : 'activate';

      if (!confirm(`Confirmer : ${action} la tâche #${taskId} ?`)) return;

      try {
        const response = await fetch(`${API_BASE}/admin/tasks/${taskId}/toggle`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        loadTasks(token); // Recharge la liste
      } catch (err) {
        alert(`Erreur : ${err.message}`);
      }
    });
  });

  // Bouton voir les soumissions (placeholder)
  document.querySelectorAll('.btn-task-subs').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `validation.html?task_id=${btn.dataset.id}`;
    });
  });
}

// ---------------------------------------------------------------
// 9. FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---------------------------------------------------------------
// 10. INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAdmin();
  if (!session) return;
  loadTasks(session.token);
})();
