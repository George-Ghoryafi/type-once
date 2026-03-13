import { exportKey, importKey } from './crypto';

const SESSION_KEY_STORAGE = 'encSessionKey';

/**
 * Stores the derived CryptoKey in browser.storage.session.
 * This persists across service-worker restarts within the same browser session
 * and is automatically cleared when the browser closes.
 */
export async function setSessionKey(key: CryptoKey): Promise<void> {
  const raw = await exportKey(key);
  await browser.storage.session.set({ [SESSION_KEY_STORAGE]: raw });
}

export async function getSessionKey(): Promise<CryptoKey | null> {
  const result = await browser.storage.session.get(SESSION_KEY_STORAGE);
  const raw = result[SESSION_KEY_STORAGE] as string | undefined;
  if (!raw) return null;
  try {
    return await importKey(raw);
  } catch {
    return null;
  }
}

export async function clearSessionKey(): Promise<void> {
  await browser.storage.session.remove(SESSION_KEY_STORAGE);
}
