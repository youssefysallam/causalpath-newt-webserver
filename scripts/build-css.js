#!/usr/bin/env node
//
// Bundles public/stylesheets/main.css -> public/build/bundle.css.
//
// This replaces the `postcss` CLI call that `npm run bundle:css` used to make.
// postcss-cli 6 hands `result.map` (a SourceMapGenerator object) straight to
// fs.writeFile. Node used to coerce that to a string; Node 18+ validates the
// argument type and throws ERR_INVALID_ARG_TYPE instead — and it does so AFTER
// truncating bundle.css, so a failed build leaves you with a 0-byte stylesheet
// and an app with no CSS at all. Calling the postcss API directly avoids the
// CLI entirely and works on every Node version.
//
// Output is byte-identical to what the CLI produced: same plugins (read from
// postcss.config.js), no sourceMappingURL annotation, map written alongside.
//
// Usage: node scripts/build-css.js [--watch]

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const root = path.join(__dirname, '..');
const config = require(path.join(root, 'postcss.config.js'));

const FROM = path.join(root, 'public/stylesheets/main.css');
const TO = path.join(root, 'public/build/bundle.css');
const WATCH_DIR = path.join(root, 'public/stylesheets');

function build() {
	const css = fs.readFileSync(FROM, 'utf8');

	return postcss(config.plugins)
		.process(css, {
			from: FROM,
			to: TO,
			// external map, and no /*# sourceMappingURL */ comment — matches what
			// the CLI wrote, so the committed bundle.css doesn't churn
			map: { inline: false, annotation: false },
		})
		.then((result) => {
			fs.mkdirSync(path.dirname(TO), { recursive: true });
			// write the map first: if anything here throws, bundle.css is still
			// the last good build rather than a truncated file
			if (result.map) fs.writeFileSync(TO + '.map', result.map.toString());
			fs.writeFileSync(TO, result.css);

			result.warnings().forEach((w) => console.warn(String(w)));
			const kb = (Buffer.byteLength(result.css) / 1024).toFixed(1);
			console.log(`bundle.css written (${kb} KB)`);
		});
}

function fail(err) {
	console.error('CSS build failed:', err && err.message ? err.message : err);
	process.exitCode = 1;
}

if (process.argv.includes('--watch')) {
	build().catch(fail);
	let pending = null;
	// NB: no { recursive: true }. Node only supports recursive watching on macOS
	// and Windows before v20 — on Linux it throws ERR_FEATURE_UNAVAILABLE_ON_PLATFORM.
	// public/stylesheets is flat, so a plain directory watch covers every file.
	fs.watch(WATCH_DIR, () => {
		clearTimeout(pending); // editors fire several events per save
		pending = setTimeout(() => build().catch(fail), 80);
	});
	console.log('watching public/stylesheets for changes…');
} else {
	build().catch((err) => {
		fail(err);
		process.exit(1);
	});
}
