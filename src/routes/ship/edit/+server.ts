import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	findTeamSubmissionByMember,
	getTeamProject,
	listTeamSubmissions
} from '$lib/server/airtable';
import { DRAFT_COOKIE, DRAFT_COOKIE_OPTIONS, sealDraft } from '$lib/server/draft';
import { isEditingEnabled } from '$lib/server/editing';

/**
 * Entry point for editing an already-shipped project. Rather than a separate edit
 * page, this seeds the draft cookie with an "edit context" and drops the user back
 * at step 1 of the ship flow (/ship/team), prefilled — they walk team → project →
 * hours → cards exactly as when shipping, except every step updates the existing
 * records in place. GET-only (a plain navigation), so it never mutates anything.
 */
export const GET: RequestHandler = async ({ locals, cookies }) => {
	if (!locals.user) throw redirect(302, '/');

	// Editing locked (e.g. after the submission deadline) → no edit session; the
	// summary still renders read-only.
	if (!isEditingEnabled()) throw redirect(303, '/ship/done');

	// Nothing on file → there's nothing to edit; send them into the ship flow.
	const existing = await findTeamSubmissionByMember(locals.user.email);
	if (!existing) throw redirect(302, '/ship/team');

	// The canonical project record is the one linked from the Teams row — the same
	// record /ship/done and the public vote page read from. Fall back to whatever
	// `existing` matched if the Teams link can't be resolved.
	let project = null;
	try {
		project = await getTeamProject(existing.teamId);
	} catch {
		/* fall back below */
	}
	const canonicalRecordId = project?.projectRecordId ?? existing.recordId;

	// Rebuild the per-member record list from Airtable (never trust the browser for
	// record ids). Put the canonical/submitter record first so downstream steps keep
	// treating index 0 as the submitter, exactly as the create flow does.
	const subs = await listTeamSubmissions(existing.teamId);
	const ordered = subs.length
		? [...subs].sort((a, b) => Number(b.recordId === canonicalRecordId) - Number(a.recordId === canonicalRecordId))
		: [{ recordId: canonicalRecordId, email: locals.user.email, hours: '', hackatime: '' }];
	const memberRecords = ordered.map((s) => ({
		email: s.email,
		recordId: s.recordId,
		hours: s.hours,
		hackatime: s.hackatime
	}));
	const teamMembers = memberRecords.map((m) => m.email).filter(Boolean);

	cookies.set(
		DRAFT_COOKIE,
		sealDraft({
			editing: true,
			teamId: existing.teamId,
			teamRecordId: project?.recordId,
			recordId: canonicalRecordId,
			projectName: project?.projectName ?? existing.projectName,
			teamMembers,
			memberRecords
		}),
		DRAFT_COOKIE_OPTIONS
	);

	throw redirect(303, '/ship/team');
};
