import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Snippet {
  id: string;
  variable: string;
  text: string;
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
}

let dbPromise: Promise<IDBPDatabase<TypeOnceDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TypeOnceDB>('type-once-db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('snippets', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
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

export async function addSnippet(variable: string, text: string): Promise<Snippet> {
  const db = await getDB();
  const snippet: Snippet = { id: crypto.randomUUID(), variable, text };
  await db.put('snippets', snippet);
  return snippet;
}

export async function deleteSnippet(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('snippets', id);
}

export async function updateSnippet(id: string, variable: string, text: string): Promise<void> {
  const db = await getDB();
  await db.put('snippets', { id, variable, text });
}
