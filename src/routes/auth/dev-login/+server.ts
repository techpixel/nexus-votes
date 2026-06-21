import { redirect, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, COOKIE_OPTIONS, seal } from '$lib/server/session';

/**
 * DEV ONLY. Lets you preview the authenticated /ship flow without real
 * Hack Club OAuth credentials. Guarded by SvelteKit's `dev` flag, so this
 * route does not exist in a production build.
 */
export const GET: RequestHandler = ({ cookies }) => {
	if (!dev) throw error(404, 'Not found');

	const sealed = seal({
		id: 'dev-user',
		email: 'dev@hackclub.com',
		firstName: 'Dev',
		lastName: 'Tester',
		yswsEligible: true,
		birthday: '2006-04-01',
		address: {
			line1: '15 Falls Rd',
			line2: '',
			city: 'Shelburne',
			state: 'VT',
			postalCode: '05482',
			country: 'United States'
		}
	});
	cookies.set(SESSION_COOKIE, sealed, COOKIE_OPTIONS);

	throw redirect(302, '/ship/team');
};
