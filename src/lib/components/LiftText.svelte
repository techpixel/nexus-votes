<script lang="ts">
	// "4 letter lift" — ported verbatim from the nexus_cards prototype
	// (liftText/updateLift). |sin((π/4)·idx)|^32 puts a narrow peak every 4th
	// character (the even power turns both sine humps into peaks, halving the
	// period to 4); the −LIFT_MARCH·t phase marches those bumps along the line.
	// Deliberately its own slow motion, distinct from the faster WaveText sway.
	let { text }: { text: string } = $props();

	const chars = $derived([...text]);
	let spans = $state<(HTMLSpanElement | undefined)[]>([]);

	const LIFT_AMP = 1.5; // px a letter rises at a bump's peak
	const LIFT_MARCH = 0.22; // how fast the bumps march along (lower = slower)

	$effect(() => {
		const len = spans.length;
		if (!len) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let raf = requestAnimationFrame(function tick(now) {
			const t = now / 1000;
			for (let i = 0; i < len; i++) {
				const el = spans[i];
				if (!el) continue;
				const pulse = Math.sin((Math.PI / 4) * (i - LIFT_MARCH * t)) ** 32;
				el.style.transform = `translateY(${-LIFT_AMP * pulse}px)`;
			}
			raf = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(raf);
	});
</script>

<span class="lift" aria-label={text}>
	{#each chars as ch, i (i)}
		<span class="lift-char" bind:this={spans[i]} aria-hidden="true">{ch === ' ' ? ' ' : ch}</span>
	{/each}
</span>

<style>
	.lift {
		display: inline-block;
	}
	.lift-char {
		display: inline-block;
		white-space: pre;
		will-change: transform;
	}
</style>
