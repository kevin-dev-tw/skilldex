import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto('file:///D:/skill/index.html', { waitUntil: 'networkidle0' });
for (const [sel, name] of [['#index', 'index'], ['#sources', 'sources'], ['#install', 'install'], ['.footer', 'footer']]) {
  const el = await p.$(sel);
  await el.evaluate((e) => e.scrollIntoView());
  await new Promise((r) => setTimeout(r, 300));
  await p.screenshot({ path: '.hallmark/shots/chk-' + name + '.png' });
}
await b.close();
console.log('done');
