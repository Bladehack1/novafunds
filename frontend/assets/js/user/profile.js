// ================================================================
//  NOVAFUNDS — user/profile.js
//  Profil utilisateur (affichage et modification)
//  Emplacement : frontend/assets/js/user/profile.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Chargement et affichage des informations du profil
//   3. Modification des informations (email, téléphone)
//   4. Changement de mot de passe
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

const profileForm    = document.getElementById('profile-edit-form');
const passwordForm   = document.getElementById('change-password-form');
const profileError   = document.getElementById('profile-error');
const profileSuccess = document.getElementById('profile-success');
const pwdError       = document.getElementById('pwd-error');
const pwdSuccess     = document.getElementById('pwd-success');
const saveProfileBtn = document.getElementById('profile-save-btn');
const savePwdBtn     = document.getElementById('pwd-save-btn');

// ---------------------------------------------------------------
// CHARGEMENT DES DONNÉES DU PROFIL
// ---------------------------------------------------------------

/**
 * Récupère les données du profil depuis l'API et pré-remplit le formulaire.
 * @param {string} token
 */
async function loadProfile(token) {
  try {
    const response = await fetch(`${API_BASE}/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger le profil.');

    const profile = await response.json();

    // Pré-remplissage des champs du formulaire de profil
    setValueById('profile-username',  profile.username);
    setValueById('profile-email',     profile.email);
    setValueById('profile-phone',     profile.phone);
    setValueById('profile-country',   profile.country);
    setValueById('profile-member-since', formatDate(profile.created_at));
    setValueById('profile-status',       profile.status);

  } catch (err) {
    console.error('[Profile] Erreur :', err.message);
    if (profileError) { profileError.textContent = err.message; profileError.style.display = 'block'; }
  }
}

// ---------------------------------------------------------------
// MODIFICATION DU PROFIL
// ---------------------------------------------------------------

if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (profileError)   profileError.style.display   = 'none';
    if (profileSuccess) profileSuccess.style.display = 'none';

    const session = requireAuth();
    if (!session) return;

    const payload = Object.fromEntries(new FormData(profileForm).entries());

    if (saveProfileBtn) { saveProfileBtn.disabled = true; saveProfileBtn.textContent = 'Sauvegarde…'; }

    try {
      const response = await fetch(`${API_BASE}/user/profile`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:    JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la mise à jour.');

      if (profileSuccess) { profileSuccess.textContent = 'Profil mis à jour avec succès ! ✅'; profileSuccess.style.display = 'block'; }

      // Met à jour le nom dans le localStorage si changé
      if (data.user) {
        localStorage.setItem('nf_user', JSON.stringify(data.user));
      }

    } catch (err) {
      if (profileError) { profileError.textContent = err.message; profileError.style.display = 'block'; }
    } finally {
      if (saveProfileBtn) { saveProfileBtn.disabled = false; saveProfileBtn.textContent = 'Sauvegarder'; }
    }
  });
}

// ---------------------------------------------------------------
// CHANGEMENT DE MOT DE PASSE
// ---------------------------------------------------------------

if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (pwdError)   pwdError.style.display   = 'none';
    if (pwdSuccess) pwdSuccess.style.display = 'none';

    const session = requireAuth();
    if (!session) return;

    const currentPwd = document.getElementById('pwd-current')?.value    ?? '';
    const newPwd     = document.getElementById('pwd-new')?.value         ?? '';
    const confirmPwd = document.getElementById('pwd-confirm')?.value     ?? '';

    // Validation locale du nouveau mot de passe
    if (!currentPwd) { if (pwdError) { pwdError.textContent = 'Saisissez votre mot de passe actuel.'; pwdError.style.display = 'block'; } return; }
    if (newPwd.length < 6) { if (pwdError) { pwdError.textContent = 'Le nouveau mot de passe doit contenir au moins 6 caractères.'; pwdError.style.display = 'block'; } return; }
    if (newPwd !== confirmPwd) { if (pwdError) { pwdError.textContent = 'Les mots de passe ne correspondent pas.'; pwdError.style.display = 'block'; } return; }

    if (savePwdBtn) { savePwdBtn.disabled = true; savePwdBtn.textContent = 'Mise à jour…'; }

    try {
      const response = await fetch(`${API_BASE}/user/profile/password`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.token}` },
        body:    JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur.');

      if (pwdSuccess) { pwdSuccess.textContent = 'Mot de passe modifié avec succès ! ✅'; pwdSuccess.style.display = 'block'; }
      passwordForm.reset();

    } catch (err) {
      if (pwdError) { pwdError.textContent = err.message; pwdError.style.display = 'block'; }
    } finally {
      if (savePwdBtn) { savePwdBtn.disabled = false; savePwdBtn.textContent = 'Modifier le mot de passe'; }
    }
  });
}

// ---------------------------------------------------------------
// FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function setValueById(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
    el.value = value ?? '';
  } else {
    el.textContent = value ?? '—';
  }
}
function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAuth();
  if (!session) return;
  loadProfile(session.token);
})();
