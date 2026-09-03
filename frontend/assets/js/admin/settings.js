// ================================================================
//  NOVAFUNDS — admin/settings.js
//  Paramètres généraux de la plateforme
//  Emplacement : frontend/assets/js/admin/settings.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de la session admin
//   2. Chargement des paramètres actuels depuis l'API
//   3. Sauvegarde des modifications
//   (Seuils de retrait, frais d'activation, limites quotidiennes, etc.)
//
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

// ---------------------------------------------------------------
// RÉFÉRENCES DOM
// ---------------------------------------------------------------

const settingsForm       = document.getElementById('settings-form');
const saveBtn            = document.getElementById('settings-save-btn');
const settingsErrorMsg   = document.getElementById('settings-error');
const settingsSuccessMsg = document.getElementById('settings-success');

// ---------------------------------------------------------------
// CHARGEMENT DES PARAMÈTRES ACTUELS
// ---------------------------------------------------------------

/**
 * Récupère les paramètres actuels de la plateforme et pré-remplit le formulaire.
 * @param {string} token
 */
async function loadSettings(token) {
  try {
    const response = await fetch(`${API_BASE}/admin/settings`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les paramètres.');

    const settings = await response.json();

    // Pré-remplit chaque champ du formulaire avec la valeur actuelle
    Object.keys(settings).forEach(key => {
      const el = document.getElementById(`setting-${key}`);
      if (el) el.value = settings[key];
    });

  } catch (err) {
    console.error('[Settings] Erreur chargement :', err.message);
    showError('Impossible de charger les paramètres : ' + err.message);
  }
}

// ---------------------------------------------------------------
// SAUVEGARDE DES PARAMÈTRES
// ---------------------------------------------------------------

if (settingsForm) {
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const session = requireAdmin();
    if (!session) return;

    // Collecte toutes les valeurs du formulaire
    const formData = new FormData(settingsForm);
    const payload  = Object.fromEntries(formData.entries());

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/admin/settings`, {
        method:  'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la sauvegarde.');

      showSuccess('Paramètres mis à jour avec succès ! ✅');

    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });
}

// ---------------------------------------------------------------
// UTILITAIRES D'AFFICHAGE
// ---------------------------------------------------------------

function showError(msg) {
  if (settingsErrorMsg)   { settingsErrorMsg.textContent = msg; settingsErrorMsg.style.display = 'block'; }
  if (settingsSuccessMsg) settingsSuccessMsg.style.display = 'none';
}
function showSuccess(msg) {
  if (settingsSuccessMsg) { settingsSuccessMsg.textContent = msg; settingsSuccessMsg.style.display = 'block'; }
  if (settingsErrorMsg)   settingsErrorMsg.style.display = 'none';
}
function clearMessages() {
  if (settingsErrorMsg)   settingsErrorMsg.style.display   = 'none';
  if (settingsSuccessMsg) settingsSuccessMsg.style.display = 'none';
}
function setLoading(loading) {
  if (!saveBtn) return;
  saveBtn.disabled    = loading;
  saveBtn.textContent = loading ? 'Sauvegarde…' : 'Sauvegarder les paramètres';
}

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAdmin();
  if (!session) return;
  loadSettings(session.token);
})();
