import { copyButton } from './copy-button';
import { dotGrid, type DotGrid } from './dot-grid';
import { scrollEffects } from './scroll-effects';
import { clamp, required } from './util';

const ARROW_REACH = 170, SWEEP_DELAY = 1000;

const arrow = required<HTMLButtonElement>('.next');
const dotArea = required('.dots');

scrollEffects(arrow);
wireDots(dotGrid(dotArea));
copyButton(required<HTMLButtonElement>('.terminal button'), required('.terminal code'));

// What makes the dot grid react: the pointer over it, the arrow, the name and links, and a sweep after load
function wireDots(grid: DotGrid) {
	dotArea.addEventListener('pointermove', e => grid.attract(e.clientX, e.clientY, { cursor: true }));
	dotArea.addEventListener('pointerleave', grid.release);
	dotArea.addEventListener('pointerdown', e => grid.burst(e.clientX, e.clientY));

	// Hovering the arrow pushes dots away from its edge nearest the grid
	arrow.addEventListener('pointerenter', () => {
		const area = dotArea.getBoundingClientRect(), icon = required('svg', arrow).getBoundingClientRect();
		const x = clamp(area.left + area.width / 2, icon.left, icon.right);
		const y = clamp(area.top + area.height / 2, icon.top, icon.bottom);
		grid.attract(x, y, { reach: ARROW_REACH });
	});
	arrow.addEventListener('pointerleave', grid.release);

	// The name and each link draw their picture while hovered or focused
	for (const element of document.querySelectorAll<HTMLElement>('[data-picture]')) {
		const show = () => grid.show(element.dataset.picture ?? null);
		const hide = () => grid.show(null);
		element.addEventListener('pointerenter', show);
		element.addEventListener('focus', show);
		element.addEventListener('pointerleave', hide);
		element.addEventListener('blur', hide);
	}

	if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(grid.sweep, SWEEP_DELAY);
}
