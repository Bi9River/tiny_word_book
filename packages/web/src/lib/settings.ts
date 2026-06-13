import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface Settings {
	token: string;
	username: string;
	repo: string;
}

const defaultSettings: Settings = {
	token: '',
	username: '',
	repo: ''
};

const initialValue = browser
	? JSON.parse(window.localStorage.getItem('vocab_settings') || 'null') || defaultSettings
	: defaultSettings;

export const settings = writable<Settings>(initialValue);

if (browser) {
	settings.subscribe((value) => {
		window.localStorage.setItem('vocab_settings', JSON.stringify(value));
	});
}
