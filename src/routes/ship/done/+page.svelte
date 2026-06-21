<script lang="ts">
	import Backdrop from '$lib/components/Backdrop.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Already shipped · Horizons Nexus</title>
</svelte:head>

<Backdrop variant="ship" />

<header class="topbar">
	<span class="who">Signed in as {data.user.email}</span>
	<a class="logout" href="/auth/logout">Log out</a>
</header>

<main>
	<section class="card done">
		<div class="badge"><img src="/art/jellybeans.webp" alt="" /></div>
		<h1>{data.projectName} is shipped!</h1>
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
		gap: 8px;
		background: var(--card);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		border-radius: var(--radius-card);
		padding: 25px 26px;
		box-shadow: var(--shadow);
	}

	.done {
		align-items: center;
		text-align: center;
		gap: 12px;
		padding: 40px 26px;
	}
	.done .badge img {
		width: 72px;
		height: auto;
		display: block;
	}
	.done h1 {
		margin: 0;
		font-size: 22px;
		font-weight: 500;
		color: #fff;
		text-shadow: var(--text-shadow);
	}
	.done p {
		margin: 0;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.75);
	}
</style>
