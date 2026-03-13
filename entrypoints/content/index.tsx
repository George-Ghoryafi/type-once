import { getCaretViewportCoords } from './caret';
import { createDropdown, highlightItem, type SnippetData } from './dropdown';
import { insertSnippet, getTriggerQuery } from './insertion';

const PASTE_KEY = 'paste'; // reserved — cannot be used as a snippet variable

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

    // ── Dropdown lifecycle ──────────────────────────────────────────────

    function renderDropdown(x: number, y: number) {
      destroyDropdown();
      const result = createDropdown(x, y, filteredSnippets, activeIdx, {
        onHover(idx) { activeIdx = idx; updateHighlight(); },
        onSelect() { selectCurrent(); },
      });
      dropdownEl = result.el;
      browser.runtime.sendMessage({ type: 'SET_BADGE', active: true }).catch(() => {});
    }

    function destroyDropdown() {
      if (dropdownEl) {
        dropdownEl.remove();
        dropdownEl = null;
      }
    }

    function removeDropdown() {
      destroyDropdown();
      activeTarget = null;
      activeIdx = 0;
      snippets = [];
      filteredSnippets = [];
      currentQuery = '';
      browser.runtime.sendMessage({ type: 'SET_BADGE', active: false }).catch(() => {});
    }

    function updateHighlight() {
      if (dropdownEl) highlightItem(dropdownEl, activeIdx);
    }

    function selectCurrent() {
      if (!activeTarget || filteredSnippets.length === 0) return;
      insertSnippet(activeTarget, filteredSnippets[activeIdx].text, currentQuery, activationCommand);
      removeDropdown();
    }

    // ── Clipboard tracking ─────────────────────────────────────────────

    document.addEventListener('copy', () => {
      const selectedText = window.getSelection()?.toString().trim();
      if (selectedText) {
        browser.runtime.sendMessage({ type: 'SAVE_CLIPBOARD', text: selectedText }).catch(() => {});
      }
    });

    // ── Show dropdown ──────────────────────────────────────────────────

    async function showDropdown(target: HTMLElement, query: string) {
      if (!dropdownEl) {
        let fetched: SnippetData[] | null = null;
        try {
          fetched = await browser.runtime.sendMessage({ type: 'GET_SNIPPETS' });
        } catch {
          try {
            fetched = await browser.runtime.sendMessage({ type: 'GET_SNIPPETS' });
          } catch { return; }
        }
        if (!fetched || fetched.length === 0) return;
        snippets = fetched;
        activeTarget = target;
      }

      currentQuery = query;
      const lowerQuery = query.toLowerCase();
      filteredSnippets = snippets.filter(s =>
        s.variable.toLowerCase().includes(lowerQuery) ||
        s.text.toLowerCase().includes(lowerQuery),
      );

      // Reserved 'paste' command — virtual snippet for the most-recent clipboard item
      if (PASTE_KEY.startsWith(lowerQuery) && lowerQuery.length > 0) {
        try {
          const pasteText: string | null = await browser.runtime.sendMessage({ type: 'GET_CLIPBOARD_LAST' });
          if (pasteText) {
            filteredSnippets = [
              { id: '__paste__', variable: PASTE_KEY, text: pasteText },
              ...filteredSnippets,
            ];
          }
        } catch { /* ignore */ }
      }

      if (filteredSnippets.length === 0) {
        removeDropdown();
        return;
      }

      activeIdx = Math.min(activeIdx, filteredSnippets.length - 1);
      if (activeIdx < 0) activeIdx = 0;

      const coords = getCaretViewportCoords(target);
      renderDropdown(coords.x, coords.y);
    }

    // ── Event listeners ────────────────────────────────────────────────

    const editable = (el: HTMLElement) =>
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el.isContentEditable;

    function addOutsideClickListener(doc: Document) {
      doc.addEventListener('mousedown', (e) => {
        if (!dropdownEl) return;
        if ((e.target as HTMLElement).closest?.('#typeonce-dropdown')) return;
        removeDropdown();
      });
    }
    addOutsideClickListener(document);
    try {
      if (window.parent !== window) addOutsideClickListener(window.parent.document);
    } catch { /* cross-origin */ }

    document.addEventListener(
      'input',
      (e) => {
        let target = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
        if (!target) return;

        if (!editable(target)) {
          const active = document.activeElement as HTMLElement | null;
          if (!active || !editable(active)) return;
          target = active;
        }

        const query = getTriggerQuery(target, activationCommand);
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
            updateHighlight();
            break;
          case 'ArrowUp':
            e.preventDefault();
            e.stopImmediatePropagation();
            activeIdx = (activeIdx - 1 + filteredSnippets.length) % filteredSnippets.length;
            updateHighlight();
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
      true,
    );
  },
});
