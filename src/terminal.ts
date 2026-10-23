import { copyButton } from './copy-button';
import { required } from './util';

const TYPE_DELAY = 40;

// The title bar's ⏎ button runs the command (so does clicking the command): the decoded email types out on the next
// line, then the button copies it
export function terminal(box: HTMLElement, { instant = false }: { instant?: boolean } = {}) {
	const button = required<HTMLButtonElement>('button', box);
	const encoded = required('.encoded', box);
	const output = required('.output', box);
	const code = required('code', box);

	button.addEventListener('click', () => {
		const email = atob(encoded.textContent ?? '');
		box.classList.add('ran');
		// Announced once, when the whole line is there
		output.ariaBusy = 'true';
		let typed = 0;
		const type = () => {
			typed = instant ? email.length : typed + 1;
			output.textContent = email.slice(0, typed);
			if (typed < email.length) return setTimeout(type, TYPE_DELAY);
			output.ariaBusy = 'false';
			button.removeAttribute('aria-label');
			button.textContent = 'COPY';
			copyButton(button, output);
		};
		type();
	}, { once: true });
	// Not when the click ends a text selection
	code.addEventListener('click', () => {
		if (!box.classList.contains('ran') && getSelection()?.isCollapsed) button.click();
	});
}
