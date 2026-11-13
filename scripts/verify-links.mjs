#!/usr/bin/env node
// Verify every skill's GitHub URL resolves (200). Caches results in
// data/linkcheck.json so reruns only check failures.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(ROOT, 'data', 'skills.json'), 'utf8'));
const CACHE = join(ROOT, 'data', 'linkcheck.json');
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function check(url) {
  if (cache[url] === 200) return 200;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'skill-ledger-linkcheck' } });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (i + 1)); continue; }
      // GitHub renders 404s as status 404; a tree page that exists is 200
      cache[url] = res.status;
      return res.status;
    } catch (e) {
      if (i === 1) { cache[url] = 0; return 0; }
      await sleep(1000);
    }
  }
  return cache[url];
}

const urls = [...new Set(data.skills.map((s) => s.url).filter((u) => u && u.startsWith('https://github.com')))];
console.log(`${urls.length} unique GitHub urls (${Object.values(cache).filter((v) => v === 200).length} cached ok)`);

const bad = [];
const CHUNK = 8;
let done = 0;
for (let i = 0; i < urls.length; i += CHUNK) {
  await Promise.all(urls.slice(i, i + CHUNK).map(async (u) => {
    const st = await check(u);
    done++;
    if (st !== 200) bad.push({ url: u, status: st, skills: data.skills.filter((s) => s.url === u).map((s) => s.name) });
  }));
  if (done % 80 < CHUNK) { console.log(`  …${done}/${urls.length}`); writeFileSync(CACHE, JSON.stringify(cache)); }
}
writeFileSync(CACHE, JSON.stringify(cache));

console.log(`\n${bad.length} broken links:`);
for (const b of bad) console.log(`  [${b.status}] ${b.url}  ← ${b.skills.join(', ')}`);
