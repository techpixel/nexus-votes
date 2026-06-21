import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForToken, fetchIdentity, primaryAddress, safeNext } from '$lib/server/auth';
import { isEligibleAttendee } from '$lib/server/horizons';
import { upsertUser } from '$lib/server/airtable';
import { SESSION_COOKIE, COOKIE_OPTIONS, seal } from '$lib/server/session';

const STATE_COOKIE = 'nexus_oauth_state';
const NEXT_COOKIE = 'nexus_oauth_next';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const returnedState = url.searchParams.get('state');
	const oauthError = url.searchParams.get('error');

	// Where to land after sign-in, captured by /auth/login. Re-validated here so a
	// tampered cookie can't turn this into an open redirect.
	const next = safeNext(cookies.get(NEXT_COOKIE));
	cookies.delete(NEXT_COOKIE, { path: '/' });

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

	// Sign-in gate: only people on the Horizons attendee view may sign in. Done
	// before any user record is created or a session is minted, so a blocked
	// account leaves no trace. Fails closed: if the directory can't be verified
	// while it's configured, we reject rather than admit everyone.
	let eligible: boolean;
	try {
		eligible = await isEligibleAttendee(identity.primary_email);
	} catch (err) {
		console.error('Horizons eligibility check failed:', err);
		throw error(
			503,
			'We could not verify your Horizons registration right now. Please try signing in again in a moment.'
		);
	}
	if (!eligible) {
		throw error(
			403,
			'Sign-in is limited to registered Horizons attendees, and the email on your Hack Club account is not on the attendee list. If you believe this is a mistake, reach out to an organizer.'
		);
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

	throw redirect(302, next);
};
