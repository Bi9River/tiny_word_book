import { queueSave } from './lib/save';

const CONTEXT_MENU_ID = 'twb-save-selection';

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: CONTEXT_MENU_ID,
		title: 'Save to Tiny Word Book',
		contexts: ['selection']
	});
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) return;
	const text = (info.selectionText ?? '').trim();
	if (!text) return;
	const lang = await readPageLang(tab.id);
	queueSave(text, tab.id, lang);
});

chrome.commands.onCommand.addListener(async (command, tab) => {
	if (command !== 'save-selection') return;
	const targetTab = tab ?? (await getActiveTab());
	if (!targetTab?.id) return;
	const result = await readSelectionAndLang(targetTab.id);
	if (!result || !result.text) return;
	queueSave(result.text, targetTab.id, result.lang);
});

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	return tab;
}

async function readSelectionAndLang(
	tabId: number
): Promise<{ text: string; lang: string } | null> {
	try {
		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId },
			func: () => ({
				text: (window.getSelection()?.toString() ?? '').trim(),
				lang: document.documentElement.lang ?? ''
			})
		});
		return (result as { text: string; lang: string } | undefined) ?? null;
	} catch (err) {
		console.warn('[twb] failed to read selection:', err);
		return null;
	}
}

async function readPageLang(tabId: number): Promise<string> {
	try {
		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId },
			func: () => document.documentElement.lang ?? ''
		});
		return (result as string | undefined) ?? '';
	} catch {
		return '';
	}
}
