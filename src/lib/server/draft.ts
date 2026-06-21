import { sealJSON, unsealJSON } from '$lib/server/secure-cookie';

/**
 * Short-lived signed cookie that carries an in-progress submission between the
 * two ship steps (/ship → /ship/cards). It just references the Airtable record
 * created in step 1, so step 2 can augment it with cards.
 */
export interface ShipDraft {
	/** team emails collected in the Team step (incl. the submitter) */
	teamMembers?: string[];
	/** team number chosen in the Team step — becomes the Team ID / short vote URL */
	teamId?: string;
	/** set once the project record is created in the Ship step */
	recordId?: string;
	projectName?: string;
	/**
	 * One submission record per teammate, created in the Ship step. The Hours step
	 * (/ship/hours) patches each with that person's hours + Hackatime project. The
	 * submitter is always first.
	 */
	memberRecords?: { email: string; recordId: string }[];
	/** unix seconds */
	exp: number;
}

export const DRAFT_COOKIE = 'nexus_ship_draft';
const MAX_AGE_SECONDS = 60 * 60; // 1 hour to finish the cards step

export function sealDraft(draft: Omit<ShipDraft, 'exp'>): string {
	const payload: ShipDraft = { ...draft, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
	return sealJSON(payload);
}

export function unsealDraft(token: string | undefined): ShipDraft | null {
	const draft = unsealJSON<ShipDraft>(token);
	if (!draft) return null;
	if (!draft.exp || draft.exp < Math.floor(Date.now() / 1000)) return null;
	return draft;
}

export const DRAFT_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	maxAge: MAX_AGE_SECONDS
};
