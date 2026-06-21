<script lang="ts">
	// Decorative background. The home variant is a single full-bleed image;
	// the ship variant keeps the layered Figma composition (1366 x 768), with
	// the .stage sized to COVER the viewport while preserving its ratio.
	let { variant = 'home', gradient = true }: { variant?: 'home' | 'ship'; gradient?: boolean } =
		$props();
</script>

<div class="backdrop {variant}" aria-hidden="true">
	{#if variant === 'home'}
		<img class="home-layer home-bg" src="/art/landing-bg.png" alt="" />
		<img class="home-layer home-mg" src="/art/landing-mg.png" alt="" />
		<img class="home-layer home-fg" src="/art/landing-fg.png" alt="Horizons Nexus" />
		{#if gradient}
			<div class="home-gradient"></div>
		{/if}
	{:else}
		<div class="stage">
			<img class="layer ship-texture" src="/art/art9.webp" alt="" />
			<img class="layer ship-left" src="/art/leftnexus.png" alt="" />
			<img class="layer ship-right" src="/art/rightnexus.png" alt="" />
			<div class="layer scrim"></div>
		</div>
	{/if}
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		overflow: hidden;
		z-index: 0;
		background: #111111;
	}
	.backdrop.ship {
		background: #0d0d0d;
	}

	/* Cover the viewport keeping the 1366:768 design ratio (pure CSS, no JS). */
	.stage {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: max(100vw, calc(100vh * 1366 / 768));
		aspect-ratio: 1366 / 768;
	}

	.layer {
		position: absolute;
		display: block;
		pointer-events: none;
	}
	img.layer {
		object-fit: cover;
	}

	/* ---- HOME ---- */
	/* Three stacked depth layers: doodle texture (back), ray burst (mid),
	   circular Horizons Nexus logo (front focal point). */
	.home-layer {
		position: absolute;
		display: block;
		pointer-events: none;
	}
	.home-bg,
	.home-mg {
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
	}
	/* Rays spiral about their centre — very slow, barely-there drift, matching
	   nexus_cards_html's hero spiral. scale(2) blows the burst well past the
	   edges so it bleeds off the page and the rotation never reveals a gap. */
	.home-mg {
		transform-origin: center;
		will-change: transform;
		animation: homeSpin 240s linear infinite;
	}
	@keyframes homeSpin {
		from {
			transform: rotate(0deg) scale(2);
		}
		to {
			transform: rotate(360deg) scale(2);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.home-mg {
			animation: none;
			transform: scale(2);
		}
	}
	.home-fg {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: min(46vw, 78vh);
		aspect-ratio: 1;
		object-fit: contain;
	}
	.home-gradient {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(to top, #000 13.462%, rgba(0, 0, 0, 0));
	}

	/* ---- SHIP ---- */
	.ship-texture {
		left: -1.318%;
		top: -21.354%;
		width: 102.709%;
		height: 136.979%;
	}
	.ship-left {
		left: -24.671%;
		top: -7.031%;
		width: 44.802%;
		height: 128.255%;
		object-position: 0% 50%;
	}
	.ship-right {
		left: 79.941%;
		top: -7.031%;
		width: 44.729%;
		height: 128.255%;
		object-position: 100% 50%;
	}
	.scrim {
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.45);
	}
</style>
