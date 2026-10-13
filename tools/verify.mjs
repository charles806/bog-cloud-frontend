#!/usr/bin/env node
/* ==========================================================================
   BOG CLOUD — VERIFICATION HARNESS

   Run:  node tools/verify.mjs [--only <path-fragment>]

   No dependencies. Parses the shipped CSS for its real token values and checks
   every colour pair that the stylesheet actually produces, in both themes.
   The point is that these assertions read tokens.css rather than restating
   numbers, so a palette edit that breaks contrast fails here instead of
   shipping.
   ========================================================================== */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0, fail = 0, warn = 0;
const failures = [];
const warnings = [];

const VERBOSE = process.argv.includes('-v');
const ok   = (m) => { pass++; if (VERBOSE && m) console.log('  \x1b[32m\u2713\x1b[0m ' + m); };
const bad  = (m) => { fail++; failures.push(m); };
const soft = (m) => { warn++; warnings.push(m); };

/* ---------------------------------------------------------------- colour -- */

function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------- read the real tokens -- */

function readTokens() {
  /* Comments MUST be stripped before parsing. The token file documents its own
     values in prose, and a line like "--brand-50: a saturated tint reads as
     noise" inside a comment is indistinguishable from a declaration to a
     naive regex — it swallowed the next real declaration whole. */
  const css = readFileSync(join(ROOT, 'assets/css/tokens.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  function block(selector) {
    const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
    const m = css.match(re);
    if (!m) throw new Error(`token block not found: ${selector}`);
    return m[1];
  }

  function parse(src) {
    const out = {};
    /* Several tokens are declared on one line in the status block
       (--err-text / --err-bg / --err-edge share a line), so this cannot be
       line-anchored. */
    for (const m of src.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      out[m[1]] = m[2].trim();
    }
    return out;
  }

  /* Dark values override light values, as they do in a real cascade. */
  const light = parse(block(':root'));
  const dark  = { ...light, ...parse(block(':root[data-theme="dark"]')) };

  /* Resolve var() references within each theme. */
  function resolve(map, name, seen = new Set()) {
    const raw = map[name];
    if (raw == null) return null;
    if (seen.has(name)) return null;
    seen.add(name);
    const ref = raw.match(/^var\((--[\w-]+)\)$/);
    return ref ? resolve(map, ref[1], seen) : raw;
  }

  const themes = {};
  for (const [theme, map] of [['light', light], ['dark', dark]]) {
    themes[theme] = new Proxy({}, {
      get: (_, k) => resolve(map, String(k)),
    });
  }
  return themes;
}

const T = readTokens();

/* --------------------------------------------------------------- checks -- */

const BODY_MIN = 4.5;   /* WCAG 1.4.3 normal text        */
const LARGE_MIN = 3.0;  /* WCAG 1.4.3 >=24px or >=19px bold */
const UI_MIN = 3.0;     /* WCAG 1.4.11 non-text UI        */

function checkPair(label, fgToken, bgToken, min, theme) {
  const fg = T[theme][fgToken], bg = T[theme][bgToken];
  if (!fg || !bg || !/^#[0-9a-f]{3,6}$/i.test(fg) || !/^#[0-9a-f]{3,6}$/i.test(bg)) {
    bad(`${theme}: ${label} — could not resolve ${fgToken} (${fg}) on ${bgToken} (${bg})`);
    return;
  }
  const r = contrast(fg, bg);
  const line = `${theme.padEnd(5)} ${label.padEnd(42)} ${fg} on ${bg}  ${r.toFixed(2)}:1  (min ${min})`;
  if (r >= min) ok(line); else bad(line);
}

console.log('\n\x1b[1mCONTRAST — text\x1b[0m');
for (const theme of ['light', 'dark']) {
  checkPair('--text on --surface',        '--text',        '--surface', BODY_MIN,  theme);
  checkPair('--text on --bg',             '--text',        '--bg',      BODY_MIN,  theme);
  checkPair('--text on --surface-2',      '--text',        '--surface-2', BODY_MIN, theme);
  checkPair('--muted on --surface',       '--muted',       '--surface', BODY_MIN,  theme);
  checkPair('--muted on --bg',            '--muted',       '--bg',      BODY_MIN,  theme);
  checkPair('--muted-2 on --surface',     '--muted-2',     '--surface', BODY_MIN,  theme);
  checkPair('--link on --bg',             '--link',        '--bg',      BODY_MIN,  theme);
  checkPair('--link on --surface',        '--link',        '--surface', BODY_MIN,  theme);
  checkPair('--brand-text on --surface',  '--brand-text',  '--surface', BODY_MIN,  theme);
  checkPair('--brand-text on --row-alt',  '--brand-text',  '--row-alt', BODY_MIN,  theme);
  checkPair('--on-brand on --brand-700',  '--on-brand',    '--brand-700', BODY_MIN, theme);
  checkPair('--on-brand on --brand-900',  '--on-brand',    '--brand-900', BODY_MIN, theme);
  checkPair('--on-fill on --flag',        '--on-fill',     '--flag',    BODY_MIN,  theme);
  checkPair('--on-fill on --live',        '--on-fill',     '--live',    BODY_MIN,  theme);
  checkPair('--on-fill on --alert',       '--on-fill',     '--alert',   BODY_MIN,  theme);
  checkPair('--on-fill on --sky',         '--on-fill',     '--sky',     BODY_MIN,  theme);
  checkPair('--on-danger on --err-edge',  '--on-danger',   '--err-edge', BODY_MIN, theme);
  for (const s of ['err', 'ok', 'warn', 'info']) {
    checkPair(`--${s}-text on --${s}-bg`, `--${s}-text`, `--${s}-bg`, BODY_MIN, theme);
  }
  /* Zebra rows must stay legible for text, links and deltas. */
  checkPair('--muted on --row-alt',       '--muted',       '--row-alt', BODY_MIN,  theme);
  checkPair('--text on --row-hover',      '--text',        '--row-hover', BODY_MIN, theme);
}

console.log('\n\x1b[1mCONTRAST — non-text (WCAG 1.4.11)\x1b[0m');
for (const theme of ['light', 'dark']) {
  checkPair('--edge on --bg (control border)',    '--edge',       '--bg',      UI_MIN, theme);
  checkPair('--edge on --surface',               '--edge',       '--surface', UI_MIN, theme);
  checkPair('--brand-text progress fill',        '--brand-text', '--surface-2', UI_MIN, theme);
  checkPair('--meter fill vs well',              '--brand-text', '--surface-2', UI_MIN, theme);
  /* The four password-strength steps, each measured against the well they sit in. */
  checkPair('--err-edge  strength step vs well',  '--err-edge',  '--surface-2', UI_MIN, theme);
  checkPair('--warn-edge strength step vs well',  '--warn-edge', '--surface-2', UI_MIN, theme);
  checkPair('--ok-edge   strength step vs well',  '--ok-edge',   '--surface-2', UI_MIN, theme);
  checkPair('--edge      strength step vs well',  '--edge',      '--surface-2', UI_MIN, theme);
  /* Signal fills are for carrying --on-fill text. Assert they must NEVER be
     used where they have to be seen against a surface — --live did exactly
     this at 1.29:1 before it was caught. */
  /* A LIGHT signal fill always takes a dark border, in both themes. --edge
     flips to --paper in dark mode and vanished against these fills at
     1.42-2.72:1, so --fill-edge is theme-invariant on purpose. */
  checkPair('--fill-edge on --flag',   '--fill-edge', '--flag',   UI_MIN, theme);
  checkPair('--fill-edge on --live',   '--fill-edge', '--live',   UI_MIN, theme);
  checkPair('--fill-edge on --sky',    '--fill-edge', '--sky',    UI_MIN, theme);
  checkPair('--fill-edge on --alert',  '--fill-edge', '--alert',  UI_MIN, theme);
  /* Progress fill vs its track. */
  checkPair('--flag fill on ink track',   '--flag', '--ink',   UI_MIN, theme);
  checkPair('--live fill on ink track',   '--live', '--ink',   UI_MIN, theme);
}

/* Collected up front: the script-wiring checks below need every page. */
const pagesAll = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'tools') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.html')) pagesAll.push(full);
  }
})(ROOT);
const pages = pagesAll;

