<script lang="ts">
	import Backdrop from '$lib/components/Backdrop.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Render the live count, or an em-dash placeholder when stats are unavailable.
	const fmt = (n: number | undefined) =>
		typeof n === 'number' ? n.toLocaleString('en-US') : '—';
</script>

<svelte:head>
	<title>Scoreboard · Horizons Nexus</title>
	<meta name="description" content="Live ship stats for Horizons Nexus." />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Delius+Unicase:wght@400;700&display=swap"
	/>
</svelte:head>

<Backdrop variant="home" gradient={false} />

<main>
	<div class="stats">
		<div class="stat-card">
			<span class="stat-num">{fmt(data.stats?.people)}</span>
			<span class="stat-label">People have shipped</span>
		</div>
		<div class="stat-card">
			<span class="stat-num">{fmt(data.stats?.projects)}</span>
			<span class="stat-label">Projects shipped</span>
		</div>
	</div>
</main>

<style>
	main {
		position: relative;
		z-index: 1;
		min-height: 100dvh;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 48px 24px 64px;
	}

	.stats {
		display: flex;
		gap: 28px;
		width: 100%;
		max-width: 1120px;
		justify-content: center;
	}

	.stat-card {
		flex: 1 1 0;
		min-width: 0;
		max-width: 525px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: #000;
		border: 4px solid #fff;
		border-radius: 16px;
		padding: 24px 16px;
		text-align: center;
	}

	.stat-num {
		font-family: 'Delius Unicase', var(--font);
		font-weight: 400;
		font-size: clamp(56px, 11vw, 96px);
		line-height: 1.05;
		color: #fff;
	}

	.stat-label {
		font-family: 'Delius Unicase', var(--font);
		font-weight: 400;
		font-size: clamp(18px, 2.6vw, 32px);
		line-height: 1.1;
		color: #fff;
		text-transform: uppercase;
	}

	@media (max-width: 720px) {
		.stats {
			flex-direction: column;
			align-items: center;
			gap: 18px;
		}
		.stat-card {
			width: 100%;
			flex: none;
		}
	}
</style>
