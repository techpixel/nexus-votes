import { env } from '$env/dynamic/private';

/**
 * Airtable Web API helpers for the "YSWS - Horizons Nexus" base.
 * Records are written by field NAME (the Airtable create/update API does not
 * accept field IDs in the request body). Attachments use the content API,
 * which DOES accept a field id or name in the URL.
 * Token needs the `data.records:write` scope and access to the base.
 */
const API_BASE = 'https://api.airtable.com/v0';
const CONTENT_BASE = 'https://content.airtable.com/v0';

// Defaults point at the live base/table; override via env if needed.
const DEFAULT_BASE_ID = 'app9SfJm8LOTJKm0A';
const DEFAULT_TABLE_ID = 'tbllB2MlHnfep54wK'; // YSWS Project Submission
const SCREENSHOT_FIELD_ID = 'fldMnSOtD7OzUe0ok'; // "Screenshot" attachment field
const CARDS_PHOTO_FIELD_ID = 'fld0eJt2Uo5Xj0WLG'; // "Cards Photo" attachment field
const TEAMS_TABLE_ID = 'tblwHPGJKjVTWvK2I'; // "Teams" table
const VOTES_TABLE_ID = 'tbltm7bzBcivRfgIW'; // "Votes" table
const USERS_TABLE_ID = 'tblLsdMMbx5T5L9S2'; // "Users" table

function config() {
	const token = env.AIRTABLE_TOKEN;
	const baseId = env.AIRTABLE_BASE_ID || DEFAULT_BASE_ID;
	const tableId = env.AIRTABLE_TABLE_ID || DEFAULT_TABLE_ID;
	return { token, baseId, tableId };
}

export function isAirtableConfigured(): boolean {
	return Boolean(env.AIRTABLE_TOKEN);
}

/**
 * Escape a value before interpolating it into an Airtable `filterByFormula`
 * string literal. Escapes backslashes first, then single quotes, so an
 * attacker-controlled value cannot break out of the quoted literal and inject
 * formula logic. Callers must still wrap the result in single quotes.
 */
function escapeFormula(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export type SubmissionFields = Record<string, string | number>;

export async function createSubmission(fields: SubmissionFields): Promise<{ id: string }> {
	const { token, baseId, tableId } = config();
	const res = await fetch(`${API_BASE}/${baseId}/${tableId}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ fields, typecast: true })
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Airtable create failed (${res.status}): ${text}`);
	}
	return (await res.json()) as { id: string };
}

export interface ExistingSubmission {
	recordId: string;
	teamId: string;
	projectName: string;
}

/**
 * Find a submission this person already belongs to — either as the submitter
 * (`Email`) or as a listed teammate (`Team Members`). Enforces one ship per
 * person/team. Fails open (returns null) when unconfigured or on error, so a
 * transient Airtable problem can't lock everyone out of shipping.
 */
export async function findTeamSubmissionByMember(
	email: string
): Promise<ExistingSubmission | null> {
	if (!isAirtableConfigured()) return null;
	const { token, baseId, tableId } = config();
	const needle = email.trim().toLowerCase();
	if (!needle) return null;

	const esc = escapeFormula(needle);
	// Coarse server-side filter; FIND is a substring match, so we confirm exact
	// line membership in JS below to avoid e.g. "an@x.com" matching "joan@x.com".
	const formula = encodeURIComponent(
		`OR(LOWER({Email})='${esc}', FIND('${esc}', LOWER({Team Members})))`
	);
	const fields = ['Project Name', 'Team ID', 'Team Members', 'Email']
		.map((f) => `fields%5B%5D=${encodeURIComponent(f)}`)
		.join('&');

	try {
		const res = await fetch(
			`${API_BASE}/${baseId}/${tableId}?pageSize=100&filterByFormula=${formula}&${fields}`,
			{ headers: { Authorization: `Bearer ${token}` } }
		);
		if (!res.ok) return null;
		const data = (await res.json()) as {
			records?: Array<{ id: string; fields: Record<string, unknown> }>;
		};
		for (const r of data.records ?? []) {
			const f = r.fields;
			const submitter = String(f['Email'] ?? '').trim().toLowerCase();
			const members = String(f['Team Members'] ?? '')
				.split(/[\n,]+/)
				.map((s) => s.trim().toLowerCase())
				.filter(Boolean);
			if (submitter === needle || members.includes(needle)) {
				return {
					recordId: r.id,
					teamId: String(f['Team ID'] ?? ''),
					projectName: String(f['Project Name'] ?? '')
				};
			}
		}
		return null;
	} catch {
		return null;
	}
}

