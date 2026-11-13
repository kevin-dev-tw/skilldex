import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const p = await b.newPage();
await p.goto('file:///D:/skill/index.html', { waitUntil: 'domcontentloaded' });

// rows all visible before JS filter runs
const total = await p.$$eval('.skill', (r) => r.length);
// open the filter popover, type a query
await p.click('.filterpop__btn');
await new Promise((r) => setTimeout(r, 100));
const popOpen = await p.$eval('#filterpop', (d) => d.open);
await p.type('#q', 'pdf');
await new Promise((r) => setTimeout(r, 200));
const shown = await p.$eval('#count', (o) => o.value);
const hidden = await p.$$eval('.skill[hidden]', (r) => r.length);
const groupsHidden = await p.$$eval('.ledger details[hidden]', (r) => r.length);
// pick one category chip (single-select, panel auto-closes)
await p.click('.chip[data-cat="Documents & Files"]');
await new Promise((r) => setTimeout(r, 200));
const shown2 = await p.$eval('#count', (o) => o.value);
const popClosedAfterChip = await p.$eval('#filterpop', (d) => !d.open);
const filternShown = await p.$eval('#filtern', (s) => ({ hidden: s.hidden, n: s.textContent }));
// custom source dropdown (reopen panel, open menu, click an option)
await p.evaluate(() => { document.getElementById('filterpop').open = true; });
await p.click('#srcbtn');
await new Promise((r) => setTimeout(r, 100));
await p.click('#srcmenu li[data-value="anthropics/skills"]');
await new Promise((r) => setTimeout(r, 200));
const shown3 = await p.$eval('#count', (o) => o.value);
const ddLabel = await p.$eval('#srclabel', (s) => s.textContent);
// clear restores everything
await p.click('#clear');
await new Promise((r) => setTimeout(r, 200));
const shown4 = await p.$eval('#count', (o) => o.value);
console.log({ total, shown, hidden, groupsHidden, popOpen, shown2, popClosedAfterChip, filternShown, shown3, ddLabel, shown4 });
await b.close();
