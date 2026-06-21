import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchAttendeesBySlack, isHorizonsConfigured } from '$lib/server/horizons';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Sign in first');
	if (!isHorizonsConfigured()) throw error(503, 'Horizons directory is not configured.');

	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 2) return json({ results: [] });

	const results = await searchAttendeesBySlack(q, 8);
	// Expose only an opaque record id as the teammate handle — never the email.
	// The submit action resolves the id back to a directory record server-side.
	return json({
		results: results.map((a) => ({
			id: a.recordId,
			name: a.name,
			slackId: a.slackId,
			slackUsername: a.slackUsername
		}))
	});
};
