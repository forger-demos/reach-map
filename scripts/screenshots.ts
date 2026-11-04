import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const ui = await Bun.file(new URL('../.forger/ui.json', import.meta.url)).json();
const outDir = new URL('../docs/screenshots/', import.meta.url).pathname;
await mkdir(outDir, {recursive: true});

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
    const point = await page.evaluate(() => (window as any).__map.project([24.9414, 60.1719]));
    await page.mouse.click(point.x, point.y);
    await page.waitForSelector('#status[data-state="reach"]', {timeout: 10000}).catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({path: `${outDir}reach-${viewport.name}-${theme}.png`});
    await context.close();
  }
}
await browser.close();
