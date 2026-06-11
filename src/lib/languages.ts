export interface Language {
	code: string;
	native: string;
	english: string;
	aliases: string[];
}

export const languages: Language[] = [
	{ code: 'en', native: 'English', english: 'English', aliases: ['英语', '英文'] },
	{ code: 'zh', native: '中文', english: 'Chinese', aliases: ['汉语', '普通话', 'mandarin', 'cn'] },
	{ code: 'ja', native: '日本語', english: 'Japanese', aliases: ['日语', 'jp', 'nihongo'] },
	{ code: 'ko', native: '한국어', english: 'Korean', aliases: ['韩语', 'kr', 'hangul'] },
	{ code: 'fr', native: 'Français', english: 'French', aliases: ['法语', 'francais'] },
	{ code: 'de', native: 'Deutsch', english: 'German', aliases: ['德语'] },
	{ code: 'es', native: 'Español', english: 'Spanish', aliases: ['西班牙语', 'castellano'] },
	{ code: 'it', native: 'Italiano', english: 'Italian', aliases: ['意大利语'] },
	{ code: 'pt', native: 'Português', english: 'Portuguese', aliases: ['葡萄牙语'] },
	{ code: 'ru', native: 'Русский', english: 'Russian', aliases: ['俄语', 'russkiy'] },
	{ code: 'sv', native: 'Svenska', english: 'Swedish', aliases: ['瑞典语', 'sw'] },
	{ code: 'no', native: 'Norsk', english: 'Norwegian', aliases: ['挪威语', 'nb', 'nn'] },
	{ code: 'da', native: 'Dansk', english: 'Danish', aliases: ['丹麦语'] },
	{ code: 'fi', native: 'Suomi', english: 'Finnish', aliases: ['芬兰语'] },
	{ code: 'is', native: 'Íslenska', english: 'Icelandic', aliases: ['冰岛语'] },
	{ code: 'nl', native: 'Nederlands', english: 'Dutch', aliases: ['荷兰语'] },
	{ code: 'pl', native: 'Polski', english: 'Polish', aliases: ['波兰语'] },
	{ code: 'cs', native: 'Čeština', english: 'Czech', aliases: ['捷克语'] },
	{ code: 'hu', native: 'Magyar', english: 'Hungarian', aliases: ['匈牙利语'] },
	{ code: 'el', native: 'Ελληνικά', english: 'Greek', aliases: ['希腊语', 'ellinika'] },
	{ code: 'tr', native: 'Türkçe', english: 'Turkish', aliases: ['土耳其语'] },
	{ code: 'ar', native: 'العربية', english: 'Arabic', aliases: ['阿拉伯语', 'arabi'] },
	{ code: 'he', native: 'עברית', english: 'Hebrew', aliases: ['希伯来语', 'ivrit'] },
	{ code: 'fa', native: 'فارسی', english: 'Persian', aliases: ['波斯语', 'farsi'] },
	{ code: 'hi', native: 'हिन्दी', english: 'Hindi', aliases: ['印地语'] },
	{ code: 'th', native: 'ไทย', english: 'Thai', aliases: ['泰语'] },
	{ code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese', aliases: ['越南语'] },
	{ code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', aliases: ['印尼语'] },
	{ code: 'la', native: 'Latina', english: 'Latin', aliases: ['拉丁语'] }
];

export function resolveLanguage(value: string): Language | undefined {
	const v = value.trim().toLowerCase();
	if (!v) return undefined;
	return languages.find((lang) => {
		const haystack = [lang.code, lang.native, lang.english, ...lang.aliases].map((s) =>
			s.toLowerCase()
		);
		return haystack.includes(v);
	});
}

export function searchLanguages(query: string, limit = 8): Language[] {
	const q = query.trim().toLowerCase();
	if (!q) return languages.slice(0, limit);

	const starts: Language[] = [];
	const contains: Language[] = [];

	for (const lang of languages) {
		const haystack = [lang.code, lang.native, lang.english, ...lang.aliases].map((s) =>
			s.toLowerCase()
		);
		if (haystack.some((h) => h.startsWith(q))) {
			starts.push(lang);
		} else if (haystack.some((h) => h.includes(q))) {
			contains.push(lang);
		}
	}

	return [...starts, ...contains].slice(0, limit);
}
