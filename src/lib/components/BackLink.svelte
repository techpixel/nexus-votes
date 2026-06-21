<script lang="ts">
	// A subtle "← Back" link for the multi-step ship flow. Navigation only (a plain
	// GET to the previous step) — it never re-runs a form action, so going back is
	// always safe. Each previous step re-prefills itself from the draft cookie.
	let { href, label = 'Back' }: { href: string; label?: string } = $props();
</script>

<a class="back" {href}>
	<svg
		viewBox="0 0 16 16"
		width="14"
		height="14"
		aria-hidden="true"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M10 3 L5 8 L10 13" />
	</svg>
	<span>{label}</span>
</a>

<style>
	.back {
		display: inline-flex;
		align-self: flex-start;
		align-items: center;
		gap: 5px;
		font-size: 13px;
		color: var(--muted);
		transition: color 0.12s ease;
	}
	.back:hover {
		color: #fff;
	}
	.back svg {
		display: block;
	}
</style>
