<script lang="ts">
	// Layered decorative background, faithful to the Figma frame (1366 x 768).
	// The .stage is sized to always COVER the viewport while preserving the
	// design's aspect ratio, so every layer keeps its relative position.
	let { variant = 'home' }: { variant?: 'home' | 'ship' } = $props();
</script>

<div class="backdrop {variant}" aria-hidden="true">
	<div class="stage">
		{#if variant === 'home'}
			<img class="layer texture" src="/art/art9.png" alt="" />
			<img class="layer doodle-left" src="/art/art7.png" alt="" />
			<img class="layer doodle-right" src="/art/art8.png" alt="" />
			<img class="layer rays" src="/art/art25.png" alt="" />
			<img class="layer orb" src="/art/art26.png" alt="" />
			<img class="layer logo" src="/art/nexus.svg" alt="Horizons Nexus" />
			<div class="layer gradient"></div>
		{:else}
			<img class="layer ship-texture" src="/art/art9.png" alt="" />
			<img class="layer ship-left" src="/art/art7.png" alt="" />
			<img class="layer ship-right" src="/art/art8.png" alt="" />
			<div class="layer scrim"></div>
		{/if}
	</div>
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
	.texture {
		left: -0.952%;
		top: -16.855%;
		width: 100.952%;
		height: 134.602%;
	}
	.doodle-left {
		left: -0.952%;
		top: -15.606%;
		width: 44.02%;
		height: 126.061%;
		object-position: 0% 50%;
	}
	.doodle-right {
		left: 56.008%;
		top: -15.527%;
		width: 43.992%;
		height: 125.981%;
		object-position: 100% 50%;
	}
	.rays {
		left: 0;
		top: -13.021%;
		width: 100%;
		height: 133.398%;
	}
	.orb {
		left: 25.11%;
		top: 4.367%;
		width: 48.878%;
		height: 86.652%;
		object-position: 50% 50%;
	}
	.logo {
		left: 26.578%;
		top: 20.387%;
		width: 46.045%;
		height: 37.029%;
		object-fit: contain;
	}
	.gradient {
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
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
