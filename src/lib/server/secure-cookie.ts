import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

/**
 * Authenticated-encryption helper for cookie payloads.
 *
 * Cookies here carry sensitive PII (mailing address, birthday, email), so they
 * are encrypted — not merely signed — with AES-256-GCM. GCM's auth tag also
 * provides integrity, so a separate HMAC is unnecessary: `final()` throws if the
 * ciphertext or tag was tampered with. The 32-byte key is derived from
 * SESSION_SECRET via SHA-256.
 */
function key(): Buffer {
	const s = env.SESSION_SECRET;
	if (!s || s.length < 16) {
		throw new Error('SESSION_SECRET is missing or too short (set it in your .env)');
	}
	return crypto.createHash('sha256').update(s).digest();
}

/** Encrypt + authenticate a JSON-serialisable payload into a cookie-safe string. */
export function sealJSON(payload: unknown): string {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
	const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
	const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString('base64url')}.${enc.toString('base64url')}.${tag.toString('base64url')}`;
}

/** Decrypt + verify a cookie string. Returns null if missing/tampered/undecryptable. */
export function unsealJSON<T>(token: string | undefined): T | null {
	if (!token) return null;
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	try {
		const iv = Buffer.from(parts[0], 'base64url');
		const enc = Buffer.from(parts[1], 'base64url');
		const tag = Buffer.from(parts[2], 'base64url');
		if (iv.length !== 12 || tag.length !== 16) return null;
		const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
		decipher.setAuthTag(tag);
		const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
		return JSON.parse(dec.toString('utf8')) as T;
	} catch {
		return null;
	}
}
