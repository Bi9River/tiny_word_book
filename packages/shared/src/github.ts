import type { Entry } from './types';
import { isSettingsComplete, type Settings } from './settings';

const API_BASE = 'https://api.github.com';
const FILE_PATH = 'words.json';

function utf8ToBase64(str: string): string {
	return btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(str: string): string {
	return decodeURIComponent(escape(atob(str)));
}

function authHeaders(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28'
	};
}

export async function testConnection(settings: Settings): Promise<true> {
	if (!isSettingsComplete(settings)) {
		throw new Error('配置不完整，请先填写信息');
	}
	const { token, username, repo } = settings;
	const response = await fetch(`${API_BASE}/repos/${username}/${repo}`, {
		headers: authHeaders(token)
	});
	if (!response.ok) {
		throw new Error(`连接失败 (${response.status}): 请检查 Token 是否过期或仓库名是否正确`);
	}
	return true;
}

export async function fetchWords(
	settings: Settings
): Promise<{ words: Entry[]; sha: string | undefined }> {
	const { token, username, repo } = settings;
	const url = `${API_BASE}/repos/${username}/${repo}/contents/${FILE_PATH}`;
	const response = await fetch(url, { headers: authHeaders(token) });

	if (response.status === 404) {
		return { words: [], sha: undefined };
	}
	if (!response.ok) throw new Error('读取数据失败');

	const data = await response.json();
	const content = base64ToUtf8(data.content);
	return {
		words: JSON.parse(content) as Entry[],
		sha: data.sha as string
	};
}

export async function syncWordsToCloud(
	settings: Settings,
	words: Entry[],
	sha: string | undefined,
	commitMessage = 'Sync words from Tiny Word Book'
): Promise<string> {
	const { token, username, repo } = settings;
	const url = `${API_BASE}/repos/${username}/${repo}/contents/${FILE_PATH}`;
	const contentBase64 = utf8ToBase64(JSON.stringify(words, null, 2));

	const body: { message: string; content: string; sha?: string } = {
		message: commitMessage,
		content: contentBase64
	};
	if (sha) body.sha = sha;

	const response = await fetch(url, {
		method: 'PUT',
		headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!response.ok) throw new Error('同步失败');

	const data = await response.json();
	return data.content.sha as string;
}
