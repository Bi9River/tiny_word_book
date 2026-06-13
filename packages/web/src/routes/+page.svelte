<script lang="ts">
	import { onMount } from 'svelte';
	import { settings } from '$lib/settings';
	import { view } from '$lib/view';
	import { theme, toggleTheme } from '$lib/theme';
	import LanguageSelect from '$lib/LanguageSelect.svelte';
	import {
		testConnection,
		fetchWords,
		syncWordsToCloud,
		resolveLanguage,
		swedishOrdklasser,
		highlight,
		type Entry,
		type EntryType
	} from '@tiny-word-book/shared';

	let currentView: 'loading' | 'settings' | 'dictionary' = 'loading';
	let words: Entry[] = [];
	let currentSha: string | undefined = undefined;

	let searchQuery = '';
	let addingType: EntryType | null = null;
	let editingId: string | null = null;
	let isSaving = false;

	let draft = { word: '', language: '', translation: '', notes: '', pos: '' };

	$: isEditing = editingId !== null;
	$: isSwedishDraft = resolveLanguage(draft.language)?.code === 'sv';

	$: availableLanguages = Array.from(
		new Set(words.map((w) => w.language).filter((l): l is string => Boolean(l)))
	).sort((a, b) => a.localeCompare(b));

	$: filteredWords = (() => {
		const q = searchQuery.trim().toLowerCase();
		const { typeFilter, languageFilter } = $view;
		const matched = words.filter((w) => {
			const entryType = w.type ?? 'word';
			if (typeFilter !== 'all' && entryType !== typeFilter) return false;
			if (languageFilter && w.language !== languageFilter) return false;
			if (!q) return true;
			return (
				w.word.toLowerCase().includes(q) ||
				(w.translation ?? '').toLowerCase().includes(q) ||
				(w.notes ?? '').toLowerCase().includes(q) ||
				(w.pos ?? '').toLowerCase().includes(q)
			);
		});

		if (!q) return matched;

		const wordsFirst: Entry[] = [];
		const sentencesAfter: Entry[] = [];
		for (const w of matched) {
			if ((w.type ?? 'word') === 'word') wordsFirst.push(w);
			else sentencesAfter.push(w);
		}
		return [...wordsFirst, ...sentencesAfter];
	})();

	onMount(async () => {
		if (!$settings.token || !$settings.repo || !$settings.username) {
			currentView = 'settings';
			return;
		}
		await loadDictionary();
	});

	async function loadDictionary() {
		currentView = 'loading';
		try {
			await testConnection($settings);
			const data = await fetchWords($settings);
			words = data.words;
			currentSha = data.sha;
			currentView = 'dictionary';
		} catch (error) {
			console.error(error);
			alert('Failed to connect. Please check your config.');
			currentView = 'settings';
		}
	}

	function startAdd(type: EntryType) {
		editingId = null;
		addingType = type;
		draft = { word: '', language: draft.language, translation: '', notes: '', pos: '' };
	}

	function startEdit(item: Entry) {
		editingId = item.created_at;
		addingType = item.type ?? 'word';
		draft = {
			word: item.word,
			language: item.language ?? '',
			translation: item.translation ?? '',
			notes: item.notes ?? '',
			pos: item.pos ?? ''
		};
	}

	function closeForm() {
		addingType = null;
		editingId = null;
	}

	function nextUniqueTimestamp(): string {
		const taken = new Set(words.map((w) => w.created_at));
		let ts = new Date().toISOString();
		while (taken.has(ts)) {
			ts = new Date(Date.parse(ts) + 1).toISOString();
		}
		return ts;
	}

	async function saveEntry() {
		if (!draft.word || !addingType) return;
		isSaving = true;

		const wasEditing = editingId !== null;
		let updatedWords: Entry[];

		const posForType = addingType === 'word' && isSwedishDraft ? draft.pos : '';

		if (wasEditing) {
			updatedWords = words.map((w) =>
				w.created_at === editingId
					? {
							...w,
							type: addingType ?? w.type,
							word: draft.word,
							language: draft.language,
							translation: draft.translation,
							notes: draft.notes,
							pos: posForType
						}
					: w
			);
		} else {
			const newEntry: Entry = {
				type: addingType,
				word: draft.word,
				language: draft.language,
				translation: draft.translation,
				notes: draft.notes,
				pos: posForType,
				created_at: nextUniqueTimestamp()
			};
			updatedWords = [newEntry, ...words];
		}

		try {
			currentSha = await syncWordsToCloud($settings, updatedWords, currentSha);
			words = updatedWords;
			draft = { word: '', language: '', translation: '', notes: '', pos: '' };
			addingType = null;
			editingId = null;
			if (!wasEditing) searchQuery = '';
		} catch (error) {
			alert('Failed to save entry.');
			console.error(error);
		} finally {
			isSaving = false;
		}
	}

	async function deleteEntry() {
		if (!editingId) return;
		if (!confirm('Delete this entry? This cannot be undone.')) return;
		isSaving = true;

		const updatedWords = words.filter((w) => w.created_at !== editingId);

		try {
			currentSha = await syncWordsToCloud($settings, updatedWords, currentSha);
			words = updatedWords;
			draft = { word: '', language: '', translation: '', notes: '', pos: '' };
			addingType = null;
			editingId = null;
		} catch (error) {
			alert('Failed to delete entry.');
			console.error(error);
		} finally {
			isSaving = false;
		}
	}

	let tempUsername = $settings.username;
	let tempRepo = $settings.repo;
	let tempToken = $settings.token;

	function saveConfig() {
		$settings = { username: tempUsername, repo: tempRepo, token: tempToken };
		loadDictionary();
	}
