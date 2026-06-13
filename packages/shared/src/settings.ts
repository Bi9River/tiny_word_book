export interface Settings {
	token: string;
	username: string;
	repo: string;
}

export const defaultSettings: Settings = {
	token: '',
	username: '',
	repo: ''
};

export function isSettingsComplete(s: Settings): boolean {
	return Boolean(s.token && s.username && s.repo);
}
