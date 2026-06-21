import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createSubmission,
	createTeam,
	nextTeamId,
	uploadScreenshot,
	isAirtableConfigured
} from '$lib/server/airtable';
import { DRAFT_COOKIE, DRAFT_COOKIE_OPTIONS, sealDraft, unsealDraft } from '$lib/server/draft';
import { guardAlreadyShipped } from '$lib/server/ship-guard';

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024; // 5 MB (Airtable inline upload limit)

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/');
	await guardAlreadyShipped(locals.user.email);
	return { user: locals.user };
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
		// Integrity guard: never create a second record for someone whose team
		// has already shipped, even via a stale tab posting straight here.
		await guardAlreadyShipped(locals.user.email);

		const form = await request.formData();
		const projectName = String(form.get('projectName') ?? '').trim();
		const playableLink = String(form.get('playableLink') ?? '').trim();
		const githubRepo = String(form.get('githubRepo') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const hackatime = String(form.get('hackatime') ?? '').trim();
		const hoursRaw = String(form.get('hours') ?? '').trim();
		const howHeard = String(form.get('howHeard') ?? '').trim();
		const doingWell = String(form.get('doingWell') ?? '').trim();
		const improve = String(form.get('improve') ?? '').trim();
		const screenshot = form.get('screenshot');

		const values = {
			projectName,
			playableLink,
			githubRepo,
			description,
			hackatime,
			hours: hoursRaw,
			howHeard,
			doingWell,
			improve
		};
		const errors: Record<string, string> = {};

		// All visible fields are required.
		if (!projectName) errors.projectName = 'Give your project a name.';

		if (!(screenshot instanceof File) || screenshot.size === 0)
			errors.screenshot = 'Add a screenshot of your project.';
		else if (screenshot.size > MAX_SCREENSHOT_BYTES)
			errors.screenshot = 'Screenshot must be under 5 MB.';

		if (!playableLink) errors.playableLink = 'A playable link is required.';
		else if (!isUrl(playableLink)) errors.playableLink = 'Enter a full URL (https://…).';

		if (!githubRepo) errors.githubRepo = 'A GitHub repo link is required.';
		else if (!isUrl(githubRepo)) errors.githubRepo = 'Enter a full URL (https://…).';

		if (!description) errors.description = 'Add a project description.';
		if (!hackatime) errors.hackatime = 'Enter your Hackatime project name.';

		let hours: number | null = null;
		if (hoursRaw === '') {
			errors.hours = 'Enter your estimated hours.';
		} else {
			hours = Number(hoursRaw);
			if (Number.isNaN(hours) || hours < 0) errors.hours = 'Enter a number of hours.';
		}

		if (Object.keys(errors).length) return fail(400, { errors, values });

		if (!isAirtableConfigured()) {
			return fail(503, {
				values,
				errors: { form: 'Submissions are not configured on the server yet (missing AIRTABLE_TOKEN).' }
			});
		}

		// Team details carried over from the Team step (defaults to just the submitter).
		const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
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
		if (hackatime) sharedFields['Hackatime Project Name'] = hackatime;
		if (hours !== null) sharedFields['Optional - Override Hours Spent'] = hours;

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

		// Best-effort screenshot upload — don't block the flow if it fails.
		if (
			screenshot instanceof File &&
			screenshot.size > 0 &&
			screenshot.size <= MAX_SCREENSHOT_BYTES
		) {
			try {
				const buf = Buffer.from(await screenshot.arrayBuffer());
				await uploadScreenshot(recordId, {
					base64: buf.toString('base64'),
					contentType: screenshot.type || 'image/png',
					filename: screenshot.name || 'screenshot.png'
				});
			} catch {
				// record is saved; the screenshot can be re-added later
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
		const teammateEmails = team.filter(
			(e) => e.trim().toLowerCase() !== locals.user!.email.trim().toLowerCase()
		);
		for (const email of teammateEmails) {
			try {
				await createSubmission({ ...sharedFields, Email: email });
			} catch (e) {
				console.error('createSubmission (teammate stub) failed:', e);
			}
		}

		// Hand off to step 2 (add your cards) with a signed reference to the record.
		cookies.set(DRAFT_COOKIE, sealDraft({ recordId, projectName }), DRAFT_COOKIE_OPTIONS);
		throw redirect(303, '/ship/cards');
	}
};
