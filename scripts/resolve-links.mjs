// Resolve repo-root GitHub links to the actual skill directory.
// For each `github.com/o/r` URL, shallow-clone (trees only, no blobs) and
// locate the SKILL.md whose directory matches the skill name.
// Writes resolved URLs back into data/skills.json. Cached in data/resolve-cache.json.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const data = JSON.parse(fs.readFileSync('data/skills.json', 'utf8'));
const cachePath = 'data/resolve-cache.json';
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
const saveCache = () => fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// repo root urls -> {repo, [skill records]}
const targets = new Map();
for (const s of data.skills) {
  if (s.dead) continue;
  const m = s.url.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)\/?$/);
  if (m) {
    if (!targets.has(m[1])) targets.set(m[1], []);
    targets.get(m[1]).push(s);
  }
}
console.log(`${targets.size} repos to resolve`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-resolve-'));
let done = 0, resolved = 0, dead = 0, unresolved = 0;

const pending = [...targets.entries()].filter(([repo]) => !(repo in cache));
const CONC = 8;

async function worker() {
  while (pending.length) {
    const [repo, records] = pending.shift();
    const dir = path.join(tmp, repo.replace(/\//g, '_'));
    let entry;
    try {
      execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--no-checkout', '--quiet', `https://github.com/${repo}`, dir], { stdio: 'pipe', timeout: 90000 });
      const branch = execFileSync('git', ['-C', dir, 'symbolic-ref', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
      const files = execFileSync('git', ['-C', dir, 'ls-tree', '-r', '--name-only', 'HEAD'], { encoding: 'utf8', maxBuffer: 8 << 20 });
      const skills = files.split('\n').filter((f) => /(^|\/)skill\.md$/i.test(f));
      entry = { branch, skills };
      cache[repo] = entry;
    } catch {
      entry = { error: 'clone failed' };
      cache[repo] = entry;
    }
    fs.rmSync(dir, { recursive: true, force: true });
    if (++done % 20 === 0) { console.log(`  …${done}/${pending.length}`); saveCache(); }
  }
}

await Promise.all(Array.from({ length: CONC }, worker));
saveCache();

// apply resolutions
for (const [repo, records] of targets) {
  const e = cache[repo];
  if (!e || e.error || !e.skills.length) {
    if (e && e.error) records.forEach((s) => { s.dead = true; dead++; });
    else { unresolved++; records.forEach((s) => { s.unresolved = true; }); }
    continue;
  }
  for (const s of records) {
    const want = slug(s.name.split('/').pop());
    let pick = e.skills.find((f) => slug(path.posix.dirname(f).split('/').pop()) === want);
    if (!pick && e.skills.length === 1) pick = e.skills[0];
    if (!pick) pick = e.skills.find((f) => path.posix.dirname(f).toLowerCase().includes(want));
    if (pick) {
      const dir = path.posix.dirname(pick);
      s.url = `https://github.com/${repo}/tree/${e.branch}${dir === '.' ? '' : '/' + dir}`;
      delete s.unresolved;
      resolved++;
    } else {
      s.unresolved = true;
      unresolved++;
    }
  }
}

fs.writeFileSync('data/skills.json', JSON.stringify(data, null, 2));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`resolved: ${resolved}, unresolved: ${unresolved}, dead repos: ${dead}`);
