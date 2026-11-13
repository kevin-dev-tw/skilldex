#!/usr/bin/env node
// Inject the ledger (category groups of skill rows), chips, source options,
// stats and the source trail into index.html between its markers.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(ROOT, 'data', 'skills.json'), 'utf8'));
const page = join(ROOT, 'index.html');
let html = readFileSync(page, 'utf8');

// Only index: the Design & Creative category, plus everything in microsoft/skills and google/skills.
const KEEP_CAT = 'Design & Creative';
const KEEP_SRC = new Set(['microsoft/skills', 'google/skills']);
const skills = data.skills.filter((s) => !s.dead && s.sourceKind !== 'local' && (s.category === KEEP_CAT || KEEP_SRC.has(s.source)));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n = 140) => (s.length > n ? s.slice(0, s.lastIndexOf(' ', n)) + '…' : s);

const byCat = new Map();
for (const s of skills) {
  if (!byCat.has(s.category)) byCat.set(s.category, []);
  byCat.get(s.category).push(s);
}
const cats = [...byCat.keys()].sort((a, b) => byCat.get(b).length - byCat.get(a).length);

// --- ledger ---
const catHue = (i) => `var(--cat-${(i % 6) + 1})`;
const groups = cats.map((cat, i) => {
  const rows = byCat.get(cat)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => {
      const desc = s.description || s.desc || '';
      const hay = esc(`${s.name} ${desc} ${s.source}`);
      const label = s.source;
      // Rows link to the project root, not a buried SKILL.md: strip /tree|blob/…
      const repoUrl = (s.url || '').match(/https?:\/\/github\.com\/[^/]+\/[^/]+/)?.[0] || s.url || '';
      const nameHtml = repoUrl
        ? `<a href="${esc(repoUrl)}" rel="noopener">${esc(s.name)}</a>`
        : esc(s.name);
      const copyVal = repoUrl || s.path || '';
      return `        <div class="skill" data-hay="${hay}" data-cat="${esc(cat)}" data-src="${esc(label)}">
          <p class="skill__name">${nameHtml}</p>
          <p class="skill__desc" title="${esc(desc)}">${esc(clip(desc))}</p>
          <p class="skill__src">${esc(label)}</p>
          <button class="skill__copy" type="button" data-copy="${esc(copyVal)}">copy link</button>
        </div>`;
    }).join('\n');
  return `      <details open data-cat="${esc(cat)}" style="--cat: ${catHue(i)}">
        <summary>${esc(cat)} <span class="measured">${byCat.get(cat).length}</span></summary>
        <div class="ledger__rows">
${rows}
        </div>
      </details>`;
}).join('\n');

// --- chips ---
const chips = [`          <button class="chip" type="button" aria-pressed="true" data-cat="*">all <span class="measured">${skills.length}</span></button>`,
  ...cats.map((c, i) => `          <button class="chip" type="button" aria-pressed="false" data-cat="${esc(c)}" style="--cat: ${catHue(i)}">${esc(c)} <span class="measured">${byCat.get(c).length}</span></button>`)].join('\n');

// --- featured picks ---
const FEATURED = ['impeccable', 'unslop', 'algorithmic-art', 'imagegen-frontend-web', 'high-end-visual-design', 'minimalist-ui'];
const featured = FEATURED.map((n) => skills.find((s) => s.name === n)).filter(Boolean).map((s) => {
  const i = Math.max(0, cats.indexOf(s.category));
  const repoUrl = (s.url || '').match(/https?:\/\/github\.com\/[^/]+\/[^/]+/)?.[0] || s.url || '';
  return `        <a class="pick" role="listitem" href="${esc(repoUrl)}" rel="noopener" style="--cat: ${catHue(i)}">
          <span class="pick__name">${esc(s.name)}</span>
          <span class="pick__desc">${esc(clip(s.description || s.desc || '', 72))}</span>
          <span class="pick__src measured">${esc(s.source)}</span>
        </a>`;
}).join('\n');

