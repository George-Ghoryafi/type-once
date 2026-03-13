/**
 * Replaces the activation command + query with the snippet text in an
 * input, textarea, or contenteditable element.
 */
export function insertSnippet(
  el: HTMLElement,
  text: string,
  query: string,
  activationCommand: string,
) {
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

/**
 * Extracts the query portion typed after the activation command, or null
 * if the activation command hasn't been typed.
 */
export function getTriggerQuery(
  el: HTMLElement,
  activationCommand: string,
): string | null {
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
    const textUntilCaret = node.textContent.substring(0, offset);
    const triggerIdx = textUntilCaret.lastIndexOf(activationCommand);
    if (triggerIdx === -1) return null;
    const query = textUntilCaret.substring(triggerIdx + len);
    if (/\s/.test(query)) return null;
    return query;
  }
  return null;
}
