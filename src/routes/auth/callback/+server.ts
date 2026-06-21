import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForToken, fetchIdentity, primaryAddress } from '$lib/server/auth';
import { upsertUser } from '$lib/server/airtable';
import { SESSION_COOKIE, COOKIE_OPTIONS, seal } from '$lib/server/session';

const STATE_COOKIE = 'nexus_oauth_state';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const returnedState = url.searchParams.get('state');
	const oauthError = url.searchParams.get('error');

	if (oauthError) {
		throw error(400, `Hack Club sign-in was cancelled or failed: ${oauthError}`);
	}

	const expectedState = cookies.get(STATE_COOKIE);
	cookies.delete(STATE_COOKIE, { path: '/' });

	if (!code || !returnedState || returnedState !== expectedState) {
		throw error(400, 'Invalid OAuth state. Please try signing in again.');
	}

	const token = await exchangeCodeForToken(code);
	const identity = await fetchIdentity(token.access_token);

	if (!identity.primary_email) {
		throw error(400, 'Hack Club did not return an email for this account.');
	}

	// Record/refresh this voter in the Users table. Fails open internally, so a
	// transient Airtable problem can't block sign-in.
	await upsertUser({
		hackClubId: identity.id,
		email: identity.primary_email,
		firstName: identity.first_name,
		lastName: identity.last_name,
		slackId: identity.slack_id,
		yswsEligible: identity.ysws_eligible
	});

	const addr = primaryAddress(identity);
	const sealed = seal({
		id: identity.id,
		email: identity.primary_email,
		firstName: identity.first_name ?? '',
		lastName: identity.last_name ?? '',
		slackId: identity.slack_id,
		yswsEligible: identity.ysws_eligible,
		birthday: identity.birthday,
		address: addr
			? {
					line1: addr.line_1,
					line2: addr.line_2,
					city: addr.city,
					state: addr.state,
					postalCode: addr.postal_code,
					country: addr.country
				}
			: undefined
	});
	cookies.set(SESSION_COOKIE, sealed, COOKIE_OPTIONS);

	throw redirect(302, '/ship/team');
};
