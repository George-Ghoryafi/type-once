import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Snippet {
  id: string; // UUID
  variable: string;
  text: string;
  type?: string;
  timestamp: number;
}

export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
}

interface TypeOnceDB extends DBSchema {
  snippets: {
    key: string;
    value: Snippet;
  };
  settings: {
    key: string;
    value: any;
  };
  clipboardHistory: {
    key: string;
    value: ClipboardItem;
  };
}

let dbPromise: Promise<IDBPDatabase<TypeOnceDB>> | null = null;

export async function getDB() {
  return openDB<TypeOnceDB>('type-once-db', 4, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (oldVersion < 1) {
        db.createObjectStore('snippets', { keyPath: 'id' });
        db.createObjectStore('settings');
      }
      if (oldVersion < 2) {
        // v2 migration logic if needed
      }
      if (oldVersion < 3) {
        db.createObjectStore('clipboardHistory', { keyPath: 'id' });
      }
      if (oldVersion < 4) {
        // v4 just adds `type` field to snippets implicitly, no schema structural changes needed
      }
    },
  });
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const db = await getDB();
  const val = await db.get('settings', key);
  return val === undefined ? defaultValue : val;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', value, key);
}

export async function getAllSnippets(): Promise<Snippet[]> {
  const db = await getDB();
  return db.getAll('snippets');
}

export async function addSnippet(variable: string, text: string, type?: string): Promise<Snippet | null> {
  const db = await getDB();
  const allSnippets = await db.getAll('snippets');
  
  // Prevent exact duplicates per design document
  // Changed deduplication logic to check variable and text
  if (allSnippets.some(s => s.variable === variable && s.text === text)) {
    return null; // A snippet with this variable and text already exists
  }
  
  const snippet: Snippet = {
    id: crypto.randomUUID(),
    variable,
    text,
    type,
    timestamp: Date.now(),
  };
  await db.add('snippets', snippet); // Changed from put to add for initial creation
  return snippet;
}

export async function deleteSnippet(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('snippets', id);
}

export async function updateSnippet(id: string, variable: string, text: string, type?: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('snippets', 'readwrite');
  const store = tx.objectStore('snippets');
  const snippet = await store.get(id);
  if (snippet) {
    snippet.variable = variable;
    snippet.text = text;
    snippet.type = type;
    snippet.timestamp = Date.now();
    await store.put(snippet);
  }
}

// ── Clipboard History ─────────────────────────────────────────────

export async function addClipboardItem(text: string): Promise<ClipboardItem | null> {
  const db = await getDB();
  
  // Prevent exact duplicate saves
  const history = await db.getAll('clipboardHistory');
  if (history.some(item => item.text === text)) {
    return null; 
  }

  const item: ClipboardItem = {
    id: crypto.randomUUID(),
    text,
    timestamp: Date.now(),
  };
  await db.put('clipboardHistory', item);
  return item;
}

export async function getClipboardHistory(): Promise<ClipboardItem[]> {
  const db = await getDB();
  const history = await db.getAll('clipboardHistory');
  // Return most recent first
  return history.sort((a, b) => b.timestamp - a.timestamp);
}

export async function clearClipboardHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('clipboardHistory');
}

export async function deleteClipboardItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('clipboardHistory', id);
}
