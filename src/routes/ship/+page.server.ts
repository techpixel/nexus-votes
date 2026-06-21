import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createSubmission,
	createTeam,
	nextTeamId,
	uploadScreenshot,
	updateSubmission,
	getTeamProject,
	invalidateTeamProject,
	isAirtableConfigured,
	type UploadFile
} from '$lib/server/airtable';
import { DRAFT_COOKIE, DRAFT_COOKIE_OPTIONS, sealDraft, unsealDraft } from '$lib/server/draft';
import { guardAlreadyShipped } from '$lib/server/ship-guard';

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB (Airtable inline upload limit)

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) throw redirect(302, '/');
	const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
	if (!draft?.editing) {
		await guardAlreadyShipped(locals.user.email);
		// Same `values` shape as the editing branch below so PageData stays a single
		// consistent type (avoids a Record<string, string> mismatch in +page.svelte).
		return {
			user: locals.user,
			editing: false,
			values: { projectName: '', playableLink: '', githubRepo: '', description: '' },
			screenshotUrl: ''
		};
	}
	// Editing: prefill from the canonical project record on file.
	let project = null;
	try {
		project = await getTeamProject(draft.teamId ?? '');
	} catch {
		/* fall back to the draft's project name below */
	}
	return {
		user: locals.user,
		editing: true,
		values: {
			projectName: project?.projectName ?? draft.projectName ?? '',
			playableLink: project?.playableUrl ?? '',
			githubRepo: project?.codeUrl ?? '',
			description: project?.description ?? ''
		},
		screenshotUrl: project?.screenshotUrl ?? ''
	};
};

function parseGithubUsername(repoUrl: string): string {
	try {
		const u = new URL(repoUrl);
		if (!/(^|\.)github\.com$/i.test(u.hostname)) return '';
		const owner = u.pathname.split('/').filter(Boolean)[0];
		return owner ?? '';
	} catch {
		return '';
	}
}

