import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'D:/skill/chrome-headless-shell/win64-157.0.8103.78/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto('file:///D:/skill/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 400));
const r = await p.evaluate(() => {
  const row = document.querySelector('.ledger details[open] .skill, .ledger details .skill');
  const ledger = document.querySelector('.ledger');
  const rr = row.getBoundingClientRect(), lr = ledger.getBoundingClientRect();
  const cs = getComputedStyle(document.querySelector('.ledger details'), '::details-content');
  return { rowLeft: rr.left, cardLeft: lr.left, bleedLeft: lr.left - rr.left, rowRight: rr.right, cardRight: lr.right, clipMargin: cs.overflowClipMargin };
});
console.log(JSON.stringify(r));
await b.close();
