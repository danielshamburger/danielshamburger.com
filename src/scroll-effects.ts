import { clamp, required } from './util';

// Same stops as @keyframes page-scroll in styles.css
const COLORS: [number, number, number][] = [[129, 192, 139], [240, 195, 216], [137, 190, 227], [236, 223, 138]];

// The color comes from a CSS scroll-driven animation (this drives it where CSS can't); this also sets the
// percentage, which Safari won't animate as a whole number, flips the arrow at the end, and calls onBottom each time
// the page is scrolled all the way down
export function scrollEffects(arrow: HTMLButtonElement, { onBottom }: { onBottom?: () => void } = {}) {
	const root = document.documentElement;
	const sections = [...document.querySelectorAll<HTMLElement>('section')];
	const progress = required('.progress');
	const supported = CSS.supports('animation-timeline: scroll()');
	let starts: number[] = [];
	let maxScroll = 0;
	let scripted = false;
	let percent: number | undefined;
	let atEnd: boolean | undefined;
	let atBottom: boolean | undefined;

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

	function update() {
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
			atEnd = nextAtEnd;
			arrow.classList.toggle('top', atEnd);
			arrow.ariaLabel = atEnd ? 'Back to top' : 'Next section';
		}

		// Only on arriving: not on load if the page opens at the bottom, and not again until it scrolls away
		const nextAtBottom = scroll >= maxScroll - 1;
		if (nextAtBottom && atBottom === false) onBottom?.();
		atBottom = nextAtBottom;
	}

	arrow.addEventListener('click', () => {
		scrollTo({ top: atEnd ? 0 : starts.find(start => start > scrollY + 1) ?? 0 });
	});
	addEventListener('scroll', update);
	addEventListener('resize', measure);
	// Catches sections growing after fonts load or text is resized
	new ResizeObserver(measure).observe(required('main'));
	measure();
}
