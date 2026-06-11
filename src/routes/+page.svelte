<script lang="ts">
	import { onMount } from 'svelte';
	import { settings } from '$lib/settings';
	import { testConnection, fetchWords, syncWordsToCloud } from '$lib/github';

	// 视图状态
	let currentView: 'loading' | 'settings' | 'dictionary' = 'loading';
	
	// 单词本数据
	let words: any[] = [];
	let currentSha: string | undefined = undefined;
	
	// 搜索与表单
	let searchQuery = '';
	let isAdding = false;
	let isSaving = false;
	
	// 新单词草稿
	let draft = { word: '', language: '', translation: '', notes: '' };

	// 响应式搜索过滤
	$: filteredWords = words.filter(w => 
		w.word.toLowerCase().includes(searchQuery.toLowerCase()) || 
		w.translation.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// 初始化与鉴权
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
			// 先测试连通性
			await testConnection();
			// 拉取数据
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

	async function saveEntry() {
		if (!draft.word || !draft.translation) return;
		isSaving = true;
		
		const newWord = {
			...draft,
			created_at: new Date().toISOString()
		};

		// 插入到数组最前面
		const updatedWords = [newWord, ...words];

		try {
			// 同步到 GitHub
			currentSha = await syncWordsToCloud(updatedWords, currentSha);
			words = updatedWords;
			
			// 重置表单
			draft = { word: '', language: '', translation: '', notes: '' };
			isAdding = false;
			searchQuery = ''; // 清楚搜索以便看到新单词
		} catch (error) {
			alert('Failed to save entry.');
			console.error(error);
		} finally {
			isSaving = false;
		}
	}

	// 设置页面的局部状态
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
				<input type="text" class="search-bar" bind:value={searchQuery} placeholder="Search entries..." />
				<button class="text-btn" on:click={() => currentView = 'settings'}>Config</button>
			</div>
			
			{#if !isAdding}
				<button class="add-trigger" on:click={() => isAdding = true}>+ Add entry</button>
			{:else}
				<div class="add-form">
					<div class="form-row">
						<input class="input-mono massive" type="text" bind:value={draft.word} placeholder="Word" autofocus />
						<input class="input-sans small" type="text" bind:value={draft.language} placeholder="Lang (e.g. en, ja)" />
					</div>
					<textarea class="input-serif" bind:value={draft.translation} placeholder="Translation"></textarea>
					<textarea class="input-sans notes" bind:value={draft.notes} placeholder="Notes (optional)"></textarea>
					
					<div class="form-actions">
						<button class="primary-btn" on:click={saveEntry} disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save entry'}
						</button>
						<button class="text-btn" on:click={() => isAdding = false} disabled={isSaving}>Cancel</button>
					</div>
				</div>
			{/if}
		</header>

		<div class="word-list">
			{#if filteredWords.length === 0}
				<div class="empty-state">No entries found.</div>
			{/if}

			{#each filteredWords as item}
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
			{/each}
		</div>
	{/if}
</main>

<style>
	/* -- 设计系统 (Tokens) -- */
	:global(body) {
		margin: 0;
		background-color: #FAFAFA;
		color: #111111;
		-webkit-font-smoothing: antialiased;
	}

	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1.5rem 6rem;
	}

	/* 排版基础 */
	.center-msg, .empty-state {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
		color: #666;
		margin-top: 4rem;
	}

	/* -- 字典正文排版 (The Signature) -- */
	.word-list {
		margin-top: 2rem;
	}

	.word-entry {
		padding: 2rem 0;
		border-bottom: 1px solid #E5E5E5; /* 结构性极细分隔线 */
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

	.lang-tag {
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #888;
	}

	.translation-text {
		margin: 0 0 0.5rem 0;
		font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
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

	/* -- 顶部工具栏与表单 -- */
	.dict-header {
		position: sticky;
		top: 0;
		background: #FAFAFA;
		padding: 1rem 0;
		border-bottom: 2px solid #111; /* 顶部的粗结构线 */
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

	.search-bar::placeholder { color: #aaa; }

	.add-trigger {
		width: 100%;
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
	.add-trigger:hover { border-color: #111; color: #111; }

	/* 新增表单排版 */
	.add-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-row {
		display: flex;
		gap: 1rem;
	}

	.add-form input, .add-form textarea {
		appearance: none;
		border: 1px solid transparent;
		background: #F0F0F0;
		padding: 0.75rem;
		border-radius: 0;
		outline: none;
		resize: vertical;
	}
	
	.add-form input:focus, .add-form textarea:focus { background: #E8E8E8; }

	.input-mono.massive {
		flex: 1;
		font-family: ui-monospace, monospace;
		font-size: 1.5rem;
	}
	
	.input-sans.small {
		width: 80px;
		font-family: ui-sans-serif, sans-serif;
		font-size: 0.875rem;
	}

	.input-serif {
		font-family: ui-serif, serif;
		font-size: 1.125rem;
		min-height: 3rem;
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

	/* -- 按钮体系 -- */
	button { appearance: none; border: none; font-family: ui-sans-serif, sans-serif; }
	
	.primary-btn {
		background: #111;
		color: #fff;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.primary-btn:disabled { background: #ccc; cursor: not-allowed; }

	.text-btn {
		background: transparent;
		color: #666;
		padding: 0;
		font-size: 0.875rem;
		text-decoration: underline;
		cursor: pointer;
	}
	.text-btn:hover { color: #111; }

	/* -- 设置视图 -- */
	.config-view h1 { font-family: ui-serif, serif; font-size: 2rem; font-weight: normal; margin: 0 0 0.5rem 0;}
	.config-view p { font-family: ui-sans-serif, sans-serif; font-size: 0.875rem; color: #666; margin-bottom: 2rem; }
	
	.field { margin-bottom: 1.5rem; }
	.field label { display: block; font-family: ui-sans-serif, sans-serif; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; color: #333; }
	.field input { width: 100%; box-sizing: border-box; padding: 0.75rem; border: 1px solid #ccc; background: transparent; font-family: ui-monospace, monospace; font-size: 0.875rem; outline: none; }
	.field input:focus { border-color: #111; }
</style>
