import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { DRAFT_COOKIE, DRAFT_COOKIE_OPTIONS, sealDraft, unsealDraft } from '$lib/server/draft';
import { lookupAttendeeByEmail, isHorizonsConfigured } from '$lib/server/horizons';
import { isTeamIdTaken } from '$lib/server/airtable';
import { guardAlreadyShipped } from '$lib/server/ship-guard';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) throw redirect(302, '/');
	await guardAlreadyShipped(locals.user.email);
	// Prefill anything already chosen this session (minus the submitter). Resolve
	// each email back to the directory so the UI can show a Slack username +
	// avatar instead of a bare email address.
	const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
	const teammateEmails = (draft?.teamMembers ?? []).filter((e) => e !== locals.user!.email);
	const teammates = await Promise.all(
		teammateEmails.map(async (email) => {
			try {
				const a = await lookupAttendeeByEmail(email);
				if (a) {
					return { email: a.email, name: a.name, slackId: a.slackId, slackUsername: a.slackUsername };
				}
			} catch {
				/* fall through to the bare-email fallback */
			}
			return { email, name: email };
		})
	);
	return { user: locals.user, teammates, teamId: draft?.teamId ?? '' };
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		if (!locals.user) throw redirect(302, '/');
		await guardAlreadyShipped(locals.user.email);
		const user = locals.user;

		const form = await request.formData();

		// Team number → becomes the Team ID / short vote URL. Normalise away any
		// leading zeros so "/007" and "/7" can't point at two different teams.
		const teamNumber = String(form.get('teamNumber') ?? '').trim();
		if (!teamNumber) {
			return fail(400, { error: 'Enter your team number.', teamNumber });
		}
		if (!/^\d+$/.test(teamNumber) || Number(teamNumber) < 1) {
			return fail(400, { error: 'Team number must be a positive whole number.', teamNumber });
		}
		const teamId = String(Number(teamNumber));
		if (await isTeamIdTaken(teamId)) {
			return fail(409, { error: `Team number ${teamId} is already taken.`, teamNumber });
		}

		const added = String(form.get('teammates') ?? '')
			.split(/[\n,]+/)
			.map((s) => s.trim().toLowerCase())
			.filter((e) => e && e !== user.email.toLowerCase());

		if (added.length && !isHorizonsConfigured()) {
			return fail(503, { error: 'The Horizons directory is not configured on the server.' });
		}

		// Re-validate every chosen teammate against the Horizons directory.
		const valid: string[] = [];
		const unknown: string[] = [];
		for (const email of [...new Set(added)]) {
			try {
				const attendee = await lookupAttendeeByEmail(email);
				if (attendee) valid.push(attendee.email);
				else unknown.push(email);
			} catch {
				return fail(502, { error: 'Could not reach the Horizons directory. Try again.' });
			}
		}
		if (unknown.length) {
			return fail(400, { error: `Not in the Horizons directory: ${unknown.join(', ')}` });
		}

		// Submitter is always the first member.
		const team = [...new Set([user.email, ...valid])];
		cookies.set(DRAFT_COOKIE, sealDraft({ teamMembers: team, teamId }), DRAFT_COOKIE_OPTIONS);
		throw redirect(303, '/ship');
	}
};
