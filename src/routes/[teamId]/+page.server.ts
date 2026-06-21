import { error, fail } from '@sveltejs/kit';
import crypto from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';
import { getTeamProject, createVote } from '$lib/server/airtable';
import { hasVoted, claimVote, releaseVote } from '$lib/server/vote-cache';
import { isVotingEnabled } from '$lib/server/voting';
import { resolveCard } from '$lib/cards';

// Team IDs are always sequential positive integers. Rejecting anything else up
// front both 404s junk URLs cleanly and keeps attacker-controlled input out of
// the Airtable filterByFormula string entirely.
const isValidTeamId = (id: string) => /^[1-9]\d*$/.test(id);

function themesFor(cards: string[]) {
	// A team may stack duplicate cards to form poker hands (Five of a Kind, etc.)
	// for the score multiplier, so `cards` can list the same frame more than once.
	// Voters rate each distinct theme once — dedupe by frame so the form doesn't
	// render the same theme twice (which also crashes the keyed {#each}) or
	// double-count it in the average.
	const seen = new Set<string>();
	return cards
		.map((code) => resolveCard(code))
		.filter((c): c is NonNullable<typeof c> => c !== null)
		// The wildcard Joker "plays as anything" and carries no real theme, so voters
		// shouldn't rate it — drop it from the form (and the POST validation built
		// from the same list).
		.filter((c) => !c.joker)
		.filter((c) => !seen.has(c.frame) && seen.add(c.frame))
		.map((c) => ({ frame: c.frame, theme: c.name.charAt(0).toUpperCase() + c.name.slice(1) }));
}

// You can't vote for a project you helped build. Team membership comes from the
// project's `members` (served from the in-memory team cache), compared
// case-insensitively against the signed-in voter's email.
const isOwnTeam = (members: string[], email: string) =>
	members.some((m) => m.trim().toLowerCase() === email.trim().toLowerCase());

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!isValidTeamId(params.teamId)) throw error(404, 'No project found for this code.');

	let project;
	try {
		project = await getTeamProject(params.teamId);
	} catch {
		throw error(503, 'Could not load this project right now. Try again in a moment.');
	}
	if (!project) throw error(404, 'No project found for this code.');

	// Decide up front which state the page should render, so we never show the
	// rating form to someone who can't actually submit (logged out / own team /
	// already voted) and then reject them on POST.
	const votingEnabled = isVotingEnabled();
	const email = locals.user?.email;
	const ownTeam = email ? isOwnTeam(project.members, email) : false;
	// Skip the vote-cache lookup entirely when voting is closed — the page shows
	// the "voting closed" state regardless.
	const alreadyVoted =
		votingEnabled && email && !ownTeam ? await hasVoted(project.recordId, email) : false;

	return {
		teamId: project.teamId,
		projectName: project.projectName,
		// show the local-part of each member email as a friendly author label
		authors: project.members.map((e) => e.split('@')[0]),
		screenshotUrl: project.screenshotUrl,
		themes: themesFor(project.cards),
		// when false, the page shows a "voting closed" message instead of the form
		votingEnabled,
		// voting requires sign-in; the page shows a prompt instead of the form when logged out
		loggedIn: Boolean(locals.user),
		ownTeam,
		alreadyVoted
	};
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		// Voting may be closed (e.g. after the judging window). Enforce it here —
		// the load gate only hides the form; a direct POST must still be rejected.
		if (!isVotingEnabled()) return fail(403, { error: 'Voting is closed.' });
		// Voting requires authentication (the landing page says "sign in to vote").
		// Without this, votes could be cast anonymously and without limit.
		if (!locals.user) return fail(401, { error: 'Please sign in to vote.' });
		if (!isValidTeamId(params.teamId)) return fail(404, { error: 'Project not found.' });

		let project;
		try {
			project = await getTeamProject(params.teamId);
		} catch {
			return fail(503, { error: 'Could not reach the server. Try again.' });
		}
		if (!project) return fail(404, { error: 'Project not found.' });

		// You can't vote for your own team's project.
		if (isOwnTeam(project.members, locals.user.email)) {
			return fail(403, { error: "You can't vote for your own team's project." });
		}

		const themes = themesFor(project.cards);
		if (!themes.length) return fail(400, { error: 'This project has no themes to rate.' });

		const form = await request.formData();
		let parsed: Record<string, unknown> = {};
		try {
			parsed = JSON.parse(String(form.get('ratings') ?? '{}'));
		} catch {
			/* leave empty → validation fails below */
		}

		const values: number[] = [];
		for (const t of themes) {
			const n = Number(parsed[t.frame]);
			if (!Number.isInteger(n) || n < 1 || n > 7) {
				return fail(400, { error: 'Please rate every theme before submitting.' });
			}
			values.push(n);
		}

		const ratingsText = themes.map((t, i) => `${t.theme}: ${values[i]}`).join('\n');
		const average = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;

		// One vote per person per project. Claim the slot atomically (after the
		// ratings are known-valid, so a malformed submit never consumes their
		// vote); a losing concurrent submit or a prior vote gets a clean 409.
		if (!(await claimVote(project.recordId, locals.user.email))) {
			return fail(409, { error: 'You have already voted on this project.' });
		}

		try {
			await createVote({
				voteId: crypto.randomUUID(),
				teamRecordId: project.recordId,
				voter: locals.user.email,
				ratings: ratingsText,
				average,
				submittedAt: new Date().toISOString()
			});
		} catch {
			// Persisting failed — release the slot so the voter can retry.
			releaseVote(project.recordId, locals.user.email);
			return fail(502, { error: 'Could not record your vote. Try again.' });
		}

		return { success: true };
	}
};
