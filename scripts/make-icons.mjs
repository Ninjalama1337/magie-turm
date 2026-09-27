// Rendert public/icon.svg als PWA-Icons und erzeugt Android-Launcher-Icons + Splashscreens.
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';

const svg = readFileSync('public/icon.svg', 'utf8');
const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const browser = await chromium.launch();

async function render(path, w, h, html) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(`<html><body style="margin:0;background:transparent;overflow:hidden">${html}</body></html>`);
  await page.screenshot({ path, omitBackground: true });
  await page.close();
}

const icon = (size, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 512 512" ${extra}>${inner}</svg>`;

for (const size of [192, 512]) await render(`public/icon-${size}.png`, size, size, icon(size));

if (existsSync('android/app/src/main/res')) {
  const res = 'android/app/src/main/res';
  const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, f] of Object.entries(dens)) {
    const s = Math.round(48 * f);
    await render(`${res}/mipmap-${d}/ic_launcher.png`, s, s, icon(s));
    await render(`${res}/mipmap-${d}/ic_launcher_round.png`, s, s, `<div style="width:${s}px;height:${s}px;border-radius:50%;overflow:hidden">${icon(s)}</div>`);
    const fg = Math.round(108 * f);
    const inset = Math.round(fg * 0.17);
    await render(
      `${res}/mipmap-${d}/ic_launcher_foreground.png`,
      fg,
      fg,
      `<div style="padding:${inset}px">${icon(fg - inset * 2, 'style="border-radius:22%"')}</div>`,
    );
    const port = [Math.round(320 * f), Math.round(480 * f)];
    const splash = (w, h) => {
      const i = Math.round(Math.min(w, h) * 0.38);
      return `<div style="width:${w}px;height:${h}px;background:radial-gradient(ellipse at 50% 45%,#4a0c16,#0b0607 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(i * 0.12)}px">
        ${icon(i)}<div style="font-family:Georgia,serif;color:#ffe7c2;letter-spacing:.15em;font-size:${Math.round(i * 0.16)}px;text-shadow:0 0 18px #d2203a">TEUFELSRAD</div></div>`;
    };
    await render(`${res}/drawable-port-${d}/splash.png`, port[0], port[1], splash(port[0], port[1]));
    await render(`${res}/drawable-land-${d}/splash.png`, port[1], port[0], splash(port[1], port[0]));
    if (d === 'xhdpi') await render(`${res}/drawable/splash.png`, port[0], port[1], splash(port[0], port[1]));
  }
}
await browser.close();
console.log('Icons & Splashscreens erzeugt');
