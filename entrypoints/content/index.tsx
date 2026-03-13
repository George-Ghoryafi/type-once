// @ts-expect-error no types for textarea-caret
import getCaretCoordinates from 'textarea-caret';

interface SnippetData {
  id: string;
  variable: string;
  text: string;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',

  main() {
    let dropdownEl: HTMLDivElement | null = null;
    let activeTarget: HTMLElement | null = null;
    let activeIdx = 0;
    let snippets: SnippetData[] = [];
    let filteredSnippets: SnippetData[] = [];
    let currentQuery = '';
    let activationCommand = '//';

    // Fetch initial command immediately
    browser.runtime.sendMessage({ type: 'GET_SETTING', key: 'activationCommand', default: '//' }).then(val => {
      if (val) activationCommand = val;
    });

    // Listen for live updates from popup
    browser.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'SETTING_UPDATED' && msg.key === 'activationCommand') {
        activationCommand = msg.value;
      }
    });

    // ── Caret position (viewport coords) ──────────────────────────────
    function getCaretViewportCoords(el: HTMLElement): { x: number; y: number } {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const pos = el.selectionStart ?? el.value.length;
        const caret = getCaretCoordinates(el, pos); // { top, left, height }
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left + caret.left - el.scrollLeft,
          y: rect.top + caret.top + caret.height - el.scrollTop,
        };
      }

      // Contenteditable — use Selection / Range API
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(false);

        // Try getClientRects first (more precise)
        const rects = range.getClientRects();
        if (rects.length > 0) {
          const r = rects[rects.length - 1];
          return { x: r.right, y: r.bottom };
        }

        // Fallback: insert a zero-width span, measure, remove
        const span = document.createElement('span');
        span.textContent = '\u200b'; // zero-width space
        range.insertNode(span);
        const spanRect = span.getBoundingClientRect();
        const coords = { x: spanRect.left, y: spanRect.bottom };
        span.parentNode?.removeChild(span);
        // Clean up selection
        sel.removeAllRanges();
        sel.addRange(range);
        return coords;
      }

      // Last-resort fallback
      const rect = el.getBoundingClientRect();
      return { x: rect.left, y: rect.bottom };
    }

    // ── Dropdown DOM ──────────────────────────────────────────────────
    function destroyDropdownDOM() {
      if (dropdownEl) {
        dropdownEl.remove();
        dropdownEl = null;
      }
    }

    function renderDropdown(x: number, y: number) {
      destroyDropdownDOM();

      dropdownEl = document.createElement('div');
      dropdownEl.id = 'typeonce-dropdown';
      // Use the HTML popover API to push this element into the Top Layer 
      // (above all <dialog> modals and maximum z-indices)
      dropdownEl.popover = 'manual';
      
      const margin = 10;
      const spaceBelow = window.innerHeight - (y + 4) - margin;
      // Provide a reasonable minimum max-height even if squeezed, fallback to 100px
      const calculatedMaxHeight = Math.max(spaceBelow, 100);

      Object.assign(dropdownEl.style, {
        position: 'fixed',
        left: `${x}px`,
        top: `${y + 4}px`,
        zIndex: '2147483647',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        maxHeight: `${calculatedMaxHeight}px`,
        overflowY: 'auto',
        minWidth: '220px',
        maxWidth: '340px',
        fontFamily: "'Nunito', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: '14px',
        padding: '6px',
      } as CSSStyleDeclaration);

      filteredSnippets.forEach((s, i) => {
        const item = document.createElement('div');
        item.dataset.idx = String(i);
        Object.assign(item.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          color: '#334155',
          background: i === activeIdx ? '#f3e8ff' : 'transparent',
          transition: 'background 0.15s',
        } as CSSStyleDeclaration);

        const varSpan = document.createElement('span');
        Object.assign(varSpan.style, {
          fontFamily: "'SF Mono','Fira Code',monospace",
          fontWeight: '700',
          color: '#8b5cf6',
          flexShrink: '0',
          background: 'rgba(139, 92, 246, 0.1)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12px',
        } as CSSStyleDeclaration);
        varSpan.textContent = s.variable;

        const arrow = document.createElement('span');
        arrow.style.color = '#94a3b8';
        arrow.style.fontSize = '12px';
        arrow.textContent = '→';

        const text = document.createElement('span');
        Object.assign(text.style, {
          color: '#475569',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '1',
        } as CSSStyleDeclaration);
        text.textContent = s.text;

        item.append(varSpan, arrow, text);

        item.addEventListener('mouseenter', () => {
          activeIdx = i;
          highlightActive();
        });

        item.addEventListener('mousedown', (e) => {
          e.preventDefault(); // keep focus on input
          selectCurrent();
        });

        dropdownEl!.appendChild(item);
      });

      document.body.appendChild(dropdownEl);
      dropdownEl.showPopover();
    }

    function highlightActive() {
      if (!dropdownEl) return;
      const items = dropdownEl.children;
      for (let i = 0; i < items.length; i++) {
        (items[i] as HTMLElement).style.background =
          i === activeIdx ? '#f3e8ff' : 'transparent';
      }
      // Scroll into view
      (items[activeIdx] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
    }

    function removeDropdown() {
      destroyDropdownDOM();
      activeTarget = null;
      activeIdx = 0;
      snippets = [];
      filteredSnippets = [];
      currentQuery = '';
    }

    function selectCurrent() {
      if (!activeTarget || filteredSnippets.length === 0) return;
      insertSnippet(activeTarget, filteredSnippets[activeIdx].text, currentQuery);
      removeDropdown();
    }

    // ── Snippet insertion ─────────────────────────────────────────────
    function insertSnippet(el: HTMLElement, text: string, query: string) {
      const lenToReplace = activationCommand.length + query.length;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const val = el.value;
        const pos = el.selectionStart ?? val.length;
        const triggerIdx = pos - lenToReplace;
        if (triggerIdx < 0) return;
        const before = val.substring(0, triggerIdx);
        const after = val.substring(pos);

        // Use native setter + InputEvent for React/framework compat
        const nativeSetter = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(el),
          'value',
        )?.set;
        if (nativeSetter) {
          nativeSetter.call(el, before + text + after);
        } else {
          el.value = before + text + after;
        }
        const newPos = triggerIdx + text.length;
        el.setSelectionRange(newPos, newPos);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // Contenteditable
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return;
        const content = node.textContent;
        const pos = range.startOffset;
        const triggerIdx = pos - lenToReplace;
        if (triggerIdx < 0) return;

        node.textContent = content.substring(0, triggerIdx) + text + content.substring(pos);
        const newRange = document.createRange();
        newRange.setStart(node, triggerIdx + text.length);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        (node.parentElement ?? el).dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    function getTriggerQuery(el: HTMLElement): string | null {
      const len = activationCommand.length;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const val = el.value;
        const pos = el.selectionStart ?? val.length;
        const textUntilCaret = val.substring(0, pos);
        const triggerIdx = textUntilCaret.lastIndexOf(activationCommand);
        if (triggerIdx === -1) return null;
        const query = textUntilCaret.substring(triggerIdx + len);
        if (/\s/.test(query)) return null;
        return query;
      }
      
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const offset = range.startOffset;
        let textUntilCaret = node.textContent.substring(0, offset);
        const triggerIdx = textUntilCaret.lastIndexOf(activationCommand);
        if (triggerIdx === -1) return null;
        const query = textUntilCaret.substring(triggerIdx + len);
        if (/\s/.test(query)) return null;
        return query;
      }
      return null;
    }

    // ── Track Clipboard History ───────────────────────────────────────
    document.addEventListener('copy', () => {
      const selectedText = window.getSelection()?.toString().trim();
      if (selectedText) {
        browser.runtime.sendMessage({
          type: 'SAVE_CLIPBOARD',
          text: selectedText,
        }).catch(() => { /* ignore */ });
      }
    });

    // ── Show dropdown ─────────────────────────────────────────────────
    async function showDropdown(target: HTMLElement, query: string) {
      if (!dropdownEl) {
        const fetched: SnippetData[] = await browser.runtime.sendMessage({
          type: 'GET_SNIPPETS',
        });
        if (!fetched || fetched.length === 0) return;
        snippets = fetched;
        activeTarget = target;
      }
      
      currentQuery = query;
      const lowerQuery = query.toLowerCase();
      filteredSnippets = snippets.filter(s => 
        s.variable.toLowerCase().includes(lowerQuery) || 
        s.text.toLowerCase().includes(lowerQuery)
      );

      if (filteredSnippets.length === 0) {
        removeDropdown();
        return;
      }

      activeIdx = Math.min(activeIdx, filteredSnippets.length - 1);
      if (activeIdx < 0) activeIdx = 0;

      const coords = getCaretViewportCoords(target);
      renderDropdown(coords.x, coords.y);
    }

    // Listen for input events across the page
    document.addEventListener(
      'input',
      (e) => {
        // Use composedPath to pierce open Shadow DOMs (e.g. Web Components)
        const target = (e.composedPath?.()[0] || e.target) as HTMLElement;
        if (!target) return;
        const isEditable =
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable;
        if (!isEditable) return;

        const query = getTriggerQuery(target);
        if (query !== null) {
          showDropdown(target, query);
        } else if (dropdownEl) {
          removeDropdown();
        }
      },
      true,
    );

    document.addEventListener(
      'keydown',
      (e) => {
        if (!dropdownEl) return;
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            e.stopImmediatePropagation();
            activeIdx = (activeIdx + 1) % filteredSnippets.length;
            highlightActive();
            break;
          case 'ArrowUp':
            e.preventDefault();
            e.stopImmediatePropagation();
            activeIdx = (activeIdx - 1 + filteredSnippets.length) % filteredSnippets.length;
            highlightActive();
            break;
          case 'Enter':
          case 'Tab':
            e.preventDefault();
            e.stopImmediatePropagation();
            selectCurrent();
            break;
          case 'Escape':
            e.preventDefault();
            e.stopImmediatePropagation();
            removeDropdown();
            break;
        }
      },
      true, // Use capture phase to intercept before target elements
    );

    document.addEventListener('mousedown', (e) => {
      if (!dropdownEl) return;
      if ((e.target as HTMLElement).closest('#typeonce-dropdown')) return;
      removeDropdown();
    });
  },
});
