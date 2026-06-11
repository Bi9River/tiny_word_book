<script lang="ts">
	import { onMount } from 'svelte';
	import { settings } from '$lib/settings';
	import { view } from '$lib/view';
	import { testConnection, fetchWords, syncWordsToCloud } from '$lib/github';
	import LanguageSelect from '$lib/LanguageSelect.svelte';

	type EntryType = 'word' | 'sentence';
	interface Entry {
		type?: EntryType;
		word: string;
		language: string;
		translation: string;
		notes: string;
		created_at: string;
	}

	let currentView: 'loading' | 'settings' | 'dictionary' = 'loading';
	let words: Entry[] = [];
	let currentSha: string | undefined = undefined;

	let searchQuery = '';
	let addingType: EntryType | null = null;
	let editingId: string | null = null;
	let isSaving = false;

	let draft = { word: '', language: '', translation: '', notes: '' };

	$: isEditing = editingId !== null;

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
				w.translation.toLowerCase().includes(q) ||
				(w.notes ?? '').toLowerCase().includes(q)
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
			await testConnection();
			const data = await fetchWords();
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
		draft = { word: '', language: draft.language, translation: '', notes: '' };
	}

	function startEdit(item: Entry) {
		editingId = item.created_at;
		addingType = item.type ?? 'word';
		draft = {
			word: item.word,
			language: item.language ?? '',
			translation: item.translation ?? '',
			notes: item.notes ?? ''
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
		if (!draft.word || !draft.translation || !addingType) return;
		isSaving = true;

		const wasEditing = editingId !== null;
		let updatedWords: Entry[];

		if (wasEditing) {
			updatedWords = words.map((w) =>
				w.created_at === editingId
					? {
							...w,
							type: addingType ?? w.type,
							word: draft.word,
							language: draft.language,
							translation: draft.translation,
							notes: draft.notes
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
				created_at: nextUniqueTimestamp()
			};
			updatedWords = [newEntry, ...words];
		}

		try {
			currentSha = await syncWordsToCloud(updatedWords, currentSha);
			words = updatedWords;
			draft = { word: '', language: '', translation: '', notes: '' };
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
			currentSha = await syncWordsToCloud(updatedWords, currentSha);
			words = updatedWords;
			draft = { word: '', language: '', translation: '', notes: '' };
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
						<textarea
							class="input-serif"
							bind:value={draft.translation}
							placeholder="Translation"
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
							placeholder="Translation"
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
						<blockquote class="sentence-text">{item.word}</blockquote>
						<div class="entry-meta">
							{#if item.language}<span class="lang-tag">{item.language}</span>{/if}
						</div>
						<p class="translation-text">{item.translation}</p>
						{#if item.notes}<p class="notes-text">{item.notes}</p>{/if}
					</article>
				{:else}
					<article class="word-entry">
						<button class="edit-btn" on:click={() => startEdit(item)} aria-label="Edit entry">
							edit
						</button>
						<div class="entry-header">
							<h2 class="word-text">{item.word}</h2>
							{#if item.language}
								<span class="lang-tag">{item.language}</span>
							{/if}
						</div>
						<p class="translation-text">{item.translation}</p>
						{#if item.notes}
							<p class="notes-text">{item.notes}</p>
						{/if}
					</article>
				{/if}
			{/each}
		</div>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		background-color: #fafafa;
		color: #111111;
		-webkit-font-smoothing: antialiased;
	}

	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1.5rem 6rem;
	}

	.center-msg,
	.empty-state {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
		color: #666;
		margin-top: 4rem;
	}

	.word-list {
		margin-top: 2rem;
	}

	.word-entry,
	.sentence-entry {
		position: relative;
		padding: 2rem 3rem 2rem 0;
		border-bottom: 1px solid #e5e5e5;
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
		color: #ccc;
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
		color: #111;
		outline: none;
	}

	@media (hover: none) {
		.edit-btn {
			opacity: 1;
			color: #888;
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
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
		font-size: 2.25rem;
		font-weight: 400;
		letter-spacing: -0.02em;
	}

	.sentence-text {
		margin: 0 0 0.5rem 0;
		padding: 0 0 0 1rem;
		border-left: 2px solid #111;
		font-family: ui-serif, Georgia, Cambria, 'Times New Roman', serif;
		font-style: italic;
		font-size: 1.4rem;
		line-height: 1.5;
		color: #111;
	}

	.entry-meta {
		margin-bottom: 0.5rem;
	}

	.lang-tag {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #888;
	}

	.translation-text {
		margin: 0 0 0.5rem 0;
		font-family: ui-serif, Georgia, Cambria, 'Times New Roman', serif;
		font-size: 1.125rem;
		line-height: 1.6;
		color: #222;
	}

	.notes-text {
		margin: 0;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
		line-height: 1.5;
		color: #666;
	}

	.dict-header {
		position: sticky;
		top: 0;
		background: #fafafa;
		padding: 1rem 0;
		border-bottom: 2px solid #111;
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
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 1rem;
		padding: 0;
		outline: none;
	}

	.search-bar::placeholder {
		color: #aaa;
	}

	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.seg {
		display: inline-flex;
		border: 1px solid #ddd;
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
		color: #666;
		cursor: pointer;
		border-right: 1px solid #ddd;
	}
	.seg-btn:last-child {
		border-right: none;
	}
	.seg-btn:hover {
		color: #111;
	}
	.seg-btn.active {
		background: #111;
		color: #fff;
	}

	.lang-filter {
		appearance: none;
		-webkit-appearance: none;
		background: transparent;
		border: 1px solid #ddd;
		padding: 0.35rem 1.75rem 0.35rem 0.6rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.75rem;
		color: #333;
		cursor: pointer;
		border-radius: 0;
		background-image: linear-gradient(45deg, transparent 50%, #888 50%),
			linear-gradient(135deg, #888 50%, transparent 50%);
		background-position: calc(100% - 12px) 50%, calc(100% - 7px) 50%;
		background-size: 5px 5px, 5px 5px;
		background-repeat: no-repeat;
	}
	.lang-filter:focus {
		outline: none;
		border-color: #111;
	}

	.add-buttons {
		display: flex;
		gap: 0.75rem;
	}

	.add-trigger {
		flex: 1;
		text-align: left;
		background: transparent;
		border: 1px dashed #ccc;
		padding: 1rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
		cursor: pointer;
		color: #666;
		transition: border-color 0.2s;
	}
	.add-trigger:hover {
		border-color: #111;
		color: #111;
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
		color: #888;
	}

	.form-row {
		display: flex;
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
		background: #f0f0f0;
		padding: 0.75rem;
		border-radius: 0;
		outline: none;
		resize: vertical;
	}

	.add-form input:focus,
	.add-form textarea:focus {
		background: #e8e8e8;
	}

	.input-mono.massive {
		flex: 1;
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

	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	button {
		appearance: none;
		border: none;
		font-family: ui-sans-serif, sans-serif;
	}

	.primary-btn {
		background: #111;
		color: #fff;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.primary-btn:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.text-btn {
		background: transparent;
		color: #666;
		padding: 0;
		font-size: 0.875rem;
		text-decoration: underline;
		cursor: pointer;
	}
	.text-btn:hover {
		color: #111;
	}

	.text-btn.danger {
		color: #b00020;
		margin-left: auto;
	}
	.text-btn.danger:hover {
		color: #7a0016;
	}

	.config-view h1 {
		font-family: ui-serif, serif;
		font-size: 2rem;
		font-weight: normal;
		margin: 0 0 0.5rem 0;
	}
	.config-view p {
		font-family: ui-sans-serif, sans-serif;
		font-size: 0.875rem;
		color: #666;
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
		color: #333;
	}
	.field input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.75rem;
		border: 1px solid #ccc;
		background: transparent;
		font-family: ui-monospace, monospace;
		font-size: 0.875rem;
		outline: none;
	}
	.field input:focus {
		border-color: #111;
	}
</style>
