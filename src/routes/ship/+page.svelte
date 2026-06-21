<script lang="ts">
	import { enhance } from '$app/forms';
	import Backdrop from '$lib/components/Backdrop.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errors = $derived<Record<string, string>>(
		form && 'errors' in form ? (form.errors ?? {}) : {}
	);
	const values = $derived<Record<string, string>>(
		form && 'values' in form ? (form.values ?? {}) : {}
	);

	let submitting = $state(false);

	// ---- screenshot drag & drop ----
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
			fileInput.files = dt.files; // so it submits with the form
			setFile(dt.files);
		}
	}
</script>

<svelte:head>
	<title>Ship your project · Horizons Nexus</title>
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
			enctype="multipart/form-data"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<h1>Ship your project</h1>

			{#if errors.form}
				<p class="form-error">{errors.form}</p>
			{/if}

			<div class="field">
				<label for="projectName">Project Name</label>
				<input
					id="projectName"
					name="projectName"
					class="input"
					class:invalid={errors.projectName}
					placeholder="Podium Pro Max Ultra"
					value={values.projectName ?? ''}
					autocomplete="off"
				/>
				{#if errors.projectName}<span class="err">{errors.projectName}</span>{/if}
			</div>

			<div class="field">
				<span class="label">Screenshot</span>
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
						name="screenshot"
						accept="image/*"
						class="file-input"
						onchange={() => setFile(fileInput?.files ?? null)}
					/>
					{#if previewUrl}
						<img class="preview" src={previewUrl} alt="Screenshot preview" />
						<span class="dz-name">{fileName}</span>
					{:else}
						<span class="dz-text">Drag and drop a screenshot</span>
					{/if}
				</label>
				{#if errors.screenshot}<span class="err">{errors.screenshot}</span>{/if}
			</div>

			<div class="field">
				<label for="playableLink">Playable Link</label>
				<input
					id="playableLink"
					name="playableLink"
					class="input"
					class:invalid={errors.playableLink}
					placeholder="https://your-project.com"
					value={values.playableLink ?? ''}
					inputmode="url"
				/>
				{#if errors.playableLink}<span class="err">{errors.playableLink}</span>{/if}
			</div>

			<div class="field">
				<label for="githubRepo">Github Repo Link</label>
				<input
					id="githubRepo"
					name="githubRepo"
					class="input"
					class:invalid={errors.githubRepo}
					placeholder="https://github.com/you/project"
					value={values.githubRepo ?? ''}
					inputmode="url"
				/>
				{#if errors.githubRepo}<span class="err">{errors.githubRepo}</span>{/if}
			</div>

			<div class="field">
				<label for="description">Project Description (Pulled from Github)</label>
				<textarea
					id="description"
					name="description"
					class="input textarea"
					class:invalid={errors.description}
					placeholder="Introducing the new Podium Pro Max Ultra!"
					rows="3">{values.description ?? ''}</textarea
				>
				{#if errors.description}<span class="err">{errors.description}</span>{/if}
			</div>

			<div class="field">
				<label for="hackatime">Hackatime Project Name</label>
				<input
					id="hackatime"
					name="hackatime"
					class="input"
					class:invalid={errors.hackatime}
					placeholder="my-cool-project"
					value={values.hackatime ?? ''}
					autocomplete="off"
				/>
				{#if errors.hackatime}<span class="err">{errors.hackatime}</span>{/if}
			</div>

			<div class="field">
				<label for="hours">Estimated Hours Spent</label>
				<span class="hint">If you’re tracking time with hackatime, put that number here.</span>
				<input
					id="hours"
					name="hours"
					class="input"
					class:invalid={errors.hours}
					placeholder="0"
					inputmode="decimal"
					value={values.hours ?? ''}
				/>
				{#if errors.hours}<span class="err">{errors.hours}</span>{/if}
			</div>

			<div class="button-spacing">
				<button class="submit" type="submit" disabled={submitting}>
					{submitting ? 'Submitting…' : 'Next'}
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
		gap: 8px;
		background: var(--card);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		border-radius: var(--radius-card);
		padding: 25px 26px;
		box-shadow: var(--shadow);
	}

	h1 {
		margin: 0 0 0;
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

	.field label,
	.field .label {
		font-size: 14px;
		font-weight: 400;
		color: #fff;
		text-shadow: var(--text-shadow);
	}

	.hint {
		font-size: 12px;
		color: var(--muted);
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
	.textarea {
		resize: vertical;
		min-height: 76px;
		line-height: 1.4;
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

	/* ---- submit ---- */
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
		cursor: progress;
	}
</style>