console.log('\n\x1b[1mSCRIPT WIRING\x1b[0m');

/* Two failure modes that are invisible in a static file and fatal in a browser:
     1. a file with top-level import/export loaded without type="module" throws
        a SyntaxError and the ENTIRE file silently never runs;
     2. code reading window.BOG.config on a page that never loaded config.js
        throws on the first access, taking the rest of the page with it.
   Both shipped broken during the auth rewrite. Neither is catchable by
   looking at CSS tokens or DOM structure, so they get checked directly. */

const jsFiles = [];
(function walkJs(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'tools') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walkJs(full);
    else if (e.name.endsWith('.js')) jsFiles.push(full);
  }
})(ROOT);

const ES_MODULE = /^\s*(?:import\s|export\s)/m;

for (const file of jsFiles.sort()) {
  const rel = file.replace(ROOT + '/', '');
  if (rel === 'assets/js/config.js') continue;   // it defines BOG.config
  const src = readFileSync(file, 'utf8');
  const isModule = ES_MODULE.test(src);

  /* Find every page that references this file, and check the tag that did it. */
  const referencing = [];
  for (const page of pagesAll) {
    const html = readFileSync(page, 'utf8');
    for (const m of html.matchAll(/<script([^>]*)src="([^"]+)"([^>]*)>/g)) {
      const srcAttr = m[2];
      const resolved = srcAttr.startsWith('/')
        ? join(ROOT, srcAttr)
        : join(dirname(page), srcAttr);
      if (resolved === file) {
        referencing.push({ page: page.replace(ROOT + '/', ''), attrs: m[1] + m[3], src: srcAttr });
      }
    }
  }

  if (isModule) {
    for (const r of referencing) {
      if (!/\btype="module"/.test(r.attrs)) {
        bad(`${rel} uses import/export but ${r.page} loads it without type="module"\n` +
            `      the whole file throws a SyntaxError and never runs`);
      }
    }
    if (!referencing.length) soft(`${rel}: module, not referenced by any page`);
  }

  /* Config must be loaded, and loaded FIRST. */
  if (/BOG\.config|window\.BOG\.config/.test(src)) {
    for (const r of referencing) {
      const pageFile = join(ROOT, r.page);
      const html = readFileSync(pageFile, 'utf8');
      if (!/\/assets\/js\/config\.js/.test(html)) {
        bad(`${rel} reads BOG.config but ${r.page} never loads config.js`);
        continue;
      }
      const cfgIdx = html.indexOf('/assets/js/config.js');
      const selfIdx = html.indexOf(r.src);
      if (selfIdx > -1 && selfIdx < cfgIdx) {
        bad(`${rel} reads BOG.config but ${r.page} loads it before config.js`);
      }
    }
  }
}

