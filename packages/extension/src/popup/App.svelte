<script lang="ts">
	import { settings, settingsLoaded } from '../lib/settings-store';
	import { isSettingsComplete } from '@tiny-word-book/shared';

	let ready = false;
	settingsLoaded.then(() => (ready = true));

	$: configured = ready && isSettingsComplete($settings);

	function openOptions() {
		chrome.runtime.openOptionsPage();
	}
</script>

<main>
	<header>
		<h1>tiny word book</h1>
	</header>

	{#if !ready}
		<p class="muted">Loading…</p>
	{:else if !configured}
		<p class="muted">Not yet configured.</p>
		<button class="primary" on:click={openOptions}>Open settings</button>
	{:else}
		<p class="muted">Connected as <strong>{$settings.username}/{$settings.repo}</strong>.</p>
		<p class="hint">Highlight text on a page → right-click → <em>Save to Tiny Word Book</em>.</p>
		<button class="text" on:click={openOptions}>Settings</button>
	{/if}
</main>

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		font-family: ui-sans-serif, system-ui, sans-serif;
		background: #fafafa;
		color: #111;
	}

	main {
		width: 320px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	header h1 {
		margin: 0;
		font-family: ui-serif, Georgia, serif;
		font-size: 1.25rem;
		font-weight: 500;
	}

	.muted {
		margin: 0;
		font-size: 0.875rem;
		color: #666;
	}

	.hint {
		margin: 0;
		font-size: 0.8125rem;
		color: #444;
		line-height: 1.5;
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

	.text {
		align-self: flex-start;
		background: transparent;
		color: #666;
		padding: 0;
		font-size: 0.8125rem;
		text-decoration: underline;
	}
	.text:hover {
		color: #111;
	}
</style>
