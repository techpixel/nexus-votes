import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { DRAFT_COOKIE, DRAFT_COOKIE_OPTIONS, sealDraft, unsealDraft } from '$lib/server/draft';
import {
	lookupAttendeeByEmail,
	lookupAttendeeByRecordId,
	isHorizonsConfigured
} from '$lib/server/horizons';
import { isTeamIdTaken } from '$lib/server/airtable';
import { guardAlreadyShipped } from '$lib/server/ship-guard';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) throw redirect(302, '/');
	await guardAlreadyShipped(locals.user.email);
	// Prefill anything already chosen this session (minus the submitter). Resolve
	// each stored email back to the directory so the UI can show a Slack username +
	// avatar — and so the browser only ever receives an opaque record id, never the
	// email address. A member that no longer resolves is dropped from the prefill
	// (the submit action re-validates each id regardless).
	const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
	const teammateEmails = (draft?.teamMembers ?? []).filter((e) => e !== locals.user!.email);
	const teammates = (
		await Promise.all(
			teammateEmails.map(async (email) => {
				try {
					const a = await lookupAttendeeByEmail(email);
					if (a) {
						return { id: a.recordId, name: a.name, slackId: a.slackId, slackUsername: a.slackUsername };
					}
				} catch {
					/* directory miss/error — drop this prefill entry */
				}
				return null;
			})
		)
	).filter((m): m is NonNullable<typeof m> => m !== null);
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

		// The browser submits opaque Horizons record ids (never emails). Record ids
		// are case-sensitive, so don't normalise case here.
		const addedIds = String(form.get('teammates') ?? '')
			.split(/[\n,]+/)
			.map((s) => s.trim())
			.filter(Boolean);

		if (addedIds.length && !isHorizonsConfigured()) {
			return fail(503, { error: 'The Horizons directory is not configured on the server.' });
		}

		// Resolve every chosen id back to a directory record to recover its email.
		const myEmail = user.email.trim().toLowerCase();
		const valid: string[] = [];
		let unknownCount = 0;
		for (const id of [...new Set(addedIds)]) {
			try {
				const attendee = await lookupAttendeeByRecordId(id);
				if (!attendee) unknownCount++;
				// Drop the submitter if they somehow picked themselves; added below.
				else if (attendee.email !== myEmail) valid.push(attendee.email);
			} catch {
				return fail(502, { error: 'Could not reach the Horizons directory. Try again.' });
			}
		}
		if (unknownCount) {
			return fail(400, {
				error: 'Some selected teammates are no longer in the directory. Remove them and try again.'
			});
		}

		// Submitter is always the first member.
		const team = [...new Set([user.email, ...valid])];
		cookies.set(DRAFT_COOKIE, sealDraft({ teamMembers: team, teamId }), DRAFT_COOKIE_OPTIONS);
		throw redirect(303, '/ship');
	}
};
