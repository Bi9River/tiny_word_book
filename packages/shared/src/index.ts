export type { Entry, EntryType } from './types';
export type { Settings } from './settings';
export { defaultSettings, isSettingsComplete } from './settings';
export type { Language } from './languages';
export { languages, resolveLanguage, searchLanguages } from './languages';
export { swedishOrdklasser, type SwedishOrdklass } from './pos';
export { escapeHtml, escapeRegex, highlight } from './search';
export { testConnection, fetchWords, syncWordsToCloud } from './github';
