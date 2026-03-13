// @ts-expect-error no types for textarea-caret
import getCaretCoordinates from 'textarea-caret';

/**
 * Returns the caret's viewport coordinates (x, y at the bottom of the line).
 * Works for <input>, <textarea>, and contenteditable elements.
 */
export function getCaretViewportCoords(el: HTMLElement): { x: number; y: number } {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const pos = el.selectionStart ?? el.value.length;
    const caret = getCaretCoordinates(el, pos);
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + caret.left - el.scrollLeft,
      y: rect.top + caret.top + caret.height - el.scrollTop,
    };
  }

  // Contenteditable — use Selection / Range API
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const focusNode = sel.focusNode;
    const focusOffset = sel.focusOffset;

    // Most reliable: measure a 1-char range; getClientRects() on a non-zero
    // range returns precise character rects (not a surrounding block's rect).
    if (focusNode?.nodeType === Node.TEXT_NODE) {
      if (focusOffset > 0) {
        const charRange = document.createRange();
        charRange.setStart(focusNode, focusOffset - 1);
        charRange.setEnd(focusNode, focusOffset);
        const rects = charRange.getClientRects();
        if (rects.length > 0) {
          const r = rects[rects.length - 1];
          return { x: r.right, y: r.bottom };
        }
      } else if ((focusNode.textContent?.length ?? 0) > 0) {
        const charRange = document.createRange();
        charRange.setStart(focusNode, 0);
        charRange.setEnd(focusNode, 1);
        const rects = charRange.getClientRects();
        if (rects.length > 0) {
          return { x: rects[0].left, y: rects[0].bottom };
        }
      }
    }

    // Fallback: collapsed-range getBoundingClientRect
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(false);
    const rangeRect = range.getBoundingClientRect();
    if (rangeRect.height > 0) {
      return { x: rangeRect.left, y: rangeRect.bottom };
    }

    // Final fallback: zero-width span
    const span = document.createElement('span');
    span.textContent = '\u200b';
    try { range.insertNode(span); } catch { /* read-only context */ }
    const spanRect = span.getBoundingClientRect();
    span.parentNode?.removeChild(span);
    sel.removeAllRanges();
    sel.addRange(range);
    if (spanRect.height > 0) {
      return { x: spanRect.left, y: spanRect.bottom };
    }
  }

  // Absolute fallback
  const rect = el.getBoundingClientRect();
  return { x: rect.left, y: rect.top };
}
