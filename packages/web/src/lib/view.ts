import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type TypeFilter = 'all' | 'word' | 'sentence';

export interface View {
	typeFilter: TypeFilter;
	languageFilter: string;
	pendingOnly: boolean;
}

const defaultView: View = {
	typeFilter: 'all',
	languageFilter: '',
	pendingOnly: false
};

const STORAGE_KEY = 'vocab_view';

function loadInitial(): View {
	if (!browser) return defaultView;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultView;
		const parsed = JSON.parse(raw);
		return { ...defaultView, ...parsed };
	} catch {
		return defaultView;
	}
}

export const view = writable<View>(loadInitial());

if (browser) {
	view.subscribe((value) => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	});
}
