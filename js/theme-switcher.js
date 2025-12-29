/**
 * Theme Switcher - Auto-follow system theme with manual override
 * Supports automatic detection of system theme preference and manual switching
 */
(function() {
  'use strict';

  // Get configuration from window.THEME_CONFIG (injected by EJS)
  const config = window.THEME_CONFIG || {
    lightTheme: 'white',
    darkTheme: 'dark',
    defaultMode: 'auto'
  };

  const THEME_KEY = 'theme-preference';
  const THEME_AUTO = 'auto';
  const THEME_LIGHT = config.lightTheme;
  const THEME_DARK = config.darkTheme;
  const DEFAULT_MODE = config.defaultMode;

  /**
   * Get the current system theme preference
   */
  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return THEME_DARK;
    }
    return THEME_LIGHT; // Returns 'white' theme for light mode
  }

  /**
   * Get the stored theme preference or default to configured default
   */
  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || DEFAULT_MODE;
    } catch (e) {
      return DEFAULT_MODE;
    }
  }

  /**
   * Store the theme preference
   */
  function setStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  }

  /**
   * Apply the theme to the document
   */
  function applyTheme(theme) {
    const root = document.documentElement;

    // Set data-theme attribute to the specific theme
    // Supports: white, light, classic, dark
    if (theme && theme !== 'white') {
      root.setAttribute('data-theme', theme);
    } else {
      // White is the default theme (no data-theme attribute needed)
      root.removeAttribute('data-theme');
    }

    // Trigger SVG theme adapter update if available
    if (window.SVGThemeAdapter && window.SVGThemeAdapter.updateAllSvgBackgrounds) {
      // Use requestAnimationFrame to update on next frame
      requestAnimationFrame(function() {
        window.SVGThemeAdapter.updateAllSvgBackgrounds();
      });
    }
  }

  /**
   * Capitalize first letter of a string
   */
  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get the effective theme (resolve 'auto' to actual theme)
   */
  function getEffectiveTheme(preference) {
    if (preference === THEME_AUTO) {
      return getSystemTheme();
    }
    return preference;
  }

  /**
   * Update the theme toggle button icon
   */
  function updateToggleButton(preference) {
    const buttons = [
      document.getElementById('theme-toggle'),
      document.getElementById('theme-toggle-mobile')
    ];

    buttons.forEach(function(button) {
      if (!button) return;

      const icon = button.querySelector('i');
      if (!icon) return;

      // Remove all theme icon classes
      icon.className = '';

      // Set icon based on preference
      if (preference === THEME_AUTO) {
        icon.className = 'fa-solid fa-circle-half-stroke fa-lg';
        button.setAttribute('aria-label', 'Theme: Auto (follows system)');
        button.setAttribute('title', 'Theme: Auto (follows system)');
      } else if (preference === THEME_DARK || preference === 'dark') {
        icon.className = 'fa-solid fa-moon fa-lg';
        button.setAttribute('aria-label', 'Theme: ' + capitalizeFirst(preference));
        button.setAttribute('title', 'Theme: ' + capitalizeFirst(preference));
      } else {
        // Light themes (white, light, classic)
        icon.className = 'fa-solid fa-sun fa-lg';
        button.setAttribute('aria-label', 'Theme: ' + capitalizeFirst(preference));
        button.setAttribute('title', 'Theme: ' + capitalizeFirst(preference));
      }
    });
  }

  /**
   * Cycle through theme options: auto -> white -> dark -> auto
   */
  function cycleTheme() {
    const current = getStoredTheme();
    let next;

    if (current === THEME_AUTO) {
      next = THEME_LIGHT;
    } else if (current === THEME_LIGHT) {
      next = THEME_DARK;
    } else {
      next = THEME_AUTO;
    }

    setStoredTheme(next);
    const effectiveTheme = getEffectiveTheme(next);
    applyTheme(effectiveTheme);
    updateToggleButton(next);
  }

  /**
   * Initialize theme on page load
   */
  function initTheme() {
    const preference = getStoredTheme();
    const effectiveTheme = getEffectiveTheme(preference);

    // Apply theme immediately to prevent flash
    applyTheme(effectiveTheme);

    // Update button when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        updateToggleButton(preference);
        setupThemeToggle();
      });
    } else {
      updateToggleButton(preference);
      setupThemeToggle();
    }
  }

  /**
   * Setup theme toggle button click handler
   */
  function setupThemeToggle() {
    const buttons = [
      document.getElementById('theme-toggle'),
      document.getElementById('theme-toggle-mobile')
    ];

    buttons.forEach(function(button) {
      if (button) {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          cycleTheme();
        });
      }
    });
  }

  /**
   * Listen for system theme changes (only when preference is 'auto')
   */
  if (window.matchMedia) {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Modern browsers
    if (darkModeQuery.addEventListener) {
      darkModeQuery.addEventListener('change', function(e) {
        const preference = getStoredTheme();
        if (preference === THEME_AUTO) {
          const newTheme = e.matches ? THEME_DARK : THEME_LIGHT;
          applyTheme(newTheme);
          // SVG adapter will be called by applyTheme
        }
      });
    }
    // Older browsers
    else if (darkModeQuery.addListener) {
      darkModeQuery.addListener(function(e) {
        const preference = getStoredTheme();
        if (preference === THEME_AUTO) {
          const newTheme = e.matches ? THEME_DARK : THEME_LIGHT;
          applyTheme(newTheme);
          // SVG adapter will be called by applyTheme
        }
      });
    }
  }

  // Initialize theme immediately
  initTheme();
})();
