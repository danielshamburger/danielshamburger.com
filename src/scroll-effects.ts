import { clamp, required } from './util';

// Same stops as @keyframes page-scroll in styles.css
const COLORS: [number, number, number][] = [[129, 192, 139], [240, 195, 216], [137, 190, 227], [236, 223, 138]];

// The color comes from a CSS scroll-driven animation (this drives it where CSS can't); this also sets the
// percentage, which Safari won't animate as a whole number, and flips the arrow at the end, calling onEnd when the
// visitor scrolls into it
export function scrollEffects(arrow: HTMLButtonElement, { onEnd }: { onEnd?: () => void } = {}) {
	const root = document.documentElement;
	const sections = [...document.querySelectorAll<HTMLElement>('section')];
	const progress = required('.progress');
	const supported = CSS.supports('animation-timeline: scroll()');
	let starts: number[] = [];
	let maxScroll = 0;
	let scripted = false;
	let percent: number | undefined;
	let atEnd: boolean | undefined;
	// Wheel, touch or keyboard input has happened; the browser restoring the position on reload doesn't count
	let userScrolled = false;
	// The arrow's own scroll is in progress (it ripples on click, so reaching the end doesn't ripple again)
	let navigating = false;

	// Measured on resize only, so scrolling never forces a layout
	function measure() {
		// The scroll position at which each section reaches the top of the frame
		starts = sections.map(section => section.offsetTop - sections[0].offsetTop);
		maxScroll = root.scrollHeight - innerHeight;
		const height = sections[0].offsetHeight;
		scripted = !supported || sections.some(section => Math.abs(section.offsetHeight - height) > 1);
		root.classList.toggle('scripted-scroll', scripted);
		if (!scripted) root.style.removeProperty('--bg');
		update();
	}

	function update(scrolled = false) {
		// Clamped because macOS overscroll reports positions past either end
		const scroll = clamp(scrollY, 0, maxScroll);
		if (scripted) {
			// Blend between the colors of the sections on either side of the scroll position
			const i = clamp(starts.findLastIndex(start => start <= scroll), 0, COLORS.length - 2);
			const t = Math.min((scroll - starts[i]) / (starts[i + 1] - starts[i]), 1);
			const rgb = COLORS[i].map((c, n) => Math.round(c + (COLORS[i + 1][n] - c) * t));
			root.style.setProperty('--bg', `rgb(${rgb})`);
		}

		// Only touches the page when the rounded number changes
		const nextPercent = Math.round(scroll / maxScroll * 100);
		if (nextPercent !== percent) {
			percent = nextPercent;
			progress.textContent = progress.dataset.label = `${percent}%`;
			progress.style.setProperty('--fill', `${percent}%`);
		}

		// Flips once the last section is more than halfway in
		const nextAtEnd = scroll >= (starts[starts.length - 2] + starts[starts.length - 1]) / 2;
		if (nextAtEnd !== atEnd) {
			// Not from a re-measure, a restored position or the arrow's own scroll
			if (nextAtEnd && atEnd === false && scrolled && userScrolled && !navigating) onEnd?.();
			atEnd = nextAtEnd;
			arrow.classList.toggle('top', atEnd);
			arrow.ariaLabel = atEnd ? 'Back to top' : 'Next section';
		}
	}

	arrow.addEventListener('click', () => {
		navigating = true;
		// scrollend marks when it lands; the timeout covers browsers without it, and clicks that don't scroll
		setTimeout(() => navigating = false, 1000);
		scrollTo({ top: atEnd ? 0 : starts.find(start => start > scrollY + 1) ?? 0 });
	});
	addEventListener('scrollend', () => navigating = false);
	for (const input of ['wheel', 'touchmove', 'keydown']) addEventListener(input, () => userScrolled = true, { passive: true });
	addEventListener('scroll', () => update(true));
	addEventListener('resize', measure);
	// Catches sections growing after fonts load or text is resized
	new ResizeObserver(measure).observe(required('main'));
	measure();
}
