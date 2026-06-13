<script lang="ts">
	import { searchLanguages, type Language } from './languages';

	export let value: string = '';
	export let placeholder: string = 'Language (e.g. sv, svenska)';

	let inputEl: HTMLInputElement;
	let open = false;
	let highlightIdx = 0;

	$: suggestions = open ? searchLanguages(value) : [];
	$: if (suggestions.length === 0) highlightIdx = 0;
	$: if (highlightIdx >= suggestions.length) highlightIdx = Math.max(0, suggestions.length - 1);

	function pick(lang: Language) {
		value = lang.native;
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			open = true;
			if (suggestions.length > 0) {
				highlightIdx = (highlightIdx + 1) % suggestions.length;
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			open = true;
			if (suggestions.length > 0) {
				highlightIdx = (highlightIdx - 1 + suggestions.length) % suggestions.length;
			}
		} else if (e.key === 'Enter') {
			if (open && suggestions[highlightIdx]) {
				e.preventDefault();
				pick(suggestions[highlightIdx]);
			}
		} else if (e.key === 'Escape') {
			open = false;
		}
	}

	function onFocus() {
		open = true;
	}

	function onBlur() {
		setTimeout(() => (open = false), 120);
	}
</script>

<div class="ls-wrap">
	<input
		bind:this={inputEl}
		bind:value
		type="text"
		class="ls-input"
		{placeholder}
		autocomplete="off"
		spellcheck="false"
		on:focus={onFocus}
		on:blur={onBlur}
		on:keydown={onKeydown}
	/>

	{#if open && suggestions.length > 0}
		<ul class="ls-list" role="listbox">
			{#each suggestions as lang, i}
				<li
					class="ls-item"
					class:active={i === highlightIdx}
					role="option"
					aria-selected={i === highlightIdx}
					on:mousedown={() => pick(lang)}
					on:mouseenter={() => (highlightIdx = i)}
				>
					<span class="ls-native">{lang.native}</span>
					<span class="ls-meta">{lang.code} · {lang.english}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.ls-wrap {
		position: relative;
		width: 100%;
	}

	.ls-input {
		width: 100%;
		box-sizing: border-box;
		appearance: none;
		border: 1px solid transparent;
		background: var(--input-bg);
		color: var(--fg);
		padding: 0.75rem;
		border-radius: 0;
		outline: none;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
	}

	.ls-input:focus {
		background: var(--input-bg-focus);
	}

	.ls-list {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		background: var(--surface);
		color: var(--fg);
		border: 1px solid var(--fg);
		max-height: 240px;
		overflow-y: auto;
		z-index: 50;
	}

	.ls-item {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.875rem;
	}

	.ls-item.active {
		background: var(--primary-bg);
		color: var(--primary-fg);
	}

	.ls-native {
		font-weight: 500;
	}

	.ls-meta {
		font-size: 0.75rem;
		color: var(--fg-faint);
		text-transform: lowercase;
	}

	.ls-item.active .ls-meta {
		color: var(--primary-fg-muted);
	}
</style>
