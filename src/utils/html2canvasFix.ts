import html2canvas from 'html2canvas';

/**
 * Converts any modern CSS color functions (oklab, oklch, lab, color-mix, color(...))
 * to standard browser-supported rgb/hex values.
 * Guaranteed to NEVER convert light elements to black!
 */
export function convertModernColorsToRgb(cssText: string): string {
  if (!cssText || !/(oklch|oklab|lab|color|color-mix)\(/i.test(cssText)) return cssText;

  // Replace color-mix(...) with standard fallback light gray/white
  let cleaned = cssText.replace(/color-mix\([^)]+\)/gi, (match) => {
    if (/slate-200|slate-100|slate-50|gray-100|gray-200/i.test(match)) {
      return '#f1f5f9';
    }
    return '#f8fafc';
  });

  // Replace oklch(...) or oklab(...)
  cleaned = cleaned.replace(/(?:oklch|oklab|lab|color)\(([^)]+)\)/gi, (match, p1) => {
    const testCanvas = document.createElement('canvas');
    const ctx = testCanvas.getContext('2d');
    if (ctx) {
      try {
        ctx.fillStyle = '#123456';
        ctx.fillStyle = match;
        const computed = ctx.fillStyle;
        // If browser natively computed a valid non-black value (or if the match wasn't black originally)
        if (computed && computed !== '#123456' && !/(oklch|oklab|lab|color)/i.test(computed)) {
          return computed;
        }
      } catch {
        // fallback below
      }
    }

    // Heuristic parsing for lightness
    const firstNum = parseFloat(p1);
    if (!isNaN(firstNum)) {
      if (firstNum > 0.85) return '#f8fafc'; // light background
      if (firstNum > 0.6) return '#cbd5e1';  // medium border/gray
      if (firstNum > 0.35) return '#475569'; // dark gray text
      return '#0f172a';                      // dark text
    }

    return '#ffffff'; // light fallback instead of black
  });

  return cleaned;
}

export const convertOklchToRgb = convertModernColorsToRgb;

/**
 * Safe wrapper around html2canvas that cleans up modern color syntax
 * before html2canvas renders the cloned DOM node.
 */
export async function safeHtml2Canvas(
  element: HTMLElement,
  options: Parameters<typeof html2canvas>[1] = {}
): Promise<HTMLCanvasElement> {
  const { onclone: userOnclone, ...restOptions } = options;

  return html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    ...restOptions,
    onclone: (clonedDoc, clonedElement) => {
      // 1. Clean up <style> elements
      try {
        const styleElements = clonedDoc.querySelectorAll('style');
        styleElements.forEach((style) => {
          if (style.textContent && /(oklch|oklab|lab|color|color-mix)/i.test(style.textContent)) {
            style.textContent = convertModernColorsToRgb(style.textContent);
          }
        });
      } catch (err) {
        console.warn('Style tag modern color cleanup warning:', err);
      }

      // 2. Clean up inline style attributes
      try {
        const styledElements = clonedDoc.querySelectorAll('[style]');
        styledElements.forEach((el) => {
          const styleAttr = el.getAttribute('style');
          if (styleAttr && /(oklch|oklab|lab|color|color-mix)/i.test(styleAttr)) {
            el.setAttribute('style', convertModernColorsToRgb(styleAttr));
          }
        });
      } catch (err) {
        console.warn('Inline style modern color cleanup warning:', err);
      }

      // 3. Ensure all background colors inside printable elements default to white/light hex if undefined or oklch
      try {
        const allElements = clonedDoc.querySelectorAll<HTMLElement>('*');
        allElements.forEach((el) => {
          const computedStyle = window.getComputedStyle(el);

          // Fix color
          const color = computedStyle.color;
          if (color && /(oklch|oklab|lab|color|color-mix)/i.test(color)) {
            el.style.color = convertModernColorsToRgb(color);
          }

          // Fix backgroundColor
          const bg = computedStyle.backgroundColor;
          if (bg && /(oklch|oklab|lab|color|color-mix)/i.test(bg)) {
            el.style.backgroundColor = convertModernColorsToRgb(bg);
          }

          // Fix borderColor
          const border = computedStyle.borderColor;
          if (border && /(oklch|oklab|lab|color|color-mix)/i.test(border)) {
            el.style.borderColor = convertModernColorsToRgb(border);
          }
        });
      } catch (err) {
        console.warn('Computed style modern color cleanup warning:', err);
      }

      // 4. User callback if present
      if (userOnclone) {
        userOnclone(clonedDoc, clonedElement);
      }
    }
  });
}