const isUrl = (v: string) => /^https?:\/\/.+/i.test(v);

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		if (!locals.user) throw redirect(302, '/');
		const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
		const editing = Boolean(draft?.editing);
		// Integrity guard: never create a second record for someone whose team
		// has already shipped, even via a stale tab posting straight here. (Editing
		// is the legitimate way back in, so skip the guard then.)
		if (!editing) await guardAlreadyShipped(locals.user.email);

		const form = await request.formData();
		const projectName = String(form.get('projectName') ?? '').trim();
		const playableLink = String(form.get('playableLink') ?? '').trim();
		const githubRepo = String(form.get('githubRepo') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const howHeard = String(form.get('howHeard') ?? '').trim();
		const doingWell = String(form.get('doingWell') ?? '').trim();
		const improve = String(form.get('improve') ?? '').trim();
		const screenshot = form.get('screenshot');

		const values = {
			projectName,
			playableLink,
			githubRepo,
			description,
			howHeard,
			doingWell,
			improve
		};
		const errors: Record<string, string> = {};

		// All visible fields are required.
		if (!projectName) errors.projectName = 'Give your project a name.';

		// A screenshot is required when shipping; when editing it's optional (the
		// existing one is kept unless a new file is provided).
		if (screenshot instanceof File && screenshot.size > 0) {
			if (screenshot.size > MAX_SCREENSHOT_BYTES)
				errors.screenshot = 'Screenshot must be under 5 MB.';
		} else if (!editing) {
			errors.screenshot = 'Add a screenshot of your project.';
		}

		if (!playableLink) errors.playableLink = 'A playable link is required.';
		else if (!isUrl(playableLink)) errors.playableLink = 'Enter a full URL (https://…).';

		if (!githubRepo) errors.githubRepo = 'A GitHub repo link is required.';
		else if (!isUrl(githubRepo)) errors.githubRepo = 'Enter a full URL (https://…).';

		if (!description) errors.description = 'Add a project description.';

		if (Object.keys(errors).length) return fail(400, { errors, values });

		if (!isAirtableConfigured()) {
			return fail(503, {
				values,
				errors: { form: 'Submissions are not configured on the server yet (missing AIRTABLE_TOKEN).' }
			});
		}

		// ---- edit mode: update the existing records in place ----
		if (editing) {
			if (!draft?.recordId || !draft.memberRecords?.length) throw redirect(303, '/ship/team');

			const sharedFields: Record<string, string | number> = {
				'Project Name': projectName,
				'Code URL': githubRepo,
				'Playable URL': playableLink,
				Description: description
			};
			const ghUser = parseGithubUsername(githubRepo);
			if (ghUser) sharedFields['GitHub Username'] = ghUser;

			// Keep the shared project fields in sync on every member's record (the
			// canonical record is what /ship/done and the vote page read; the stubs
			// mirror it as in the create flow). The canonical record is first.
			const updates = await Promise.allSettled(
				draft.memberRecords.map((m) => updateSubmission(m.recordId, sharedFields))
			);
			if (updates[0]?.status === 'rejected') {
				console.error('updateSubmission (edit project) failed:', updates[0].reason);
				return fail(502, {
					values,
					errors: { form: 'Could not save your changes. Please try again.' }
				});
			}
			for (const r of updates) {
				if (r.status === 'rejected')
					console.error('updateSubmission (edit project, stub) failed:', r.reason);
			}

			// Replace the screenshot only if a new one was supplied — best-effort, on
			// every member record so each carries it (same as shipping).
			if (
				screenshot instanceof File &&
				screenshot.size > 0 &&
				screenshot.size <= MAX_SCREENSHOT_BYTES
			) {
				const buf = Buffer.from(await screenshot.arrayBuffer());
				const file: UploadFile = {
					base64: buf.toString('base64'),
					contentType: screenshot.type || 'image/png',
					filename: screenshot.name || 'screenshot.png'
				};
				for (const m of draft.memberRecords) {
					try {
						await uploadScreenshot(m.recordId, file);
					} catch (e) {
						console.error('uploadScreenshot (edit) failed:', e);
					}
				}
			}

			invalidateTeamProject(draft.teamId ?? '');

			cookies.set(
				DRAFT_COOKIE,
				sealDraft({
					editing: true,
					teamId: draft.teamId,
					teamRecordId: draft.teamRecordId,
					recordId: draft.recordId,
					projectName,
					teamMembers: draft.teamMembers,
					memberRecords: draft.memberRecords
				}),
				DRAFT_COOKIE_OPTIONS
			);
			throw redirect(303, '/ship/hours');
		}

		// Team details carried over from the Team step (defaults to just the submitter).
		const team = draft?.teamMembers?.length ? draft.teamMembers : [locals.user.email];
		// Use the team number chosen in the Team step; only auto-assign as a
		// fallback (e.g. someone posting straight here without that step).
		const teamId = draft?.teamId || (await nextTeamId());

		// Project-level data shared by everyone on the team. Reused below to seed a
		// stub submission record for each teammate (see createSubmission loop).
		const sharedFields: Record<string, string | number> = {
			'Project Name': projectName,
			'Code URL': githubRepo,
			'Playable URL': playableLink,
			Description: description,
			'Team Members': team.join('\n'),
			'Team ID': teamId
		};
		const ghUser = parseGithubUsername(githubRepo);
		if (ghUser) sharedFields['GitHub Username'] = ghUser;

		// The submitter's own record: shared project data + their identity.
		const fields: Record<string, string | number> = {
			...sharedFields,
			'First Name': locals.user.firstName,
			'Last Name': locals.user.lastName,
			Email: locals.user.email
		};
		if (howHeard) fields['How did you hear about this?'] = howHeard;
		if (doingWell) fields['What are we doing well?'] = doingWell;
		if (improve) fields['How can we improve?'] = improve;

		// Identity data pulled from Hack Club Auth at sign-in (privileged scopes).
		if (locals.user.birthday) fields['Birthday'] = locals.user.birthday;
		const addr = locals.user.address;
		if (addr) {
			if (addr.line1) fields['Address (Line 1)'] = addr.line1;
			if (addr.line2) fields['Address (Line 2)'] = addr.line2;
			if (addr.city) fields['City'] = addr.city;
			if (addr.state) fields['State / Province'] = addr.state;
			if (addr.postalCode) fields['ZIP / Postal Code'] = addr.postalCode;
			if (addr.country) fields['Country'] = addr.country;
		}

		let recordId: string;
		try {
			({ id: recordId } = await createSubmission(fields));
		} catch (e) {
			// Log the raw Airtable error server-side; show the user a generic message
			// so internal details (field names, base structure) aren't disclosed.
			console.error('createSubmission failed:', e);
			return fail(502, {
				values,
				errors: { form: 'Could not save your submission. Please try again.' }
			});
		}

		// Prepare the screenshot once so the SAME image can be attached to every
		// team member's record below. Attachments upload per record (the content
		// API takes a single record id), so without this each teammate stub would
		// be left without the screenshot — only the submitter's record would have
		// it. Reading the bytes once avoids re-buffering the upload per member.
		let screenshotFile: UploadFile | null = null;
		if (
			screenshot instanceof File &&
			screenshot.size > 0 &&
			screenshot.size <= MAX_SCREENSHOT_BYTES
		) {
			const buf = Buffer.from(await screenshot.arrayBuffer());
			screenshotFile = {
				base64: buf.toString('base64'),
				contentType: screenshot.type || 'image/png',
				filename: screenshot.name || 'screenshot.png'
			};
		}

		// Best-effort screenshot upload to the submitter's record — don't block the
		// flow if it fails.
		if (screenshotFile) {
			try {
				await uploadScreenshot(recordId, screenshotFile);
			} catch (e) {
				// Record is saved; the screenshot can be re-added later. Log the raw
				// Airtable error (e.g. a 403 from the content/upload API) so a failed
				// upload is diagnosable instead of vanishing silently.
				console.error('uploadScreenshot failed:', e);
			}
		}

		// Index the team in the Teams table, linked to this project (best-effort).
		try {
			await createTeam({ teamId, members: team, projectRecordId: recordId });
		} catch {
			// the submission is saved regardless of team-table indexing
		}

		// Give every teammate their own YSWS submission record. These stubs carry the
		// shared project data + the teammate's email, but no personal/shipping identity
		// (that's only available once the teammate signs in themselves). Best-effort —
		// the submitter's own ship is already saved either way. Only the submitter's
		// record is linked from the Teams table (the canonical project record).
		//
		// Each created record is tracked (submitter first) so the next step
		// (/ship/hours) can set every member's hours + Hackatime project individually.
		const memberRecords: { email: string; recordId: string }[] = [
			{ email: locals.user.email, recordId }
		];
		const teammateEmails = team.filter(
			(e) => e.trim().toLowerCase() !== locals.user!.email.trim().toLowerCase()
		);
		for (const email of teammateEmails) {
			try {
				const { id } = await createSubmission({ ...sharedFields, Email: email });
				memberRecords.push({ email, recordId: id });
				// Attach the same screenshot to the teammate's record so every member's
				// YSWS submission carries it, not just the submitter's (best-effort).
				if (screenshotFile) {
					try {
						await uploadScreenshot(id, screenshotFile);
					} catch (e) {
						console.error('uploadScreenshot (teammate stub) failed:', e);
					}
				}
			} catch (e) {
				console.error('createSubmission (teammate stub) failed:', e);
			}
		}

		// Hand off to the Hours step (set per-member hours + Hackatime) with a signed
		// reference to every member's record. recordId/projectName are carried through
		// for the final cards step.
		cookies.set(
			DRAFT_COOKIE,
			sealDraft({ recordId, projectName, memberRecords }),
			DRAFT_COOKIE_OPTIONS
		);
		throw redirect(303, '/ship/hours');
	}
};
