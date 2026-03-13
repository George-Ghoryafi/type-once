const ALGO = { name: 'AES-GCM', length: 256 } as const;
const PBKDF2_ITERATIONS = 600_000;
const VERIFY_PLAINTEXT = 'typeonce-v1-verify';

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    ALGO,
    true, // extractable for session storage
    ['encrypt', 'decrypt'],
  );
}

export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const out = new Uint8Array(12 + ciphertext.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ciphertext), 12);
  return btoa(String.fromCharCode(...out));
}

export async function decrypt(key: CryptoKey, base64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plaintext);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, ALGO, true, ['encrypt', 'decrypt']);
}

export async function createVerifier(key: CryptoKey): Promise<string> {
  return encrypt(key, VERIFY_PLAINTEXT);
}

export async function checkVerifier(key: CryptoKey, verifier: string): Promise<boolean> {
  try {
    const decrypted = await decrypt(key, verifier);
    return decrypted === VERIFY_PLAINTEXT;
  } catch {
    return false;
  }
}
