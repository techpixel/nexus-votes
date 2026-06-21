import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Shipping a NEW project is open by default and closed only when
 * SHIPPING_ENABLED is explicitly set to a falsy value ("false", "0", "off",
 * "no"). Editing an already-shipped project is governed separately by
 * EDITING_ENABLED, so locking new ships never strands a team mid-edit. Reading
 * from $env/dynamic/private lets HQ close submissions after a deadline by
 * flipping the env var and restarting — no rebuild needed.
 */
export function isShippingEnabled(): boolean {
	const raw = env.SHIPPING_ENABLED?.trim().toLowerCase();
	if (!raw) return true;
	return !['false', '0', 'off', 'no'].includes(raw);
}

/**
 * Block a fresh ship when shipping is closed, sending the user to the
 * read-only "shipping is closed" screen. Only fires for new ships — editing an
 * existing project walks the same steps and must stay open (it has its own
 * EDITING_ENABLED gate) — so it's safe to call at the top of every ship step's
 * load + action alongside guardAlreadyShipped. Covers stale drafts if the flag
 * is flipped mid-session.
 */
export function guardShippingDisabled(editing: boolean | undefined): void {
	if (!editing && !isShippingEnabled()) throw redirect(303, '/ship/closed');
}
