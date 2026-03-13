import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { encrypt, decrypt } from './crypto';

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
    upgrade(db, oldVersion, _newVersion, _transaction) {
      if (oldVersion < 1) {
        db.createObjectStore('snippets', { keyPath: 'id' });
        db.createObjectStore('settings');
      }
      if (oldVersion < 3) {
        db.createObjectStore('clipboardHistory', { keyPath: 'id' });
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

export async function getAllSnippets(key?: CryptoKey): Promise<Snippet[]> {
  const db = await getDB();
  const snippets = await db.getAll('snippets');
  if (!key) return snippets;
  return Promise.all(
    snippets.map(async (s) => {
      try {
        return { ...s, variable: await decrypt(key, s.variable), text: await decrypt(key, s.text) };
      } catch {
        return s; // fallback: return as-is if decryption fails
      }
    }),
  );
}

export async function addSnippet(
  variable: string,
  text: string,
  type?: string,
  key?: CryptoKey,
): Promise<Snippet | null> {
  const db = await getDB();
  const allSnippets = await db.getAll('snippets');

  // Dedup check against plaintext
  if (key) {
    for (const s of allSnippets) {
      try {
        const decVar = await decrypt(key, s.variable);
        const decText = await decrypt(key, s.text);
        if (decVar === variable && decText === text) return null;
      } catch { /* skip undecryptable items */ }
    }
  } else {
    if (allSnippets.some((s) => s.variable === variable && s.text === text)) return null;
  }

  const storedVariable = key ? await encrypt(key, variable) : variable;
  const storedText = key ? await encrypt(key, text) : text;

  const snippet: Snippet = {
    id: crypto.randomUUID(),
    variable: storedVariable,
    text: storedText,
    type,
    timestamp: Date.now(),
  };
  await db.add('snippets', snippet);
  // Return with plaintext values so the caller can update local state
  return { ...snippet, variable, text };
}

export async function deleteSnippet(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('snippets', id);
}

export async function updateSnippet(
  id: string,
  variable: string,
  text: string,
  type?: string,
  key?: CryptoKey,
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('snippets', 'readwrite');
  const store = tx.objectStore('snippets');
  const snippet = await store.get(id);
  if (snippet) {
    snippet.variable = key ? await encrypt(key, variable) : variable;
    snippet.text = key ? await encrypt(key, text) : text;
    snippet.type = type;
    snippet.timestamp = Date.now();
    await store.put(snippet);
  }
}

// ── Clipboard History ─────────────────────────────────────────────

export async function addClipboardItem(text: string, key?: CryptoKey): Promise<ClipboardItem | null> {
  const db = await getDB();
  const history = await db.getAll('clipboardHistory');

  // Dedup check against plaintext
  if (key) {
    for (const item of history) {
      try {
        const decText = await decrypt(key, item.text);
        if (decText === text) return null;
      } catch { /* skip */ }
    }
  } else {
    if (history.some((item) => item.text === text)) return null;
  }

  const storedText = key ? await encrypt(key, text) : text;
  const item: ClipboardItem = {
    id: crypto.randomUUID(),
    text: storedText,
    timestamp: Date.now(),
  };
  await db.put('clipboardHistory', item);
  return key ? { ...item, text } : item;
}

export async function getClipboardHistory(key?: CryptoKey): Promise<ClipboardItem[]> {
  const db = await getDB();
  const history = await db.getAll('clipboardHistory');
  const sorted = history.sort((a, b) => b.timestamp - a.timestamp);
  if (!key) return sorted;
  return Promise.all(
    sorted.map(async (item) => {
      try {
        return { ...item, text: await decrypt(key, item.text) };
      } catch {
        return item;
      }
    }),
  );
}

export async function clearAllSnippets(): Promise<void> {
  const db = await getDB();
  await db.clear('snippets');
}

export async function clearClipboardHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('clipboardHistory');
}

export async function deleteClipboardItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('clipboardHistory', id);
}

// ── Bulk encryption / decryption (used when toggling encryption on/off) ───────

export async function encryptAllData(key: CryptoKey): Promise<void> {
  const db = await getDB();

  const snippets = await db.getAll('snippets');
  for (const s of snippets) {
    s.variable = await encrypt(key, s.variable);
    s.text = await encrypt(key, s.text);
    await db.put('snippets', s);
  }

  const history = await db.getAll('clipboardHistory');
  for (const item of history) {
    item.text = await encrypt(key, item.text);
    await db.put('clipboardHistory', item);
  }
}

export async function decryptAllData(key: CryptoKey): Promise<void> {
  const db = await getDB();

  const snippets = await db.getAll('snippets');
  for (const s of snippets) {
    try {
      s.variable = await decrypt(key, s.variable);
      s.text = await decrypt(key, s.text);
      await db.put('snippets', s);
    } catch { /* already plaintext or error — skip */ }
  }

  const history = await db.getAll('clipboardHistory');
  for (const item of history) {
    try {
      item.text = await decrypt(key, item.text);
      await db.put('clipboardHistory', item);
    } catch { /* already plaintext or error — skip */ }
  }
}
