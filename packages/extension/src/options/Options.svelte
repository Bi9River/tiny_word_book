<script lang="ts">
	import { settings, settingsLoaded, saveSettings } from '../lib/settings-store';
	import { testConnection } from '@tiny-word-book/shared';

	let username = '';
	let repo = '';
	let token = '';
	let status: 'idle' | 'testing' | 'ok' | 'error' = 'idle';
	let message = '';

	settingsLoaded.then(() => {
		username = $settings.username;
		repo = $settings.repo;
		token = $settings.token;
	});

	async function save() {
		status = 'testing';
		message = '';
		const next = { username: username.trim(), repo: repo.trim(), token: token.trim() };
		try {
			await testConnection(next);
			await saveSettings(next);
			status = 'ok';
			message = 'Connected and saved.';
		} catch (err) {
			status = 'error';
			message = err instanceof Error ? err.message : 'Failed to verify.';
		}
	}
</script>

<main>
	<header>
		<h1>tiny word book</h1>
		<p>Configuration</p>
	</header>

	<div class="field">
		<label for="username">GitHub Username</label>
		<input id="username" type="text" bind:value={username} placeholder="e.g. Bi9River" />
	</div>

	<div class="field">
		<label for="repo">Private Repository</label>
		<input id="repo" type="text" bind:value={repo} placeholder="e.g. vocab_data" />
	</div>

	<div class="field">
		<label for="token">Access Token (PAT)</label>
		<input id="token" type="password" bind:value={token} placeholder="ghp_..." />
	</div>

	<div class="actions">
		<button class="primary" on:click={save} disabled={status === 'testing'}>
			{status === 'testing' ? 'Verifying…' : 'Save & verify'}
		</button>
		{#if status === 'ok'}
			<span class="ok">{message}</span>
		{:else if status === 'error'}
			<span class="error">{message}</span>
		{/if}
	</div>
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		background: #fafafa;
		color: #111;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	main {
		max-width: 480px;
		margin: 0 auto;
		padding: 3rem 1.5rem;
	}

	header h1 {
		margin: 0;
		font-family: ui-serif, Georgia, serif;
		font-size: 1.75rem;
		font-weight: 500;
	}
	header p {
		margin: 0.25rem 0 2rem;
		color: #666;
		font-size: 0.875rem;
	}

	.field {
		margin-bottom: 1.5rem;
	}
	.field label {
		display: block;
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

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	button {
		appearance: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
	}
	.primary {
		background: #111;
		color: #fff;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}
	.primary:disabled {
		background: #ccc;
		cursor: not-allowed;
	}

	.ok {
		font-size: 0.875rem;
		color: #1a7f37;
	}
	.error {
		font-size: 0.875rem;
		color: #b00020;
	}
</style>
