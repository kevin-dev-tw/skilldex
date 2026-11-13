// Stagger fallback: set --sibling-index where sibling-index() isn't supported.
if (!CSS.supports('animation-delay: calc(sibling-index() * 0.1s)')) {
  document.querySelectorAll('.stage__rows').forEach((l) =>
    [...l.children].forEach((el, i) => el.style.setProperty('--sibling-index', i + 1)));
}

const q = document.getElementById('q');
const src = document.getElementById('src');
const count = document.getElementById('count');
const empty = document.getElementById('empty');
const clearBtn = document.getElementById('clear');
const pop = document.getElementById('filterpop');
const filtern = document.getElementById('filtern');
const chips = [...document.querySelectorAll('.chip')];
const rows = [...document.querySelectorAll('.skill')];
const groups = [...document.querySelectorAll('.ledger details')];
const TOTAL = rows.length;

// Chips are single-select: one category lens, or "all". Click the active chip to release it.
let activeCat = null;
const cats = new Set(rows.map((r) => r.dataset.cat));

// Phones start collapsed: the full ledger is too tall to scroll past.
const smallScreen = () => matchMedia('(max-width: 40rem)').matches;
if (smallScreen()) groups.forEach((g) => (g.open = false));

function syncChips() {
  for (const c of chips) {
    const on = c.dataset.cat === '*' ? activeCat === null : activeCat === c.dataset.cat;
    c.setAttribute('aria-pressed', String(on));
  }
}

function apply() {
  const needle = q.value.trim().toLowerCase();
  const srcVal = src.value;
  let shown = 0;
  for (const row of rows) {
    const hit = (!needle || row.dataset.hay.toLowerCase().includes(needle))
      && (!srcVal || row.dataset.src === srcVal)
      && (!activeCat || row.dataset.cat === activeCat);
    row.hidden = !hit;
    if (hit) shown++;
  }
  const filtering = !!needle || !!srcVal || activeCat !== null;
  for (const g of groups) {
    const visible = [...g.querySelectorAll('.skill')].some((r) => !r.hidden);
    g.hidden = !visible;
    if (filtering && visible && smallScreen()) g.open = true;
  }
  count.value = shown;
  empty.hidden = shown !== 0;
  if (clearBtn) clearBtn.hidden = !filtering;
  const label = document.getElementById('srclabel');
  if (label) {
    label.textContent = src.options[src.selectedIndex].textContent;
    document.querySelectorAll('#srcmenu [role="option"]').forEach((li) => {
      li.setAttribute('aria-selected', String(li.dataset.value === src.value));
    });
  }
  if (filtern) {
    const n = (needle ? 1 : 0) + (srcVal ? 1 : 0) + (activeCat !== null ? 1 : 0);
    filtern.hidden = n === 0;
    filtern.textContent = n;
  }
}

if (q && src) {
q.addEventListener('input', apply);
src.addEventListener('change', apply);
for (const c of chips) {
  c.addEventListener('click', () => {
    const cat = c.dataset.cat;
    activeCat = cat === '*' || activeCat === cat ? null : cat;
    syncChips();
    apply();
    if (pop) pop.open = false;
  });
}
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    q.value = ''; src.value = ''; activeCat = null;
    syncChips(); apply(); q.focus();
  });
}
if (pop) {
  document.addEventListener('click', (e) => {
    if (pop.open && !pop.contains(e.target)) pop.open = false;
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pop && pop.open) pop.open = false;
});

// Custom source dropdown. Options are generated from the hidden <select>
// so data/skills.json → build stays the single source of truth.
const srcdd = document.getElementById('srcdd');
if (srcdd) {
  const btn = document.getElementById('srcbtn');
  const menu = document.getElementById('srcmenu');
  const items = [...src.options].map((o) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.tabIndex = -1;
    li.dataset.value = o.value;
    li.textContent = o.textContent;
    menu.append(li);
    return li;
  });
  const openDD = () => { menu.hidden = false; srcdd.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); };
  const closeDD = () => { menu.hidden = true; srcdd.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
  const current = () => Math.max(0, items.findIndex((li) => li.dataset.value === src.value));
  const pick = (li) => { src.value = li.dataset.value; src.dispatchEvent(new Event('change')); closeDD(); btn.focus(); };
  btn.addEventListener('click', () => { if (menu.hidden) { openDD(); items[current()].focus(); } else closeDD(); });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openDD(); (e.key === 'ArrowUp' ? items.at(-1) : items[0]).focus(); }
  });
  menu.addEventListener('click', (e) => { const li = e.target.closest('li[role="option"]'); if (li) pick(li); });
  menu.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); items[e.key === 'Home' ? 0 : items.length - 1].focus(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i >= 0) pick(items[i]); }
  });
  document.addEventListener('click', (e) => { if (!menu.hidden && !srcdd.contains(e.target)) closeDD(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { closeDD(); btn.focus(); } });
}
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  e.preventDefault();
  q.focus();
});
}

// Page transitions: fade out before same-site page loads. Entry fade is CSS
// (`pagein` on <main>); reduced-motion disables both through the global rule
// and this early return.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.addEventListener('click', (e) => {
  if (reduceMotion || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#')) return;
  if (a.origin !== location.origin) return;
  e.preventDefault();
  document.documentElement.classList.add('page-leave');
  setTimeout(() => { location.href = href; }, 150);
});

// In-page navigation: smooth-scroll without writing a #fragment into the URL.
// The href stays so the links still work with scripting off.
const slab = document.querySelector('.slab');
const burger = document.getElementById('burger');
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href') === '#') return;
  const target = document.querySelector(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ block: 'start' });
  if (slab) { slab.classList.remove('is-open'); if (burger) burger.setAttribute('aria-expanded', 'false'); }
});

if (burger && slab) {
  burger.addEventListener('click', () => {
    const open = slab.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (slab.classList.contains('is-open') && !slab.contains(e.target)) {
      slab.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && slab.classList.contains('is-open')) {
      slab.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.focus();
    }
  });
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    const t = btn.textContent;
    btn.textContent = 'copied';
    btn.classList.add('is-copied');
    setTimeout(() => { btn.textContent = t; btn.classList.remove('is-copied'); }, 1200);
  } catch {
    window.prompt('Copy the link:', btn.dataset.copy);
  }
});

if (q && src) { syncChips(); apply(); }
