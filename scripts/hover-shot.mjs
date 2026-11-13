import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'D:/skill/chrome-headless-shell/win64-157.0.8103.78/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await p.goto('file:///D:/skill/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
const y = await p.evaluate(() => {
  const row = document.querySelector('.ledger details .skill');
  row.scrollIntoView({ block: 'center' });
  return row.getBoundingClientRect().top;
});
await new Promise(r => setTimeout(r, 300));
await p.hover('.ledger details .skill');
await new Promise(r => setTimeout(r, 300));
await p.screenshot({ path: '.hallmark/shots/hover-bleed.png', clip: { x: 0, y: Math.max(0, y - 20), width: 1440, height: 100 } });
await b.close();
