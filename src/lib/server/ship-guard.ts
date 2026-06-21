import { redirect } from '@sveltejs/kit';
import { findTeamSubmissionByMember } from './airtable';

/**
 * One ship per person/team. If this user already submitted, or is a member of a
 * team that has, send them to the "already shipped" finish screen instead of
 * letting them ship a second time. Throws a redirect when blocked; returns
 * normally when the user is clear to ship.
 *
 * NOTE: only guard the *entry* steps (`/ship/team`, `/ship`). The submission
 * record is created at the `/ship` step before cards are added, so guarding
 * `/ship/cards` would bounce a legitimate user out of finishing their own hand.
 */
export async function guardAlreadyShipped(email: string): Promise<void> {
	const existing = await findTeamSubmissionByMember(email);
	if (!existing) return;
	throw redirect(303, '/ship/done');
}
