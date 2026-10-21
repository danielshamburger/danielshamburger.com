import { PICTURES } from './pictures';
import { required } from './util';

const SPACING = 14, MARGIN = 12, RADIUS = 1.5, REACH = 100, PUSH = 18, GROW = 1.4, EASE = 0.2;
const BURST_DURATION = 600, BURST_REACH = 320, BURST_WIDTH = 30, BURST_PUSH = 18, BURST_GROW = 1.5;
const SWEEP_DURATION = 1200, SWEEP_STRENGTH = 0.7, SWEEP_FROM = 0.15, SWEEP_TO = 0.85;
const PICTURE_GROW = 1.3, PICTURE_DIM = 0.6;

interface Point {
	x: number;
	y: number;
}

interface Field extends Point {
	reach: number;
	cursor: boolean;
}

interface Burst extends Point {
	start: number;
}

interface Dot extends Point {
	col: number;
	row: number;
}

interface State {
	field: Field; // the point the dots push away from
	strength: number; // how hard the field pushes right now, easing toward target
	target: number;
	bursts: Burst[]; // click shockwaves still expanding
	sweep: { start: number } | null; // the load-time sweep while it runs
	picture: string | null; // name of the picture to draw
	dim: number; // how far the dots outside the picture have shrunk
	lit: number[]; // per dot, how far it has grown into the picture
}

interface Geometry {
	width: number;
	height: number;
	cols: number;
	rows: number;
	dots: Dot[];
	outside: Path2D;
}

export interface AttractOptions {
	reach?: number;
	cursor?: boolean;
}

// The controls. Points are viewport coordinates, like pointer events give.
export interface DotGrid {
	attract(x: number, y: number, options?: AttractOptions): void;
	release(): void;
	burst(x: number, y: number): void;
	// Draws a picture by name, or clears it with null; a picture also ends the sweep
	show(name: string | null): void;
	// Runs the sweep, unless the dots are already busy with the pointer or a picture
	sweep(): void;
}

// Moves a value a step toward its goal, snapping once it's close enough to stop animating
const ease = (value: number, goal: number) => {
	const next = value + (goal - value) * EASE;
	return Math.abs(goal - next) < 0.001 ? goal : next;
};

