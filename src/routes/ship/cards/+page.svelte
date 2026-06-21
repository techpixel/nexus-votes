<script lang="ts">
	import { enhance } from '$app/forms';
	import Backdrop from '$lib/components/Backdrop.svelte';
	import {
		CARDS,
		cardImage,
		cardLabel,
		cardCode,
		themeLabel,
		handOptions,
		playedFrames,
		handName,
		handMult,
		type Card,
		type Suit
	} from '$lib/cards';
	import type { PageData, ActionData } from './$types';
	import BackLink from '$lib/components/BackLink.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const MAX_CARDS = 5;
	// You may stack duplicate cards (up to a full hand of the same one). This unlocks
	// the "not so secret" hands — Five of a Kind (5 of a rank), Flush House (3+2 of a
	// suit), and even Flush Five (5 identical cards).
	const MAX_COPIES = 5;

	// A hand can now hold duplicate cards, so a frame no longer uniquely identifies a
	// slot. Each added card gets its own uid for keying the list and removing one copy.
	type HandCard = Card & { uid: number };
	let uidSeq = 0;

	// Every card in natural playing order: 2 → Ace, then Clubs · Spades · Hearts · Diamonds.
	// The wildcard Joker has no rank/suit, so it always sorts to the end.
	const SUIT_ORDER: Record<Suit, number> = { C: 0, S: 1, H: 2, D: 3 };
	const ALL_CARDS = [...CARDS].sort(
		(a, b) =>
			Number(a.joker ?? false) - Number(b.joker ?? false) ||
			(a.r ?? 0) - (b.r ?? 0) ||
			SUIT_ORDER[a.s ?? 'C'] - SUIT_ORDER[b.s ?? 'C']
	);

	// A stable, scattered tilt per card (−8°…8°) so the list looks hand-dealt rather
	// than uniform. Derived from the frame id so it never re-rolls between renders.
	function cardTilt(frame: string): number {
		let h = 0;
		for (let i = 0; i < frame.length; i++) h = (h * 31 + frame.charCodeAt(i)) >>> 0;
		return (h % 17) - 8;
	}

	let hand = $state<HandCard[]>([]);
	let query = $state('');
	let open = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let error = $state('');
	let submitting = $state(false);

	const codes = $derived(hand.map(cardCode).join(' '));
	// How many copies of each card frame are already in the hand.
	const handCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const c of hand) counts.set(c.frame, (counts.get(c.frame) ?? 0) + 1);
		return counts;
	});
	// A card stays searchable until the hand holds the max number of copies of it.
	const available = $derived(ALL_CARDS.filter((c) => (handCounts.get(c.frame) ?? 0) < MAX_COPIES));

	// Cards matching the search box — by theme name, description, playing-card
	// name ("queen of hearts"), or short code ("QH"). Empty query lists them all.
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return available;
		return available.filter(
			(c) =>
				c.name.toLowerCase().includes(q) ||
				c.desc.toLowerCase().includes(q) ||
				cardLabel(c).toLowerCase().includes(q) ||
				cardCode(c).toLowerCase().includes(q)
		);
	});

	// ---- poker hand: every hand these cards can form, best first (Joker = wild) ----
	const options = $derived(handOptions(hand));
	const bestIdx = $derived(options[0] ?? -1);

	// The hand the player has chosen to play. Null = follow the best automatically;
	// once they pick, we honour it until it's no longer formable (cards changed).
	let picked = $state<number | null>(null);
	const activeHand = $derived(picked !== null && options.includes(picked) ? picked : bestIdx);

	// Reset a stale manual pick when the formable hands change underneath it.
	$effect(() => {
		if (picked !== null && !options.includes(picked)) picked = null;
	});

	const playedHandName = $derived(activeHand >= 0 ? handName(activeHand) : '');
	const playedMult = $derived(activeHand >= 0 ? handMult(activeHand) : 0);
	const played = $derived(playedFrames(hand, activeHand));

	// Auto-sorted for display: scoring cards first, then by rank (Ace high, Joker leads).
	const displayHand = $derived.by(() => {
		const rankOf = (c: Card) => (c.joker || c.r === undefined ? 15 : c.r);
		return [...hand].sort(
			(a, b) =>
				Number(played.has(b.frame)) - Number(played.has(a.frame)) ||
				rankOf(b) - rankOf(a) ||
				(a.s ?? '').localeCompare(b.s ?? '')
		);
	});

	function addCard(card: Card) {
		error = '';
		if (hand.length >= MAX_CARDS) {
			error = `A hand is at most ${MAX_CARDS} cards.`;
			return;
		}
		if ((handCounts.get(card.frame) ?? 0) >= MAX_COPIES) {
			error = `You can stack at most ${MAX_COPIES} of the same card.`;
			return;
		}
		hand = [...hand, { ...card, uid: uidSeq++ }];
		query = '';
		open = false;
	}

	function addFirst() {
		const first = results[0];
		if (!first) {
			error = 'No matching card — try a name like “uranium” or “Queen of Hearts”.';
			return;
		}
		addCard(first);
	}

	function removeCard(uid: number) {
		hand = hand.filter((c) => c.uid !== uid);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addFirst();
		} else if (e.key === 'Escape') {
			open = false;
		}
	}

	// Close the results list when clicking outside the search field.
	$effect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	});

	// Fan layout, split so the card face can rotate while its hover tooltip stays upright.
	function fanPos(i: number, n: number): string {
		const offset = i - (n - 1) / 2;
		const x = offset * 50;
		const y = Math.abs(offset) * 3;
		return `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
	}
	function fanRot(i: number, n: number): number {
		return (i - (n - 1) / 2) * 7;
	}

	// ---- photo of cards: drag & drop (same pattern as the ship form) ----
	let fileInput: HTMLInputElement | undefined = $state();
	let dragOver = $state(false);
	let fileName = $state('');
	let previewUrl = $state<string | null>(null);

	function setFile(files: FileList | null) {
		const f = files?.[0];
		if (!f || !f.type.startsWith('image/')) return;
		fileName = f.name;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = URL.createObjectURL(f);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const dt = e.dataTransfer;
		if (dt?.files?.length && fileInput) {
			fileInput.files = dt.files;
			setFile(dt.files);
		}
	}
</script>

<svelte:head>
	<title>Add your cards · Horizons Nexus</title>
</svelte:head>

<Backdrop variant="ship" />

<header class="topbar">
	<span class="who">Signed in as {data.user.email}</span>
	<a class="logout" href="/auth/logout">Log out</a>
</header>

<main>
	{#if form && 'success' in form && form.success}
		<section class="card done">
			<div class="badge"><img src="/art/jellybeans.webp" alt="" /></div>
			<h1>{form.projectName} is shipped!</h1>
			<p>Thanks, {data.user.firstName || 'friend'} — your project and cards are in.</p>
			{#if form.photoWarning}
				<p class="warn">{form.photoWarning}</p>
			{/if}
		</section>
	{:else}
		<form
			class="card"
			method="POST"
			enctype="multipart/form-data"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					// On success the server clears the draft cookie, so re-running load()
					// would bounce us back to /ship. Skip invalidation to keep the success screen.
					await update({ invalidateAll: result.type !== 'success' });
					submitting = false;
				};
			}}
		>
			<BackLink href="/ship/hours" />
			<h1>Add your cards</h1>

			<div class="hand-box">
				{#if hand.length === 0}
					<span class="hand-empty">Your hand will appear here</span>
				{:else}
					<div class="hand">
						{#each displayHand as card, i (card.uid)}
							<button
								type="button"
								class="play-card"
								class:dimmed={!played.has(card.frame)}
								style="--pos: {fanPos(i, displayHand.length)}; --rot: {fanRot(i, displayHand.length)}deg"
								title="Remove {cardLabel(card)}"
								aria-label="Remove {cardLabel(card)}"
								onclick={() => removeCard(card.uid)}
							>
								<span class="card-face">
									<img src={cardImage(card)} alt="" />
								</span>
								<span class="card-tip" aria-hidden="true">
									<span class="tip-theme">{themeLabel(card)}</span>
									<span class="tip-card">{cardLabel(card).toLowerCase()}</span>
									<span class="tip-action">Click to remove</span>
								</span>
							</button>
						{/each}
					</div>
					<div class="hand-label">
						<p class="hand-name">
							{playedHandName}{#if playedMult}<span class="mult">×{playedMult} mult</span>{/if}
						</p>
						<p class="hand-themes">
							{displayHand
								.filter((c) => played.has(c.frame))
								.map(themeLabel)
								.join(', ')}
						</p>
					</div>
				{/if}
			</div>

			{#if options.length > 1}
				<div class="hand-picker">
					<span class="picker-label">Play this hand as:</span>
					<div class="picker-options">
						{#each options as idx (idx)}
							<button
								type="button"
								class="hand-chip"
								class:active={idx === activeHand}
								onclick={() => (picked = idx)}
							>
								<span class="chip-name">{handName(idx)}</span>
								<span class="chip-mult">×{handMult(idx)}</span>
							</button>
						{/each}
					</div>
					<span class="picker-hint">Only the themes in the chosen hand count.</span>
				</div>
			{/if}

			{#if hand.length > 0}
				<span class="remove-hint">Click a card to remove it</span>
			{/if}

			<div class="card-row" bind:this={root}>
				<div class="search-wrap">
					<span class="search-icon" aria-hidden="true">
						<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6">
							<circle cx="7" cy="7" r="4.5" />
							<line x1="10.4" y1="10.4" x2="14" y2="14" stroke-linecap="round" />
						</svg>
					</span>
					<input
						class="search"
						type="text"
						placeholder={hand.length >= MAX_CARDS
							? 'Your hand is full'
							: 'Search cards — “uranium”, “Queen of Hearts”…'}
						bind:value={query}
						onfocus={() => (open = true)}
						onkeydown={onKeydown}
						disabled={hand.length >= MAX_CARDS}
						autocomplete="off"
						aria-label="Search cards"
					/>
				</div>

				{#if open && hand.length < MAX_CARDS}
					<ul class="results">
						{#if results.length === 0}
							<li class="no-results">No cards match “{query}”.</li>
						{:else}
							{#each results as card (card.frame)}
								<li>
									<button type="button" class="result" onclick={() => addCard(card)}>
										<span class="result-card" style="transform: rotate({cardTilt(card.frame)}deg);">
											<img src={cardImage(card)} alt="" />
										</span>
										<span class="result-text">
											<span class="theme">Theme: {themeLabel(card)}</span>
											<span class="play">{cardLabel(card)}</span>
										</span>
										{#if (handCounts.get(card.frame) ?? 0) > 0}
											<span class="result-have">{handCounts.get(card.frame)} in hand · add more</span>
										{/if}
										<span class="result-add" aria-hidden="true">+</span>
									</button>
								</li>
							{/each}
						{/if}
					</ul>
				{/if}
			</div>
			{#if error}<span class="err">{error}</span>{/if}

			<div class="field">
				<span class="label">Photo of your cards</span>
				<label
					class="dropzone"
					class:drag={dragOver}
					ondragover={(e) => {
						e.preventDefault();
						dragOver = true;
					}}
					ondragleave={() => (dragOver = false)}
					ondrop={onDrop}
				>
					<input
						bind:this={fileInput}
						type="file"
						name="cardsPhoto"
						accept="image/*"
						class="file-input"
						onchange={() => setFile(fileInput?.files ?? null)}
					/>
					{#if previewUrl}
						<img class="preview" src={previewUrl} alt="Cards preview" />
						<span class="dz-name">{fileName}</span>
					{:else}
						<span class="dz-text">Drag and drop a screenshot</span>
					{/if}
				</label>
			</div>

			<input type="hidden" name="cards" value={codes} />
			<input type="hidden" name="playedHand" value={playedHandName} />
			{#if form && 'error' in form && form.error}
				<p class="form-error">{form.error}</p>
			{/if}

			<div class="button-spacing">
				<button class="submit" type="submit" disabled={hand.length === 0 || submitting}>
					{submitting ? 'Submitting…' : 'Next'}
				</button>
			</div>
		</form>
	{/if}
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

	h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 500;
		color: #fff;
		text-shadow: var(--text-shadow);
	}

	/* ---- hand preview ---- */
	.hand-box {
		position: relative;
		width: 100%;
		height: 203px;
		background: var(--input-bg);
		border: 1px solid #fff;
		border-radius: var(--radius-input);
		box-shadow: var(--shadow);
		/* overflow visible so a card's hover tooltip can float above the box */
	}
	.hand {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 150px;
	}
	.hand-empty {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
		font-size: 13px;
	}
	.play-card {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 76px;
		height: 104px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		transform: var(--pos);
		transform-origin: center center;
		transition: transform 0.2s ease;
	}
	.card-face {
		display: block;
		width: 100%;
		height: 100%;
		border: 1px solid #fff;
		border-radius: 8px;
		box-shadow: var(--shadow);
		overflow: hidden;
		background: var(--input-bg);
		transform: rotate(var(--rot));
		transform-origin: center center;
		transition: transform 0.2s ease, filter 0.12s ease;
	}
	.card-face img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.play-card:hover .card-face {
		transform: rotate(var(--rot)) scale(1.12);
		filter: brightness(1.08);
	}
	.play-card.dimmed .card-face {
		filter: grayscale(1);
	}
	.play-card.dimmed:hover .card-face {
		filter: grayscale(1) brightness(1.08);
	}

	/* hover tooltip — theme, playing-card name, remove hint (stays upright) */
	.card-tip {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		padding: 5px 16px;
		min-width: 88px;
		background: #3a3a3a;
		border-radius: 8px;
		box-shadow: var(--shadow);
		text-align: center;
		white-space: nowrap;
		z-index: 50;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.12s ease;
	}
	.play-card:hover .card-tip {
		opacity: 1;
	}
	.tip-theme {
		font-size: 16px;
		color: #fff;
		line-height: 1.15;
	}
	.tip-card {
		font-size: 12px;
		color: #ccc;
		line-height: 1.15;
	}
	.tip-action {
		font-size: 10px;
		color: #999;
		line-height: 1.15;
	}
	/* hint under the hand — clicking a card removes it */
	.remove-hint {
		display: block;
		text-align: center;
		font-size: 11px;
		color: var(--muted);
	}

	/* ---- detected hand label ---- */
	.hand-label {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 14px;
		text-align: center;
	}
	.hand-name {
		margin: 0;
		font-size: 16px;
		color: #fff;
		text-shadow: var(--text-shadow);
	}
	.hand-name .mult {
		margin-left: 8px;
		padding: 1px 7px;
		border-radius: 6px;
		background: var(--hc-red);
		color: #fff;
		font-size: 12px;
		vertical-align: middle;
		box-shadow: var(--shadow);
	}
	.hand-themes {
		margin: 3px 0 0;
		padding: 0 16px;
		font-size: 12px;
		color: #ccc;
	}

	/* ---- "play this hand as" picker (only when >1 hand is possible) ---- */
	.hand-picker {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding-top: 4px;
	}
	.picker-label {
		font-size: 13px;
		color: #fff;
		text-shadow: var(--text-shadow);
	}
	.picker-options {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 6px;
	}
	.hand-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--input-bg);
		border: 1px solid rgba(255, 255, 255, 0.5);
		border-radius: 999px;
		padding: 6px 12px;
		color: #fff;
		font-family: inherit;
		font-size: 13px;
		cursor: pointer;
		box-shadow: var(--shadow);
		transition: border-color 0.12s ease, background 0.12s ease, filter 0.12s ease;
	}
	.hand-chip:hover {
		filter: brightness(1.15);
	}
	.hand-chip.active {
		border-color: var(--hc-red);
		background: #2a2020;
	}
	.chip-mult {
		font-size: 11px;
		color: #ffb3b3;
	}
	.hand-chip.active .chip-mult {
		color: #fff;
	}
	.picker-hint {
		font-size: 11px;
		color: var(--muted);
	}

	/* ---- card search ---- */
	.card-row {
		position: relative;
		width: 100%;
	}

	/* ---- search input ---- */
	.search-wrap {
		position: relative;
		width: 100%;
		min-width: 0;
	}
	.search-icon {
		position: absolute;
		left: 11px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		color: rgba(255, 255, 255, 0.5);
		pointer-events: none;
	}
	.search {
		width: 100%;
		background: var(--input-bg);
		border: 1px solid #fff;
		border-radius: var(--radius-input);
		padding: 12px 12px 12px 34px;
		color: #fff;
		font-family: inherit;
		font-size: 14px;
		box-shadow: var(--shadow);
		outline: none;
	}
	.search::placeholder {
		color: rgba(255, 255, 255, 0.4);
	}
	.search:focus {
		border-color: var(--hc-red);
	}
	.search:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* ---- search results (scrollable list of cards) ---- */
	.results {
		position: absolute;
		z-index: 5;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 6px;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 300px;
		overflow-y: auto;
		background: var(--card);
		border: 1px solid #fff;
		border-radius: var(--radius-input);
		box-shadow: var(--shadow);
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
	}
	.results::-webkit-scrollbar {
		width: 10px;
	}
	.results::-webkit-scrollbar-track {
		background: transparent;
		margin: 6px 0;
	}
	.results::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.28);
		border-radius: 999px;
		border: 3px solid transparent;
		background-clip: padding-box;
	}
	.results::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.45);
		background-clip: padding-box;
	}
	.no-results {
		padding: 14px;
		text-align: center;
		color: var(--muted);
		font-size: 13px;
	}
	.result {
		display: flex;
		align-items: center;
		gap: 16px;
		width: 100%;
		background: var(--input-bg);
		border: 1px solid #fff;
		border-radius: 6px;
		box-shadow: var(--shadow);
		padding: 13px 16px;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition: filter 0.12s ease;
	}
	.result:hover {
		filter: brightness(1.15);
	}
	.result-card {
		display: block;
		flex: none;
		width: 54px;
		height: 74px;
		border: 1px solid #fff;
		border-radius: 6px;
		box-shadow: var(--shadow);
		overflow: hidden;
	}
	.result-card img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.result-text {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.result-text .theme {
		font-size: 20px;
		font-weight: 500;
		color: #fff;
		text-shadow: var(--text-shadow);
	}
	.result-text .play {
		font-size: 16px;
		color: #ccc;
	}

	/* "already in your hand" hint — only shows for cards you can still stack a 2nd of */
	.result-have {
		flex: none;
		margin-left: auto;
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
	}
	/* when the hint is present it owns the right-shove, so the + sits snug beside it */
	.result-have + .result-add {
		margin-left: 10px;
	}

	/* plus affordance on the right of each result row */
	.result-add {
		flex: none;
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		background: #fff;
		color: #141414;
		font-size: 26px;
		line-height: 1;
		box-shadow: var(--shadow);
		transition: filter 0.12s ease;
	}
	.result:hover .result-add {
		filter: brightness(0.92);
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

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-top: 16px;
	}
	.field .label {
		font-size: 14px;
		color: #fff;
		text-shadow: var(--text-shadow);
	}

	/* ---- dropzone ---- */
	.dropzone {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 60px;
		background: var(--input-bg);
		border: 1px dashed #fff;
		border-radius: var(--radius-input);
		padding: 12px;
		box-shadow: var(--shadow);
		cursor: pointer;
		text-align: center;
		transition: border-color 0.12s ease, background 0.12s ease;
	}
	.dropzone.drag {
		border-color: var(--hc-red);
		background: #262626;
	}
	.file-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}
	.dz-text {
		font-size: 14px;
		color: #fff;
		text-shadow: var(--text-shadow);
	}
	.dz-name {
		font-size: 12px;
		color: var(--muted);
		word-break: break-all;
	}
	.preview {
		max-height: 120px;
		max-width: 100%;
		border-radius: 8px;
		object-fit: contain;
	}

	/* ---- next ---- */
	.button-spacing {
		padding-top: 24px;
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

	/* ---- success ---- */
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
		font-size: 22px;
	}
	.done p {
		margin: 0;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.75);
	}
	.done .warn {
		color: #ffb020;
	}
</style>
