// ================================================================
//  NOVAFUNDS — register.js
//  Fichier JavaScript pour la page d'INSCRIPTION (register.html)
//  Emplacement : frontend/assets/js/register.js
// ================================================================
//
//  FONCTIONNALITÉS COUVERTES :
//   1. Pré-remplissage du code de parrainage depuis l'URL (?ref=CODE)
//   2. Validation côté client de tous les champs du formulaire
//   3. Envoi des données à l'API backend (POST /api/auth/register)
//   4. Affichage du message de confirmation après inscription réussie
//   5. Redirection automatique vers la page d'activation
//   6. Vérification de session existante au chargement de la page
//
// ================================================================

// ---------------------------------------------------------------
// 1. CONFIGURATION GLOBALE
// ---------------------------------------------------------------

/** URL de base de l'API backend. Modifiable selon l'environnement. */
const API_BASE = '/api';

// ---------------------------------------------------------------
// 2. SÉLECTION DES ÉLÉMENTS DU DOM
//    Ces IDs doivent correspondre à ceux présents dans register.html
// ---------------------------------------------------------------

const registerForm = document.getElementById('register-form');          // Le formulaire
const usernameInput = document.getElementById('reg-username');            // Champ nom d'utilisateur
const emailInput = document.getElementById('reg-email');              // Champ adresse e-mail
const phoneInput = document.getElementById('reg-phone');              // Champ téléphone
const countrySelect = document.getElementById('reg-country');            // Liste déroulante pays
const passwordInput = document.getElementById('reg-password');           // Champ mot de passe
const confirmPwdInput = document.getElementById('reg-confirm-password');   // Champ confirmation mdp
const referralInput = document.getElementById('reg-referral');           // Champ code parrainage
const acceptTermsInput = document.getElementById('reg-terms');              // Case CGU
const submitBtn = document.getElementById('reg-submit-btn');         // Bouton soumettre
const errorMsg = document.getElementById('reg-error-msg');          // Bloc message erreur
const successMsg = document.getElementById('reg-success-msg');        // Bloc message succès

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
  errorMsg.textContent = message;
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
  successMsg.textContent = message;
  successMsg.style.display = 'block';
  if (errorMsg) errorMsg.style.display = 'none';
}

/**
 * Masque tous les messages de retour (erreur et succès).
 * Appelée avant chaque nouvelle soumission.
 */
function clearMessages() {
  if (errorMsg) errorMsg.style.display = 'none';
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
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'Inscription en cours…' : "S'inscrire";
}

// ---------------------------------------------------------------
// 4. EXPRESSIONS RÉGULIÈRES DE VALIDATION
// ---------------------------------------------------------------

/** Valide le format d'une adresse e-mail standard */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valide un numéro de téléphone international (avec ou sans indicatif) */
const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

/** Valide le nom d'utilisateur : lettres, chiffres et underscore uniquement */
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

// ---------------------------------------------------------------
// 5. VALIDATION CÔTÉ CLIENT
//    Vérifie tous les champs AVANT d'envoyer la requête au serveur.
//    Cela réduit les appels inutiles à l'API et améliore l'UX.
// ---------------------------------------------------------------

/**
 * Valide l'ensemble des champs du formulaire d'inscription.
 * Les vérifications sont faites dans l'ordre d'apparition dans le formulaire.
 *
 * @returns {{ valid: boolean, error?: string }}
 */
