// ================================================================
//  NOVAFUNDS — user/tasks.js
//  Liste des tâches rémunérées disponibles pour l'utilisateur
//  Emplacement : frontend/assets/js/user/tasks.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session et du statut du compte (doit être ACTIVE)
//   2. Chargement des tâches disponibles depuis l'API
//   3. Affichage des tâches avec filtrage par catégorie
//   4. Bouton pour commencer une tâche (redirige vers task-detail.html)
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

const tasksContainer   = document.getElementById('tasks-container');   // Zone d'affichage des tâches
const filterSelect     = document.getElementById('task-filter-category'); // Filtre catégorie
const tasksCountEl     = document.getElementById('tasks-count');         // Compteur de tâches

// ---------------------------------------------------------------
// CHARGEMENT DES TÂCHES DISPONIBLES
// ---------------------------------------------------------------

/**
 * Charge la liste des tâches disponibles depuis l'API.
 * Filtre optionnellement par catégorie.
 * @param {string} token
 * @param {string} category - Catégorie sélectionnée (vide = toutes)
 */
async function loadAvailableTasks(token, category = '') {
  if (!tasksContainer) return;
  tasksContainer.innerHTML = '<p>Chargement des tâches…</p>';

  try {
    const params = new URLSearchParams({ status: 'active' });
    if (category) params.append('category', category);

    const response = await fetch(`${API_BASE}/user/tasks?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les tâches.');

    const tasks = await response.json();

    if (tasksCountEl) tasksCountEl.textContent = tasks.length;

    renderTasks(tasks);

  } catch (err) {
    console.error('[Tasks User] Erreur :', err.message);
    if (tasksContainer) tasksContainer.innerHTML = `<p style="color:red;">Erreur : ${escapeHtml(err.message)}</p>`;
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DES TÂCHES
// ---------------------------------------------------------------

/**
 * Génère et affiche les cartes de tâches dans le conteneur.
 * @param {Array} tasks - Liste des tâches à afficher
 */
function renderTasks(tasks) {
  if (!tasksContainer) return;

  if (!tasks || tasks.length === 0) {
    tasksContainer.innerHTML = '<p>Aucune tâche disponible pour le moment. Revenez plus tard !</p>';
    return;
  }

  tasksContainer.innerHTML = '';

  tasks.forEach(task => {
    const card = document.createElement('article');
    card.innerHTML = `
      <h3>${escapeHtml(task.title)}</h3>
      <p><strong>Catégorie :</strong> ${escapeHtml(task.category)}</p>
      <p><strong>Récompense :</strong> ${task.reward} USD</p>
      <p>${escapeHtml(task.description)}</p>
      <p><strong>Délai :</strong> ${task.duration_hours}h pour compléter</p>
      <p>
        <button class="btn-start-task" data-id="${task.id}">
          ▶ Commencer cette tâche
        </button>
      </p>
    `;
    tasksContainer.appendChild(card);
  });

  // Attache les événements sur les boutons "Commencer"
  document.querySelectorAll('.btn-start-task').forEach(btn => {
    btn.addEventListener('click', () => {
      // Redirige vers la page de détail de la tâche avec son ID
      window.location.href = `task-detail.html?task_id=${btn.dataset.id}`;
    });
  });
}

// ---------------------------------------------------------------
// FILTRE PAR CATÉGORIE
// ---------------------------------------------------------------

if (filterSelect) {
  filterSelect.addEventListener('change', () => {
    const session = requireAuth();
    if (!session) return;
    loadAvailableTasks(session.token, filterSelect.value);
  });
}

// ---------------------------------------------------------------
// FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAuth();
  if (!session) return;
  loadAvailableTasks(session.token);
})();
