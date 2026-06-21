<script lang="ts">
	import Backdrop from '$lib/components/Backdrop.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Shipping is closed · Horizons Nexus</title>
</svelte:head>

<Backdrop variant="ship" />

<header class="topbar">
	<span class="who">Signed in as {data.user.email}</span>
	<a class="logout" href="/auth/logout">Log out</a>
</header>

<main>
	<section class="card">
		<div class="head">
			<div class="badge"><img src="/art/jellybeans.webp" alt="" /></div>
			<h1>Shipping is closed</h1>
			<p class="sub">The window for shipping new projects has ended. Thanks for building!</p>
		</div>
	</section>
</main>

<style>
	.topbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 2;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 14px 18px;
		font-size: 12px;
		color: var(--muted);
	}
	.topbar .logout {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.topbar .logout:hover {
		color: #fff;
	}

	main {
		position: relative;
		z-index: 1;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 64px 20px;
	}

	.card {
		width: 486px;
		max-width: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
		background: var(--card);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		border-radius: var(--radius-card);
		padding: 32px 26px;
		box-shadow: var(--shadow);
	}

	.head {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 8px;
	}
	.badge img {
		width: 72px;
		height: auto;
		display: block;
	}
	h1 {
		margin: 0;
		font-size: 22px;
		font-weight: 500;
		color: #fff;
		text-shadow: var(--text-shadow);
	}
	.sub {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
		line-height: 1.45;
	}
</style>
