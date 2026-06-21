<script lang="ts">
	import { enhance } from '$app/forms';
	import WaveText from '$lib/components/WaveText.svelte';
	import LiftText from '$lib/components/LiftText.svelte';
	import ShaderBackdrop from '$lib/components/ShaderBackdrop.svelte';
	import { tilt } from '$lib/actions/tilt';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// per-theme rating, 1..7 (0 = not yet rated)
	let ratings = $state<Record<string, number>>({});
	let submitting = $state(false);
	const SCALE = [1, 2, 3, 4, 5, 6, 7];

	const allRated = $derived(
		data.themes.length > 0 && data.themes.every((t) => (ratings[t.frame] ?? 0) >= 1)
	);

	function rate(frame: string, value: number) {
		ratings = { ...ratings, [frame]: value };
	}
</script>

<svelte:head>
	<title>{data.projectName} · Vote · Horizons Nexus</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
</svelte:head>

<ShaderBackdrop />

<main>
	<section class="project">
		<h1 class="title"><WaveText text={data.projectName} /></h1>
		{#if data.authors.length}
			<p class="authors"><LiftText text={data.authors.join(', ')} /></p>
		{/if}
		<div class="shot">
			{#if data.screenshotUrl}
				<img src={data.screenshotUrl} alt="{data.projectName} screenshot" />
			{/if}
		</div>
	</section>

	{#if form && 'success' in form && form.success}
		<p class="thanks"><WaveText text="Thanks for voting!" /></p>
	{:else if !data.votingEnabled}
		<p class="notice">Voting is closed.</p>
	{:else if !data.loggedIn}
		<div class="signin">
			<p class="signin-prompt">Sign in to vote on this project.</p>
			<a class="signin-btn" href="/auth/login">Sign in with Hack Club</a>
		</div>
	{:else if data.ownTeam}
		<p class="notice">This is your team's project — you can't vote for it.</p>
	{:else if data.alreadyVoted}
		<p class="thanks"><WaveText text="You've already voted!" /></p>
	{:else if data.themes.length}
		<form
			class="rate"
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<h2 class="rate-title"><WaveText text="Rate this project's theme" /></h2>

			<div class="rows">
				{#each data.themes as t (t.frame)}
					<div class="rate-row">
						<div class="card-tilt">
							<img class="card" src="/cards/{t.frame}.webp" alt="" use:tilt />
						</div>
						<div class="rate-body">
							<p class="theme">Theme: {t.theme}</p>
							<div class="scale" role="radiogroup" aria-label="Rate theme: {t.theme}">
								{#each SCALE as n (n)}
									<button
										type="button"
										class="dot"
										class:filled={(ratings[t.frame] ?? 0) >= n}
										role="radio"
										aria-checked={ratings[t.frame] === n}
										aria-label="{n} of 7"
										onclick={() => rate(t.frame, n)}
									></button>
								{/each}
							</div>
							<div class="ends">
								<span>Doesn't fit theme</span>
								<span>Fits theme</span>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<input type="hidden" name="ratings" value={JSON.stringify(ratings)} />
			{#if form && 'error' in form && form.error}
				<p class="vote-error">{form.error}</p>
			{/if}
			<button class="vote-submit" type="submit" disabled={!allRated || submitting}>
				{submitting ? 'Submitting…' : 'Submit vote'}
			</button>
		</form>
	{/if}
</main>

<style>
	main {
		position: relative;
		min-height: 100dvh;
		/* transparent so the animated ShaderBackdrop shows through behind the page */
		background: transparent;
		color: #fff;
		font-family: var(--font-pixel);
		margin: 0 auto;
		max-width: 430px;
		padding: 40px 24px calc(40px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	/* ---- project header ---- */
	.project {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		text-align: center;
	}
	.title {
		margin: 0;
		font-size: clamp(30px, 9vw, 40px);
		font-weight: 500;
		line-height: 1.05;
		text-shadow: var(--text-shadow);
	}
	.authors {
		margin: 0;
		font-size: clamp(18px, 6vw, 24px);
		color: #b5b5b5;
	}
	.shot {
		width: 100%;
		aspect-ratio: 343 / 226;
		border: 4px solid #fff;
		border-radius: 24px;
		background: #d9d9d9;
		overflow: hidden;
	}
	.shot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.rate-title {
		margin: 0;
		font-size: clamp(26px, 8vw, 32px);
		font-weight: 500;
		text-shadow: var(--text-shadow);
	}

	/* ---- rating rows ---- */
	.rows {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.rate-row {
		display: flex;
		align-items: center;
		gap: 24px;
	}
	/* perspective wrapper: gives the JS-driven ambient tilt the depth that makes
	   it read as 3D rather than a flat skew. The resting z-roll (−3°…3°, random
	   per card) is set in the tilt action, not here. */
	.card-tilt {
		flex: none;
		width: 76px;
		height: 102px;
		perspective: 320px;
	}
	.card {
		display: block;
		width: 100%;
		height: 100%;
		border: 1px solid #fff;
		border-radius: 8px;
		box-shadow: var(--shadow);
		object-fit: cover;
		transform-origin: center center;
		will-change: transform;
	}
	.rate-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.theme {
		margin: 0;
		font-size: 20px;
		text-shadow: var(--text-shadow);
	}
	.scale {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.dot {
		width: 20px;
		height: 20px;
		flex: none;
		border-radius: 50%;
		border: 2px solid #fff;
		background: transparent;
		padding: 0;
		cursor: pointer;
		transition:
			background 0.1s ease,
			transform 0.1s ease;
	}
	.dot.filled {
		background: #fff;
	}
	.dot:active {
		transform: scale(0.88);
	}
	.ends {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 2px;
		font-size: 15px;
		line-height: 1.2;
		color: #c4c4c4;
	}

	.rate {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
	.vote-error {
		margin: 0;
		font-size: 14px;
		color: #ff6b6b;
		text-align: center;
	}
	.vote-submit {
		width: 100%;
		font-family: var(--font-pixel);
		font-size: 20px;
		background: #fff;
		color: #202020;
		border: none;
		border-radius: 14px;
		padding: 14px;
		cursor: pointer;
		box-shadow: var(--shadow);
		transition:
			filter 0.12s ease,
			transform 0.1s ease;
	}
	.vote-submit:hover:not(:disabled) {
		filter: brightness(0.92);
	}
	.vote-submit:active:not(:disabled) {
		transform: translateY(1px);
	}
	.vote-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.thanks {
		margin: 24px 0;
		text-align: center;
		font-size: clamp(28px, 9vw, 38px);
		text-shadow: var(--text-shadow);
	}
	.notice {
		margin: 24px 0;
		text-align: center;
		font-size: 18px;
		line-height: 1.35;
		color: #c4c4c4;
		text-shadow: var(--text-shadow);
	}
	.signin {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		text-align: center;
	}
	.signin-prompt {
		margin: 0;
		font-size: 18px;
		text-shadow: var(--text-shadow);
	}
	.signin-btn {
		font-family: var(--font-pixel);
		font-size: 18px;
		background: var(--hc-red);
		color: #fff;
		padding: 14px 18px;
		border-radius: 14px;
		line-height: 1;
		box-shadow: var(--shadow);
		transition: filter 0.12s ease, transform 0.1s ease;
	}
	.signin-btn:hover {
		filter: brightness(1.07);
	}
	.signin-btn:active {
		transform: translateY(1px);
	}
</style>
