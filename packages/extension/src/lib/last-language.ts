const KEY = 'twb_last_lang';

export async function getLastLanguage(): Promise<string> {
	const r = await chrome.storage.local.get(KEY);
	return (r[KEY] as string | undefined) ?? '';
}

export async function rememberLanguage(value: string): Promise<void> {
	if (!value) return;
	await chrome.storage.local.set({ [KEY]: value });
}
