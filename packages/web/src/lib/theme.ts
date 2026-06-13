import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'vocab_theme';

function detectInitial(): Theme {
	if (!browser) return 'light';
	const saved = window.localStorage.getItem(STORAGE_KEY);
	if (saved === 'light' || saved === 'dark') return saved;
	const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
	return prefersDark ? 'dark' : 'light';
}

export const theme = writable<Theme>(detectInitial());

if (browser) {
	theme.subscribe((value) => {
		document.documentElement.setAttribute('data-theme', value);
		window.localStorage.setItem(STORAGE_KEY, value);
		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) meta.setAttribute('content', value === 'dark' ? '#0e0e0e' : '#fafafa');
	});
}

export function toggleTheme() {
	theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}