</script>

<main>
	{#if currentView === 'loading'}
		<div class="center-msg">Loading identity...</div>
	{:else if currentView === 'settings'}
		<section class="config-view">
			<header>
				<h1>Configuration</h1>
				<p>Establish connection to your private repository.</p>
			</header>

			<div class="field">
				<label for="username">GitHub Username</label>
				<input id="username" type="text" bind:value={tempUsername} placeholder="e.g. Bi9River" />
			</div>

			<div class="field">
				<label for="repo">Private Repository</label>
				<input id="repo" type="text" bind:value={tempRepo} placeholder="e.g. vocab_data" />
			</div>

			<div class="field">
				<label for="token">Access Token (PAT)</label>
				<input id="token" type="password" bind:value={tempToken} placeholder="ghp_..." />
			</div>

			<button class="primary-btn" on:click={saveConfig}>Save configuration</button>
		</section>
	{:else if currentView === 'dictionary'}
		<header class="dict-header">
			<div class="toolbar">
				<input
					type="text"
					class="search-bar"
					bind:value={searchQuery}
					placeholder="Search entries..."
				/>
				<button class="text-btn" on:click={toggleTheme} aria-label="Toggle theme">
					{$theme === 'dark' ? 'Light' : 'Dark'}
				</button>
				<button class="text-btn" on:click={() => (currentView = 'settings')}>Config</button>
			</div>

			<div class="filter-bar">
				<div class="seg" role="tablist" aria-label="Type filter">
					<button
						class="seg-btn"
						class:active={$view.typeFilter === 'all'}
						on:click={() => view.update((v) => ({ ...v, typeFilter: 'all' }))}
					>
						All
					</button>
					<button
						class="seg-btn"
						class:active={$view.typeFilter === 'word'}
						on:click={() => view.update((v) => ({ ...v, typeFilter: 'word' }))}
					>
						Words
					</button>
					<button
						class="seg-btn"
						class:active={$view.typeFilter === 'sentence'}
						on:click={() => view.update((v) => ({ ...v, typeFilter: 'sentence' }))}
					>
						Sentences
					</button>
				</div>

				<select
					class="lang-filter"
					value={$view.languageFilter}
					on:change={(e) =>
						view.update((v) => ({ ...v, languageFilter: e.currentTarget.value }))}
				>
					<option value="">All languages</option>
					{#each availableLanguages as lang}
						<option value={lang}>{lang}</option>
					{/each}
				</select>
			</div>

			{#if !addingType}
				<div class="add-buttons">
					<button class="add-trigger" on:click={() => startAdd('word')}>+ Add word</button>
					<button class="add-trigger" on:click={() => startAdd('sentence')}>+ Add sentence</button>
				</div>
			{:else}
				<div class="add-form">
					<div class="form-meta">
						{#if isEditing}
							{addingType === 'word' ? 'Edit word' : 'Edit sentence'}
						{:else}
							{addingType === 'word' ? 'New word' : 'New sentence'}
						{/if}
					</div>

					{#if addingType === 'word'}
						<div class="form-row">
							<input
								class="input-mono massive"
								type="text"
								bind:value={draft.word}
								placeholder="Word"
								autofocus
							/>
							<div class="lang-slot">
								<LanguageSelect bind:value={draft.language} />
							</div>
						</div>
						{#if isSwedishDraft}
							<select class="pos-select" bind:value={draft.pos}>
								<option value="">Ordklass (optional)</option>
								{#each swedishOrdklasser as ord}
									<option value={ord}>{ord}</option>
								{/each}
							</select>
						{/if}
						<textarea
							class="input-serif"
							bind:value={draft.translation}
							placeholder="Translation (optional)"
						></textarea>
					{:else}
						<textarea
							class="input-serif sentence-input"
							bind:value={draft.word}
							placeholder="Sentence"
						></textarea>
						<div class="lang-slot solo">
							<LanguageSelect bind:value={draft.language} />
						</div>
						<textarea
							class="input-serif"
							bind:value={draft.translation}
							placeholder="Translation (optional)"
						></textarea>
					{/if}

					<textarea
						class="input-sans notes"
						bind:value={draft.notes}
						placeholder="Notes (optional)"
					></textarea>

					<div class="form-actions">
						<button class="primary-btn" on:click={saveEntry} disabled={isSaving}>
							{isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Save entry'}
						</button>
						<button class="text-btn" on:click={closeForm} disabled={isSaving}>Cancel</button>
						{#if isEditing}
							<button class="text-btn danger" on:click={deleteEntry} disabled={isSaving}>
								Delete
							</button>
						{/if}
					</div>
				</div>
			{/if}
		</header>

		<div class="word-list">
			{#if filteredWords.length === 0}
				<div class="empty-state">No entries found.</div>
			{/if}

			{#each filteredWords as item (item.created_at)}
				{#if item.type === 'sentence'}
					<article class="sentence-entry">
						<button class="edit-btn" on:click={() => startEdit(item)} aria-label="Edit entry">
							edit
						</button>
						<blockquote class="sentence-text">{@html highlight(item.word, searchQuery)}</blockquote>
						<div class="entry-meta">
							{#if item.language}<span class="lang-tag">{item.language}</span>{/if}
						</div>
						{#if item.translation}
							<p class="translation-text">{@html highlight(item.translation, searchQuery)}</p>
						{/if}
						{#if item.notes}
							<p class="notes-text">{@html highlight(item.notes, searchQuery)}</p>
						{/if}
					</article>
				{:else}
					<article class="word-entry">
						<button class="edit-btn" on:click={() => startEdit(item)} aria-label="Edit entry">
							edit
						</button>
						<div class="entry-header">
							<h2 class="word-text">{@html highlight(item.word, searchQuery)}</h2>
							{#if item.language}
								<span class="lang-tag">{item.language}</span>
							{/if}
							{#if item.pos}
								<span class="pos-tag">{item.pos}</span>
							{/if}
						</div>
						{#if item.translation}
							<p class="translation-text">{@html highlight(item.translation, searchQuery)}</p>
						{/if}
						{#if item.notes}
							<p class="notes-text">{@html highlight(item.notes, searchQuery)}</p>
						{/if}
					</article>
				{/if}
			{/each}
		</div>
	{/if}
</main>

<style>
	:global(:root) {
		--bg: #fafafa;
		--fg: #111111;
		--fg-strong: #000000;
		--fg-mid: #333333;
		--fg-dim: #444444;
		--fg-muted: #666666;
		--fg-faint: #888888;
		--placeholder: #aaaaaa;
		--hairline: #cccccc;
		--hairline-2: #dddddd;
		--separator: #e5e5e5;
		--input-bg: #f0f0f0;
		--input-bg-focus: #e8e8e8;
		--primary-bg: #111111;
		--primary-fg: #ffffff;
		--primary-fg-muted: #cccccc;
		--surface: #ffffff;
		--danger: #b00020;
		--danger-hover: #7a0016;
	}

	:global([data-theme='dark']) {
		--bg: #0e0e0e;
		--fg: #ededed;
		--fg-strong: #ffffff;
		--fg-mid: #c8c8c8;
		--fg-dim: #b0b0b0;
		--fg-muted: #909090;
		--fg-faint: #707070;
		--placeholder: #555555;
		--hairline: #3a3a3a;
		--hairline-2: #2a2a2a;
		--separator: #232323;
		--input-bg: #1c1c1c;
		--input-bg-focus: #262626;
		--primary-bg: #ededed;
		--primary-fg: #0e0e0e;
		--primary-fg-muted: #555555;
		--surface: #181818;
		--danger: #ff7373;
		--danger-hover: #ff9999;
	}

	:global(body) {
		margin: 0;
		background-color: var(--bg);
		color: var(--fg);
		-webkit-font-smoothing: antialiased;
	}

	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1.5rem calc(4rem + env(safe-area-inset-bottom));
	}

	.center-msg,
	.empty-state {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
		color: var(--fg-muted);
		margin-top: 4rem;
	}

	.word-list {
		margin-top: 2rem;
	}

	.word-entry,
	.sentence-entry {
		position: relative;
		padding: 2rem 3rem 2rem 0;
		border-bottom: 1px solid var(--separator);
	}

	.edit-btn {
		position: absolute;
		top: 1.5rem;
		right: 0;
		appearance: none;
		background: transparent;
		border: none;
		padding: 0.25rem 0.4rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--hairline);
		cursor: pointer;
		opacity: 0.5;
		transition:
			opacity 0.15s,
			color 0.15s;
	}

	.word-entry:hover .edit-btn,
	.sentence-entry:hover .edit-btn,
	.edit-btn:focus {
		opacity: 1;
		color: var(--fg);
		outline: none;
	}

	@media (hover: none) {
		.edit-btn {
			opacity: 1;
			color: var(--fg-faint);
		}
	}

	.entry-header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.word-text {
		margin: 0;
		min-width: 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 2.25rem;
		font-weight: 400;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
		color: var(--fg);
	}

	.sentence-text {
		margin: 0 0 0.5rem 0;
		padding: 0 0 0 1rem;
		border-left: 2px solid var(--fg);
		font-family: ui-serif, Georgia, Cambria, 'Times New Roman', serif;
		font-style: italic;
		font-size: 1.4rem;
		line-height: 1.5;
		color: var(--fg);
	}

	.entry-meta {
		margin-bottom: 0.5rem;
	}

	.lang-tag {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-faint);
	}

	.pos-tag {
		font-family: ui-serif, Georgia, Cambria, 'Times New Roman', serif;
		font-style: italic;
		font-size: 0.8125rem;
		color: var(--fg-muted);
	}

	.translation-text {
		margin: 0 0 0.5rem 0;
		font-family: ui-serif, Georgia, Cambria, 'Times New Roman', serif;
		font-size: 1.125rem;
		line-height: 1.6;
		color: var(--fg-mid);
	}

	.notes-text {
		margin: 0;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--fg-muted);
	}

	:global(.hl) {
		font-weight: 700;
		color: var(--fg-strong);
		background: transparent;
	}

	.dict-header {
		position: sticky;
		top: 0;
		background: var(--bg);
		padding: 1rem 0;
		border-bottom: 2px solid var(--fg);
		z-index: 10;
	}

	.toolbar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.search-bar {
		flex: 1;
		appearance: none;
		border: none;
		background: transparent;
		color: var(--fg);
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 1rem;
		padding: 0;
		outline: none;
	}

	.search-bar::placeholder {
		color: var(--placeholder);
	}

	.filter-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.seg {
		display: inline-flex;
		border: 1px solid var(--hairline-2);
	}

	.seg-btn {
		appearance: none;
		background: transparent;
		border: none;
		padding: 0.35rem 0.75rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-muted);
		cursor: pointer;
		border-right: 1px solid var(--hairline-2);
	}
	.seg-btn:last-child {
		border-right: none;
	}
	.seg-btn:hover {
		color: var(--fg);
	}
	.seg-btn.active {
		background: var(--primary-bg);
		color: var(--primary-fg);
	}

	.lang-filter {
		appearance: none;
		-webkit-appearance: none;
		background: transparent;
		border: 1px solid var(--hairline-2);
		padding: 0.35rem 1.75rem 0.35rem 0.6rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.75rem;
		color: var(--fg-mid);
		cursor: pointer;
		border-radius: 0;
		background-image: linear-gradient(45deg, transparent 50%, var(--fg-faint) 50%),
			linear-gradient(135deg, var(--fg-faint) 50%, transparent 50%);
		background-position: calc(100% - 12px) 50%, calc(100% - 7px) 50%;
		background-size: 5px 5px, 5px 5px;
		background-repeat: no-repeat;
	}
	.lang-filter:focus {
		outline: none;
		border-color: var(--fg);
	}

	.add-buttons {
		display: flex;
		gap: 0.75rem;
	}

	.add-trigger {
		flex: 1;
		text-align: left;
		background: transparent;
		border: 1px dashed var(--hairline);
		padding: 1rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
		cursor: pointer;
		color: var(--fg-muted);
		transition: border-color 0.2s;
	}
	.add-trigger:hover {
		border-color: var(--fg);
		color: var(--fg);
	}

	.add-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-meta {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--fg-faint);
	}

	.form-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: stretch;
	}

	.lang-slot {
		width: 200px;
		flex-shrink: 0;
	}

	.lang-slot.solo {
		width: 100%;
	}

	.add-form input,
	.add-form textarea {
		appearance: none;
		border: 1px solid transparent;
		background: var(--input-bg);
		color: var(--fg);
		padding: 0.75rem;
		border-radius: 0;
		outline: none;
		resize: vertical;
	}

	.add-form input:focus,
	.add-form textarea:focus {
		background: var(--input-bg-focus);
	}

	.input-mono.massive {
		flex: 1 1 200px;
		min-width: 0;
		font-family: ui-monospace, monospace;
		font-size: 1.5rem;
	}

	.input-serif {
		font-family: ui-serif, serif;
		font-size: 1.125rem;
		min-height: 3rem;
	}

	.sentence-input {
		font-style: italic;
		min-height: 5rem;
	}

	.input-sans.notes {
		font-family: ui-sans-serif, sans-serif;
		font-size: 0.875rem;
		min-height: 3rem;
	}

	.pos-select {
		appearance: none;
		-webkit-appearance: none;
		background: var(--input-bg);
		color: var(--fg);
		border: 1px solid transparent;
		padding: 0.5rem 1.75rem 0.5rem 0.6rem;
		border-radius: 0;
		outline: none;
		font-family: ui-serif, Georgia, Cambria, 'Times New Roman', serif;
		font-style: italic;
		font-size: 0.9375rem;
		align-self: flex-start;
		background-image: linear-gradient(45deg, transparent 50%, var(--fg-faint) 50%),
			linear-gradient(135deg, var(--fg-faint) 50%, transparent 50%);
		background-position: calc(100% - 12px) 50%, calc(100% - 7px) 50%;
		background-size: 5px 5px, 5px 5px;
		background-repeat: no-repeat;
	}
	.pos-select:focus {
		background-color: var(--input-bg-focus);
	}

	.form-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	button {
		appearance: none;
		border: none;
		font-family: ui-sans-serif, sans-serif;
	}

	.primary-btn {
		background: var(--primary-bg);
		color: var(--primary-fg);
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.primary-btn:disabled {
		background: var(--hairline);
		cursor: not-allowed;
	}

	.text-btn {
		background: transparent;
		color: var(--fg-muted);
		padding: 0;
		font-size: 0.875rem;
		text-decoration: underline;
		cursor: pointer;
	}
	.text-btn:hover {
		color: var(--fg);
	}

	.text-btn.danger {
		color: var(--danger);
		margin-left: auto;
	}
	.text-btn.danger:hover {
		color: var(--danger-hover);
	}

	.config-view h1 {
		font-family: ui-serif, serif;
		font-size: 2rem;
		font-weight: normal;
		margin: 0 0 0.5rem 0;
		color: var(--fg);
	}
	.config-view p {
		font-family: ui-sans-serif, sans-serif;
		font-size: 0.875rem;
		color: var(--fg-muted);
		margin-bottom: 2rem;
	}

	.field {
		margin-bottom: 1.5rem;
	}
	.field label {
		display: block;
		font-family: ui-sans-serif, sans-serif;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
		color: var(--fg-mid);
	}
	.field input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.75rem;
		border: 1px solid var(--hairline);
		background: transparent;
		color: var(--fg);
		font-family: ui-monospace, monospace;
		font-size: 0.875rem;
		outline: none;
	}
	.field input:focus {
		border-color: var(--fg);
	}

	@media (max-width: 480px) {
		main {
			padding: 1.25rem 1rem calc(3rem + env(safe-area-inset-bottom));
		}

		.dict-header {
			padding: 0.75rem 0;
		}

		.toolbar {
			gap: 0.75rem;
			margin-bottom: 0.75rem;
		}

		.search-bar {
			font-size: 0.9375rem;
		}

		.filter-bar {
			gap: 0.5rem;
			margin-bottom: 0.75rem;
		}

		.seg-btn {
			padding: 0.4rem 0.6rem;
		}

		.lang-filter {
			max-width: 50%;
		}

		.add-buttons {
			gap: 0.5rem;
		}

		.add-trigger {
			padding: 0.75rem;
			text-align: center;
		}

		.word-list {
			margin-top: 1.25rem;
		}

		.word-entry,
		.sentence-entry {
			padding: 1.25rem 2.5rem 1.25rem 0;
		}

		.edit-btn {
			top: 1rem;
		}

		.word-text {
			font-size: 1.75rem;
		}

		.sentence-text {
			font-size: 1.15rem;
			padding-left: 0.75rem;
		}

		.translation-text {
			font-size: 1rem;
		}

		.input-mono.massive {
			font-size: 1.25rem;
		}

		.input-serif {
			font-size: 1rem;
		}

		.lang-slot {
			width: 100%;
		}

		.config-view h1 {
			font-size: 1.6rem;
		}
	}
</style>
