import { env } from '$env/dynamic/private';

/**
 * Read-only access to the Horizons attendee directory (a separate Airtable base)
 * so team members can be searched/validated by Slack username. Uses its own
 * token, HORIZONS_AIRTABLE_TOKEN.
 *
 * The whole directory is fetched once and cached in memory (10 min TTL), so the
 * typeahead dropdown filters locally instead of calling Airtable per keystroke.
 */
const API = 'https://api.airtable.com/v0';
const BASE = 'appu6QWWhuLT2kdEF';
const TABLE = 'tbl5tq0FZ1k0vToOJ';
const VIEW = 'viwVuATC6UPzcHNmt';
const CACHE_TTL_MS = 10 * 60 * 1000;

export interface HorizonsAttendee {
	recordId: string;
	email: string;
	slackUsername?: string;
	/** display label — Badge Name (real name) if known, else Slack username, else email */
	name: string;
	slackId?: string;
	horizonsUserId?: number;
}

export function isHorizonsConfigured(): boolean {
	return Boolean(env.HORIZONS_AIRTABLE_TOKEN);
}

function token(): string {
	const t = env.HORIZONS_AIRTABLE_TOKEN;
	if (!t) throw new Error('HORIZONS_AIRTABLE_TOKEN is not set');
	return t;
}

type Rec = { id: string; fields: Record<string, unknown> };

function toAttendee(rec: Rec): HorizonsAttendee {
	const f = rec.fields;
	const str = (k: string) => (typeof f[k] === 'string' ? (f[k] as string) : undefined);
	const email = (str('Email') ?? '').toLowerCase();
	const slackUsername = str('Slack Username');
	// "Badge Name" is a lookup (array) holding the person's real name — preferred display.
	const badgeRaw = f['Badge Name'];
	const badgeName = (
		Array.isArray(badgeRaw) ? String(badgeRaw[0] ?? '') : String(badgeRaw ?? '')
	).trim();
	return {
		recordId: rec.id,
		email,
		slackUsername,
		name: badgeName || slackUsername || email,
		slackId: str('Slack ID'),
		horizonsUserId: typeof f['Horizons User ID'] === 'number' ? (f['Horizons User ID'] as number) : undefined
	};
}

// ---- in-memory directory cache ----
let directory: HorizonsAttendee[] | null = null;
let fetchedAt = 0;
let inflight: Promise<HorizonsAttendee[]> | null = null;

async function fetchAllAttendees(): Promise<HorizonsAttendee[]> {
	const all: HorizonsAttendee[] = [];
	let offset: string | undefined;
	const fields = ['Slack Username', 'Email', 'Slack ID', 'Horizons User ID', 'Badge Name']
		.map((f) => `&fields%5B%5D=${encodeURIComponent(f)}`)
		.join('');

	// page through the view (100/page); cap pages as a runaway guard
	for (let page = 0; page < 100; page++) {
		const url =
			`${API}/${BASE}/${TABLE}?pageSize=100&view=${VIEW}${fields}` +
			(offset ? `&offset=${encodeURIComponent(offset)}` : '');
		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${token()}`, Accept: 'application/json' }
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Horizons directory fetch failed (${res.status}): ${text}`);
		}
		const data = (await res.json()) as { records?: Rec[]; offset?: string };
		for (const rec of data.records ?? []) {
			const a = toAttendee(rec);
			if (a.email) all.push(a);
		}
		offset = data.offset;
		if (!offset) break;
	}
	return all;
}

async function getDirectory(): Promise<HorizonsAttendee[]> {
	if (directory && Date.now() - fetchedAt < CACHE_TTL_MS) return directory;
	if (inflight) return inflight;
	inflight = fetchAllAttendees()
		.then((d) => {
			directory = d;
			fetchedAt = Date.now();
			inflight = null;
			return d;
		})
		.catch((e) => {
			inflight = null;
			throw e;
		});
	return inflight;
}

/** Typeahead search by display name or Slack username (substring), from cache. */
export async function searchAttendeesBySlack(q: string, limit = 8): Promise<HorizonsAttendee[]> {
	const term = q.trim().toLowerCase();
	if (term.length < 2) return [];
	const dir = await getDirectory();
	const matches = dir.filter(
		(a) => a.name.toLowerCase().includes(term) || a.slackUsername?.toLowerCase().includes(term)
	);
	matches.sort((a, b) => {
		const ap = a.name.toLowerCase().startsWith(term) ? 0 : 1;
		const bp = b.name.toLowerCase().startsWith(term) ? 0 : 1;
		return ap - bp || a.name.localeCompare(b.name);
	});
	return matches.slice(0, limit);
}

/** Exact lookup by email (server-side validation), from cache. */
export async function lookupAttendeeByEmail(email: string): Promise<HorizonsAttendee | null> {
	const clean = email.trim().toLowerCase();
	if (!clean) return null;
	const dir = await getDirectory();
	return dir.find((a) => a.email === clean) ?? null;
}
