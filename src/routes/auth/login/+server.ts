import { redirect, error } from '@sveltejs/kit';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types';
import { buildAuthorizeUrl, isAuthConfigured } from '$lib/server/auth';

const STATE_COOKIE = 'nexus_oauth_state';

export const GET: RequestHandler = ({ cookies }) => {
	if (!isAuthConfigured()) {
		throw error(
			500,
			'Hack Club OAuth is not configured. Set AUTH_CLIENT_ID, AUTH_CLIENT_SECRET and AUTH_REDIRECT_URI in your .env (register an app at https://auth.hackclub.com/developer/apps).'
		);
	}

	const state = crypto.randomBytes(16).toString('hex');
	cookies.set(STATE_COOKIE, state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 10 // 10 minutes to complete the flow
	});

	throw redirect(302, buildAuthorizeUrl(state));
};
