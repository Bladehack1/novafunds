// ================================================================
//  NOVAFUNDS — login.js
//  Fichier JavaScript pour la page de CONNEXION (login.html)
//  Emplacement : frontend/assets/js/login.js
// ================================================================
//
//  FONCTIONNALITÉS COUVERTES :
//   1. Validation côté client des champs du formulaire
//   2. Envoi des identifiants à l'API backend (POST /api/auth/login)
//   3. Sauvegarde du token JWT et des infos utilisateur dans localStorage
//   4. Redirection automatique selon le rôle (admin ou user)
//   5. Vérification de session existante au chargement de la page
//
// ================================================================

// ---------------------------------------------------------------
// 1. CONFIGURATION GLOBALE
// ---------------------------------------------------------------

/** URL de base de l'API backend. Modifiable selon l'environnement. */
const API_BASE = '/api';

// ---------------------------------------------------------------
// 2. SÉLECTION DES ÉLÉMENTS DU DOM
//    Ces IDs doivent correspondre à ceux présents dans login.html
// ---------------------------------------------------------------

const loginForm     = document.getElementById('login-form');         // Le formulaire
const usernameInput = document.getElementById('login-username');     // Champ username/email
const passwordInput = document.getElementById('login-password');     // Champ mot de passe
const submitBtn     = document.getElementById('login-submit-btn');   // Bouton de soumission
const errorMsg      = document.getElementById('login-error-msg');    // Bloc message erreur
const successMsg    = document.getElementById('login-success-msg');  // Bloc message succès

// ---------------------------------------------------------------
// 3. FONCTIONS UTILITAIRES D'AFFICHAGE
// ---------------------------------------------------------------

/**
 * Affiche un message d'erreur visible à l'utilisateur.
 * Cache automatiquement le message de succès s'il est affiché.
 *
 * @param {string} message - Le texte de l'erreur à afficher
 */
function showError(message) {
  if (!errorMsg) return;
  errorMsg.textContent  = message;
  errorMsg.style.display = 'block';
  if (successMsg) successMsg.style.display = 'none';
}

/**
 * Affiche un message de succès visible à l'utilisateur.
 * Cache automatiquement le message d'erreur s'il est affiché.
 *
 * @param {string} message - Le texte du succès à afficher
 */
function showSuccess(message) {
  if (!successMsg) return;
  successMsg.textContent  = message;
  successMsg.style.display = 'block';
  if (errorMsg) errorMsg.style.display = 'none';
}

/**
 * Masque tous les messages de retour (erreur et succès).
 * Appelée avant chaque nouvelle soumission.
 */
function clearMessages() {
  if (errorMsg)   errorMsg.style.display   = 'none';
  if (successMsg) successMsg.style.display = 'none';
}

/**
 * Active ou désactive le bouton de soumission pendant le chargement.
 * Empêche les double-clics et indique à l'utilisateur qu'une action est en cours.
 *
 * @param {boolean} loading - true = chargement en cours, false = prêt
 */
function setLoading(loading) {
  if (!submitBtn) return;
  submitBtn.disabled    = loading;
  submitBtn.textContent = loading ? 'Connexion en cours…' : 'Se connecter';
}

// ---------------------------------------------------------------
// 4. VALIDATION CÔTÉ CLIENT
//    Vérifie les champs AVANT d'envoyer la requête au serveur.
//    Cela réduit les appels inutiles à l'API.
// ---------------------------------------------------------------

/**
 * Valide les champs du formulaire de connexion.
 * Retourne un objet indiquant si le formulaire est valide,
 * et un message d'erreur si ce n'est pas le cas.
 *
 * @returns {{ valid: boolean, error?: string }}
 */
