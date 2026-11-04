import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const ui = await Bun.file(new URL('../.forger/ui.json', import.meta.url)).json();
const outDir = new URL('../docs/screenshots/', import.meta.url).pathname;
await mkdir(outDir, {recursive: true});

const places = [
  {name: 'centre', at: [24.9414, 60.1719]},
  {name: 'suburb', at: [25.01, 60.2509]},
];

const browser = await chromium.launch();
for (const viewport of ui.viewports) {
  for (const theme of ui.themes) {
    const context = await browser.newContext({viewport, colorScheme: theme});
    const page = await context.newPage();
    await page.goto(ui.url);
    await page.waitForFunction(() => (window as any).__map?.loaded(), null, {timeout: 30000}).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({path: `${outDir}map-${viewport.name}-${theme}.png`});
    await page.waitForSelector('#status[data-state="ready"]', {timeout: 30000}).catch(() => {});
    for (const place of places) {
      await page.reload();
      await page.waitForFunction(() => (window as any).__map?.loaded(), null, {timeout: 30000}).catch(() => {});
      await page.waitForSelector('#status[data-state="ready"]', {timeout: 30000}).catch(() => {});
      const point = await page.evaluate(([lng, lat]) => (window as any).__map.project([lng, lat]), place.at);
      await page.mouse.click(point.x, point.y);
      await page.waitForSelector('#status[data-state="reach"]', {timeout: 10000}).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({path: `${outDir}reach-${place.name}-${viewport.name}-${theme}.png`});
    }
    await page.reload();
    await page.waitForFunction(() => (window as any).__map?.loaded(), null, {timeout: 30000}).catch(() => {});
    await page.waitForSelector('#status[data-state="ready"]', {timeout: 30000}).catch(() => {});
    const centre = await page.evaluate(([lng, lat]) => (window as any).__map.project([lng, lat]), places[0]!.at);
    await page.mouse.click(centre.x, centre.y);
    await page.waitForSelector('#status[data-state="reach"]', {timeout: 10000}).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({path: `${outDir}when-weekday-0800-${viewport.name}-${theme}.png`});
    await page.check('input[name="day"][value="sunday"]');
    await page.fill('#time-slider', String(23 * 60));
    await page.waitForFunction(() => /23:00 on a Sunday/.test(document.getElementById('status')!.textContent ?? ''), null, {timeout: 20000}).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({path: `${outDir}when-sunday-2300-${viewport.name}-${theme}.png`});
    await context.close();
  }
}
await browser.close();
