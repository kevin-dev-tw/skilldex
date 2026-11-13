#!/usr/bin/env node
// Fetch skills from GitHub: real SKILL.md files in major repos + categorized
// entries from awesome lists. Writes data/skills.json. No auth needed.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'data', 'cache');
const OUT = join(ROOT, 'data', 'skills.json');
mkdirSync(CACHE, { recursive: true });

const REPOS = [
  'microsoft/skills',
  'google/skills',
  'openai/skills',
  'anthropics/skills',
  'anthropics/claude-cookbooks',
  'obra/superpowers',
  'vercel-labs/skills',
  // design-focused collections
  'pbakaus/impeccable',
  'Leonxlnx/taste-skill',
  'Leonxlnx/taste-skill-classics',
  'h3nryprod01/design-taste',
  'heydamir/unslop',
  'nextlevelbuilder/ui-ux-pro-max-skill',
  'Ga14ctic/awwwards-skill',
  'IndelibleVivi/frontend-craft',
  'yasikvlad/industrial-brutalist-ui',
  'bremsstrahlung-57/minimalist-ui-skill',
  'Makies06/imagegen-frontend-web',
  'andrea-vertelya/brandkit-skill-lovable',
];

// Each list: which top-level sections contain skill entries.
const LISTS = [
  {
    name: 'ComposioHQ/awesome-claude-skills',
    url: 'https://raw.githubusercontent.com/ComposioHQ/awesome-claude-skills/master/README.md',
    start: /^##\s+Skills\s*$/m,
    stop: /^##\s+(?!#)/m,
    stopAfter: true,
  },
  {
    name: 'travisvn/awesome-claude-skills',
    url: 'https://raw.githubusercontent.com/travisvn/awesome-claude-skills/main/README.md',
    start: /^##\s+.*(Official Skills|Community Skills)/m,
    stop: /^##\s+✏️|^##\s+Creating/m,
    stopAfter: true,
  },
  {
    name: 'VoltAgent/awesome-agent-skills',
    url: 'https://raw.githubusercontent.com/VoltAgent/awesome-agent-skills/main/README.md',
    start: /^###\s+.*Skills?\s+by/m,
    stop: /^##\s+🔒|^##\s+Security/m,
    stopAfter: true,
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, { retries = 1 } = {}) {
  const key = createHash('sha1').update(url).digest('hex');
  const cf = join(CACHE, key + '.txt');
  if (existsSync(cf)) return readFileSync(cf, 'utf8');
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'skill-catalog' } });
      if (res.ok) {
        const t = await res.text();
        writeFileSync(cf, t);
        return t;
      }
      if (res.status === 404) return null;
      if (i === retries) throw new Error(`${res.status} ${url}`);
    } catch (e) {
      if (i === retries) throw e;
      await sleep(800 * (i + 1));
    }
  }
  return null;
}

async function fetchJson(url) {
  const t = await fetchText(url);
  return t ? JSON.parse(t) : null;
}

// Parse simple YAML frontmatter scalars (name, description, license).
// Handles quoted strings and `>-`/`|` block scalars.
function frontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const body = m[1];
  const out = {};
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!kv || lines[i].startsWith(' ') || lines[i].startsWith('-')) continue;
    const [, key, val] = kv;
    if (!/^(name|description|license|version|author)$/.test(key)) continue;
    let v = val.trim();
    if (v === '>-' || v === '>' || v === '|' || v === '|-' || v === '') {
      const block = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s+\S/.test(lines[j])) block.push(lines[j].trim());
        else if (/^[A-Za-z_-]+:/.test(lines[j]) || lines[j].trim() === '') break;
        else break;
      }
      v = block.join(' ');
    } else {
      v = v.replace(/^['"]|['"]$/g, '');
    }
    out[key] = v;
  }
  return out;
}

