/**
 * NovaFunds — Moteur i18n (Internationalisation)
 * Langues supportées : Français (fr), English (en), Swahili (sw), Lingala (ln)
 * Langue par défaut : Français (fr)
 */

(function () {
  'use strict';

  const SUPPORTED_LANGS = ['fr', 'en', 'sw', 'ln'];
  const DEFAULT_LANG = 'fr';
  const STORAGE_KEY = 'nf_lang';

  /**
   * Récupère la langue active (depuis localStorage ou défaut)
   */
  function getCurrentLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;
  }

  /**
   * Calcule le chemin relatif vers /locales/ depuis la page courante
   */
  function getLocalesBasePath() {
    const path = window.location.pathname;
    // Pages dans /admin/ ou /user/ → remonter 2 niveaux
    if (path.includes('/admin/') || path.includes('/user/')) {
      return '../../locales/';
    }
    // Pages dans /public/ → remonter 2 niveaux
    if (path.includes('/public/')) {
      return '../../locales/';
    }
    // Racine ou autre
    return '../locales/';
  }

  /**
   * Charge un fichier JSON de traduction
   */
  async function loadTranslations(lang) {
    const basePath = getLocalesBasePath();
    try {
      const response = await fetch(`${basePath}${lang}.json?v=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.warn(`[i18n] Impossible de charger ${lang}.json, retour au français.`, err);
      // Fallback vers le français
      if (lang !== DEFAULT_LANG) {
        const fallback = await fetch(`${basePath}${DEFAULT_LANG}.json`);
        return await fallback.json();
      }
      return {};
    }
  }

  /**
   * Accède à une clé imbriquée dans un objet (ex: "user.dashboard.title")
   */
  function getNestedValue(obj, keyPath) {
    return keyPath.split('.').reduce((acc, key) => {
      return acc && acc[key] !== undefined ? acc[key] : null;
    }, obj);
  }

  /**
   * Applique les traductions à tous les éléments [data-i18n]
   */
  function applyTranslations(translations) {
    // Texte des éléments
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        el.textContent = value;
      }
    });

    // Placeholders des inputs
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        el.setAttribute('placeholder', value);
      }
    });

    // Attribut title (tooltip)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        el.setAttribute('title', value);
      }
    });

    // Attribut aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        el.setAttribute('aria-label', value);
      }
    });

    // Mise à jour de l'attribut lang sur <html>
    const langMap = { fr: 'fr', en: 'en', sw: 'sw', ln: 'ln' };
    const currentLang = getCurrentLang();
    document.documentElement.setAttribute('lang', langMap[currentLang] || 'fr');

    // Mise à jour du <title> de la page si la clé page-title est définie
    const pageTitleEl = document.querySelector('[data-i18n-page-title]');
    if (pageTitleEl) {
      const key = pageTitleEl.getAttribute('data-i18n-page-title');
      const value = getNestedValue(translations, key);
      if (value !== null) {
        document.title = value;
      }
    }
  }

  /**
   * Sauvegarde la langue choisie et recharge les traductions
   */
  async function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
      console.warn(`[i18n] Langue non supportée : ${lang}`);
      return;
    }
    localStorage.setItem(STORAGE_KEY, lang);
    const translations = await loadTranslations(lang);

    // Stocker globalement pour d'autres scripts
    window._nf_translations = translations;
    window._nf_lang = lang;

    applyTranslations(translations);

    // Mettre à jour l'UI du sélecteur si présent
    const switcher = document.getElementById('nf-lang-switcher-select');
    if (switcher) switcher.value = lang;

    // Émettre un événement custom
    document.dispatchEvent(new CustomEvent('nf:langchange', {
      detail: { lang, translations }
    }));
  }

  /**
   * Initialisation automatique au chargement de la page
   */
  async function init() {
    const lang = getCurrentLang();
    const translations = await loadTranslations(lang);
    window._nf_translations = translations;
    window._nf_lang = lang;
    applyTranslations(translations);
  }

  // Exposer setLang globalement
  window.nfI18n = {
    setLang,
    getCurrentLang,
    getTranslation: function (keyPath) {
      return getNestedValue(window._nf_translations || {}, keyPath) || keyPath;
    },
    SUPPORTED_LANGS,
    DEFAULT_LANG
  };

  // Lancer l'initialisation dès que le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
