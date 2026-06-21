import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Editing an already-shipped project is allowed by default and disabled only
 * when EDITING_ENABLED is explicitly set to a falsy value ("false", "0", "off",
 * "no"). Reading from $env/dynamic/private lets HQ lock submissions after a
 * deadline by flipping the env var and restarting — no rebuild needed.
 */
export function isEditingEnabled(): boolean {
	const raw = env.EDITING_ENABLED?.trim().toLowerCase();
	if (!raw) return true;
	return !['false', '0', 'off', 'no'].includes(raw);
}

/**
 * Bounce an in-flight edit session back to the read-only summary when editing
 * is disabled. Only fires for edit drafts — a fresh ship walks the same steps
 * and must not be blocked — so it's safe to call at the top of every ship
 * step's load + action. Covers stale `editing` cookies if the flag is flipped
 * mid-session; the /ship/edit entry point is the primary block.
 */
export function guardEditingDisabled(editing: boolean | undefined): void {
	if (editing && !isEditingEnabled()) throw redirect(303, '/ship/done');
}
