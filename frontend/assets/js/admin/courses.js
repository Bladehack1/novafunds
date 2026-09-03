// ================================================================
//  NOVAFUNDS — admin/courses.js
//  Gestion des formations (modules de cours gratuits)
//  Emplacement : frontend/assets/js/admin/courses.js
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

const courseForm    = document.getElementById('create-course-form');
const coursesTbody  = document.getElementById('courses-tbody');
const courseError   = document.getElementById('course-error');
const courseSuccess = document.getElementById('course-success');
const courseBtn     = document.getElementById('course-submit-btn');

// ---------------------------------------------------------------
// CHARGEMENT DES COURS
// ---------------------------------------------------------------

async function loadCourses(token) {
  if (!coursesTbody) return;
  coursesTbody.innerHTML = '<tr><td colspan="5">Chargement des formations…</td></tr>';

  try {
    const response = await fetch(`${API_BASE}/admin/courses`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les formations.');
    const courses = await response.json();
    renderCoursesTable(courses, token);
  } catch (err) {
    if (coursesTbody) coursesTbody.innerHTML = `<tr><td colspan="5" style="color:red;">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderCoursesTable(courses, token) {
  if (!coursesTbody) return;
  if (!courses || !courses.length) {
    coursesTbody.innerHTML = '<tr><td colspan="5">Aucune formation créée.</td></tr>';
    return;
  }
  coursesTbody.innerHTML = '';
  courses.forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(c.id)}</td>
      <td><strong>${escapeHtml(c.title)}</strong></td>
      <td>${escapeHtml(c.category)}</td>
      <td>${c.lessons_count ?? 0} leçon(s)</td>
      <td>
        <button class="btn-delete-course" data-id="${c.id}">🗑 Supprimer</button>
      </td>
    `;
    coursesTbody.appendChild(row);
  });

  document.querySelectorAll('.btn-delete-course').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Supprimer la formation #${btn.dataset.id} ?`)) return;
      const session = requireAdmin();
      if (!session) return;
      try {
        const res = await fetch(`${API_BASE}/admin/courses/${btn.dataset.id}`, {
          method:  'DELETE',
          headers: { 'Authorization': `Bearer ${session.token}` },
        });
        if (!res.ok) throw new Error('Erreur lors de la suppression.');
        loadCourses(session.token);
      } catch (err) {
        alert(`Erreur : ${err.message}`);
      }
    });
  });
}

// ---------------------------------------------------------------
// CRÉATION D'UN COURS
// ---------------------------------------------------------------

if (courseForm) {
  courseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const session = requireAdmin();
    if (!session) return;

    if (courseError)   courseError.style.display   = 'none';
    if (courseSuccess) courseSuccess.style.display = 'none';

    const payload = Object.fromEntries(new FormData(courseForm).entries());
    if (courseBtn) { courseBtn.disabled = true; courseBtn.textContent = 'Création…'; }

    try {
      const res = await fetch(`${API_BASE}/admin/courses`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur.');
      if (courseSuccess) { courseSuccess.textContent = 'Formation créée ! ✅'; courseSuccess.style.display = 'block'; }
      courseForm.reset();
      loadCourses(session.token);
    } catch (err) {
      if (courseError) { courseError.textContent = err.message; courseError.style.display = 'block'; }
    } finally {
      if (courseBtn) { courseBtn.disabled = false; courseBtn.textContent = 'Créer la formation'; }
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
  loadCourses(session.token);
})();
