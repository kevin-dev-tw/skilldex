import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'D:/skill/chrome-headless-shell/win64-157.0.8103.78/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 0.8 });
for (const [page, name] of [['landing', 'comboB-landing'], ['index', 'comboB-index']]) {
  await p.goto(`file:///D:/skill/${page}.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  await p.screenshot({ path: `.hallmark/shots/${name}.png` });
}
await b.close();
