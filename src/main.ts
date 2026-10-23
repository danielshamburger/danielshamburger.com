import { dotGrid } from './dot-grid';
import { scrollEffects } from './scroll-effects';
import { terminal } from './terminal';
import { clamp, required } from './util';

const ARROW_REACH = 170, SWEEP_DELAY = 1000, NOT_FOUND_TIME = 3000;

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
	onEnd: () => grid.burst(...arrowEdge()),
});
wireDots();
notFound();
// Every press of the terminal's button (decode, then copy) ripples the dots from its side of the grid
const box = required('.terminal');
terminal(box);
const action = required('button', box);
action.addEventListener('click', () => grid.burst(...nearestPoint(action, dotArea)));

// The point inside one element nearest another element's center: where effects on the dots start from, so they
// come from that element's direction
function nearestPoint(from: Element, to: Element) {
	const { left, top, width, height } = from.getBoundingClientRect(), area = to.getBoundingClientRect();
	return [clamp(left + width / 2, area.left, area.right), clamp(top + height / 2, area.top, area.bottom)] as const;
}
// The arrow's edge nearest the dot grid
function arrowEdge() {
	return nearestPoint(dotArea, required('svg', arrow));
}

// The 404 page sends visitors home with ?404: the dots draw a 404 for a moment, and the address is tidied up
function notFound() {
	if (!new URLSearchParams(location.search).has('404')) return;
	history.replaceState(null, '', location.pathname + location.hash);
	grid.show('notFound');
	setTimeout(() => grid.show(null), NOT_FOUND_TIME);
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

	// The sweep demonstrates the dots after load; skipped once the page has left the top (scrolled, arrow clicked,
	// or reopened partway down)
	setTimeout(() => {
		if (scrollY === 0) grid.sweep();
	}, SWEEP_DELAY);
}
