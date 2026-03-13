# TypeOnce UI/UX Design Document

## 1. Core Concepts
The application handles two distinct data types, collectively referred to as **Saveables**:
1. **Snippets**: User-defined key-value pairs (variable name to text content).
2. **Clipboard History**: Automatically tracked history of the user's copied text.

### Universal Saveable Rules
- **No Duplicates**: The system actively prevents duplicate entries from being saved to ensure cleanliness and efficiency.
- **Editing Rules**: Snippets are mutable and require a dedicated editing interface. Clipboard History entries are immutable records and cannot be edited, only deleted or used.

---

## 2. Page Architecture & UX Flow
To prevent the popup from feeling cramped and hard to navigate, the UI will be split into distinct, dedicated views. 

### A. Main View (The Hub)
The primary entry point when clicking the extension icon. It uses a **Tabbed Interface** to enforce a clear separation between content types.

- **Header Layer**: Contains the App title, a universal Search bar for quick filtering, and a Settings gear icon.
- **Navigation Tabs**: 
  - `Snippets` | `Clipboard History`
- **Content Area (Snippets Tab)**:
  - An "Add Snippet" floating action button (FAB) or dedicated sticky header to quickly create new snippets.
  - The view itself transitions away from a bland, infinite scroll. Saveables will be displayed as distinct "Cards". To optimize vertical space, cards with long text will be truncated or collapsible, expandable only when clicked.
  - Each Snippet card features quick-action buttons: `Copy/Use`, `Edit`, and `Delete`.
- **Content Area (Clipboard History Tab)**:
  - Displayed in reverse-chronological order.
  - Features truncated text previews.
  - Each Clipboard card features quick-action buttons: `Copy/Use`, `Save as Snippet` (converts history to a snippet), and `Delete`.

### B. Snippet Editor View (Overlay/Sub-page)
When creating a new Snippet or clicking `Edit` on an existing one, the user is transitioned to a clean, focused form view.
- **Fields**: Variable Name (trigger), Text Content (textarea).
- **Actions**: `Save`, `Cancel`. 
- Upon saving/canceling, the user is cleanly routed back to the Main View.

### C. Settings Page (Standalone View)
Replacing the current inline settings module, this is a fully dedicated page accessed via the Main View header.
- **Navigation**: Prominent "Back" button to return to the Main View.
- **General Settings**: 
  - Configure the Activation Command (e.g., `//`).
- **Danger Zone**:
  - Two distinct, highly visible buttons (e.g., red backgrounds): 
    1. `Clear All Snippets`
    2. `Clear Clipboard History`
  - Pressing either button triggers a prominent, multi-step confirmation warning ("Are you sure? This cannot be undone.") to prevent accidental data loss.

---

## 3. Visual Aesthetic
The extension will shift away from the overly bright or overly dark "company tool" look toward a modern, structured, and highly legible consumer feel. 
- **Structure Over Color**: Using spacing, subtle borders, and distinct card backgrounds to separate elements rather than relying on noisy colors.
- **Navigation**: Smooth page transitions (slide-in/fade) between the Main View, Editor View, and Settings Page to make the extension feel like a native desktop application.
