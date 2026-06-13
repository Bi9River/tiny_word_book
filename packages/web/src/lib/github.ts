import { get } from 'svelte/store';
import { settings } from './settings';

const API_BASE = 'https://api.github.com';
const FILE_PATH = 'words.json';

function utf8ToBase64(str: string) {
	return window.btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(str: string) {
	return decodeURIComponent(escape(window.atob(str)));
}

export async function testConnection() {
	const { token, username, repo } = get(settings);
	if (!token || !username || !repo) throw new Error('配置不完整，请先填写信息');

	const url = `${API_BASE}/repos/${username}/${repo}`;
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28'
		}
	});

	if (!response.ok) {
		throw new Error(`连接失败 (${response.status}): 请检查 Token 是否过期或仓库名是否正确`);
	}
	return true;
}

export async function fetchWords() {
	const { token, username, repo } = get(settings);
	const url = `${API_BASE}/repos/${username}/${repo}/contents/${FILE_PATH}`;

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json'
		}
	});

	if (response.status === 404) {
		return { words: [], sha: undefined };
	}

	if (!response.ok) throw new Error('读取数据失败');

	const data = await response.json();
	const content = base64ToUtf8(data.content);
	
	return {
		words: JSON.parse(content),
		sha: data.sha
	};
}

export async function syncWordsToCloud(words: any[], sha: string | undefined) {
	const { token, username, repo } = get(settings);
	const url = `${API_BASE}/repos/${username}/${repo}/contents/${FILE_PATH}`;
	
	const contentBase64 = utf8ToBase64(JSON.stringify(words, null, 2));

	const body: any = {
		message: 'Sync words from Tiny Word Book PWA',
		content: contentBase64
	};

	if (sha) body.sha = sha;

	const response = await fetch(url, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) throw new Error('同步失败');

	const data = await response.json();
	return data.content.sha;
}
