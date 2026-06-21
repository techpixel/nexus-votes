import { env } from '$env/dynamic/private';

/**
 * Hack Club Auth (auth.hackclub.com) — OAuth 2.0 / OIDC.
 * Confidential client: we exchange the code with our client_secret server-side,
 * so PKCE is not required. Profile is read from the richer /api/v1/me endpoint.
 * Docs: https://auth.hackclub.com/docs/oauth-guide
 */
export const AUTH_BASE = 'https://auth.hackclub.com';
export const AUTHORIZE_URL = `${AUTH_BASE}/oauth/authorize`;
export const TOKEN_URL = `${AUTH_BASE}/oauth/token`;
export const PROFILE_URL = `${AUTH_BASE}/api/v1/me`;

/**
 * Scopes requested at sign-in. Includes the privileged `address` + `birthdate`
 * scopes (mailing address + birthday) so we can pull that data from Hack Club.
 * These are HQ-only — the OAuth app must be approved by Hack Club HQ, or
 * /authorize returns `invalid_scope`.
 */
export const SCOPES = 'openid profile email name address birthdate';

export function authConfig() {
	const clientId = env.AUTH_CLIENT_ID;
	const clientSecret = env.AUTH_CLIENT_SECRET;
	const redirectUri = env.AUTH_REDIRECT_URI;
	return { clientId, clientSecret, redirectUri };
}

export function isAuthConfigured(): boolean {
	const { clientId, clientSecret, redirectUri } = authConfig();
	return Boolean(clientId && clientSecret && redirectUri);
}

export function buildAuthorizeUrl(state: string): string {
	const { clientId, redirectUri } = authConfig();
	const params = new URLSearchParams({
		client_id: clientId ?? '',
		redirect_uri: redirectUri ?? '',
		response_type: 'code',
		scope: SCOPES,
		state
	});
	return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface TokenResponse {
	access_token: string;
	token_type: string;
	scope?: string;
	[key: string]: unknown;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
	const { clientId, clientSecret, redirectUri } = authConfig();
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		client_id: clientId ?? '',
		client_secret: clientSecret ?? '',
		redirect_uri: redirectUri ?? ''
	});

	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Token exchange failed (${res.status}): ${text}`);
	}
	return (await res.json()) as TokenResponse;
}

export interface HackClubAddress {
	id?: string;
	first_name?: string;
	last_name?: string;
	line_1?: string;
	line_2?: string;
	city?: string;
	state?: string;
	postal_code?: string;
	country?: string;
	phone_number?: string;
	primary?: boolean;
}

export interface HackClubIdentity {
	id: string;
	primary_email?: string;
	first_name?: string;
	last_name?: string;
	slack_id?: string;
	verification_status?: string;
	ysws_eligible?: boolean;
	birthday?: string;
	legal_first_name?: string;
	legal_last_name?: string;
	addresses?: HackClubAddress[];
}

/** The user's primary mailing address (or the first one available). */
export function primaryAddress(identity: HackClubIdentity): HackClubAddress | undefined {
	const addresses = identity.addresses;
	if (!addresses?.length) return undefined;
	return addresses.find((a) => a.primary) ?? addresses[0];
}

export async function fetchIdentity(accessToken: string): Promise<HackClubIdentity> {
	const res = await fetch(PROFILE_URL, {
		headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Profile fetch failed (${res.status}): ${text}`);
	}
	const data = (await res.json()) as { identity: HackClubIdentity };
	return data.identity;
}
