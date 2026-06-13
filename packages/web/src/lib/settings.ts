import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { defaultSettings, type Settings } from '@tiny-word-book/shared';

const STORAGE_KEY = 'vocab_settings';

const initialValue: Settings = browser
	? (JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null') as Settings | null) ||
		defaultSettings
	: defaultSettings;

export const settings = writable<Settings>(initialValue);

if (browser) {
	settings.subscribe((value) => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	});
}
