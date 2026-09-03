// ================================================================
//  NOVAFUNDS — user/referrals.js
//  Parrainage et affiliation de l'utilisateur
//  Emplacement : frontend/assets/js/user/referrals.js
// ================================================================
//
//  FONCTIONNALITÉS :
//   1. Vérification de session
//   2. Affichage du code et lien de parrainage personnel
//   3. Bouton de copie du lien de parrainage
//   4. Chargement de la liste des filleuls
//   5. Affichage des bonus de parrainage
//
// ================================================================

const API_BASE = '/api';

function requireAuth() {
  const token = localStorage.getItem('nf_token');
  const user  = JSON.parse(localStorage.getItem('nf_user') || 'null');
  if (!token || !user) { window.location.href = '../public/login.html'; return null; }
  return { token, user };
}

const referralCodeEl   = document.getElementById('user-referral-code');  // Affichage du code
const referralLinkEl   = document.getElementById('user-referral-link');  // Affichage du lien
const copyLinkBtn      = document.getElementById('copy-referral-link');  // Bouton copier
const referralsTbody   = document.getElementById('referrals-tbody');     // Tableau des filleuls
const bonusTbody       = document.getElementById('referral-bonus-tbody'); // Tableau des bonus

// ---------------------------------------------------------------
// CHARGEMENT DES DONNÉES DE PARRAINAGE
// ---------------------------------------------------------------

/**
 * Récupère les informations de parrainage de l'utilisateur depuis l'API.
 * @param {string} token
 */
async function loadReferralData(token) {
  try {
    const response = await fetch(`${API_BASE}/user/referrals`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Impossible de charger les données de parrainage.');

    const data = await response.json();

    // Affichage du code de parrainage
    if (referralCodeEl) referralCodeEl.textContent = data.referral_code ?? '—';

    // Construction et affichage du lien de parrainage complet
    const referralUrl = `${window.location.origin}/frontend/public/register.html?ref=${data.referral_code}`;
    if (referralLinkEl) referralLinkEl.value = referralUrl;

    // Statistiques globales de parrainage
    setTextById('stat-total-referrals',  data.total_referrals  ?? '0');
    setTextById('stat-active-referrals', data.active_referrals ?? '0');
    setTextById('stat-referral-earnings', `${data.total_earnings ?? '0.00'} USD`);

    // Chargement du tableau des filleuls et des bonus
    renderReferrals(data.referrals ?? []);
    renderBonuses(data.bonuses ?? []);

  } catch (err) {
    console.error('[Referrals User] Erreur :', err.message);
  }
}

// ---------------------------------------------------------------
// AFFICHAGE DES FILLEULS
// ---------------------------------------------------------------

/**
 * Génère les lignes du tableau des filleuls.
 * @param {Array} referrals
 */
function renderReferrals(referrals) {
  if (!referralsTbody) return;

  if (!referrals.length) {
    referralsTbody.innerHTML = '<tr><td colspan="4">Vous n\'avez pas encore de filleuls.</td></tr>';
    return;
  }

  referralsTbody.innerHTML = '';

  referrals.forEach(r => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(r.username)}</td>
      <td>${formatDate(r.joined_at)}</td>
      <td>
        <span style="color:${r.is_active ? 'green' : 'orange'};">
          ${r.is_active ? 'Actif ✅' : 'En attente ⏳'}
        </span>
      </td>
      <td>${r.bonus_generated ?? '0.00'} USD</td>
    `;
    referralsTbody.appendChild(row);
  });
}

// ---------------------------------------------------------------
// AFFICHAGE DES BONUS PERÇUS
// ---------------------------------------------------------------

/**
 * Génère les lignes du tableau des bonus de parrainage reçus.
 * @param {Array} bonuses
 */
function renderBonuses(bonuses) {
  if (!bonusTbody) return;

  if (!bonuses.length) {
    bonusTbody.innerHTML = '<tr><td colspan="3">Aucun bonus reçu pour le moment.</td></tr>';
    return;
  }

  bonusTbody.innerHTML = '';
  bonuses.forEach(b => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(b.earned_at)}</td>
      <td>${escapeHtml(b.reason)}</td>
      <td><strong style="color:green;">+${b.amount} USD</strong></td>
    `;
    bonusTbody.appendChild(row);
  });
}

// ---------------------------------------------------------------
// COPIE DU LIEN DE PARRAINAGE
// ---------------------------------------------------------------

if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', () => {
    const link = referralLinkEl?.value;
    if (!link) return;

    // Copie dans le presse-papier
    navigator.clipboard.writeText(link).then(() => {
      const original = copyLinkBtn.textContent;
      copyLinkBtn.textContent = 'Copié ! ✅';
      setTimeout(() => { copyLinkBtn.textContent = original; }, 2000);
    }).catch(() => {
      alert('Impossible de copier automatiquement. Sélectionnez et copiez le lien manuellement.');
    });
  });
}

// ---------------------------------------------------------------
// FONCTIONS UTILITAIRES
// ---------------------------------------------------------------

function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ---------------------------------------------------------------
// INITIALISATION
// ---------------------------------------------------------------

(function init() {
  const session = requireAuth();
  if (!session) return;
  loadReferralData(session.token);
})();
