// Regenerate the PWA icon set (web-pwa fork) from build/icon-flat.svg, the
// same flat design source scripts/make-icons.mjs uses for Windows/Linux.
//
//   public/pwa/icon-192.png, icon-512.png — "any": the squircle as designed
//   public/pwa/maskable-512.png           — full-bleed #141414, glyph inside
//                                           the 80% maskable safe zone
//   public/pwa/apple-touch-icon.png       — 180 px full-bleed; iOS rounds it
//
// The squircle's own fill is rgb(20,20,20) = #141414, so painting the
// transparent corners that colour makes the full-bleed variants seamless.
// Committed outputs; rerun only when the design changes:
// `node scripts/make-pwa-icons.mjs`.
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(path.join(root, "build", "icon-flat.svg"), "utf8");
const out = path.join(root, "public", "pwa");
mkdirSync(out, { recursive: true });

const BACKGROUND = "#141414";
// The glyph reaches ~93% of the icon's half-width from the centre; 0.8 / 0.93
// keeps it inside the maskable safe circle with a little air.
const MASKABLE_SCALE = 0.84;

/** The source SVG nested in a square canvas, scaled about the centre. */
function framed(scale, background) {
	const inner = source.replace(/<\?xml[^>]*>/, "").replace(/<!DOCTYPE[^>]*>/, "");
	const offset = (1024 * (1 - scale)) / 2;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">`
		+ (background ? `<rect width="1024" height="1024" fill="${background}"/>` : "")
		+ `<g transform="translate(${offset} ${offset}) scale(${scale})"><svg width="1024" height="1024" viewBox="0 0 1024 1024">${inner.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg></g></svg>`;
}

const render = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

const outputs = [
	["icon-192.png", framed(1, null), 192],
	["icon-512.png", framed(1, null), 512],
	["maskable-512.png", framed(MASKABLE_SCALE, BACKGROUND), 512],
	["apple-touch-icon.png", framed(1, BACKGROUND), 180],
];
for (const [name, svg, size] of outputs) {
	const png = render(svg, size);
	writeFileSync(path.join(out, name), png);
	console.log(`public/pwa/${name}  ${size}×${size} — ${(png.length / 1024).toFixed(1)} KB`);
}
