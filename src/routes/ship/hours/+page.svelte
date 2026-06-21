<script lang="ts">
	import { enhance } from '$app/forms';
	import Backdrop from '$lib/components/Backdrop.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errors = $derived<Record<string, string>>(
		form && 'errors' in form ? (form.errors ?? {}) : {}
	);
	const hoursValues = $derived<string[]>(
		form && 'values' in form ? (form.values?.hours ?? []) : []
	);
	const hackatimeValues = $derived<string[]>(
		form && 'values' in form ? (form.values?.hackatime ?? []) : []
	);

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Hours per teammate · Horizons Nexus</title>
</svelte:head>

<Backdrop variant="ship" />

<header class="topbar">
	<span class="who">Signed in as {data.user.email}</span>
	<a class="logout" href="/auth/logout">Log out</a>
</header>

<main>
	<form
		class="card"
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<BackLink href="/ship" />
		<h1>Hours per teammate</h1>
		<p class="lead">
			Set the hours spent and Hackatime project for each person on the team. If you’re tracking
			time with Hackatime, put that number here.
		</p>

		{#if errors.form}
			<p class="form-error">{errors.form}</p>
		{/if}

		<ul class="members">
			{#each data.members as m, i (m.id)}
				<li class="member">
					<div class="m-head">
						<span class="m-name">{m.name}</span>
						{#if m.isYou}<span class="m-tag">you</span>{/if}
					</div>
					<div class="m-fields">
						<div class="field">
							<label for="hours_{i}">Hours</label>
							<input
								id="hours_{i}"
								name="hours_{i}"
								class="input"
								class:invalid={errors[`hours_${i}`]}
								placeholder="0"
								inputmode="decimal"
								value={hoursValues[i] ?? ''}
								autocomplete="off"
							/>
							{#if errors[`hours_${i}`]}<span class="err">{errors[`hours_${i}`]}</span>{/if}
						</div>
						<div class="field">
							<label for="hackatime_{i}">Hackatime Project</label>
							<input
								id="hackatime_{i}"
								name="hackatime_{i}"
								class="input"
								placeholder="my-cool-project"
								value={hackatimeValues[i] ?? ''}
								autocomplete="off"
							/>
						</div>
					</div>
				</li>
			{/each}
		</ul>

		<div class="button-spacing">
			<button class="submit" type="submit" disabled={submitting}>
				{submitting ? 'Saving…' : 'Next'}
			</button>
		</div>
	</form>
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
		padding: 25px 26px;
		box-shadow: var(--shadow);
	}

	h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 500;
		color: #fff;
		text-shadow: var(--text-shadow);
	}
	.lead {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
		text-shadow: var(--text-shadow);
	}

	.members {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.member {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding-top: 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.12);
	}
	.member:first-child {
		padding-top: 0;
		border-top: none;
	}
	.m-head {
		display: flex;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
	}
	.m-name {
		font-size: 15px;
		color: #fff;
		text-shadow: var(--text-shadow);
	}
	.m-tag {
		font-size: 11px;
		color: #000;
		background: #fff;
		border-radius: 999px;
		padding: 1px 8px;
	}
	.m-fields {
		display: grid;
		grid-template-columns: 110px 1fr;
		gap: 10px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.field label {
		font-size: 13px;
		font-weight: 400;
		color: #fff;
		text-shadow: var(--text-shadow);
	}

	.input {
		width: 100%;
		background: var(--input-bg);
		border: 1px solid #fff;
		border-radius: var(--radius-input);
		padding: 12px;
		color: #fff;
		font-family: inherit;
		font-size: 14px;
		box-shadow: var(--shadow);
		outline: none;
	}
	.input::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}
	.input:focus {
		border-color: var(--hc-red);
	}
	.input.invalid {
		border-color: var(--hc-red);
	}

	.err {
		font-size: 12px;
		color: var(--hc-red);
	}
	.form-error {
		margin: 0;
		font-size: 13px;
		color: var(--hc-red);
		background: rgba(255, 63, 63, 0.1);
		border: 1px solid rgba(255, 63, 63, 0.4);
		border-radius: 10px;
		padding: 10px 12px;
	}

	.button-spacing {
		padding-top: 8px;
	}
	.submit {
		width: 100%;
		background: #fff;
		color: #000;
		border: 1px solid #fff;
		border-radius: var(--radius-input);
		padding: 12px;
		font-size: 14px;
		font-weight: 400;
		box-shadow: var(--shadow);
		cursor: pointer;
		transition: filter 0.12s ease, transform 0.12s ease;
	}
	.submit:hover:not(:disabled) {
		filter: brightness(0.92);
	}
	.submit:active:not(:disabled) {
		transform: translateY(1px);
	}
	.submit:disabled {
		opacity: 0.6;
		cursor: progress;
	}
</style>