/** Next sequential team id (max existing + 1) — used for the short vote URL /<id>. */
export async function nextTeamId(): Promise<string> {
	const { token, baseId } = config();
	let max = 0;
	let offset: string | undefined;
	for (let page = 0; page < 50; page++) {
		const url =
			`${API_BASE}/${baseId}/${TEAMS_TABLE_ID}?pageSize=100&fields%5B%5D=Team%20ID` +
			(offset ? `&offset=${encodeURIComponent(offset)}` : '');
		const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
		if (!res.ok) break;
		const data = (await res.json()) as {
			records?: Array<{ fields: Record<string, unknown> }>;
			offset?: string;
		};
		for (const r of data.records ?? []) {
			const n = parseInt(String(r.fields['Team ID'] ?? ''), 10);
			if (!Number.isNaN(n) && n > max) max = n;
		}
		offset = data.offset;
		if (!offset) break;
	}
	return String(max + 1);
}

/**
 * Whether a Teams row already claims this Team ID. Used to keep the chosen team
 * numbers (and therefore the short vote URLs /<id>) unique. Fails open (returns
 * false) when unconfigured or on error, so a transient Airtable problem can't
 * block someone from shipping.
 */
export async function isTeamIdTaken(teamId: string): Promise<boolean> {
	if (!isAirtableConfigured()) return false;
	const { token, baseId } = config();
	const formula = encodeURIComponent(`{Team ID}='${escapeFormula(teamId)}'`);
	try {
		const res = await fetch(
			`${API_BASE}/${baseId}/${TEAMS_TABLE_ID}?maxRecords=1&fields%5B%5D=Team%20ID&filterByFormula=${formula}`,
			{ headers: { Authorization: `Bearer ${token}` } }
		);
		if (!res.ok) return false;
		const data = (await res.json()) as { records?: unknown[] };
		return (data.records?.length ?? 0) > 0;
	} catch {
		return false;
	}
}

export interface TeamProject {
	/** Teams-table record id — used to link a vote to this team */
	recordId: string;
	teamId: string;
	projectName: string;
	members: string[];
	screenshotUrl?: string;
	/** raw card codes, e.g. ["AS", "QH", "5S"] */
	cards: string[];
}

// ---- in-memory team/project cache ----
// The vote page /<teamId> is the hot read path: when voting opens, many people
// load the same few team pages at once, and each miss costs two sequential
// Airtable calls. Project data is effectively immutable during voting, so a
// short read-through cache (single-flight + negative caching) collapses a burst
// of identical loads into one round-trip. Per-process only (serverless instances
// don't share it); the short TTL also lets a rare late edit surface on its own.
const TEAM_CACHE_TTL_MS = 60 * 1000;
const teamCache = new Map<string, { value: TeamProject | null; at: number }>();
const teamInflight = new Map<string, Promise<TeamProject | null>>();

/** Look up a team by its (sequential) Team ID and return its linked project. */
export async function getTeamProject(teamId: string): Promise<TeamProject | null> {
	const cached = teamCache.get(teamId);
	if (cached && Date.now() - cached.at < TEAM_CACHE_TTL_MS) return cached.value;

	const existing = teamInflight.get(teamId);
	if (existing) return existing;

	// Only resolved values (including a legitimate `null` not-found) are cached;
	// thrown transient errors clear the in-flight slot and are retried next call.
	const p = fetchTeamProject(teamId)
		.then((value) => {
			teamCache.set(teamId, { value, at: Date.now() });
			return value;
		})
		.finally(() => teamInflight.delete(teamId));
	teamInflight.set(teamId, p);
	return p;
}

