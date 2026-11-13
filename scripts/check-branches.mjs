import fs from 'node:fs';
const skills = JSON.parse(fs.readFileSync('data/skills.json', 'utf8')).skills;
const urls = [...new Set(skills.filter(s => !s.dead).map(s => s.url).filter(Boolean))];
const odd = urls.filter((u) => {
  const m = u.match(/github\.com\/[^/]+\/[^/]+\/(tree|blob)\/([^/]+)/);
  return !m || m[2] !== 'main' || m[1] !== 'tree';
});
const H = { 'User-Agent': 'skill-ledger-check', Accept: 'application/vnd.github+json' };
const results = [];
for (const u of odd) {
  const m = u.match(/github\.com\/([^/]+)\/([^/]+)(?:\/(tree|blob)\/([^/]+)(\/.*)?)?/);
  const [, owner, repo, , ref, path] = m;
  try {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: H });
    if (r.status !== 200) { results.push({ u, def: 'HTTP' + r.status, ok: false }); continue; }
    const def = (await r.json()).default_branch;
    const branchOk = !ref || ref === def;
    let pathOk = true, note = '';
    if (path) {
      const c = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents${path}?ref=${def}`, { headers: H });
      pathOk = c.status === 200;
      if (!pathOk) note = 'path missing on ' + def;
    }
    results.push({ u, def, ref, branchOk, pathOk, note });
  } catch (e) { results.push({ u, err: String(e).slice(0, 60) }); }
}
const bad = results.filter((r) => r.branchOk === false || r.pathOk === false || r.err || (r.def && String(r.def).startsWith('HTTP')));
console.log('checked', results.length, '| anomalies:', bad.length);
bad.forEach((b) => console.log(JSON.stringify(b)));
fs.writeFileSync('data/branch-check.json', JSON.stringify(results, null, 2));
