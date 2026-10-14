import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const readPage = slug => fs.readFileSync(new URL(`../public/modules/${slug}.html`, import.meta.url), 'utf8');
const decode = html => html.replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)));
const pages = [
  {key: 'curriculum', label: 'Curriculum', labelVi: 'Ch\u01b0\u01a1ng tr\u00ecnh gi\u00e1o d\u1ee5c', href: 'module-5-curriculum.html'},
  {key: 'videos', label: 'Videos for Teaching', labelVi: 'Video gi\u1ea3ng d\u1ea1y', href: 'module-5-videos.html'},
  {key: 'policies', label: 'Policies', labelVi: 'Ch\u00ednh s\u00e1ch', href: 'module-5-policies.html'},
];

test('Module 5 retains three bilingual learning buttons and matching local navigation', () => {
  const html = decode(readPage('module-5'));
  const buttons = [...html.matchAll(/<a class="button [^"]*module-page-button" href="([^"]+)">([\s\S]*?)<\/a>/g)];
  assert.equal(buttons.length, 3);
  for (const [index, [, href, copy]] of buttons.entries()) {
    assert.equal(href, pages[index].href);
    assert(copy.includes(`lang="en">${pages[index].label}</span>`));
    assert(copy.includes(`lang="vi">${pages[index].labelVi}</span>`));
  }
  const script = fs.readFileSync(new URL('../public/site.js', import.meta.url), 'utf8');
  const declaration = script.match(/const module5Pages = \[[\s\S]*?\];/)?.[0];
  assert(declaration);
  assert.deepEqual(JSON.parse(vm.runInNewContext(`${declaration}\nJSON.stringify(module5Pages)`)), pages);
});

test('all Module 5 pages have bilingual headings and versioned scoped styles', () => {
  for (const {href, label, labelVi} of [{href: 'module-5.html', label: 'Resources', labelVi: 'T\u00e0i nguy\u00ean'}, ...pages]) {
    const html = decode(readPage(href.replace('.html', '')));
    assert(html.includes(`<h1 class="bilingual-title"><span lang="en">${label}</span><span lang="vi">${labelVi}</span></h1>`));
    assert(html.includes('module-5-bilingual.css?v=73'));
    assert(html.includes('site.js?v=73'));
    assert(!html.includes('module-test.html'));
  }
  const css = fs.readFileSync(new URL('../public/module-5-bilingual.css', import.meta.url), 'utf8');
  for (const selector of css.split('{').slice(0, -1).map(part => part.split('}').at(-1).trim())) {
    assert(selector.startsWith('.page-module-5') || selector.startsWith('@media'), selector);
  }
});

test('original Module 5 files and policy history remain available with bilingual descriptions', () => {
  const expectedAssets = {
    'module-5-curriculum': ['chuong-trinh-giao-duc-pho-thong-tong-the-2018'],
    'module-5-videos': ['STEM_English_Video_Resources_by_Subject_Expanded'],
    'module-5-policies': ['nghi-dinh-222-2025-nd-cp', 'quyet-dinh-2371-2025-qd-ttg', 'quyet-dinh-2732-2025-qd-ttg', 'quyet-dinh-2080-2017-qd-ttg'],
  };
  for (const [slug, assets] of Object.entries(expectedAssets)) {
    const html = readPage(slug);
    for (const name of assets) {
      assert(html.includes(`href="../assets/pdfs/${name}.pdf"`));
      assert(html.includes(`download="${name}.pdf"`));
      const pdf = fs.readFileSync(new URL(`../public/assets/pdfs/${name}.pdf`, import.meta.url));
      assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    }
  }
  const policy = readPage('module-5-policies');
  const articles = [...policy.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/g)];
  assert.equal(articles.length, 4);
  for (const [, article] of articles) {
    for (const block of ['policy-subtitle', 'policy-status']) {
      assert.match(article, new RegExp(`class="${block}"><span lang="en">[\\s\\S]*?<span lang="vi">`));
    }
    assert(article.includes('Open PDF / M&#7903; PDF'));
    assert(article.includes('Download PDF / T&#7843;i PDF'));
    assert(article.includes('Source /'));
  }
  assert(policy.includes('data-policy-group="historical"'));
  assert(policy.includes('unofficial translations for reference'));
  assert(policy.includes('original Vietnamese documents prevail'));
  const videos = readPage('module-5-videos');
  assert(videos.includes('data-video-src="https://www.youtube-nocookie.com/embed/5Dp2qHz8r2U?rel=0"'));
  assert(videos.includes('lang="vi">Xem tr&#234;n YouTube'));
});
