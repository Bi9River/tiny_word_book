export type EntryType = 'word' | 'sentence';

export interface Entry {
	type?: EntryType;
	word: string;
	language: string;
	translation: string;
	notes: string;
	pos?: string;
	created_at: string;
}