// A canvas of dots that push away from a point and grow as it gets close, ring out from clicks, and draw small
// pictures. It knows nothing about the rest of the page: it returns its controls, and main.ts decides what drives them.
export function dotGrid(area: HTMLElement): DotGrid {
	const canvas = required<HTMLCanvasElement>('canvas', area);
	const ctx = context2d(canvas);
	const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink');
	const bleed = Number.parseFloat(getComputedStyle(area).getPropertyValue('--bleed'));

	// Geometry is rebuilt on resize and never modified; state changes only through the controls and step()
	let geometry: Geometry;
	const state: State = {
		field: { x: 0, y: 0, reach: REACH, cursor: false },
		strength: 0,
		target: 0,
		bursts: [],
		sweep: null,
		picture: null,
		dim: 0,
		lit: [],
	};
	let frame: number | null = null;

	// Where the dots sit for a given size
	function layout(width: number, height: number): Geometry {
		// Same margin on every side; spacing stretches a fraction of a pixel per axis to fit exactly
		const axis = (size: number) => {
			const n = Math.max(1, Math.round((size - 2 * MARGIN) / SPACING));
			return Array.from({ length: n + 1 }, (_, i) => MARGIN + i * (size - 2 * MARGIN) / n);
		};
		const xs = axis(width), ys = axis(height);

		// The bleed ring around the area, where shapes are drawn in ink instead of cut out
		const outside = new Path2D();
		outside.rect(-bleed, -bleed, width + 2 * bleed, height + 2 * bleed);
		outside.rect(0, 0, width, height);

		const dots = ys.flatMap((y, row) => xs.map((x, col) => ({ x, y, col, row })));
		return { width, height, cols: xs.length, rows: ys.length, dots, outside };
	}

	function resize() {
		const { width, height } = area.getBoundingClientRect();
		canvas.width = (width + 2 * bleed) * devicePixelRatio;
		canvas.height = (height + 2 * bleed) * devicePixelRatio;
		// Draw in the area's coordinates; the bleed sits at negative/overflow positions
		ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, bleed * devicePixelRatio, bleed * devicePixelRatio);
		geometry = layout(width, height);
		state.lit = geometry.dots.map(() => 0);
		draw(performance.now());
	}

	// Advances the state one frame; returns whether anything is still moving
	function step(now: number) {
		const { width, height, cols, rows, dots } = geometry;

		if (state.sweep) {
			// Push a cursor-less bulge from top to bottom, then end with a burst
			const t = Math.min((now - state.sweep.start) / SWEEP_DURATION, 1);
			const eased = (1 - Math.cos(t * Math.PI)) / 2;
			state.field = { x: width / 2, y: height * (SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * eased), reach: REACH, cursor: false };
			state.strength = Math.sin(t * Math.PI) * SWEEP_STRENGTH;
			if (t === 1) {
				state.sweep = null;
				state.bursts.push({ x: state.field.x, y: state.field.y, start: now });
			}
		} else {
			state.strength = ease(state.strength, state.target);
		}
		state.bursts = state.bursts.filter(burst => now - burst.start < BURST_DURATION);

		// The picture, centered in the grid: its dots grow and the rest shrink
		const bitmap = state.picture === null ? undefined : PICTURES[state.picture];
		const fits = bitmap !== undefined && bitmap.length <= rows && bitmap[0].length <= cols;
		const top = fits ? Math.floor((rows - bitmap.length) / 2) : 0;
		const left = fits ? Math.floor((cols - bitmap[0].length) / 2) : 0;
		state.dim = ease(state.dim, fits ? 1 : 0);
		let settled = state.dim === (fits ? 1 : 0);
		dots.forEach(({ col, row }, i) => {
			const goal = fits && bitmap[row - top]?.[col - left] === '#' ? 1 : 0;
			state.lit[i] = ease(state.lit[i], goal);
			settled &&= state.lit[i] === goal;
		});

		return state.sweep !== null || state.bursts.length > 0 || state.strength !== state.target || !settled;
	}

	// Paints the current state; reads it, never changes it
	function draw(now: number) {
		const { width, height, dots } = geometry;
		const { field, strength, bursts, dim, lit } = state;

		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.clearRect(-bleed, -bleed, width + 2 * bleed, height + 2 * bleed);
		ctx.fillStyle = ctx.strokeStyle = ink;
		ctx.fillRect(0, 0, width, height);

		const path = new Path2D();
		dots.forEach(({ x, y }, i) => {
			const dx = x - field.x, dy = y - field.y, distance = Math.hypot(dx, dy) || 1;
			const falloff = strength * Math.max(0, 1 - distance / field.reach) ** 2;
			let cx = x + dx / distance * falloff * PUSH, cy = y + dy / distance * falloff * PUSH;
			let r = RADIUS * (1 + GROW * falloff + PICTURE_GROW * lit[i] - PICTURE_DIM * dim * (1 - lit[i]));

			// Each burst is a ring that expands from the click and fades as it goes
			for (const burst of bursts) {
				const age = (now - burst.start) / BURST_DURATION;
				const bx = x - burst.x, by = y - burst.y, d = Math.hypot(bx, by) || 1;
				const wave = Math.max(0, 1 - Math.abs(d - age * BURST_REACH) / BURST_WIDTH) * (1 - age) ** 2;
				cx += bx / d * wave * BURST_PUSH;
				cy += by / d * wave * BURST_PUSH;
				r += RADIUS * BURST_GROW * wave;
			}
			path.moveTo(cx + r, cy);
			path.arc(cx, cy, r, 0, Math.PI * 2);
		});
		cut(path, 'fill');

		if (field.cursor && strength > 0.01) {
			ctx.globalAlpha = strength;
			ctx.lineWidth = 2;
			cut(cursor(field.x, field.y), 'stroke');
		}
	}

	// Inside the area, punch the shape out of the ink; outside it, draw the shape in ink so it reads the same
	function cut(path: Path2D, mode: 'fill' | 'stroke') {
		const paint = () => mode === 'fill' ? ctx.fill(path) : ctx.stroke(path);
		ctx.globalCompositeOperation = 'destination-out';
		paint();

		ctx.save();
		ctx.clip(geometry.outside, 'evenodd');
		ctx.globalCompositeOperation = 'source-over';
		paint();
		ctx.restore();
	}

	function tick() {
		const now = performance.now();
		const moving = step(now);
		draw(now);
		frame = moving ? requestAnimationFrame(tick) : null;
	}

	function animate() {
		frame ??= requestAnimationFrame(tick);
	}

	// Viewport coordinates to the area's
	function local(x: number, y: number): Point {
		const { left, top } = area.getBoundingClientRect();
		return { x: x - left, y: y - top };
	}

	resize();
	new ResizeObserver(resize).observe(area);

	return {
		attract(x, y, { reach = REACH, cursor = false } = {}) {
			state.sweep = null;
			state.field = { ...local(x, y), reach, cursor };
			state.target = 1;
			animate();
		},
		release() {
			state.target = 0;
			animate();
		},
		burst(x, y) {
			state.bursts.push({ ...local(x, y), start: performance.now() });
			animate();
		},
		show(name) {
			state.picture = name;
			if (name) state.sweep = null;
			animate();
		},
		sweep() {
			if (state.target || state.picture) return;
			state.sweep = { start: performance.now() };
			animate();
		},
	};
}

function context2d(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D is not supported');
	return ctx;
}

// Rounded viewfinder brackets centered on a point
function cursor(cx: number, cy: number) {
	const half = 14, corner = 3, arm = 4, path = new Path2D();
	for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
		const x = cx + sx * half, y = cy + sy * half;
		path.moveTo(x, y - sy * (corner + arm));
		path.arcTo(x, y, x - sx * corner, y, corner);
		path.lineTo(x - sx * (corner + arm), y);
	}
	return path;
}
