import { sealJSON, unsealJSON } from '$lib/server/secure-cookie';

export interface SessionAddress {
	line1?: string;
	line2?: string;
	city?: string;
	state?: string;
	postalCode?: string;
	country?: string;
}

export interface SessionUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	slackId?: string;
	yswsEligible?: boolean;
	/** ISO date, e.g. "2006-04-01" — from the privileged `birthdate` scope */
	birthday?: string;
	/** Primary mailing address — from the privileged `address` scope */
	address?: SessionAddress;
	/** unix seconds */
	exp: number;
}

export const SESSION_COOKIE = 'nexus_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Serialise + encrypt a session payload into a cookie-safe string. */
export function seal(user: Omit<SessionUser, 'exp'>): string {
	const payload: SessionUser = { ...user, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
	return sealJSON(payload);
}

/** Decrypt a cookie string and return the user, or null if invalid/expired/tampered. */
export function unseal(token: string | undefined): SessionUser | null {
	const user = unsealJSON<SessionUser>(token);
	if (!user) return null;
	if (!user.exp || user.exp < Math.floor(Date.now() / 1000)) return null;
	return user;
}

export const COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	maxAge: MAX_AGE_SECONDS
};
