import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	findTeamSubmissionByMember,
	getTeamProject,
	enrichOwnSubmission,
	listTeamSubmissions
} from '$lib/server/airtable';
import { lookupAttendeeByEmail } from '$lib/server/horizons';
import { cardsFromCodes, playedFrames, handIndexByName, handMult, themeLabel } from '$lib/cards';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/');
	// Only reachable once you've actually shipped. If nothing is on file (e.g.
	// someone navigates here directly), send them into the ship flow instead.
	const existing = await findTeamSubmissionByMember(locals.user.email);
	if (!existing) throw redirect(302, '/ship/team');

	// Pull the canonical project record (the submitter's, linked from the Teams
	// table) so the read-only summary is identical for everyone on the team —
	// including teammates, whose own record is a stub without cards/played hand.
	let project = null;
	try {
		project = await getTeamProject(existing.teamId);
	} catch {
		// Fall back to the minimal info from `existing` below.
	}

	// Now that this teammate has signed in, fill in their stub record with their
	// Hack Club identity + the team's cards/played hand. Idempotent and best-effort
	// (no-ops for the submitter's already-complete record); never blocks the page.
	try {
		await enrichOwnSubmission({
			email: locals.user.email,
			firstName: locals.user.firstName,
			lastName: locals.user.lastName,
			birthday: locals.user.birthday,
			address: locals.user.address,
			cards: (project?.cards ?? []).join(' '),
			playedHand: project?.playedHand
		});
	} catch {
		// enrichment is opportunistic — the summary below still renders without it
	}

	// Per-member hours. Each teammate has their own submission record carrying
	// "Optional - Override Hours Spent"; resolve a friendly display name per
	// person (and never ship the raw email to the browser, matching /ship/hours).
	// Falls back to an empty list if Airtable is unconfigured/unreachable.
	const you = locals.user.email.trim().toLowerCase();
	const members = await Promise.all(
		(await listTeamSubmissions(existing.teamId)).map(async (m) => {
			let name = m.email.split('@')[0];
			try {
				const attendee = await lookupAttendeeByEmail(m.email);
				if (attendee?.name) name = attendee.name;
			} catch {
				/* keep the local-part fallback */
			}
			return { name, isYou: m.email.trim().toLowerCase() === you, hours: m.hours };
		})
	);
	// Show the viewer first, then alphabetically by name.
	members.sort((a, b) => Number(b.isYou) - Number(a.isYou) || a.name.localeCompare(b.name));

	// Resolve the played hand into its mult + the themes it actually uses.
	let playedHand = '';
	let playedMult = 0;
	let playedThemes: string[] = [];
	if (project?.playedHand) {
		playedHand = project.playedHand;
		const idx = handIndexByName(project.playedHand);
		playedMult = idx >= 0 ? handMult(idx) : 0;
		const cards = cardsFromCodes(project.cards ?? []);
		const frames = playedFrames(cards, idx);
		playedThemes = cards.filter((c) => frames.has(c.frame)).map(themeLabel);
	}

	return {
		user: locals.user,
		projectName: project?.projectName ?? existing.projectName,
		teamId: existing.teamId,
		description: project?.description ?? '',
		playableUrl: project?.playableUrl ?? '',
		codeUrl: project?.codeUrl ?? '',
		screenshotUrl: project?.screenshotUrl ?? '',
		members,
		playedHand,
		playedMult,
		playedThemes
	};
};
