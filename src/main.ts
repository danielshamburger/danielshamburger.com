import { copyButton } from './copy-button';
import { dotGrid } from './dot-grid';
import { scrollEffects } from './scroll-effects';
import { clamp, required } from './util';

const ARROW_REACH = 170, SWEEP_DELAY = 1000;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const arrow = required<HTMLButtonElement>('.next');
const dotArea = required('.dots');

const progress = required('.progress');

// Dots pushed up past the area stay visible over the progress bar's fill
const grid = dotGrid(dotArea, {
	inked: () => {
		const rect = progress.getBoundingClientRect();
		rect.width *= Number.parseFloat(progress.style.getPropertyValue('--fill') || '0') / 100;
		return [rect];
	},
});

// Scrolling into the last section ripples the dots from the arrow, as it flips to "back to top"
scrollEffects(arrow, {
	onEnd: () => {
		if (!reducedMotion) grid.burst(...arrowEdge());
	},
});
wireDots();
copyButton(required<HTMLButtonElement>('.terminal button'), required('.terminal .encoded'));

// The arrow's edge nearest the dot grid, where the arrow's effects on the dots start from
function arrowEdge() {
	const area = dotArea.getBoundingClientRect(), icon = required('svg', arrow).getBoundingClientRect();
	return [clamp(area.left + area.width / 2, icon.left, icon.right), clamp(area.top + area.height / 2, icon.top, icon.bottom)] as const;
}

// What makes the dot grid react: the pointer over it, the arrow, the name and links, and a sweep after load
// (the arrow flipping at the end is wired through scrollEffects above)
function wireDots() {
	dotArea.addEventListener('pointermove', e => grid.attract(e.clientX, e.clientY, { cursor: true }));
	dotArea.addEventListener('pointerleave', grid.release);
	// Pressing ripples and starts a gravity well; letting go flings out whatever it gathered
	dotArea.addEventListener('pointerdown', e => {
		grid.burst(e.clientX, e.clientY);
		grid.hold(e.clientX, e.clientY);
	});
	for (const end of ['pointerup', 'pointerleave', 'pointercancel']) dotArea.addEventListener(end, grid.fling);

	// Hovering the arrow pushes dots away from its edge nearest the grid; clicking ripples out from it
	arrow.addEventListener('pointerenter', () => grid.attract(...arrowEdge(), { reach: ARROW_REACH }));
	arrow.addEventListener('pointerleave', grid.release);
	arrow.addEventListener('click', () => grid.burst(...arrowEdge()));

	// The name and each link draw their picture while hovered or focused
	for (const element of document.querySelectorAll<HTMLElement>('[data-picture]')) {
		const show = () => grid.show(element.dataset.picture ?? null);
		const hide = () => grid.show(null);
		element.addEventListener('pointerenter', show);
		element.addEventListener('focus', show);
		element.addEventListener('pointerleave', hide);
		element.addEventListener('blur', hide);
	}

	// The sweep demonstrates the dots after load; skipped for reduced motion, or once the page has left the top
	// (scrolled, arrow clicked, or reopened partway down)
	if (!reducedMotion) {
		setTimeout(() => {
			if (scrollY === 0) grid.sweep();
		}, SWEEP_DELAY);
	}
}
