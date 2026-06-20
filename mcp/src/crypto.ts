// AES-GCM seal/open for the OAuth request blob carried through the login form.
// GCM gives confidentiality + integrity, so the client cannot forge or tamper
// with the authorization request (incl. its redirect_uri) between GET and POST.

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', hexToBytes(keyHex), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

/** Encrypt an object → URL-safe token (iv || ciphertext). */
export async function seal(keyHex: string, data: unknown): Promise<string> {
  const key = await importKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return toBase64Url(out);
}

/** Decrypt a token → object, or null if missing/tampered/invalid. */
export async function open<T>(keyHex: string, token: string): Promise<T | null> {
  try {
    if (!token) return null;
    const raw = fromBase64Url(token);
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const key = await importKey(keyHex);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    return null;
  }
}
