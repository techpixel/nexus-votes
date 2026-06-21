import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, unseal } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	let user = null;
	try {
		user = unseal(token);
	} catch {
		// Missing/invalid SESSION_SECRET — treat as logged out rather than crash.
		user = null;
	}
	event.locals.user = user;
	return resolve(event);
};