// Map a skill to a canonical category from its name + description + hints.
const CANON = [
  ['Documents & Files', /\b(pdf|docx|word|xlsx|excel|spreadsheet|pptx|powerpoint|csv|markdown|document|epub|latex)\b/i],
  ['Design & Creative', /\b(design|art|canvas|brand|ui|ux|figma|image|logo|typograph|pixel|svg|illustration|theme|poster)\b/i],
  ['Video, Audio & Media', /\b(video|audio|gif|music|remotion|media|animation|3d|blender|photo|podcast)\b/i],
  ['Web, Mobile & Frontend', /\b(web|frontend|react|next|vue|svelte|html|css|tailwind|browser|landing|artifact|gsap|wordpress|mobile|ios|android|flutter|swift|kotlin)\b/i],
  ['Data & Analysis', /\b(data|analytic|sql|database|duckdb|mongodb|supabase|neon|clickhouse|chart|visualiz|notebook|pandas|etl)\b/i],
  ['AI, Agents & MCP', /\b(mcp|agent|claude|openai|gemini|llm|prompt|model|hugging|replicate|fal|minimax|anthropic|research|wiki|knowledge|rag|learn)\b/i],
  ['DevOps & Infra', /\b(docker|kubernetes|k8s|gke|terraform|hashi|cloudflare|netlify|vercel|ci\/cd|pipeline|deploy|infra|aws|azure|gcp|google.cloud|cloud.run|iam|secops|monitor|observab|troubleshoot|filestore|storage|backup|compute.engine|git(?!hub)|angular|expo|callstack)\b/i],
  ['Security & Testing', /\b(secur|test|trail.of.bits|sentry|auth0|auth|penetr|vulnerab|fuzz|behat|capybara|appium|cucumber|playwright|triage|hunt)\b/i],
  ['APIs & Integration', /\b(api|sdk|graphql|apollo|stripe|resend|courier|binance|notion|slack|integration|webhook|serpapi|composio|search)\b/i],
  ['Marketing & Business', /\b(market|seo|advertis|sales|business|copywrit|growth|content.strat|haines|barrett)\b/i],
  ['Product & Management', /\b(product|manager|roadmap|pawel|huryn|peters|project|planning|notion.doc)\b/i],
  ['Writing & Communication', /\b(writ|comm|email|internal.comm|coauthor|blog|newsletter|typefully|slack.gif)\b/i],
  ['Productivity & Workflow', /\b(productiv|workflow|automat|n8n|organiz|task|note|calendar|workspace)\b/i],
  ['Skill Authoring & Meta', /\b(skill.creator|create.skill|skill.author|migrat|onboard|template)\b/i],
  ['Development & Code', /\b(code|develop|review|debug|refactor|typescript|python|rust|java|dotnet|\.net|golang|lint|commit|repo|sdk|cli|issue|pull.request|migrat|onboard|scaffold|boiler|template|release|changelog|readme|generat)\b/i],
  ['Industry & Domain', /\b(health|medical|financ|crypto|stock|legal|educat|science|weather|travel|game|gaming|iot|home|real.estate|fitness|sport|music.industry)\b/i],
  ['Documents & Files', /\b(file|folder|filesystem|drive|dropbox|s3|upload|download)\b/i],
];
function categorize(s) {
  const hay = `${s.hint || ''} ${s.name} ${s.description || s.desc || ''}`;
  for (const [cat, re] of CANON) if (re.test(hay)) return cat;
  return 'Other';
}

const normUrl = (u) => u.replace(/\/+$/, '').replace(/\.git$/, '').toLowerCase();

