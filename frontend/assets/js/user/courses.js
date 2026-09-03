// ================================================================
//  NOVAFUNDS — user/courses.js
//  Formations gratuites disponibles pour les utilisateurs
//  Emplacement : frontend/assets/js/user/courses.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Chargement de la liste des formations disponibles
//   3. Affichage avec progression de l'utilisateur
//   4. Accès à un cours (redirect)
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

const coursesContainer = document.getElementById('courses-container');

// ---------------------------------------------------------------
// CHARGEMENT DES FORMATIONS
// ---------------------------------------------------------------

/**
 * Charge la liste des formations disponibles depuis l'API.
 * Affiche également la progression de l'utilisateur pour chaque cours.
 * @param {string} token
 */
async function loadCourses(token) {
  if (!coursesContainer) return;
  coursesContainer.innerHTML = '<p>Chargement des formations…</p>';

  try {
    const response = await fetch(`${API_BASE}/user/courses`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les formations.');

    const courses = await response.json();
    renderCourses(courses);

  } catch (err) {
    console.error('[Courses User] Erreur :', err.message);
    if (coursesContainer) coursesContainer.innerHTML = `<p style="color:red;">${escapeHtml(err.message)}</p>`;
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DES FORMATIONS
// ---------------------------------------------------------------

/**
 * Génère et affiche les cartes de cours.
 * @param {Array} courses
 */
function renderCourses(courses) {
  if (!coursesContainer) return;

  if (!courses || courses.length === 0) {
    coursesContainer.innerHTML = '<p>Aucune formation disponible pour le moment.</p>';
    return;
  }

  coursesContainer.innerHTML = '';

  courses.forEach(course => {
    const card = document.createElement('article');
    const progress = course.user_progress ?? 0; // Progression en %
    const statusLabel = progress === 100 ? '✅ Terminé' : progress > 0 ? `En cours (${progress}%)` : 'Non commencé';
    const statusColor = progress === 100 ? 'green' : progress > 0 ? 'orange' : 'gray';

    card.innerHTML = `
      <h3>${escapeHtml(course.title)}</h3>
      <p><strong>Catégorie :</strong> ${escapeHtml(course.category)}</p>
      <p><strong>Leçons :</strong> ${course.lessons_count ?? 0}</p>
      <p>${escapeHtml(course.description ?? '')}</p>
      <p>
        <strong>Progression :</strong>
        <span style="color:${statusColor};">${statusLabel}</span>
      </p>
      <p>
        <button class="btn-open-course" data-id="${course.id}">
          ${progress > 0 ? '▶ Continuer la formation' : '▶ Commencer la formation'}
        </button>
      </p>
    `;
    coursesContainer.appendChild(card);
  });

  // Attache les événements d'ouverture de cours
  document.querySelectorAll('.btn-open-course').forEach(btn => {
    btn.addEventListener('click', () => {
      // Redirige vers la page de cours (à adapter selon l'architecture choisie)
      alert(`Ouverture de la formation #${btn.dataset.id} (page à implémenter).`);
    });
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
  loadCourses(session.token);
})();