function validateForm() {
  const username = usernameInput?.value.trim() ?? '';
  const email = emailInput?.value.trim() ?? '';
  const phone = phoneInput?.value.trim() ?? '';
  const country = countrySelect?.value ?? '';
  const password = passwordInput?.value ?? '';
  const confirmPwd = confirmPwdInput?.value ?? '';
  const accepted = acceptTermsInput?.checked ?? false;

  // --- Validation du nom d'utilisateur ---
  if (!username) {
    return { valid: false, error: "Veuillez saisir un nom d'utilisateur." };
  }
  if (username.length < 3 || username.length > 30) {
    return { valid: false, error: "Le nom d'utilisateur doit contenir entre 3 et 30 caractères." };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores (_)." };
  }

  // --- Validation de l'e-mail ---
  if (!email) {
    return { valid: false, error: 'Veuillez saisir votre adresse e-mail.' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Veuillez saisir une adresse e-mail valide (ex: jean@example.com).' };
  }

  // --- Validation du téléphone ---
  if (!phone) {
    return { valid: false, error: 'Veuillez saisir votre numéro de téléphone.' };
  }
  if (!PHONE_REGEX.test(phone)) {
    return { valid: false, error: 'Veuillez saisir un numéro de téléphone valide (ex: +225 07 00 00 00).' };
  }

  // --- Validation du pays ---
  if (!country) {
    return { valid: false, error: 'Veuillez sélectionner votre pays de résidence.' };
  }

  // --- Validation du mot de passe ---
  if (!password) {
    return { valid: false, error: 'Veuillez saisir un mot de passe.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 6 caractères.' };
  }

  // --- Vérification de la confirmation du mot de passe ---
  if (password !== confirmPwd) {
    return { valid: false, error: 'Les deux mots de passe ne correspondent pas. Veuillez vérifier.' };
  }

  // --- Vérification de l'acceptation des CGU ---
  if (!accepted) {
    return { valid: false, error: "Vous devez accepter les Conditions Générales d'Utilisation pour vous inscrire." };
  }

  // Tous les champs sont valides
  return { valid: true };
}

// ---------------------------------------------------------------
// 6. PRÉ-REMPLISSAGE DU CODE DE PARRAINAGE DEPUIS L'URL
//    Si l'URL contient ?ref=CODE, le champ est rempli automatiquement
//    et verrouillé pour éviter toute modification.
//    Exemple d'URL : register.html?ref=NF-12345
// ---------------------------------------------------------------

/**
 * Lit le paramètre `ref` dans l'URL de la page et pré-remplit
 * le champ de code de parrainage si la valeur est présente.
 */
function prefillReferralFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');

  if (ref && referralInput) {
    referralInput.value = ref;       // Pré-remplit le champ
    referralInput.readOnly = true;      // Empêche la modification manuelle
    referralInput.title = 'Code de parrainage appliqué automatiquement depuis le lien.';
  }
}

// ---------------------------------------------------------------
// 7. APPEL À L'API BACKEND
// ---------------------------------------------------------------

/**
 * Envoie une requête POST à l'API pour créer un nouveau compte.
 * Retourne les données JSON si l'inscription est réussie.
 * Lance une exception si le serveur retourne une erreur.
 *
 * @param {object} payload - Les données du formulaire à envoyer
 * @param {string} payload.username      - Nom d'utilisateur choisi
 * @param {string} payload.email         - Adresse e-mail
 * @param {string} payload.phone         - Numéro de téléphone
 * @param {string} payload.country       - Code du pays (ex: "CI", "FR")
 * @param {string} payload.password      - Mot de passe en clair
 * @param {string|null} payload.referral_code - Code de parrainage ou null
 *
 * @returns {Promise<{ message: string, user: object }>}
 */
async function registerRequest(payload) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  // Si la réponse HTTP n'est pas 2xx, on lève une erreur avec le message du serveur
  if (!response.ok) {
    throw new Error(data.message || "Erreur lors de l'inscription. Veuillez réessayer.");
  }

  return data; // Contient { message, user }
}

// ---------------------------------------------------------------
// 8. GESTION DE LA SOUMISSION DU FORMULAIRE
// ---------------------------------------------------------------

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
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

    // --- Étape 2 : Construction du payload à envoyer ---
    const payload = {
      username: usernameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      country: countrySelect.value,
      password: passwordInput.value,
      // Si le champ parrainage est vide, on envoie null
      referral_code: referralInput?.value.trim() || null,
    };

    // --- Étape 3 : Désactiver le bouton pendant la requête ---
    setLoading(true);

    try {
      // --- Étape 4 : Appel à l'API ---
      const result = await registerRequest(payload);

      // --- Étape 5 : Informer l'utilisateur du succès ---
      showSuccess(
        result.message ||
        "Inscription réussie ! Votre compte est en statut PENDING. " +
        "Vous allez être redirigé vers la page d'activation (10 USD)…"
      );

      // Réinitialise le formulaire après succès
      registerForm.reset();

      // --- Étape 6 : Rediriger vers activation.html après 3 secondes ---
      setTimeout(() => {
        window.location.href = 'activation.html';
      }, 3000);

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
// 9. INITIALISATION AU CHARGEMENT DE LA PAGE
// ---------------------------------------------------------------

// Pré-remplir le code de parrainage si présent dans l'URL
prefillReferralFromUrl();

// ---------------------------------------------------------------
// 10. VÉRIFICATION D'UNE SESSION EXISTANTE (auto-login)
//     Si l'utilisateur est déjà connecté, on le redirige
//     immédiatement sans afficher le formulaire.
// ---------------------------------------------------------------

(function checkExistingSession() {
  const token = localStorage.getItem('nf_token');
  const user = JSON.parse(localStorage.getItem('nf_user') || 'null');

  // Si un token et un utilisateur existent dans le localStorage, on redirige
  if (token && user) {
    const role = user?.role ?? 'user';
    if (role === 'admin' || role === 'super_admin') {
      window.location.href = '../admin/dashboard.html';
    } else {
      window.location.href = '../user/dashboard.html';
    }
  }
})();
