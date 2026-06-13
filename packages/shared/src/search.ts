export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlight(text: string, query: string): string {
	const safeText = text ?? '';
	const q = query.trim();
	if (!q) return escapeHtml(safeText);
	const re = new RegExp(escapeRegex(q), 'gi');
	let result = '';
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = re.exec(safeText)) !== null) {
		result += escapeHtml(safeText.slice(lastIndex, match.index));
		result += `<strong class="hl">${escapeHtml(match[0])}</strong>`;
		lastIndex = match.index + match[0].length;
		if (match[0].length === 0) re.lastIndex++;
	}
	result += escapeHtml(safeText.slice(lastIndex));
	return result;
}
