<script lang="ts">
	import { enhance } from '$app/forms';
	import Backdrop from '$lib/components/Backdrop.svelte';
	import type { PageData, ActionData } from './$types';

	type Member = { email: string; name: string };

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally -- intentional one-time prefill from server
	let teammates = $state<Member[]>((data.teammates ?? []).map((e) => ({ email: e, name: e })));
	// svelte-ignore state_referenced_locally -- intentional one-time prefill from server
	let teamNumber = $state(data.teamId ?? '');
	let query = $state('');
	let results = $state<Member[]>([]);
	let searching = $state(false);
	let error = $state('');
	let submitting = $state(false);

	let timer: ReturnType<typeof setTimeout> | undefined;

	function onInput() {
		error = '';
		clearTimeout(timer);
		if (query.trim().length < 2) {
			results = [];
			return;
		}
		timer = setTimeout(runSearch, 250);
	}

	async function runSearch() {
		const q = query.trim();
		if (q.length < 2) return;
		searching = true;
		try {
			const res = await fetch(`/ship/team/search?q=${encodeURIComponent(q)}`);
			if (res.ok) {
				const body = (await res.json()) as { results: Member[] };
				results = body.results ?? [];
			}
		} catch {
			/* leave previous results */
		} finally {
			searching = false;
		}
	}

	function isOnTeam(email: string) {
		return (
			email.toLowerCase() === data.user.email.toLowerCase() ||
			teammates.some((t) => t.email.toLowerCase() === email.toLowerCase())
		);
	}

	function pick(member: Member) {
		if (isOnTeam(member.email)) {
			error = `${member.name} is already on the team.`;
		} else {
			teammates = [...teammates, member];
		}
		query = '';
		results = [];
	}

	function removeMember(email: string) {
		teammates = teammates.filter((t) => t.email !== email);
	}
</script>

<svelte:head>
	<title>Your team · Horizons Nexus</title>
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
		<h1>Ship your project</h1>

		<div class="field">
			<label class="label" for="teamNumber">Team Number</label>
			<input
				id="teamNumber"
				name="teamNumber"
				class="input"
				placeholder="1"
				bind:value={teamNumber}
				inputmode="numeric"
				autocomplete="off"
			/>
		</div>

		<div class="field">
			<span class="label">Team Members</span>
			<ul class="members">
				<li class="member">
					<span class="m-name">{data.user.email}</span>
					<span class="m-email">you</span>
				</li>
				{#each teammates as m (m.email)}
					<li class="member">
						<span class="m-name">{m.name}</span>
						{#if m.name !== m.email}<span class="m-email">{m.email}</span>{/if}
						<button
							type="button"
							class="remove"
							title="Remove {m.name}"
							onclick={() => removeMember(m.email)}>×</button
						>
					</li>
				{/each}
			</ul>
		</div>

		<div class="combo">
			<input
				class="input"
				placeholder="Search by name…"
				bind:value={query}
				oninput={onInput}
				autocomplete="off"
			/>
			{#if query.trim().length >= 2}
				<ul class="dropdown">
					{#if searching && results.length === 0}
						<li class="dd-empty">Searching…</li>
					{:else if results.length === 0}
						<li class="dd-empty">No matches</li>
					{:else}
						{#each results as r (r.email)}
							<li>
								<button
									type="button"
									class="dd-item"
									disabled={isOnTeam(r.email)}
									onclick={() => pick(r)}
								>
									<span class="dd-name">{r.name}</span>
									<span class="dd-email">{r.email}</span>
								</button>
							</li>
						{/each}
					{/if}
				</ul>
			{/if}
		</div>
		{#if error}<span class="err">{error}</span>{/if}
		{#if form?.error}<p class="form-error">{form.error}</p>{/if}

		<input type="hidden" name="teammates" value={teammates.map((t) => t.email).join('\n')} />

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
		padding: 24px;
		box-shadow: var(--shadow);
	}

	h1 {
		margin: 0;
		padding-bottom: 8px;
		font-size: 24px;
		font-weight: 500;
		color: #fff;
		text-shadow: var(--text-shadow);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.field .label {
		font-size: 14px;
		color: #fff;
		text-shadow: var(--text-shadow);
	}

	.members {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.member {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 0;
		font-size: 14px;
		color: #fff;
	}
	.m-email {
		color: var(--muted);
		font-size: 12px;
	}
	.remove {
		margin-left: auto;
		flex: none;
		background: none;
		border: none;
		color: var(--muted);
		font-size: 20px;
		line-height: 1;
		cursor: pointer;
		padding: 0 4px;
	}
	.remove:hover {
		color: #fff;
	}

	/* ---- combo / typeahead ---- */
	.combo {
		position: relative;
		width: 100%;
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
	.dropdown {
		position: absolute;
		z-index: 5;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 4px;
		list-style: none;
		background: #202020;
		border: 1px solid rgba(255, 255, 255, 0.5);
		border-radius: var(--radius-input);
		box-shadow: var(--shadow);
		max-height: 220px;
		overflow-y: auto;
	}
	.dd-empty {
		padding: 10px 12px;
		font-size: 13px;
		color: var(--muted);
	}
	.dd-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		border-radius: 8px;
		padding: 8px 10px;
		cursor: pointer;
		color: #fff;
	}
	.dd-item:hover:not(:disabled),
	.dd-item:focus-visible {
		background: #2c2c2c;
	}
	.dd-item:disabled {
		filter: grayscale(1);
		color: var(--muted);
		cursor: not-allowed;
	}
	.dd-name {
		font-size: 14px;
	}
	.dd-email {
		font-size: 12px;
		color: var(--muted);
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
		cursor: not-allowed;
	}
</style>
