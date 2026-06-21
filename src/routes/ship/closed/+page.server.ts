import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isShippingEnabled } from '$lib/server/shipping';
import { findTeamSubmissionByMember } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/');
	// Only meaningful while shipping is actually closed — if it's open, this page
	// has no reason to exist, so send the user into the ship flow.
	if (isShippingEnabled()) throw redirect(302, '/ship/team');
	// Already shipped? The team's submission still stands — show that summary
	// rather than telling them shipping is closed. Fail open to the message if
	// the lookup can't be made.
	let alreadyShipped = false;
	try {
		alreadyShipped = Boolean(await findTeamSubmissionByMember(locals.user.email));
	} catch {
		/* keep alreadyShipped = false and show the closed screen */
	}
	if (alreadyShipped) throw redirect(302, '/ship/done');
	return { user: locals.user };
};
