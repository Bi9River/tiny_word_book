<script lang="ts">
	import { onMount } from 'svelte';
	import { settings } from '$lib/settings';
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
	let isSaving = false;

	let draft = { word: '', language: '', translation: '', notes: '' };

	$: filteredWords = words.filter(
		(w) =>
			w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
			w.translation.toLowerCase().includes(searchQuery.toLowerCase())
	);

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
		addingType = type;
		draft = { word: '', language: draft.language, translation: '', notes: '' };
	}

	function cancelAdd() {
		addingType = null;
	}

	async function saveEntry() {
		if (!draft.word || !draft.translation || !addingType) return;
		isSaving = true;

		const newEntry: Entry = {
			type: addingType,
			word: draft.word,
			language: draft.language,
			translation: draft.translation,
			notes: draft.notes,
			created_at: new Date().toISOString()
		};

		const updatedWords = [newEntry, ...words];

		try {
			currentSha = await syncWordsToCloud(updatedWords, currentSha);
			words = updatedWords;
			draft = { word: '', language: '', translation: '', notes: '' };
			addingType = null;
			searchQuery = '';
		} catch (error) {
			alert('Failed to save entry.');
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

			{#if !addingType}
				<div class="add-buttons">
					<button class="add-trigger" on:click={() => startAdd('word')}>+ Add word</button>
					<button class="add-trigger" on:click={() => startAdd('sentence')}>+ Add sentence</button>
				</div>
			{:else}
				<div class="add-form">
					<div class="form-meta">
						{addingType === 'word' ? 'New word' : 'New sentence'}
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
							{isSaving ? 'Saving...' : 'Save entry'}
						</button>
						<button class="text-btn" on:click={cancelAdd} disabled={isSaving}>Cancel</button>
					</div>
				</div>
			{/if}
		</header>

		<div class="word-list">
			{#if filteredWords.length === 0}
				<div class="empty-state">No entries found.</div>
			{/if}

			{#each filteredWords as item}
				{#if item.type === 'sentence'}
					<article class="sentence-entry">
						<blockquote class="sentence-text">{item.word}</blockquote>
						<div class="entry-meta">
							{#if item.language}<span class="lang-tag">{item.language}</span>{/if}
						</div>
						<p class="translation-text">{item.translation}</p>
						{#if item.notes}<p class="notes-text">{item.notes}</p>{/if}
					</article>
				{:else}
					<article class="word-entry">
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
		padding: 2rem 0;
		border-bottom: 1px solid #e5e5e5;
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
