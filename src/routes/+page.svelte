<script lang="ts">
	import Backdrop from '$lib/components/Backdrop.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Horizons Nexus</title>
	<meta name="description" content="Vote on projects at Horizons Nexus." />
</svelte:head>

<Backdrop variant="home" />

<main>
	<div class="cta">
		<p class="prompt">Sign in to vote at Horizons Nexus</p>
		<a class="signin" href="/auth/login">Sign in with Hack Club</a>
		{#if data.dev}
			<a class="dev" href="/auth/dev-login">Dev login (skip OAuth)</a>
		{/if}
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
		padding: 48px 24px;
	}

	.cta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		text-align: center;
	}

	.prompt {
		margin: 0;
		font-size: 16px;
		font-weight: 500;
		color: #fff;
		text-shadow: var(--text-shadow);
	}

	.signin {
		background: var(--hc-red);
		color: #fff;
		font-size: 16px;
		font-weight: 400;
		padding: 16px;
		border-radius: var(--radius-input);
		line-height: 1;
		transition:
			transform 0.12s ease,
			filter 0.12s ease;
	}
	.signin:hover {
		filter: brightness(1.07);
	}
	.signin:active {
		transform: translateY(1px);
	}

	.dev {
		font-size: 12px;
		color: var(--muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.dev:hover {
		color: #fff;
	}
</style>
