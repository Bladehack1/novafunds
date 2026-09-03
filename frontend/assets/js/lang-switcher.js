/**
 * NovaFunds — Sélecteur de Langue (Language Switcher)
 * Injecte un bouton flottant en haut à droite de chaque page
 * Langues : FR 🇫🇷 | EN 🇬🇧 | SW 🇹🇿 | LN 🇨🇩
 */

(function () {
  'use strict';

  const LANGS = [
    { code: 'fr', label: 'Français', flag: '🇫🇷', short: 'FR' },
    { code: 'en', label: 'English',  flag: '🇬🇧', short: 'EN' },
    { code: 'sw', label: 'Swahili',  flag: '🇹🇿', short: 'SW' },
    { code: 'ln', label: 'Lingala',  flag: '🇨🇩', short: 'LN' }
  ];

  function createSwitcher() {
    const currentLang = (window.nfI18n && window.nfI18n.getCurrentLang()) ||
                        localStorage.getItem('nf_lang') || 'fr';
    const current = LANGS.find(l => l.code === currentLang) || LANGS[0];

    // ── Styles injectés dynamiquement ──────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      #nf-lang-switcher {
        position: fixed;
        top: 14px;
        right: 18px;
        z-index: 99999;
        font-family: 'Segoe UI', Arial, sans-serif;
      }

      #nf-lang-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #e0e0ff;
        border: 1px solid rgba(120, 130, 255, 0.4);
        border-radius: 24px;
        padding: 7px 14px 7px 10px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.3px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        transition: all 0.25s ease;
        user-select: none;
      }

      #nf-lang-btn:hover {
        background: linear-gradient(135deg, #252550 0%, #1e2d5e 100%);
        border-color: rgba(130, 145, 255, 0.7);
        box-shadow: 0 6px 20px rgba(100,100,255,0.25);
        transform: translateY(-1px);
      }

      #nf-lang-btn .nf-flag {
        font-size: 16px;
        line-height: 1;
      }

      #nf-lang-btn .nf-arrow {
        font-size: 9px;
        opacity: 0.7;
        transition: transform 0.2s;
        margin-left: 2px;
      }

      #nf-lang-switcher.open #nf-lang-btn .nf-arrow {
        transform: rotate(180deg);
      }

      #nf-lang-dropdown {
        display: none;
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: linear-gradient(160deg, #1a1a2e 0%, #0f1535 100%);
        border: 1px solid rgba(120, 130, 255, 0.35);
        border-radius: 14px;
        overflow: hidden;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        min-width: 170px;
        animation: nf-dropdown-in 0.18s ease;
      }

      @keyframes nf-dropdown-in {
        from { opacity: 0; transform: translateY(-8px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)   scale(1);    }
      }

      #nf-lang-switcher.open #nf-lang-dropdown {
        display: block;
      }

      .nf-lang-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 16px;
        cursor: pointer;
        color: #c8ccff;
        font-size: 13.5px;
        font-weight: 500;
        transition: background 0.15s, color 0.15s;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }

      .nf-lang-option:last-child {
        border-bottom: none;
      }

      .nf-lang-option:hover {
        background: rgba(100, 120, 255, 0.18);
        color: #ffffff;
      }

      .nf-lang-option.active {
        background: rgba(100, 120, 255, 0.28);
        color: #a8b4ff;
        font-weight: 700;
      }

      .nf-lang-option .nf-opt-flag {
        font-size: 18px;
      }

      .nf-lang-check {
        margin-left: auto;
        font-size: 12px;
        color: #7b8cff;
        opacity: 0;
      }

      .nf-lang-option.active .nf-lang-check {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);

    // ── Structure HTML ───────────────────────────────────────────────────
    const wrapper = document.createElement('div');
    wrapper.id = 'nf-lang-switcher';
    wrapper.setAttribute('role', 'navigation');
    wrapper.setAttribute('aria-label', 'Language selector');

    const btn = document.createElement('button');
    btn.id = 'nf-lang-btn';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = `
      <span class="nf-flag">${current.flag}</span>
      <span class="nf-short">${current.short}</span>
      <span class="nf-arrow">▼</span>
    `;

    const dropdown = document.createElement('div');
    dropdown.id = 'nf-lang-dropdown';
    dropdown.setAttribute('role', 'listbox');

    LANGS.forEach(lang => {
      const opt = document.createElement('div');
      opt.className = 'nf-lang-option' + (lang.code === currentLang ? ' active' : '');
      opt.setAttribute('role', 'option');
      opt.setAttribute('aria-selected', lang.code === currentLang ? 'true' : 'false');
      opt.setAttribute('data-lang', lang.code);
      opt.setAttribute('tabindex', '0');
      opt.innerHTML = `
        <span class="nf-opt-flag">${lang.flag}</span>
        <span>${lang.label}</span>
        <span class="nf-lang-check">✓</span>
      `;

      opt.addEventListener('click', () => selectLang(lang.code));
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectLang(lang.code);
        }
      });

      dropdown.appendChild(opt);
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(dropdown);
    document.body.appendChild(wrapper);

    // ── Interactions ─────────────────────────────────────────────────────
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = wrapper.classList.contains('open');
      wrapper.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', () => {
      wrapper.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });

    // ── Sélection d'une langue ───────────────────────────────────────────
    function selectLang(code) {
      // Mettre à jour l'UI immédiatement
      const shortEl = btn.querySelector('.nf-short');
      const flagEl  = btn.querySelector('.nf-flag');
      const selected = LANGS.find(l => l.code === code);
      if (selected && shortEl && flagEl) {
        shortEl.textContent = selected.short;
        flagEl.textContent  = selected.flag;
      }

      // Mettre à jour les options
      dropdown.querySelectorAll('.nf-lang-option').forEach(opt => {
        const isActive = opt.getAttribute('data-lang') === code;
        opt.classList.toggle('active', isActive);
        opt.setAttribute('aria-selected', String(isActive));
      });

      // Fermer le dropdown
      wrapper.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');

      // Appliquer la traduction via le moteur i18n
      if (window.nfI18n && window.nfI18n.setLang) {
        window.nfI18n.setLang(code);
      } else {
        localStorage.setItem('nf_lang', code);
        location.reload();
      }
    }

    // ── Écoute les changements de langue du moteur i18n ─────────────────
    document.addEventListener('nf:langchange', (e) => {
      const { lang } = e.detail;
      const shortEl = btn.querySelector('.nf-short');
      const flagEl  = btn.querySelector('.nf-flag');
      const selected = LANGS.find(l => l.code === lang);
      if (selected) {
        if (shortEl) shortEl.textContent = selected.short;
        if (flagEl)  flagEl.textContent  = selected.flag;
      }
      dropdown.querySelectorAll('.nf-lang-option').forEach(opt => {
        const isActive = opt.getAttribute('data-lang') === lang;
        opt.classList.toggle('active', isActive);
        opt.setAttribute('aria-selected', String(isActive));
      });
    });
  }

  // Injecter après le chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSwitcher);
  } else {
    createSwitcher();
  }

})();
