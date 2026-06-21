import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { updateSubmission, uploadCardsPhoto, isAirtableConfigured } from '$lib/server/airtable';
import { DRAFT_COOKIE, unsealDraft } from '$lib/server/draft';
import {
	cardsFromCodes,
	bestHandIndex,
	handOptions,
	handIndexByName,
	handName
} from '$lib/cards';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB (Airtable inline upload limit)

export const load: PageServerLoad = ({ locals, cookies }) => {
	if (!locals.user) throw redirect(302, '/');
	// This step only makes sense once the project record has been created.
	const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
	if (!draft?.recordId) throw redirect(302, '/ship');
	return { user: locals.user, projectName: draft.projectName ?? '' };
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		if (!locals.user) throw redirect(302, '/');
		const draft = unsealDraft(cookies.get(DRAFT_COOKIE));
		if (!draft?.recordId) throw redirect(302, '/ship');

		const form = await request.formData();
		const cards = String(form.get('cards') ?? '').trim();
		const requestedHand = String(form.get('playedHand') ?? '').trim();
		const photo = form.get('cardsPhoto');

		if (!cards) return fail(400, { error: 'Add at least one card to your hand.' });

		// Resolve the chosen hand server-side: honour the player's pick only if it's
		// actually formable from the submitted cards; otherwise fall back to the best
		// hand. Never trust the client's hand label blindly.
		const handCards = cardsFromCodes(cards.split(/\s+/).filter(Boolean));
		const formable = handOptions(handCards);
		const requestedIdx = handIndexByName(requestedHand);
		const chosenIdx = formable.includes(requestedIdx) ? requestedIdx : bestHandIndex(handCards);
		const playedHand = chosenIdx >= 0 ? handName(chosenIdx) : '';

		if (!isAirtableConfigured()) {
			return fail(503, { error: 'Submissions are not configured on the server yet (missing AIRTABLE_TOKEN).' });
		}

		try {
			await updateSubmission(draft.recordId, { Cards: cards, 'Played Hand': playedHand });
		} catch (e) {
			// Log server-side; don't surface raw Airtable error text to the client.
			console.error('updateSubmission (cards) failed:', e);
			return fail(502, { error: 'Could not save your cards. Please try again.' });
		}

		let photoWarning: string | undefined;
		if (photo instanceof File && photo.size > 0) {
			if (photo.size > MAX_PHOTO_BYTES) {
				photoWarning = 'Your cards were saved, but the photo was too large to upload (5 MB max).';
			} else {
				try {
					const buf = Buffer.from(await photo.arrayBuffer());
					await uploadCardsPhoto(draft.recordId, {
						base64: buf.toString('base64'),
						contentType: photo.type || 'image/png',
						filename: photo.name || 'cards.png'
					});
				} catch (e) {
					console.error('uploadCardsPhoto failed:', e);
					photoWarning = 'Your cards were saved, but the photo failed to upload.';
				}
			}
		}

		cookies.delete(DRAFT_COOKIE, { path: '/' });
		return { success: true, projectName: draft.projectName ?? 'Your project', photoWarning };
	}
};
