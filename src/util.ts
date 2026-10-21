export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// querySelector for elements the page can't work without: fails loudly instead of returning null
export function required<T extends Element = HTMLElement>(selector: string, parent: ParentNode = document): T {
	const element = parent.querySelector<T>(selector);
	if (!element) throw new Error(`Missing element: ${selector}`);
	return element;
}
