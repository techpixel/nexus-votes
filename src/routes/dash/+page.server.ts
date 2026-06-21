import type { PageServerLoad } from './$types';
import { getShipStats } from '$lib/server/airtable';

// Public scoreboard. Fails open to `null` so a transient Airtable hiccup shows
// a placeholder ("—") rather than erroring out the whole display.
export const load: PageServerLoad = async () => {
	try {
		return { stats: await getShipStats() };
	} catch {
		return { stats: null };
	}
};
