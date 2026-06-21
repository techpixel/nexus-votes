<script lang="ts">
	// Balatro-style wavy text, ported from the nexus_cards prototype
	// (carnival_kaplay balatroTextAnim): each character gets a per-index sine bob
	// plus a gentle fan tilt, updated every frame.
	let { text }: { text: string } = $props();

	const chars = $derived([...text]);
	let spans = $state<(HTMLSpanElement | undefined)[]>([]);

	const WAVE_SPEED = 1.4; // a touch faster than wall-clock — lively but subtle
	const WAVE_K = 1.35; // phase step per character (shorter wavelength = higher)

	$effect(() => {
		const len = spans.length;
		const start = performance.now();
		let raf = requestAnimationFrame(function tick(now) {
			const t = ((now - start) / 1000) * WAVE_SPEED;
			for (let i = 0; i < len; i++) {
				const el = spans[i];
				if (!el) continue;
				const phase = t + i * WAVE_K;
				// clamp the static fan so long headings don't over-tilt on mobile
				const fan = Math.max(-7, Math.min(7, i - len / 2));
				const angle = Math.sin(phase / 2) * 1.5 + fan;
				const y = Math.sin(phase) + 1.5;
				el.style.transform = `translateY(${y}px) rotate(${angle}deg)`;
			}
			raf = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(raf);
	});
</script>

<span class="wave" aria-label={text}>
	{#each chars as ch, i (i)}
		<span class="wave-char" bind:this={spans[i]} aria-hidden="true">{ch === ' ' ? ' ' : ch}</span>
	{/each}
</span>

<style>
	.wave {
		display: inline-block;
	}
	.wave-char {
		display: inline-block;
		will-change: transform;
	}
</style>
