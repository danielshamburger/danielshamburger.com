// Copies the code's text; if the clipboard is blocked, selects it for a manual copy instead
export function copyButton(button: HTMLButtonElement, code: HTMLElement) {
	let reset: number | undefined;

	button.addEventListener('click', async () => {
		try {
			await navigator.clipboard.writeText(code.textContent ?? '');
			button.textContent = '✓';
			button.ariaLabel = 'Copied';
		} catch {
			getSelection()?.selectAllChildren(code);
			button.textContent = 'FAILED';
			button.removeAttribute('aria-label');
		}
		clearTimeout(reset);
		reset = setTimeout(() => {
			button.textContent = 'COPY';
			button.removeAttribute('aria-label');
		}, 2500);
	});
}
