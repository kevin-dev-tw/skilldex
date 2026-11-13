import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'D:/skill/chrome-headless-shell/win64-157.0.8103.78/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
await p.goto('file:///D:/skill/about.html#contribute', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
const info = await p.evaluate(() => {
  const a = document.querySelector('#contribute .btn');
  const r = a.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(a);
  return { boxW: r.width, textW: range.getBoundingClientRect().width };
});
console.log(JSON.stringify(info));
const el = await p.$('#contribute .headblock');
await el.screenshot({ path: '.hallmark/shots/btn-about-fix.png' });
await b.close();
