# Dropdown Positioning and Caret Detection: A Deep Dive

Hey! Since we just solved that tricky dropdown positioning bug, I wanted to write down exactly _why_ it was happening, _how_ we fixed it, and the underlying browser architecture that forces us to use this specific approach.

This document serves as both a teaching guide on DOM manipulation edge-cases and as permanent architectural documentation for TypeOnce's text-expansion feature.

## The Problem: Why was the dropdown in the top right?

Initially, our dropdown was sometimes appearing at the very top-right of the screen, or not at all depending on the website.

The original approach used WXT's `cssInjectionMode: 'ui'` which mounts our React component inside a Shadow DOM overlay. That overlay is essentially a separate `div` that floats completely independently of the DOM elements the user is interacting with.

When we calculated the caret position, we were getting numbers like `(x: 100, y: 150)`. We then told the shadow root to position itself there. But because of how different web apps structure their CSS (e.g., extensive use of `position: relative` or complex stacking contexts on `<body>` / `<html>`), those coordinates didn't map correctly to the fixed overlay context.

## The Solution: A Two-Pronged Approach

To reliably position a dropdown next to a user's un-submitted typing caret across _any_ website (React, Vue, plain HTML, etc.), we had to abandon the shadow root overlay and inject our UI directly into the page's `document.body` as a `position: fixed` element.

But the harder part is actually finding the caret. The browser DOM treats different text input mechanisms completely differently, so we have to handle two distinct cases.

### Case 1: Standard `<input>` and `<textarea>` elements

You might think you can just ask the browser, "Where is the cursor in this textarea?" Unfortunately, the native DOM API (`element.selectionStart`) only tells us the _index character_ of the raw text string (e.g., "the cursor is after the 15th character"). It does not know the pixel coordinates (`x`, `y`) on the screen.

**The Mirror Div Technique:**
To translate a character index into pixel coordinates, we use a classic trick (implemented via the `textarea-caret` library):

1. Create a `div` off-screen that perfectly mirrors the textarea's CSS (font family, size, padding, border, line-height, etc.).
2. Copy the text from the start of the textarea up to the caret index into this mirror `div`.
3. Append a dummy `<span>` element right after that text.
4. Because this mirror `div` renders exactly like the real textarea, that `<span>` will sit exactly where the caret would be.
5. We measure the `<span>`'s offset from the top/left of the mirror `div`.

Once we have those relative coordinates `(caretLeft, caretTop)`, we add them to the actual textarea's position on the screen, minus any scrolling:

```javascript
const rect = el.getBoundingClientRect();
x = rect.left + caretLeft - el.scrollLeft;
y = rect.top + caretTop + caretHeight - el.scrollTop;
```

### Case 2: ContentEditable Elements (e.g., Notion, Gmail, Google Docs)

Many modern web editors don't use `<textarea>`. They use `div`s with `contenteditable="true"`. Here, the browser _does_ give us a way to measure pixels, but we interact with the `Selection` and `Range` APIs instead of string indices.

A `Range` represents a fragment of a document that can contain nodes and parts of text nodes. When a user is typing, their caret is a collapsed `Range`.

**The Range Measurement Technique:**

1. We grab the active selection (`window.getSelection()`).
2. We get the current range (`sel.getRangeAt(0)`).
3. We ask the browser for the pixel bounding box of that range (`range.getClientRects()`).

If the user is typing standard text in a standard contenteditable div, this works perfectly and returns viewport-relative `x` and `y` coordinates.

_Fallback mechanism:_ Sometimes, if the range is purely empty space or acting weirdly across element boundaries, `getClientRects()` fails. In that case, we mutate the DOM briefly: we insert an invisible zero-width space character (`\u200b`) wrapped in a `<span>` at the caret position, measure its `getBoundingClientRect()`, and immediately remove it.

## Event Dispatching: The "React Problem"

Finally, when the user clicks a snippet to insert it, we don't just want to change the text on the screen; we need the underlying website's framework (like React or Angular) to realize the text changed.

If we just do `input.value = "new text"`, a React app won't update its internal state, and when the user hits 'Submit', it will send the old text.

To fix this, we do two things:

1. We dispatch native `input` and `change` events after modifying the value.
2. For React specifically, we have to bypass its synthetic event interception. We grab the native prototype setter for `value` on `HTMLInputElement` and call it directly before dispatching the event:

```javascript
const nativeSetter = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(el),
  "value",
)?.set;

if (nativeSetter) {
  nativeSetter.call(el, newValue);
} else {
  el.value = newValue; // Fallback
}
el.dispatchEvent(new Event("input", { bubbles: true }));
```

This simulates a genuine user keystroke, ensuring full compatibility widely across the web.

## Edge Case Analysis: Paste-Restricted Inputs

A common security or UX restriction on certain websites (e.g., repeating a password field or entering credit card numbers) is to block users from pasting text by intercepting the `paste` event and calling `e.preventDefault()`.

**How does this affect TypeOnce?**
Currently, TypeOnce completely bypasses paste restrictions. It will successfully "paste" the snippet into a restricted input field.

**Why does it work?**
Our extension does not use the clipboard or the browser's native `document.execCommand('paste')` mechanism to insert the snippet. Instead, we are directly manipulating the DOM element's internal state (via `input.value = newText` or `node.textContent = newText`).

When a site restricts pasting, it attaches an event listener specifically to the clipboard `paste` event:

```javascript
inputField.addEventListener("paste", (e) => {
  e.preventDefault(); // This blocks native clipboard pasting
});
```

Because TypeOnce bypasses the clipboard entirely and writes directly to the DOM property, the `paste` event is never fired. The browser only sees that the value changed, and then our extension fires generic `input` and `change` events (which sites rarely block, because blocking `input` events would prevent the user from typing normally).

**Should we improve this?**
From a functional standpoint, the system works reliably. However, from a product philosophy standpoint, if a site explicitly restricts pasting, it's usually for a reason (e.g., forcing a user to manually re-type an email address to ensure accuracy).

If we wanted to respect the website's intentions, we could modify our insertion logic to simulate actual keystrokes rather than doing a bulk value replacement. Instead of rewriting `input.value`, we could synthetically dispatch `KeyboardEvent`s for each character in the snippet. But there are caveats:

1. Simulating full trusting keystrokes via JavaScript `KeyboardEvent` is actively prevented by browser security models; synthetic keystrokes usually do not trigger actual text insertion into the DOM to prevent malicious botting.
2. The current direct-DOM modification is the most reliable way an extension can alter page text.

Therefore, keeping the current direct value-setter approach is the recommended best practice for browser extensions, even if it happens to bypass page-level `paste` event listeners.

## Summary

By combining the Mirror Div technique for native inputs, the Selection/Range API for modern rich-text editors, direct body-injection for reliable CSS positioning, and prototype-hacking for React compatibility, we've built an extremely robust, site-agnostic text replacement engine.
