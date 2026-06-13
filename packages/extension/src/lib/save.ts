import {
	fetchWords,
	syncWordsToCloud,
	isSettingsComplete,
	resolveLanguage,
	type Entry
} from '@tiny-word-book/shared';
import { readSettings } from './settings-store';
import { getLastLanguage, rememberLanguage } from './last-language';
import { showToast } from './toast';

let saveChain: Promise<unknown> = Promise.resolve();

export function queueSave(text: string, tabId: number, pageLang: string): Promise<void> {
	const work = () => doSave(text, tabId, pageLang);
	saveChain = saveChain.catch(() => undefined).then(work);
	return saveChain as Promise<void>;
}

function detectType(text: string): 'word' | 'sentence' {
	return /\s/.test(text) ? 'sentence' : 'word';
}

async function resolveLanguageName(pageLang: string): Promise<string> {
	const baseCode = pageLang.split('-')[0]?.trim().toLowerCase();
	if (baseCode) {
		const match = resolveLanguage(baseCode);
		if (match) return match.native;
	}
	return await getLastLanguage();
}

function makeUniqueTimestamp(taken: Set<string>): string {
	let ts = new Date().toISOString();
	while (taken.has(ts)) {
		ts = new Date(Date.parse(ts) + 1).toISOString();
	}
	return ts;
}

function preview(text: string, max = 40): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function doSave(text: string, tabId: number, pageLang: string): Promise<void> {
	const trimmed = text.trim();
	if (!trimmed) return;

	const settings = await readSettings();
	if (!isSettingsComplete(settings)) {
		await showToast(tabId, 'tiny word book: configure first');
		return;
	}

	const type = detectType(trimmed);
	const language = await resolveLanguageName(pageLang);

	try {
		const { words, sha } = await fetchWords(settings);
		const taken = new Set(words.map((w) => w.created_at));
		const newEntry: Entry = {
			type,
			word: trimmed,
			language,
			translation: '',
			notes: '',
			pending: true,
			created_at: makeUniqueTimestamp(taken)
		};
		const updated = [newEntry, ...words];
		await syncWordsToCloud(settings, updated, sha, `twb: save ${type} from extension`);
		if (language) await rememberLanguage(language);
		await showToast(tabId, `Saved ${type}: ${preview(trimmed)}`);
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'unknown error';
		await showToast(tabId, `Save failed: ${msg}`);
	}
}
