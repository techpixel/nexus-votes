import { env } from '$env/dynamic/private';

/**
 * Voting is open by default and closed only when VOTING_ENABLED is explicitly
 * set to a falsy value ("false", "0", "off", "no"). Reading from
 * $env/dynamic/private means HQ can close voting after the judging window by
 * flipping the env var and restarting — no rebuild needed.
 */
export function isVotingEnabled(): boolean {
	const raw = env.VOTING_ENABLED?.trim().toLowerCase();
	if (!raw) return true;
	return !['false', '0', 'off', 'no'].includes(raw);
}