/* ---------------------------------------------------- config centralisation -- */

console.log('\n\x1b[1mCONFIG — single source of truth\x1b[0m');

const SECRETS = [
  ['AIzaSyD7Ve',                       'Firebase web key'],
  ['bog-cloud-1.onrender.com',         'Express API host'],
  ['api.bogcloud.com',                 'keys API host'],
  ['bog-cloud.appspot.com',            'legacy storage bucket'],
  ['bog-cloud.firebasestorage.app',    'storage bucket'],
  ['initializeApp({',                  'inline Firebase init'],
];

let configLeaks = 0;
for (const file of jsFiles.sort()) {
  if (file.endsWith('/assets/js/config.js')) continue;
  const rel = file.replace(ROOT + '/', '');
  const src = readFileSync(file, 'utf8');
  const hits = SECRETS.filter(([needle]) => src.includes(needle));
  if (hits.length) {
    configLeaks += hits.length;
    bad(`${rel} hardcodes ${hits.length} config value(s) that belong in assets/js/config.js\n      ` +
        hits.map(([, label]) => label).join(', '));
  }
}
if (!configLeaks) ok(`no hardcoded hosts, keys or buckets outside config.js (${jsFiles.length} files scanned)`);

/* Every config.url('x') / config.adminUrl('x') key must exist in config.js.
   These throw at call time, so a typo is only visible when a user clicks the
   button that hits it — exactly how config.url('auth/me') got written. */
const cfgSrc = readFileSync(join(ROOT, 'assets/js/config.js'), 'utf8');
const knownKeys = new Set([
  ...[...cfgSrc.matchAll(/^ {6}(\w+):\s*'/gm)].map((m) => m[1]),
]);
let keyMisses = 0;
for (const file of jsFiles) {
  const rel = file.replace(ROOT + '/', '');
  if (rel === 'assets/js/config.js') continue;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/config\.(?:admin)?[uU]rl\('([^']+)'/g)) {
    if (!knownKeys.has(m[1])) {
      keyMisses++;
      bad(`${rel} calls config.${m[0].includes('admin') ? 'admin' : ''}url('${m[1]}') but config.js has no such route`);
    }
  }
}
if (!keyMisses) ok(`all config.url()/adminUrl() keys resolve (${knownKeys.size} routes defined)`);

/* Every getElementById('x') in a page script must exist in that page, OR be
   created at runtime by shell.js. shell.js injects the topbar and sidebar
   from JS, so a handful of ids legitimately have no markup — those are
   listed here rather than being silently skipped. */
const SHELL_INJECTED = new Set([
  'shell-search', 'accountMenu', 'userAvatar', 'menuAvatar', 'menuUserName',
  'menuUserEmail', 'userFirstName', 'themeToggle', 'themeToggleSidebar',
  'sidebar', 'overlay', 'menu', 'shell-menu',
]);