// --- source select ---
const sources = [...new Set(skills.map((s) => s.source))].sort();
const srcOpts = [`          <option value="">all ${sources.length} sources</option>`,
  ...sources.map((s) => `          <option value="${esc(s)}">${esc(s)}</option>`)].join('\n');

// --- trail ---
const kindOf = (src) => {
  const k = skills.find((s) => s.source === src)?.sourceKind;
  return k === 'list' ? 'list' : 'repository';
};
const trail = sources.map((s, i) => {
  const n = skills.filter((k) => k.source === s).length;
  const nameHtml = `<a href="https://github.com/${esc(s)}" rel="noopener">${esc(s)}</a>`;
  return `    <li style="--cat: ${catHue(i)}">
      <span class="trail__name">${nameHtml}</span>
      <span class="trail__kind">${kindOf(s)}</span>
      <span class="trail__count">${n}</span>
    </li>`;
}).join('\n');

// --- stats ---
const total = skills.length.toLocaleString('en-US');
const date = data.generatedAt.slice(0, 10);
const replace = (a, b, content) => {
  const i = html.indexOf(a), j = html.indexOf(b);
  if (i < 0 || j < 0) return;
  html = html.slice(0, i + a.length) + content + html.slice(j);
};

replace('<!-- STATS:figure -->', '<!-- /STATS:figure -->', total);
replace('<!-- STATS:repos -->', '<!-- /STATS:repos -->', String(sources.filter((s) => kindOf(s) === 'repository').length));
replace('<!-- STATS:lists -->', '<!-- /STATS:lists -->', String(sources.filter((s) => kindOf(s) === 'list').length));
replace('<!-- STATS:cats -->', '<!-- /STATS:cats -->', String(cats.length));
replace('<!-- STATS:date -->', '<!-- /STATS:date -->', date);
replace('<!-- STATS:date2 -->', '<!-- /STATS:date2 -->', date);
const numWord = (n) => ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'][n] || String(n);
const nRepos = sources.filter((s) => kindOf(s) === 'repository').length;
const nLists = sources.filter((s) => kindOf(s) === 'list').length;
replace('<!-- STATS:srcword -->', '<!-- /STATS:srcword -->', numWord(sources.length).replace(/^./, (c) => c.toUpperCase()));
replace('<!-- STATS:repoword -->', '<!-- /STATS:repoword -->', numWord(nRepos).replace(/^./, (c) => c.toUpperCase()));
replace('<!-- STATS:listword -->', '<!-- /STATS:listword -->', numWord(nLists));
replace('<!-- STATS:srcn -->', '<!-- /STATS:srcn -->', String(sources.length));
replace('<!-- STATS:figure2 -->', '<!-- /STATS:figure2 -->', total);
replace('<!-- STATS:srcn2 -->', '<!-- /STATS:srcn2 -->', String(sources.length));
replace('<!-- CHIPS:BEGIN -->', '<!-- CHIPS:END -->', '\n' + chips + '\n        ');
replace('<!-- FEATURED:BEGIN -->', '<!-- FEATURED:END -->', '\n' + featured + '\n        ');
replace('<!-- SOURCES:BEGIN -->', '<!-- SOURCES:END -->', '\n' + srcOpts + '\n        ');
replace('<!-- TRAIL:BEGIN -->', '<!-- TRAIL:END -->', '\n' + trail + '\n      ');
replace('<!-- INDEX:BEGIN -->', '<!-- INDEX:END -->', '\n' + groups + '\n');

html = html.replace(/placeholder="filter [\d,]+ skills…"/, `placeholder="filter ${total} skills…"`);
html = html.replace(/<output id="count" for="q">[\d,]+<\/output>/, `<output id="count" for="q">${total}</output>`);

writeFileSync(page, html);
console.log(`index.html: ${total} skills in ${cats.length} groups, ${sources.length} sources, ${(html.length / 1024).toFixed(0)} KB`);
