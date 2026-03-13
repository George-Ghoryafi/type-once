export interface SnippetData {
  id: string;
  variable: string;
  text: string;
}

interface TopLayerCtx {
  doc: Document;
  xOff: number;
  yOff: number;
}

/**
 * Try to escape to the parent same-origin document so the dropdown lives
 * in the outermost top layer — never clipped by an iframe boundary or
 * sitting behind a <dialog> that owns the iframe.
 */
export function getTopLayerCtx(): TopLayerCtx {
  try {
    if (window.parent !== window) {
      const parentDoc = window.parent.document; // throws if cross-origin
      const frame = window.frameElement as HTMLElement | null;
      const rect = frame?.getBoundingClientRect() ?? { left: 0, top: 0 };
      return { doc: parentDoc, xOff: rect.left, yOff: rect.top };
    }
  } catch { /* cross-origin iframe — stay in current document */ }
  return { doc: document, xOff: 0, yOff: 0 };
}

/**
 * Builds and appends the dropdown DOM to the target document's top layer.
 * Returns the created element.
 */
export function createDropdown(
  x: number,
  y: number,
  items: SnippetData[],
  activeIdx: number,
  callbacks: {
    onHover: (idx: number) => void;
    onSelect: () => void;
  },
): { el: HTMLDivElement; host: Document } {
  const { doc, xOff, yOff } = getTopLayerCtx();

  const el = doc.createElement('div');
  el.id = 'typeonce-dropdown';
  el.popover = 'manual';

  const OFFSET = 15;
  const margin = 10;
  const absX = x + xOff;
  const absY = y + yOff + OFFSET;
  const viewH = (doc.defaultView ?? window).innerHeight;
  const spaceBelow = viewH - absY - margin;
  const calculatedMaxHeight = Math.max(spaceBelow, 100);

  Object.assign(el.style, {
    position: 'fixed',
    left: `${absX}px`,
    top: `${absY}px`,
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

  items.forEach((s, i) => {
    const item = doc.createElement('div');
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

    const varSpan = doc.createElement('span');
    Object.assign(varSpan.style, {
      fontFamily: "'SF Mono','Fira Code',monospace",
      fontWeight: '700',
      color: s.id === '__paste__' ? '#0ea5e9' : '#8b5cf6',
      flexShrink: '0',
      background: s.id === '__paste__' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(139, 92, 246, 0.1)',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '12px',
    } as CSSStyleDeclaration);
    varSpan.textContent = s.variable;

    const arrow = doc.createElement('span');
    arrow.style.color = '#94a3b8';
    arrow.style.fontSize = '12px';
    arrow.textContent = '→';

    const text = doc.createElement('span');
    Object.assign(text.style, {
      color: '#475569',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: '1',
    } as CSSStyleDeclaration);
    text.textContent = s.text;

    item.append(varSpan, arrow, text);

    item.addEventListener('mouseenter', () => callbacks.onHover(i));
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      callbacks.onSelect();
    });

    el.appendChild(item);
  });

  doc.body.appendChild(el);
  el.showPopover?.();

  return { el, host: doc };
}

/**
 * Updates the visual highlight on dropdown items.
 */
export function highlightItem(dropdownEl: HTMLDivElement, activeIdx: number) {
  const items = dropdownEl.children;
  for (let i = 0; i < items.length; i++) {
    (items[i] as HTMLElement).style.background =
      i === activeIdx ? '#f3e8ff' : 'transparent';
  }
  (items[activeIdx] as HTMLElement)?.scrollIntoView({ block: 'nearest' });
}
