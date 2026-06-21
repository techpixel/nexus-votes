import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	findTeamSubmissionByMember,
	getTeamProject,
	invalidateTeamProject,
	updateSubmission,
	uploadScreenshot,
	isAirtableConfigured
} from '$lib/server/airtable';

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB (Airtable inline upload limit)

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

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/');
	// Editing only makes sense once you've shipped. If nothing is on file, send
	// the user into the ship flow rather than showing an empty edit form.
	const existing = await findTeamSubmissionByMember(locals.user.email);
	if (!existing) throw redirect(302, '/ship/team');

	// Prefill from the canonical project record (the one linked from the Teams
	// table) so a teammate edits the same project everyone sees, not their stub.
	let project = null;
	try {
		project = await getTeamProject(existing.teamId);
	} catch {
		// Fall back to the minimal info from `existing` below.
	}

	return {
		user: locals.user,
		values: {
			projectName: project?.projectName ?? existing.projectName ?? '',
			playableLink: project?.playableUrl ?? '',
			githubRepo: project?.codeUrl ?? '',
			description: project?.description ?? ''
		},
		screenshotUrl: project?.screenshotUrl ?? ''
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) throw redirect(302, '/');
		// Re-derive the team server-side; never trust the client for which project
		// it's allowed to edit.
		const existing = await findTeamSubmissionByMember(locals.user.email);
		if (!existing) throw redirect(302, '/ship/team');

		const form = await request.formData();
		const projectName = String(form.get('projectName') ?? '').trim();
		const playableLink = String(form.get('playableLink') ?? '').trim();
		const githubRepo = String(form.get('githubRepo') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const screenshot = form.get('screenshot');

		const values = { projectName, playableLink, githubRepo, description };
		const errors: Record<string, string> = {};

		if (!projectName) errors.projectName = 'Give your project a name.';

		// Screenshot is optional on edit — keep the existing one if none is supplied —
		// but a replacement still has to fit the upload limit.
		if (screenshot instanceof File && screenshot.size > MAX_SCREENSHOT_BYTES)
			errors.screenshot = 'Screenshot must be under 5 MB.';

		if (!playableLink) errors.playableLink = 'A playable link is required.';
		else if (!isUrl(playableLink)) errors.playableLink = 'Enter a full URL (https://…).';

		if (!githubRepo) errors.githubRepo = 'A GitHub repo link is required.';
		else if (!isUrl(githubRepo)) errors.githubRepo = 'Enter a full URL (https://…).';

		if (!description) errors.description = 'Add a project description.';

		if (Object.keys(errors).length) return fail(400, { errors, values });

		if (!isAirtableConfigured()) {
			return fail(503, {
				values,
				errors: { form: 'Editing is not configured on the server yet (missing AIRTABLE_TOKEN).' }
			});
		}

		// Write back to the canonical project record — the same one /ship/done and
		// the public vote page read from (resolved via the Teams link, not whatever
		// stub record happens to match this member first).
		let project = null;
		try {
			project = await getTeamProject(existing.teamId);
		} catch {
			// handled by the missing-record guard below
		}
		const recordId = project?.projectRecordId;
		if (!recordId) {
			return fail(502, {
				values,
				errors: { form: 'Could not find your project to edit. Please try again.' }
			});
		}

		const fields: Record<string, string | number> = {
			'Project Name': projectName,
			'Code URL': githubRepo,
			'Playable URL': playableLink,
			Description: description
		};
		const ghUser = parseGithubUsername(githubRepo);
		if (ghUser) fields['GitHub Username'] = ghUser;

		try {
			await updateSubmission(recordId, fields);
		} catch (e) {
			// Log the raw Airtable error server-side; keep the user message generic.
			console.error('updateSubmission (edit) failed:', e);
			return fail(502, {
				values,
				errors: { form: 'Could not save your changes. Please try again.' }
			});
		}

		// Best-effort screenshot replacement — only when a new file was provided.
		if (screenshot instanceof File && screenshot.size > 0 && screenshot.size <= MAX_SCREENSHOT_BYTES) {
			try {
				const buf = Buffer.from(await screenshot.arrayBuffer());
				await uploadScreenshot(recordId, {
					base64: buf.toString('base64'),
					contentType: screenshot.type || 'image/png',
					filename: screenshot.name || 'screenshot.png'
				});
			} catch (e) {
				console.error('uploadScreenshot (edit) failed:', e);
			}
		}

		// Bust the read-through cache so the edit shows up right away.
		invalidateTeamProject(existing.teamId);

		throw redirect(303, '/ship/done');
	}
};
