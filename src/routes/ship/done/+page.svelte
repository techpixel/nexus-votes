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
	<section class="card">
		<div class="head">
			<div class="badge"><img src="/art/jellybeans.webp" alt="" /></div>
			<h1>{data.projectName} is shipped!</h1>
			<p class="sub">Here's what your team submitted.</p>
		</div>

		{#if data.screenshotUrl}
			<img class="shot" src={data.screenshotUrl} alt="{data.projectName} screenshot" />
		{/if}

		<dl class="summary">
			{#if data.playedHand}
				<div class="row">
					<dt>Played hand</dt>
					<dd>
						<span class="hand">
							{data.playedHand}{#if data.playedMult}<span class="mult">×{data.playedMult} mult</span>{/if}
						</span>
						{#if data.playedThemes.length}
							<span class="themes">{data.playedThemes.join(', ')}</span>
						{/if}
					</dd>
				</div>
			{/if}

			{#if data.description}
				<div class="row">
					<dt>Description</dt>
					<dd class="desc">{data.description}</dd>
				</div>
			{/if}

			{#if data.playableUrl}
				<div class="row">
					<dt>Playable URL</dt>
					<dd><a href={data.playableUrl} target="_blank" rel="noopener noreferrer">{data.playableUrl}</a></dd>
				</div>
			{/if}

			{#if data.codeUrl}
				<div class="row">
					<dt>GitHub repo</dt>
					<dd><a href={data.codeUrl} target="_blank" rel="noopener noreferrer">{data.codeUrl}</a></dd>
				</div>
			{/if}
		</dl>

		<a class="edit" href="/ship/edit">Edit project</a>
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
	}

	.shot {
		width: 100%;
		max-height: 180px;
		object-fit: cover;
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: var(--radius-input);
	}

	.summary {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	dt {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-size: 14px;
		color: #fff;
		word-break: break-word;
	}
	dd a {
		color: #fff;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	dd a:hover {
		color: var(--hc-red);
	}
	.desc {
		white-space: pre-wrap;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.85);
	}

	.edit {
		display: block;
		margin-top: 4px;
		width: 100%;
		text-align: center;
		background: #fff;
		color: #000;
		border: 1px solid #fff;
		border-radius: var(--radius-input);
		padding: 12px;
		font-size: 14px;
		box-shadow: var(--shadow);
		transition: filter 0.12s ease, transform 0.12s ease;
	}
	.edit:hover {
		filter: brightness(0.92);
	}
	.edit:active {
		transform: translateY(1px);
	}

	.hand {
		display: inline-flex;
		align-items: center;
		font-size: 15px;
	}
	.hand .mult {
		margin-left: 8px;
		padding: 1px 7px;
		border-radius: 6px;
		background: var(--hc-red);
		color: #fff;
		font-size: 12px;
		box-shadow: var(--shadow);
	}
	.themes {
		display: block;
		margin-top: 3px;
		font-size: 12px;
		color: #ccc;
	}
</style>
