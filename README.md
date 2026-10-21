# danielshamburger[dot]com

Repo for my personal website: a single page built with [Vite](https://vite.dev) and TypeScript, hosted on GitHub Pages.

## Running it

Requires Node 20.19+ or 22.12+.

```sh
npm install       # install dependencies
npm run dev       # local dev server with live reload
npm run build     # type-check, then build the site into dist/
npm run preview   # serve the dist/ build locally 
```

`npm run build` fails on any TypeScript error, so a broken build never deploys.

## Deploying

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the site and publishes `dist/` to GitHub Pages. Nothing built is committed.