const HTML_ID = /\bid="([^"]+)"/g;
let idMisses = 0;
for (const page of pagesAll) {
  const rel = page.replace(ROOT + '/', '');
  const html = readFileSync(page, 'utf8');
  const ids = new Set([...html.matchAll(HTML_ID)].map((m) => m[1]));

  /* Scripts this page loads, resolved the same way the browser would. */
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((src) => src.endsWith('.js'))
    .map((src) => (src.startsWith('/') ? join(ROOT, src) : join(dirname(page), src)))
    .filter((f) => existsSync(f));

  for (const script of scripts) {
    if (script.includes('/assets/js/')) continue;   /* shared, not page-specific */
    const srel = script.replace(ROOT + '/', '');
    const src = readFileSync(script, 'utf8');
    for (const m of src.matchAll(/getElementById\('([^']+)'\)/g)) {
      const id = m[1];
      if (ids.has(id) || SHELL_INJECTED.has(id)) continue;
      idMisses++;
      bad(`${srel} reads #${id}, which does not exist in ${rel}`);
    }
  }
}
if (!idMisses) ok('every getElementById() in every page script resolves');

console.log('\n\x1b[1mSTRUCTURE — pages\x1b[0m');

const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;


for (const file of pages.sort()) {
  const rel = file.replace(ROOT + '/', '');
  if (only && !rel.includes(only)) continue;

  const html = readFileSync(file, 'utf8');
  const issues = [];

  if (!html.trim()) { soft(`${rel}: empty placeholder`); continue; }

  /* Heading structure */
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s === 0) issues.push('no <h1>');
  if (h1s > 1) issues.push(`${h1s} <h1> elements`);
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      issues.push(`heading jump h${levels[i - 1]} -> h${levels[i]}`);
      break;
    }
  }

  /* Inputs must be labelled */
  const inputs = [...html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)];
  const labelled = new Set(
    [...html.matchAll(/<label[^>]*\bfor="([^"]+)"/g)].map((m) => m[1])
  );
  for (const [, tag, attrs] of inputs) {
    const type = (attrs.match(/\btype="([^"]+)"/i) || [])[1] || '';
    if (['hidden', 'submit', 'button', 'reset'].includes(type)) continue;
    const id = (attrs.match(/\bid="([^"]+)"/i) || [])[1];
    const hasAria = /\baria-label(ledby)?=/i.test(attrs);
    const wrapped = new RegExp(`<label[^>]*>(?:(?!</label>)[\\s\\S])*<${tag}\\b`, 'i').test(html);
    if (!hasAria && !(id && labelled.has(id)) && !wrapped) {
      issues.push(`unlabelled <${tag}${id ? ' id=' + id : ''}>`);
    }
  }

  /* Every page needs the theme boot script before first paint */
  if (!/theme-boot\.js/.test(html)) issues.push('missing theme-boot.js');
  if (!/<html[^>]+lang=/.test(html)) issues.push('<html> has no lang');

  /* No legacy per-folder CSS once a page is ported */
  if (/href="css\/[^"]+\.css"/.test(html)) issues.push('still links legacy css/');

  /* Images */
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt=/.test(m[1])) issues.push('<img> without alt');
    if (!/\bwidth=/.test(m[1]) || !/\bheight=/.test(m[1])) {
      issues.push('<img> without width/height (CLS)');
    }
  }

  /* Referenced local assets must exist AND be non-empty */
  const refs = [...html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)].map((m) => m[1]);
  for (const r of new Set(refs)) {
    const p = join(ROOT, decodeURIComponent(r));
    if (!existsSync(p)) issues.push(`missing asset ${r}`);
    else if (statSync(p).size === 0) issues.push(`EMPTY asset ${r}`);
  }

  /* The 2.1MB logo should be gone */
  if (/images\/logo\.jpeg/.test(html)) issues.push('still loads the 2.1MB images/logo.jpeg');

  if (issues.length) bad(`${rel}\n      ` + issues.join('\n      '));
  else ok(`${rel}`);
}

/* ---------------------------------------------------------------- report -- */

console.log('\n' + '─'.repeat(64));
if (warnings.length) {
  console.log(`\x1b[33m${warn} warning(s)\x1b[0m`);
  for (const w of warnings) console.log('  ' + w);
}
if (fail) {
  console.log(`\x1b[31m\x1b[1m${fail} FAILED\x1b[0m, ${pass} passed, ${warn} warned\n`);
  for (const f of failures) console.log('  \x1b[31m✕\x1b[0m ' + f);
  process.exit(1);
}
console.log(`\x1b[32m\x1b[1mALL PASS\x1b[0m — ${pass} checks, ${warn} warnings`);