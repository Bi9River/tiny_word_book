import { writable, get } from 'svelte/store';
import { defaultSettings, type Settings } from '@tiny-word-book/shared';

const KEY = 'vocab_settings';

export const settings = writable<Settings>(defaultSettings);

export const settingsLoaded: Promise<void> = chrome.storage.sync.get(KEY).then((r) => {
	const stored = r[KEY] as Partial<Settings> | undefined;
	if (stored) settings.set({ ...defaultSettings, ...stored });
});

export async function saveSettings(value: Settings): Promise<void> {
	settings.set(value);
	await chrome.storage.sync.set({ [KEY]: value });
}

export async function readSettings(): Promise<Settings> {
	const r = await chrome.storage.sync.get(KEY);
	const stored = r[KEY] as Partial<Settings> | undefined;
	return { ...defaultSettings, ...(stored ?? {}) };
}

function settingsEqual(a: Settings, b: Settings): boolean {
	return a.token === b.token && a.username === b.username && a.repo === b.repo;
}

chrome.storage.onChanged.addListener((changes, area) => {
	if (area !== 'sync' || !changes[KEY]) return;
	const newValue = changes[KEY].newValue as Settings | undefined;
	if (!newValue) return;
	const merged: Settings = { ...defaultSettings, ...newValue };
	if (settingsEqual(get(settings), merged)) return;
	settings.set(merged);
});
