// Copies the code's text, then calls onCopy; if the clipboard is blocked, selects it for a manual copy instead
export function copyButton(button: HTMLButtonElement, code: HTMLElement, onCopy?: () => void) {
	let reset: number | undefined;

	button.addEventListener('click', async () => {
		try {
			await navigator.clipboard.writeText(code.textContent ?? '');
			button.textContent = 'COPIED';
			onCopy?.();
		} catch {
			getSelection()?.selectAllChildren(code);
			button.textContent = 'FAILED';
		}
		clearTimeout(reset);
		reset = setTimeout(() => button.textContent = 'COPY', 1500);
	});
}