async function fetchTeamProject(teamId: string): Promise<TeamProject | null> {
	const { token, baseId, tableId } = config();
	const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

	const formula = encodeURIComponent(`{Team ID}='${escapeFormula(teamId)}'`);
	const teamRes = await fetch(
		`${API_BASE}/${baseId}/${TEAMS_TABLE_ID}?maxRecords=1&filterByFormula=${formula}`,
		{ headers }
	);
	if (!teamRes.ok) throw new Error(`Team lookup failed (${teamRes.status})`);
	const teamData = (await teamRes.json()) as {
		records?: Array<{ id: string; fields: Record<string, unknown> }>;
	};
	const team = teamData.records?.[0];
	if (!team) return null;

	const projectIds = (team.fields['Project'] as string[] | undefined) ?? [];
	if (!projectIds.length) return null;

	const projRes = await fetch(`${API_BASE}/${baseId}/${tableId}/${projectIds[0]}`, { headers });
	if (!projRes.ok) throw new Error(`Project fetch failed (${projRes.status})`);
	const proj = (await projRes.json()) as { fields: Record<string, unknown> };
	const f = proj.fields;

	const attachments = (f['Screenshot'] as Array<{ url?: string }> | undefined) ?? [];
	return {
		recordId: team.id,
		teamId,
		projectName: (f['Project Name'] as string) ?? 'Untitled project',
		members: String(f['Team Members'] ?? '')
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean),
		screenshotUrl: attachments[0]?.url,
		cards: String(f['Cards'] ?? '')
			.split(/\s+/)
			.map((s) => s.trim())
			.filter(Boolean)
	};
}

/** Create a Teams row linked to a project submission record. */
export async function createTeam(opts: {
	teamId: string;
	members: string[];
	projectRecordId: string;
}): Promise<{ id: string }> {
	const { token, baseId } = config();
	const res = await fetch(`${API_BASE}/${baseId}/${TEAMS_TABLE_ID}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			fields: {
				'Team ID': opts.teamId,
				Members: opts.members.join('\n'),
				Project: [opts.projectRecordId]
			},
			typecast: true
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Airtable team create failed (${res.status}): ${text}`);
	}
	return (await res.json()) as { id: string };
}

/** Record a vote (one row per submission), linked to the team being voted on. */
export async function createVote(opts: {
	voteId: string;
	teamRecordId: string;
	voter: string;
	ratings: string;
	average: number;
	submittedAt: string;
}): Promise<void> {
	const { token, baseId } = config();
	const res = await fetch(`${API_BASE}/${baseId}/${VOTES_TABLE_ID}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			fields: {
				'Vote ID': opts.voteId,
				Team: [opts.teamRecordId],
				Voter: opts.voter,
				Ratings: opts.ratings,
				'Average Rating': opts.average,
				'Submitted At': opts.submittedAt
			},
			typecast: true
		})
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Airtable vote create failed (${res.status}): ${text}`);
	}
}

/**
 * Every team record id this voter has already voted for. The `Team` link field
 * comes back from the REST API as an array of record ids, so we filter by
 * `Voter` server-side and collect the linked teams. This is the durable source
 * of truth used to hydrate the in-memory dedupe cache (see vote-cache.ts), so —
 * unlike most helpers here — it *throws* on a real Airtable error and lets the
 * cache decide to fail open and retry. Returns [] when unconfigured.
 */
export async function listVotesByVoter(voter: string): Promise<string[]> {
	if (!isAirtableConfigured()) return [];
	const needle = voter.trim().toLowerCase();
	if (!needle) return [];
	const { token, baseId } = config();
	const formula = encodeURIComponent(`LOWER({Voter})='${escapeFormula(needle)}'`);
	const teamRecordIds: string[] = [];
	let offset: string | undefined;
	for (let page = 0; page < 50; page++) {
		const url =
			`${API_BASE}/${baseId}/${VOTES_TABLE_ID}?pageSize=100&filterByFormula=${formula}&fields%5B%5D=Team` +
			(offset ? `&offset=${encodeURIComponent(offset)}` : '');
		const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
		if (!res.ok) throw new Error(`Votes lookup failed (${res.status})`);
		const data = (await res.json()) as {
			records?: Array<{ fields: { Team?: string[] } }>;
			offset?: string;
		};
		for (const r of data.records ?? []) {
			for (const id of r.fields.Team ?? []) teamRecordIds.push(id);
		}
		offset = data.offset;
		if (!offset) break;
	}
	return teamRecordIds;
}

