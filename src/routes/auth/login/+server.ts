import { redirect, error } from '@sveltejs/kit';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types';
import { buildAuthorizeUrl, isAuthConfigured, safeNext } from '$lib/server/auth';

const STATE_COOKIE = 'nexus_oauth_state';
const NEXT_COOKIE = 'nexus_oauth_next';

export const GET: RequestHandler = ({ url, cookies }) => {
	if (!isAuthConfigured()) {
		throw error(
			500,
			'Hack Club OAuth is not configured. Set AUTH_CLIENT_ID, AUTH_CLIENT_SECRET and AUTH_REDIRECT_URI in your .env (register an app at https://auth.hackclub.com/developer/apps).'
		);
	}

	const state = crypto.randomBytes(16).toString('hex');
	const cookieOpts = {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		maxAge: 60 * 10 // 10 minutes to complete the flow
	};
	cookies.set(STATE_COOKIE, state, cookieOpts);

	// Remember where the user started so the callback can send them back there
	// instead of the default ship page. Validated now and again on the way out.
	cookies.set(NEXT_COOKIE, safeNext(url.searchParams.get('next')), cookieOpts);

	throw redirect(302, buildAuthorizeUrl(state));
};
