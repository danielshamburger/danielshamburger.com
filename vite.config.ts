import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

// Fills in %COMMIT% in index.html: the commit being built, or "dev" while running locally
export default defineConfig({
	plugins: [{
		name: 'commit',
		transformIndexHtml: (html, { server }) =>
			html.replaceAll('%COMMIT%', server ? 'dev' : execSync('git rev-parse --short HEAD').toString().trim()),
	}],
});
