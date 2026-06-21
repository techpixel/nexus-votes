import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { updateSubmission, isAirtableConfigured } from '$lib/server/airtable';
import { lookupAttendeeByEmail } from '$lib/server/horizons';
import { DRAFT_COOKIE, DRAFT_COOKIE_OPTIONS, sealDraft, unsealDraft } from '$lib/server/draft';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) throw redirect(302, '/');
	// This step only makes sense once the project + per-member records exist.
	// (No already-shipped guard here: the records already exist by now, so the
	// guard would bounce the submitter straight to /ship/done.)
	const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
	if (!draft?.recordId || !draft.memberRecords?.length) throw redirect(302, '/ship');

	const you = locals.user.email.trim().toLowerCase();
	// Resolve a friendly display name per member from the (cached) Horizons
	// directory. The browser only ever receives a display name + the opaque record
	// id (used as a key + to patch the row by index) — never the email. If the
	// lookup misses, fall back to the email's local-part so no full address ships.
	const members = await Promise.all(
		draft.memberRecords.map(async (m) => {
			let name = m.email.split('@')[0];
			try {
				const attendee = await lookupAttendeeByEmail(m.email);
				if (attendee?.name) name = attendee.name;
			} catch {
				/* keep the local-part fallback */
			}
			return {
				id: m.recordId,
				name,
				isYou: m.email.trim().toLowerCase() === you,
				// Prefill the saved values when editing (empty on a fresh ship).
				hours: m.hours ?? '',
				hackatime: m.hackatime ?? ''
			};
		})
	);

	return {
		user: locals.user,
		projectName: draft.projectName ?? '',
		members,
		editing: Boolean(draft.editing)
	};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		if (!locals.user) throw redirect(302, '/');
		const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
		if (!draft?.recordId || !draft.memberRecords?.length) throw redirect(302, '/ship');

		const form = await request.formData();
		const members = draft.memberRecords;

		// Read each member's row by index (the form renders them in the same order
		// as draft.memberRecords, so we never trust client-supplied record ids).
		const hoursValues: string[] = [];
		const hackatimeValues: string[] = [];
		const errors: Record<string, string> = {};
		const patches: { recordId: string; fields: Record<string, string | number> }[] = [];

		members.forEach((m, i) => {
			const hoursRaw = String(form.get(`hours_${i}`) ?? '').trim();
			const hackatime = String(form.get(`hackatime_${i}`) ?? '').trim();
			hoursValues[i] = hoursRaw;
			hackatimeValues[i] = hackatime;

			const fields: Record<string, string | number> = {};
			if (hoursRaw === '') {
				errors[`hours_${i}`] = 'Enter hours.';
			} else {
				const hours = Number(hoursRaw);
				if (Number.isNaN(hours) || hours < 0) errors[`hours_${i}`] = 'Enter a number.';
				else fields['Optional - Override Hours Spent'] = hours;
			}
			if (hackatime) fields['Hackatime Project Name'] = hackatime;

			patches.push({ recordId: m.recordId, fields });
		});

		const values = { hours: hoursValues, hackatime: hackatimeValues };
		if (Object.keys(errors).length) return fail(400, { errors, values });

		if (!isAirtableConfigured()) {
			return fail(503, {
				values,
				errors: { form: 'Submissions are not configured on the server yet (missing AIRTABLE_TOKEN).' }
			});
		}

		// Patches are independent per record; re-submitting overwrites with the same
		// values (idempotent), so surfacing a failure and letting the user retry is safe.
		const results = await Promise.allSettled(
			patches.map((p) => updateSubmission(p.recordId, p.fields))
		);
		const failed = results.filter((r) => r.status === 'rejected');
		if (failed.length) {
			for (const r of failed) console.error('updateSubmission (hours) failed:', (r as PromiseRejectedResult).reason);
			return fail(502, {
				values,
				errors: { form: 'Could not save everyone’s hours. Please try again.' }
			});
		}

		// Carry the submitter's record forward for the final cards step. Fold the
		// just-saved hours/Hackatime back into memberRecords so going Back here
		// re-prefills them, and preserve the edit context if we're editing.
		const memberRecords = members.map((m, i) => ({
			email: m.email,
			recordId: m.recordId,
			hours: hoursValues[i],
			hackatime: hackatimeValues[i]
		}));
		cookies.set(
			DRAFT_COOKIE,
			sealDraft({
				editing: draft.editing,
				teamId: draft.teamId,
				teamRecordId: draft.teamRecordId,
				recordId: draft.recordId,
				projectName: draft.projectName,
				teamMembers: draft.teamMembers,
				memberRecords
			}),
			DRAFT_COOKIE_OPTIONS
		);
		throw redirect(303, '/ship/cards');
	}
};
