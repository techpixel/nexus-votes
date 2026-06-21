import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getShipStats } from '$lib/server/airtable';

// JSON feed for the /dash scoreboard's client-side polling. Fails open to
// `null` so a transient Airtable hiccup leaves the last-shown counts in place
// rather than blanking the display. Reads through the same 30s server cache.
export const GET: RequestHandler = async () => {
	try {
		return json({ stats: await getShipStats() });
	} catch {
		return json({ stats: null });
	}
};
