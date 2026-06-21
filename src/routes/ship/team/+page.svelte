<script lang="ts">
	import { enhance } from '$app/forms';
	import Backdrop from '$lib/components/Backdrop.svelte';
	import BackLink from '$lib/components/BackLink.svelte';
	import type { PageData, ActionData } from './$types';

	type Member = { id: string; name: string; slackId?: string; slackUsername?: string };

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally -- intentional one-time prefill from server
	let teammates = $state<Member[]>(data.teammates ?? []);
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

	// A result is "on the team" if it's already picked, or if it's the signed-in
	// user themselves — matched by Slack ID, since the browser no longer receives
	// email addresses to compare against.
	function isOnTeam(member: Member) {
		return (
			(!!member.slackId && member.slackId === data.user?.slackId) ||
			teammates.some((t) => t.id === member.id)
		);
	}

	function pick(member: Member) {
		if (isOnTeam(member)) {
			error = `${member.name} is already on the team.`;
		} else {
			teammates = [...teammates, member];
		}
		query = '';
		results = [];
	}

	function removeMember(id: string) {
		teammates = teammates.filter((t) => t.id !== id);
	}

	// Slack avatars come from Cachet — /users/{slackId}/r 302-redirects straight
	// to the profile image, so the browser can load it directly via <img src>.
	const CACHET_BASE = 'https://cachet.dunkirk.sh';
	function avatarUrl(slackId: string) {
		return `${CACHET_BASE}/users/${slackId}/r`;
	}
	function initial(label: string) {
		return (label.trim()[0] ?? '?').toUpperCase();
	}
	// If Cachet has no image for this Slack ID, drop the <img> to reveal the initial.
	function onAvatarError(e: Event) {
		(e.currentTarget as HTMLImageElement).remove();
	}

	const selfName = $derived(
		[data.user?.firstName, data.user?.lastName].filter(Boolean).join(' ').trim() ||
			data.user?.email ||
			'You'
	);
</script>

<svelte:head>
	<title>Your team · Horizons Nexus</title>
</svelte:head>

<Backdrop variant="ship" />

<header class="topbar">
	<span class="who">Signed in as {selfName}</span>
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
		{#if data.editing}<BackLink href="/ship/done" label="Cancel" />{/if}
		<h1>{data.editing ? 'Edit your project' : 'Ship your project'}</h1>

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
					{@render avatar(data.user?.slackId, selfName)}
					<span class="m-text">
						<span class="m-name">{selfName}</span>
						<span class="m-email">you</span>
					</span>
				</li>
				{#each teammates as m (m.id)}
					<li class="member">
						{@render avatar(m.slackId, m.name)}
						<span class="m-text">
							<span class="m-name">{m.name}</span>
							{#if m.slackUsername}<span class="m-email">@{m.slackUsername}</span>{/if}
						</span>
						<button
							type="button"
							class="remove"
							title="Remove {m.name}"
							onclick={() => removeMember(m.id)}>×</button
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
						{#each results as r (r.id)}
							<li>
								<button
									type="button"
									class="dd-item"
									disabled={isOnTeam(r)}
									onclick={() => pick(r)}
								>
									{@render avatar(r.slackId, r.name)}
									<span class="dd-text">
										<span class="dd-name">{r.name}</span>
										{#if r.slackUsername}<span class="dd-email">@{r.slackUsername}</span>{/if}
									</span>
								</button>
							</li>
						{/each}
					{/if}
				</ul>
			{/if}
		</div>
		{#if error}<span class="err">{error}</span>{/if}
		{#if form?.error}<p class="form-error">{form.error}</p>{/if}

		<input type="hidden" name="teammates" value={teammates.map((t) => t.id).join('\n')} />

		<div class="button-spacing">
			<button class="submit" type="submit" disabled={submitting}>
				{submitting ? 'Saving…' : 'Next'}
			</button>
		</div>
	</form>
</main>

{#snippet avatar(slackId: string | undefined, label: string)}
	<span class="avatar" aria-hidden="true">
		<span class="avatar-initial">{initial(label)}</span>
		{#if slackId}
			<img
				class="avatar-img"
				src={avatarUrl(slackId)}
				alt=""
				loading="lazy"
				referrerpolicy="no-referrer"
				onerror={onAvatarError}
			/>
		{/if}
	</span>
{/snippet}

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
		gap: 10px;
		padding: 8px 0;
		font-size: 14px;
		color: #fff;
	}
	.m-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.m-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.m-email {
		color: var(--muted);
		font-size: 12px;
	}

	/* ---- Slack avatar (Cachet) ---- */
	.avatar {
		position: relative;
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--hc-red);
		display: grid;
		place-items: center;
	}
	.avatar-initial {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
	}
	.avatar-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
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
		flex-direction: row;
		align-items: center;
		gap: 10px;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		border-radius: 8px;
		padding: 8px 10px;
		cursor: pointer;
		color: #fff;
	}
	.dd-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
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
