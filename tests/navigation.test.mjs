import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const publicRoot = new URL('../public/', import.meta.url);
const pages = fs.readdirSync(publicRoot, {recursive:true}).filter(name => name.endsWith('.html'));

test('every page removes only the top navigation Resources link', () => {
  assert(pages.length > 0);
  for (const name of pages) {
    const html = fs.readFileSync(new URL(name, publicRoot), 'utf8');
    const header = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/)?.[0];
    assert(header, name);
    assert(!header.includes('>Resources</a>'), name);
    assert(header.includes('>Home</a>'), name);
    assert(header.includes('data-open-modules>Modules</button>'), name);
    assert.match(html, /style\.css\?v=68/);
    assert.match(html, /site\.js\?v=(?:68|73|77|80)/);
    const dialog = html.match(/<dialog\b[^>]*data-module-dialog[^>]*>[\s\S]*?<\/dialog>/)?.[0];
    assert(dialog, name);
    for (let id = 1; id <= 5; id++) assert(dialog.includes(`module-${id}.html`), `${name}: Module ${id}`);
  }
});

test('Module 5 resources and the direct Resources page remain available', () => {
  assert(fs.existsSync(new URL('resources.html', publicRoot)));
  const module5 = fs.readFileSync(new URL('modules/module-5.html', publicRoot), 'utf8');
  for (const child of ['curriculum','videos','policies']) assert(module5.includes(`module-5-${child}.html`));
  const generator = fs.readFileSync(new URL('../scripts/generate-subject-resources.mjs', import.meta.url), 'utf8');
  assert(!generator.includes('<a href="../resources.html">Resources</a>'));
});

test('only Module 2 exposes its requested sentence Test and generic quick tests stay removed', () => {
  for (let id = 1; id <= 5; id++) {
    const html = fs.readFileSync(new URL(`modules/module-${id}.html`, publicRoot), 'utf8');
    assert(!html.includes('module-test.html'), `Module ${id}`);
    if (id === 2) assert(html.includes('data-module2-tab="test"'));
    else assert(!/>\s*Test\s*<\//.test(html), `Module ${id}`);
    if (id > 2) assert(html.includes(`href="module-${id - 1}.html">Previous module</a>`));
    if (id < 5 && id !== 2) assert(html.includes(`href="module-${id + 1}.html">Next module</a>`));
    if (id === 2) assert(!html.includes('class="page-actions"'));
    assert(html.includes('data-open-modules>Modules</button>'));
  }
});
