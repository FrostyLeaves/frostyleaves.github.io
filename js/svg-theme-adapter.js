/**
 * SVG Theme Adapter - Dynamically adapt SVG backgrounds to current theme
 * Converts external SVG images to inline SVG and adjusts background colors
 */
(function() {
  'use strict';

  // CSS variable names for theme colors
  const BG_COLOR_VAR = '--color-background';

  /**
   * Get current theme background color from CSS variables
   */
  function getThemeBackgroundColor() {
    const root = document.documentElement;
    // Force reflow to ensure CSS is updated
    void root.offsetHeight;
    const computedStyle = getComputedStyle(root);
    const bgColor = computedStyle.getPropertyValue(BG_COLOR_VAR).trim();

    // Debug log
    console.debug('SVG Theme Adapter: Current theme background color:', bgColor || '#ffffff');

    return bgColor || '#ffffff';
  }

  /**
   * Check if an image is an SVG
   */
  function isSvgImage(img) {
    const src = img.src || '';
    return src.toLowerCase().endsWith('.svg') ||
           src.toLowerCase().includes('.svg?') ||
           src.toLowerCase().includes('.svg#') ||
           src.startsWith('data:image/svg+xml');
  }

  /**
   * Decode base64 data URL
   */
  function decodeDataURL(dataURL) {
    if (dataURL.startsWith('data:image/svg+xml;base64,')) {
      const base64 = dataURL.substring('data:image/svg+xml;base64,'.length);
      return atob(base64);
    } else if (dataURL.startsWith('data:image/svg+xml,')) {
      const encoded = dataURL.substring('data:image/svg+xml,'.length);
      return decodeURIComponent(encoded);
    }
    return null;
  }

  /**
   * Convert external SVG to inline SVG
   */
  function convertToInlineSvg(img) {
    return new Promise(function(resolve, reject) {
      const src = img.src;

      // Skip if already processed
      if (img.hasAttribute('data-svg-processed')) {
        resolve(null);
        return;
      }

      // Handler for SVG text
      function processSvgText(svgText) {
        // Parse SVG text to DOM
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');

        if (!svgElement) {
          throw new Error('Invalid SVG content');
        }

        // Copy img attributes to svg
        const imgClasses = img.className;
        const imgId = img.id;
        const imgStyle = img.getAttribute('style');
        const imgAlt = img.alt;

        if (imgClasses) svgElement.setAttribute('class', imgClasses);
        if (imgId) svgElement.setAttribute('id', imgId);
        if (imgStyle) svgElement.setAttribute('style', imgStyle);
        if (imgAlt) svgElement.setAttribute('aria-label', imgAlt);

        // Ensure SVG has viewBox for proper scaling
        // If no viewBox exists, create one from width/height
        if (!svgElement.hasAttribute('viewBox')) {
          const width = svgElement.getAttribute('width') || svgElement.width.baseVal.value;
          const height = svgElement.getAttribute('height') || svgElement.height.baseVal.value;
          if (width && height) {
            svgElement.setAttribute('viewBox', '0 0 ' + parseFloat(width) + ' ' + parseFloat(height));
          }
        }

        // Remove fixed width/height to allow CSS to control sizing
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');

        // Mark as processed
        svgElement.setAttribute('data-svg-processed', 'true');
        svgElement.setAttribute('data-svg-original-src', src);

        // Add theme-adaptive class
        svgElement.classList.add('svg-theme-adaptive');

        // Replace img with inline svg
        if (img.parentNode) {
          img.parentNode.replaceChild(svgElement, img);
          resolve(svgElement);
        } else {
          reject(new Error('Image has no parent node'));
        }
      }

      try {
        // Check if it's a data URL
        if (src.startsWith('data:image/svg+xml')) {
          const svgText = decodeDataURL(src);
          if (svgText) {
            processSvgText(svgText);
          } else {
            throw new Error('Failed to decode data URL');
          }
        } else {
          // Fetch the SVG file
          fetch(src)
            .then(function(response) {
              if (!response.ok) {
                throw new Error('Failed to fetch SVG: ' + response.statusText);
              }
              return response.text();
            })
            .then(processSvgText)
            .catch(function(error) {
              console.warn('Failed to convert SVG to inline:', src.substring(0, 100), error);
              // Mark as processed to avoid retry
              img.setAttribute('data-svg-processed', 'failed');
              reject(error);
            });
        }
      } catch (error) {
        console.warn('Failed to convert SVG to inline:', src.substring(0, 100), error);
        // Mark as processed to avoid retry
        img.setAttribute('data-svg-processed', 'failed');
        reject(error);
      }
    });
  }

  /**
   * Check if current theme is dark
   */
  function isDarkTheme() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark';
  }

  /**
   * Convert RGB to HSL
   */
  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return [h * 360, s * 100, l * 100];
  }

  /**
   * Convert HSL to RGB
   */
  function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = function(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * Invert a color with hue rotation (mimics filter: invert(1) hue-rotate(180deg))
   */
  function invertColor(color) {
    if (!color) return color;

    const colorStr = color.toLowerCase().trim();
    let r, g, b, a = null;

    // Parse CSS color keywords
    const colorKeywords = {
      'white': [255, 255, 255],
      'black': [0, 0, 0],
      'red': [255, 0, 0],
      'green': [0, 128, 0],
      'blue': [0, 0, 255],
      'yellow': [255, 255, 0],
      'cyan': [0, 255, 255],
      'magenta': [255, 0, 255]
    };

    if (colorKeywords[colorStr]) {
      [r, g, b] = colorKeywords[colorStr];
    }
    // Parse hex colors
    else if (colorStr.startsWith('#')) {
      const hex = colorStr.substring(1);
      const num = parseInt(hex, 16);
      r = (num >> 16) & 0xFF;
      g = (num >> 8) & 0xFF;
      b = num & 0xFF;
    }
    // Parse rgb/rgba colors
    else {
      const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (rgbMatch) {
        r = parseInt(rgbMatch[1]);
        g = parseInt(rgbMatch[2]);
        b = parseInt(rgbMatch[3]);
        a = rgbMatch[4];
      } else {
        return color;
      }
    }

    // Step 1: Invert RGB
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;

    // Step 2: Convert to HSL
    const hsl = rgbToHsl(r, g, b);
    let h = hsl[0];
    let s = hsl[1];
    let l = hsl[2];

    // Step 3: Rotate hue by 180 degrees
    // Only rotate hue if the color has saturation (not grayscale)
    if (s > 0) {
      h = (h + 180) % 360;
    }

    // Step 4: Convert back to RGB
    const rgb = hslToRgb(h, s, l);

    // Return formatted color
    if (a !== null) {
      return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
    } else if (colorStr.startsWith('#')) {
      return '#' + ((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]).toString(16).padStart(6, '0');
    } else {
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }

  /**
   * Update SVG colors to match current theme
   */
  function updateSvgBackground(svg) {
    if (!svg || !svg.querySelector) return;

    const bgColor = getThemeBackgroundColor();
    const isDark = isDarkTheme();

    // Store original colors on first run
    if (!svg.hasAttribute('data-colors-stored')) {
      // Find all elements with fill or stroke
      const elementsWithColors = svg.querySelectorAll('[fill], [stroke]');
      elementsWithColors.forEach(function(elem) {
        const fill = elem.getAttribute('fill');
        const stroke = elem.getAttribute('stroke');

        if (fill && fill !== 'none') {
          elem.setAttribute('data-original-fill', fill);
        }
        if (stroke && stroke !== 'none') {
          elem.setAttribute('data-original-stroke', stroke);
        }
      });

      svg.setAttribute('data-colors-stored', 'true');
    }

    // Find the main background rect at origin (0,0)
    const rects = svg.querySelectorAll('rect');

    rects.forEach(function(rect) {
      const x = parseFloat(rect.getAttribute('x')) || 0;
      const y = parseFloat(rect.getAttribute('y')) || 0;

      // If it's at origin (0,0), it's the main background rect
      if (x === 0 && y === 0) {
        // Always update background to theme color
        if (rect.hasAttribute('style') && rect.style.fill) {
          rect.style.fill = bgColor;
        } else {
          rect.setAttribute('fill', bgColor);
        }

        // Mark as main background on first encounter
        if (!rect.hasAttribute('data-theme-background')) {
          rect.setAttribute('data-theme-background', 'true');
        }
      }
    });

    // Update all other colors based on theme
    const elementsWithColors = svg.querySelectorAll('[data-original-fill], [data-original-stroke]');
    elementsWithColors.forEach(function(elem) {
      // Skip background rect
      if (elem.hasAttribute('data-theme-background')) {
        return;
      }

      const originalFill = elem.getAttribute('data-original-fill');
      const originalStroke = elem.getAttribute('data-original-stroke');

      // Process fill color
      if (originalFill) {
        const fillLower = originalFill.toLowerCase().trim();
        let newFill;

        // If original color is white, always use theme background color
        if (fillLower === '#ffffff' || fillLower === '#fff' || fillLower === 'white') {
          newFill = bgColor;
        } else if (isDark) {
          // Dark mode: invert non-white colors
          newFill = invertColor(originalFill);
        } else {
          // Light mode: restore original colors
          newFill = originalFill;
        }

        if (elem.hasAttribute('style') && elem.style.fill) {
          elem.style.fill = newFill;
        } else {
          elem.setAttribute('fill', newFill);
        }
      }

      // Process stroke color
      if (originalStroke) {
        const strokeLower = originalStroke.toLowerCase().trim();
        let newStroke;

        // If original stroke is white, always use theme background color
        if (strokeLower === '#ffffff' || strokeLower === '#fff' || strokeLower === 'white') {
          newStroke = bgColor;
        } else if (isDark) {
          // Dark mode: invert non-white colors
          newStroke = invertColor(originalStroke);
        } else {
          // Light mode: restore original colors
          newStroke = originalStroke;
        }

        if (elem.hasAttribute('style') && elem.style.stroke) {
          elem.style.stroke = newStroke;
        } else {
          elem.setAttribute('stroke', newStroke);
        }
      }
    });
  }

  /**
   * Process all SVG images in the article content
   */
  function processArticleSvgs() {
    const articles = document.querySelectorAll('article .content');
    const promises = [];

    articles.forEach(function(article) {
      const images = article.querySelectorAll('img');

      images.forEach(function(img) {
        if (isSvgImage(img) && !img.hasAttribute('data-svg-processed')) {
          const promise = convertToInlineSvg(img)
            .then(function(svg) {
              if (svg) {
                updateSvgBackground(svg);
              }
            })
            .catch(function(error) {
              // Silent fail for individual images
              console.debug('SVG conversion failed:', img.src, error);
            });

          promises.push(promise);
        }
      });
    });

    return Promise.all(promises);
  }

  /**
   * Update all processed SVGs when theme changes
   */
  function updateAllSvgBackgrounds() {
    const svgs = document.querySelectorAll('svg[data-svg-processed="true"]');

    console.debug('SVG Theme Adapter: Updating', svgs.length, 'SVG backgrounds');

    svgs.forEach(function(svg) {
      updateSvgBackground(svg);
    });
  }

  /**
   * Setup MutationObserver to watch for theme changes
   */
  function observeThemeChanges() {
    const root = document.documentElement;

    // Watch for data-theme attribute changes
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          // Theme changed, update all SVG backgrounds
          // Use requestAnimationFrame for immediate update on next frame
          requestAnimationFrame(function() {
            updateAllSvgBackgrounds();
          });
        }
      });
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
      attributeOldValue: true
    });
  }

  /**
   * Enable transitions after initial load
   */
  function enableTransitions() {
    // Delay slightly to ensure SVGs are fully rendered with correct colors
    requestAnimationFrame(function() {
      document.documentElement.classList.add('theme-transitions-ready');
    });
  }

  /**
   * Initialize the SVG theme adapter
   */
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        processArticleSvgs().then(enableTransitions);
        observeThemeChanges();
      });
    } else {
      processArticleSvgs().then(enableTransitions);
      observeThemeChanges();
    }
  }

  // Export functions for manual use if needed
  window.SVGThemeAdapter = {
    processArticleSvgs: processArticleSvgs,
    updateAllSvgBackgrounds: updateAllSvgBackgrounds
  };

  // Initialize
  init();
})();
