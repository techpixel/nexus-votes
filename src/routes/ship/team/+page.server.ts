import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { DRAFT_COOKIE, DRAFT_COOKIE_OPTIONS, sealDraft, unsealDraft } from '$lib/server/draft';
import {
	lookupAttendeeByEmail,
	lookupAttendeeByRecordId,
	isHorizonsConfigured
} from '$lib/server/horizons';
import {
	isTeamIdTaken,
	getTeamProject,
	createSubmission,
	updateSubmission,
	deleteSubmission,
	updateTeam,
	invalidateTeamProject
} from '$lib/server/airtable';
import { guardAlreadyShipped } from '$lib/server/ship-guard';
import { guardEditingDisabled } from '$lib/server/editing';
import { guardShippingDisabled } from '$lib/server/shipping';

const lc = (s: string) => s.trim().toLowerCase();

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) throw redirect(302, '/');
	const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
	guardEditingDisabled(draft?.editing);
	// While editing, the team has already shipped — bypass the guards that would
	// otherwise bounce them to /ship/done or /ship/closed.
	if (!draft?.editing) await guardAlreadyShipped(locals.user.email);
	guardShippingDisabled(draft?.editing);
	// Prefill anything already chosen this session (minus the submitter). Resolve
	// each stored email back to the directory so the UI can show a Slack username +
	// avatar — and so the browser only ever receives an opaque record id, never the
	// email address. A member that no longer resolves is dropped from the prefill
	// (the submit action re-validates each id regardless).
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
	return {
		user: locals.user,
		teammates,
		teamId: draft?.teamId ?? '',
		editing: Boolean(draft?.editing)
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		if (!locals.user) throw redirect(302, '/');
		const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
		const editing = Boolean(draft?.editing);
		guardEditingDisabled(editing);
		if (!editing) await guardAlreadyShipped(locals.user.email);
		guardShippingDisabled(editing);
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
		// When editing, the team already owns its current number — only re-check
		// uniqueness if they're changing it to a different one.
		const teamIdChanged = !editing || teamId !== draft?.teamId;
		if (teamIdChanged && (await isTeamIdTaken(teamId))) {
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
		const myEmail = lc(user.email);
		const valid: string[] = [];
		let unknownCount = 0;
		for (const id of [...new Set(addedIds)]) {
			try {
				const attendee = await lookupAttendeeByRecordId(id);
				if (!attendee) unknownCount++;
				// Drop the submitter if they somehow picked themselves; added below.
				else if (lc(attendee.email) !== myEmail) valid.push(attendee.email);
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

		if (!editing) {
			cookies.set(DRAFT_COOKIE, sealDraft({ teamMembers: team, teamId }), DRAFT_COOKIE_OPTIONS);
			throw redirect(303, '/ship');
		}

		// ---- edit mode: reconcile the team against what's already on file ----
		const oldTeamId = draft?.teamId ?? teamId;
		const canonicalId = draft?.recordId;
		const existingRecords = draft?.memberRecords ?? [];
		const newSet = new Set(team.map(lc));
		const membersChanged =
			existingRecords.length !== team.length ||
			existingRecords.some((m) => !newSet.has(lc(m.email)));

		// Records to keep (still on the team) vs drop (removed members). The submitter's
		// canonical record is always kept — the submitter can't remove themselves.
		const kept = existingRecords.filter((m) => newSet.has(lc(m.email)));
		const dropped = existingRecords.filter(
			(m) => !newSet.has(lc(m.email)) && m.recordId !== canonicalId
		);

		for (const m of dropped) {
			try {
				await deleteSubmission(m.recordId);
			} catch (e) {
				console.error('deleteSubmission (edit) failed:', e);
			}
		}

		// New stubs for members who weren't on the team before. Seed them with the
		// shared project fields (same as the create flow) so they're not blank rows.
		const knownEmails = new Set(existingRecords.map((m) => lc(m.email)));
		const addedEmails = team.filter((e) => !knownEmails.has(lc(e)));
		const newMemberRecords = kept.map((m) => ({ ...m }));

		if (addedEmails.length) {
			let project = null;
			try {
				project = await getTeamProject(oldTeamId);
			} catch {
				/* seed with just the team fields below if the project can't be read */
			}
			const shared: Record<string, string | number> = {
				'Team ID': teamId,
				'Team Members': team.join('\n')
			};
			if (project?.projectName) shared['Project Name'] = project.projectName;
			if (project?.codeUrl) shared['Code URL'] = project.codeUrl;
			if (project?.playableUrl) shared['Playable URL'] = project.playableUrl;
			if (project?.description) shared['Description'] = project.description;
			if (project?.githubUsername) shared['GitHub Username'] = project.githubUsername;

			for (const email of addedEmails) {
				try {
					const { id } = await createSubmission({ ...shared, Email: email });
					newMemberRecords.push({ email, recordId: id });
				} catch (e) {
					console.error('createSubmission (edit stub) failed:', e);
				}
			}
		}

		// Propagate a new team number / membership list onto every surviving record
		// and the Teams row, so the Team ID and the listed members stay consistent.
		if (teamIdChanged || membersChanged) {
			const patch: Record<string, string | number> = { 'Team Members': team.join('\n') };
			if (teamIdChanged) patch['Team ID'] = teamId;
			await Promise.allSettled(
				newMemberRecords.map((m) => updateSubmission(m.recordId, patch))
			);
			if (draft?.teamRecordId) {
				try {
					await updateTeam(draft.teamRecordId, {
						teamId,
						members: team,
						memberRecordIds: newMemberRecords.map((m) => m.recordId)
					});
				} catch (e) {
					console.error('updateTeam (edit) failed:', e);
				}
			}
			invalidateTeamProject(oldTeamId);
			invalidateTeamProject(teamId);
		}

		cookies.set(
			DRAFT_COOKIE,
			sealDraft({
				editing: true,
				teamId,
				teamRecordId: draft?.teamRecordId,
				recordId: canonicalId,
				projectName: draft?.projectName,
				teamMembers: team,
				memberRecords: newMemberRecords
			}),
			DRAFT_COOKIE_OPTIONS
		);
		throw redirect(303, '/ship');
	}
};