async function repoSkills(repo) {
  const meta = await fetchJson(`https://api.github.com/repos/${repo}`);
  if (!meta) { console.error(`  ! ${repo}: no meta`); return []; }
  const branch = meta.default_branch;
  const tree = await fetchJson(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`);
  if (!tree?.tree) { console.error(`  ! ${repo}: no tree`); return []; }
  const paths = tree.tree.filter((t) => /(^|\/)SKILL\.md$/i.test(t.path)).map((t) => t.path);
  console.log(`  ${repo}: ${paths.length} SKILL.md (${branch})`);

  const out = [];
  const CHUNK = 10;
  for (let i = 0; i < paths.length; i += CHUNK) {
    await Promise.all(paths.slice(i, i + CHUNK).map(async (p) => {
      const raw = `https://raw.githubusercontent.com/${repo}/${branch}/${p.split('/').map(encodeURIComponent).join('/')}`;
      const md = await fetchText(raw);
      if (!md) return;
      const fm = frontmatter(md);
      const dir = p.replace(/\/SKILL\.md$/i, '');
      const seg = dir.split('/');
      const name = fm.name || seg[seg.length - 1];
      if (!fm.description) console.error(`  ! no desc: ${repo}/${p}`);
      out.push({
        name,
        description: fm.description || '',
        license: fm.license || '',
        source: repo,
        sourceKind: 'repo',
        hint: seg.slice(0, -1).join(' '),
        url: `https://github.com/${repo}/tree/${branch}/${dir}`,
        rawUrl: raw,
      });
    }));
    if (i % 50 === 0 && i > 0) console.log(`    …${i}/${paths.length}`);
  }
  return out;
}

function parseAwesome(list, md) {
  const lines = md.split(/\r?\n/);
  let inScope = !list.start;
  let section = '';
  const items = [];
  const linkRe = /[-*]\s+\[?\*?\*?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\*?\*?\]?(?:\*\*)?\s*[-–—:]\s*(.+)/;
  for (const line of lines) {
    if (list.start && list.start.test(line)) { inScope = true; list.start = null; continue; }
    if (!inScope) continue;
    if (list.stop && list.stop.test(line) && !/^#{3,}/.test(line)) break;
    const h = line.match(/^#{2,4}\s+(.+)/);
    if (h) { section = h[1].replace(/[📁🎯🌟✏️💛🔒🤝]/gu, '').trim(); continue; }
    const m = line.match(linkRe);
    if (!m) continue;
    const [, name, url, desc] = m;
    if (!/github\.com/i.test(url)) continue;
    if (/badge|sponsor|user-attachments|awesome$/i.test(url)) continue;
    items.push({
      name: name.replace(/\*\*/g, '').trim(),
      url: normUrl(url),
      desc: desc.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim(),
      section,
      source: list.name,
      sourceKind: 'listed',
    });
  }
  return items;
}

const all = [];
const seenNames = new Set();
for (const repo of REPOS) {
  const skills = await repoSkills(repo);
  for (const s of skills) {
    const key = s.name.toLowerCase() + '|' + repo.split('/')[0].toLowerCase();
    if (seenNames.has(key)) { console.log(`    ~ dup name skipped: ${s.name} (${repo})`); continue; }
    seenNames.add(key);
    all.push(s);
  }
}

const seen = new Set(all.map((s) => normUrl(s.url)));
let dupes = 0;
for (const list of LISTS) {
  const md = await fetchText(list.url);
  if (!md) { console.error(`  ! ${list.name}: fetch failed`); continue; }
  const items = parseAwesome(list, md);
  let kept = 0;
  for (const it of items) {
    // skip entries pointing into repos we already collected file-by-file
    const repoRoot = it.url.match(/^(https:\/\/github\.com\/[^/]+\/[^/]+)/)?.[1];
    if (seen.has(it.url) || (repoRoot && REPOS.map((r) => `https://github.com/${r}`).includes(repoRoot))) { dupes++; continue; }
    it.hint = it.section;
    seen.add(it.url);
    all.push(it);
    kept++;
  }
  console.log(`  ${list.name}: ${items.length} parsed, ${kept} kept`);
}

for (const s of all) s.category = categorize(s);

const stats = {
  total: all.length,
  repo: all.filter((s) => s.sourceKind === 'repo').length,
  listed: all.filter((s) => s.sourceKind === 'listed').length,
  dupes,
  sources: [...new Set(all.map((s) => s.source))],
  categories: [...new Set(all.map((s) => s.category))].sort(),
};
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), stats, skills: all }, null, 2));
console.log(`\n${stats.total} skills (${stats.repo} repo + ${stats.listed} listed, ${dupes} dupes) → data/skills.json`);
console.log(stats.categories.map((c) => `${c}: ${all.filter((s) => s.category === c).length}`).join('\n'));