/** Update fields on an existing submission record. */
export async function updateSubmission(recordId: string, fields: SubmissionFields): Promise<void> {
	const { token, baseId, tableId } = config();
	const res = await fetch(`${API_BASE}/${baseId}/${tableId}/${recordId}`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ fields, typecast: true })
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Airtable update failed (${res.status}): ${text}`);
	}
}

export interface UploadFile {
	base64: string;
	contentType: string;
	filename: string;
}

/**
 * Upload an image to an attachment field of an existing record.
 * Uses the Airtable content "uploadAttachment" endpoint (accepts base64).
 */
export async function uploadAttachment(
	recordId: string,
	fieldId: string,
	file: UploadFile
): Promise<void> {
	const { token, baseId } = config();
	const res = await fetch(
		`${CONTENT_BASE}/${baseId}/${recordId}/${fieldId}/uploadAttachment`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				contentType: file.contentType,
				file: file.base64,
				filename: file.filename
			})
		}
	);

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Airtable attachment upload failed (${res.status}): ${text}`);
	}
}

export const uploadScreenshot = (recordId: string, file: UploadFile) =>
	uploadAttachment(recordId, SCREENSHOT_FIELD_ID, file);

export const uploadCardsPhoto = (recordId: string, file: UploadFile) =>
	uploadAttachment(recordId, CARDS_PHOTO_FIELD_ID, file);

export interface UserUpsert {
	/** Hack Club identity id — the unique key for the Users table */
	hackClubId: string;
	email: string;
	firstName?: string;
	lastName?: string;
	slackId?: string;
	yswsEligible?: boolean;
}

/**
 * Record/refresh a voter in the Users table on sign-in. Matches on the unique
 * `Hack Club ID`: for a returning user it bumps `Last Seen` (and refreshes the
 * profile fields in case they changed); for a new one it creates a row with
 * `First Seen` + `Last Seen`. Fails open (logs and returns) so a transient
 * Airtable problem can never block sign-in.
 */
export async function upsertUser(user: UserUpsert): Promise<void> {
	if (!isAirtableConfigured()) return;
	const id = user.hackClubId?.trim();
	if (!id) return;

	const { token, baseId } = config();
	const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
	const now = new Date().toISOString();

	// Fields that should always reflect the latest identity from Hack Club.
	const profile = {
		Email: user.email,
		'First Name': user.firstName ?? '',
		'Last Name': user.lastName ?? '',
		'Slack ID': user.slackId ?? '',
		'YSWS Eligible': Boolean(user.yswsEligible)
	};

	try {
		const formula = encodeURIComponent(`{Hack Club ID}='${escapeFormula(id)}'`);
		const findRes = await fetch(
			`${API_BASE}/${baseId}/${USERS_TABLE_ID}?maxRecords=1&filterByFormula=${formula}`,
			{ headers: { Authorization: `Bearer ${token}` } }
		);
		const existing = findRes.ok
			? ((await findRes.json()) as { records?: Array<{ id: string }> }).records?.[0]
			: undefined;

		if (existing) {
			await fetch(`${API_BASE}/${baseId}/${USERS_TABLE_ID}/${existing.id}`, {
				method: 'PATCH',
				headers,
				body: JSON.stringify({ fields: { ...profile, 'Last Seen': now }, typecast: true })
			});
		} else {
			await fetch(`${API_BASE}/${baseId}/${USERS_TABLE_ID}`, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					fields: { 'Hack Club ID': id, ...profile, 'First Seen': now, 'Last Seen': now },
					typecast: true
				})
			});
		}
	} catch (err) {
		console.error('upsertUser failed:', err);
	}
}
