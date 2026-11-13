import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'D:/skill/chrome-headless-shell/win64-157.0.8103.78/chrome-headless-shell-win64/chrome-headless-shell.exe', headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 512, height: 512 });
await p.goto('file:///D:/skill/assets/mark.svg', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 300));
await p.screenshot({ path: 'assets/mark.png', omitBackground: true });
await b.close();
