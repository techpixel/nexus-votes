import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { findTeamSubmissionByMember } from '$lib/server/airtable';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/');
	// Only reachable once you've actually shipped. If nothing is on file (e.g.
	// someone navigates here directly), send them into the ship flow instead.
	const existing = await findTeamSubmissionByMember(locals.user.email);
	if (!existing) throw redirect(302, '/ship/team');
	return {
		user: locals.user,
		projectName: existing.projectName,
		teamId: existing.teamId
	};
};
