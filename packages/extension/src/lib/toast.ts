function injectedToastFn(message: string) {
	const id = 'twb-toast-host';
	const existing = document.getElementById(id);
	if (existing) existing.remove();
	const host = document.createElement('div');
	host.id = id;
	Object.assign(host.style, {
		position: 'fixed',
		bottom: '24px',
		right: '24px',
		zIndex: '2147483647',
		background: '#111',
		color: '#fff',
		padding: '10px 16px',
		fontFamily: 'system-ui, -apple-system, sans-serif',
		fontSize: '13px',
		lineHeight: '1.4',
		borderRadius: '4px',
		boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
		transition: 'opacity 200ms ease',
		opacity: '0',
		maxWidth: '320px',
		wordBreak: 'break-word',
		pointerEvents: 'none'
	});
	host.textContent = message;
	document.body.appendChild(host);
	requestAnimationFrame(() => {
		host.style.opacity = '1';
	});
	setTimeout(() => {
		host.style.opacity = '0';
		setTimeout(() => host.remove(), 250);
	}, 1500);
}

export async function showToast(tabId: number, message: string): Promise<void> {
	try {
		await chrome.scripting.executeScript({
			target: { tabId },
			func: injectedToastFn,
			args: [message]
		});
	} catch (err) {
		console.warn('[twb] toast inject failed:', err);
	}
}