function validateForm() {
  const username = usernameInput?.value.trim() ?? '';
  const password = passwordInput?.value        ?? '';

  // Le nom d'utilisateur ou l'email est obligatoire
  if (!username) {
    return { valid: false, error: "Veuillez saisir votre nom d'utilisateur ou e-mail." };
  }

  // Le mot de passe est obligatoire
  if (!password) {
    return { valid: false, error: 'Veuillez saisir votre mot de passe.' };
  }

  // Le mot de passe doit faire au moins 6 caractères
  if (password.length < 6) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------
// 5. APPEL À L'API BACKEND
// ---------------------------------------------------------------

/**
 * Envoie une requête POST à l'API pour authentifier l'utilisateur.
 * Retourne les données JSON si la connexion est réussie.
 * Lance une exception si le serveur retourne une erreur.
 *
 * @param {string} username - Nom d'utilisateur ou adresse e-mail
 * @param {string} password - Mot de passe en clair (envoyé via HTTPS)
 * @returns {Promise<{ token: string, user: object }>}
 */
async function loginRequest(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });

  const data = await response.json();

  // Si la réponse HTTP n'est pas 2xx, on lève une erreur avec le message du serveur
  if (!response.ok) {
    throw new Error(data.message || 'Erreur de connexion. Veuillez réessayer.');
  }

  return data; // Contient { token, user }
}

// ---------------------------------------------------------------
// 6. GESTION DE LA SESSION (localStorage)
// ---------------------------------------------------------------

/**
 * Sauvegarde le token JWT et les informations de l'utilisateur
 * dans le localStorage du navigateur.
 * Ces données persistent même après fermeture de l'onglet.
 *
 * @param {string} token - Le token JWT retourné par le serveur
 * @param {object} user  - Les données de l'utilisateur connecté
 */
function saveSession(token, user) {
  localStorage.setItem('nf_token', token);
  localStorage.setItem('nf_user',  JSON.stringify(user));
}

/**
 * Redirige l'utilisateur vers son espace selon son rôle.
 *  - 'admin' ou 'super_admin' → tableau de bord administrateur
 *  - Tout autre rôle          → tableau de bord utilisateur
 *
 * @param {object} user - L'objet utilisateur contenant la propriété `role`
 */
function redirectAfterLogin(user) {
  const role = user?.role ?? 'user';

  if (role === 'admin' || role === 'super_admin') {
    window.location.href = '../admin/dashboard.html';
  } else {
    window.location.href = '../user/dashboard.html';
  }
}

// ---------------------------------------------------------------
// 7. GESTION DE LA SOUMISSION DU FORMULAIRE
// ---------------------------------------------------------------

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    // Empêche le rechargement de la page (comportement natif du formulaire HTML)
    event.preventDefault();

    // Efface les anciens messages avant chaque tentative
    clearMessages();

    // --- Étape 1 : Validation locale ---
    const { valid, error } = validateForm();
    if (!valid) {
      showError(error);
      return; // On stoppe tout si les champs sont invalides
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // --- Étape 2 : Désactiver le bouton pendant la requête ---
    setLoading(true);

    try {
      // --- Étape 3 : Appel à l'API ---
      const { token, user } = await loginRequest(username, password);

      // --- Étape 4 : Sauvegarder la session ---
      saveSession(token, user);

      // --- Étape 5 : Informer l'utilisateur et rediriger ---
      showSuccess('Connexion réussie ! Redirection en cours…');
      setTimeout(() => redirectAfterLogin(user), 1200);

    } catch (err) {
      // En cas d'erreur réseau ou réponse serveur non-OK
      showError(err.message);

    } finally {
      // Toujours réactiver le bouton à la fin (succès ou erreur)
      setLoading(false);
    }
  });
}

// ---------------------------------------------------------------
// 8. VÉRIFICATION D'UNE SESSION EXISTANTE (auto-login)
//    Si l'utilisateur est déjà connecté, on le redirige
//    immédiatement sans afficher le formulaire.
// ---------------------------------------------------------------

(function checkExistingSession() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');

  // Si un token et un utilisateur existent dans le localStorage, on redirige
  if (token && user) {
    redirectAfterLogin(user);
  }
})();
