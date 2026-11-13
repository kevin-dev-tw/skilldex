import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'D:/skill/chrome-headless-shell/win64-157.0.8103.78/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 0.9 });
for (const [page, name] of [['landing', 'foot-bottom-landing'], ['index', 'foot-bottom-index']]) {
  await p.goto(`file:///D:/skill/${page}.html`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 400));
  await p.screenshot({ path: `.hallmark/shots/${name}.png` });
}
await b.close();
