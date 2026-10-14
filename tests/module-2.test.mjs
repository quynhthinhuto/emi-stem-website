import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const readPage = name => fs.readFileSync(new URL(`../public/modules/${name}.html`, import.meta.url), 'utf8');
const expectedPages = [
  {key: 'video', label: 'Video', href: 'module-2.html#video'},
  {key: 'lesson-plans', label: 'Format of Lesson Plan', href: 'module-2.html#lesson-plan'},
  {key: 'test', label: 'Test', href: 'module-2.html#test'},
];

test('Module 2 has three tabs with sentence practice and retains its video and documents', () => {
  const html = readPage('module-2');
  assert.deepEqual([...html.matchAll(/data-module2-tab="([^"]+)"/g)].map(([, key]) => key), ['video', 'lesson-plan', 'test']);
  assert(html.includes('<span>Video</span>'));
  assert(html.includes('<span>Format of Lesson Plan</span>'));
  assert(html.includes('<span>Test</span>'));
  assert(html.includes('data-classroom-sentences'));
  assert(html.includes('data-module2-panel="lesson-plan" hidden'));
  for (const key of ['video', 'lesson-plan', 'test']) {
    assert(html.includes(`id="module2-${key}" role="tabpanel" aria-labelledby="module2-tab-${key}"`));
  }
  for (const removed of ['module-page-links', 'subject-button-grid', 'suggested-intro', 'class="page-actions"', 'module-2-pedagogies.html']) assert(!html.includes(removed));
});

test('Module 2 local navigation matches its three learning buttons', () => {
  const script = fs.readFileSync(new URL('../public/site.js', import.meta.url), 'utf8');
  const declaration = script.match(/const module2Pages = \[[\s\S]*?\];/)?.[0];
  assert(declaration);
  const pages = vm.runInNewContext(`${declaration}\nJSON.stringify(module2Pages)`);
  assert.deepEqual(JSON.parse(pages), expectedPages);
});

test('former Module 2 child URLs redirect to their corresponding in-page tabs', () => {
  for (const [slug, key] of [['module-2-video', 'video'], ['module-2-lesson-plans', 'lesson-plan']]) {
    const html = readPage(slug);
    assert(html.includes(`http-equiv="refresh" content="0;url=module-2.html#${key}"`));
    assert(html.includes(`rel="canonical" href="module-2.html#${key}"`));
    assert(!html.includes('<video'));
    assert(!html.includes('subject-button-grid'));
    assert(!html.includes('suggested-intro'));
  }
  assert(readPage('module-2-pedagogies').includes('<h1>Pedagogies</h1>'));
});

test('shared bilingual format and guide expose verified PDF Word and real cover assets', () => {
  const resources = JSON.parse(fs.readFileSync(new URL('../lib/module-2-planning-resources.json', import.meta.url), 'utf8'));
  assert.deepEqual(resources.map(item => item.kind), ['format', 'guide']);
  const html = readPage('module-2');
  for (const item of resources) {
    assert.deepEqual(item.languages, ['en', 'vi']);
    assert.equal(item.lessonMinutes, 45);
    assert.equal(item.pages, item.kind === 'format' ? 5 : 15);
    assert(html.includes(`${item.pages} pages / trang`));
    for (const [format, asset] of Object.entries(item.files)) {
      const bytes = fs.readFileSync(new URL(`../public${asset.path}`, import.meta.url));
      assert.equal(bytes.length, asset.bytes);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256);
      const magic = format === 'pdf' ? '%PDF' : format === 'docx' ? 'PK' : '\x89PNG';
      assert.equal(bytes.subarray(0, magic.length).toString('latin1'), magic);
      assert(html.includes(asset.path));
      const version = item.kind === 'format' ? 1 : 2;
      assert(html.includes(`${asset.path}?v=${version}`));
      if (format === 'docx') assert(html.includes(`href="${asset.path}?v=${version}" download`));
    }
  }
  assert(html.includes('not issued or endorsed by Cambridge'));
  assert(html.includes('https://doi.org/10.1017/9781009024792.007'));
});

test('revised guide follows seven video steps with bilingual tables and a 45-minute sequence', () => {
  const guide = JSON.parse(fs.readFileSync(new URL('../scripts/data/module-2-step-guide.json', import.meta.url), 'utf8'));
  assert.equal(guide.revision, 2);
  assert.equal(guide.lessonMinutes, 45);
  assert.equal(guide.pages.length, 15);
  const steps = guide.pages.flatMap(page => page.heading?.match(/^Step (\d)/)?.[1] ?? []);
  assert.deepEqual(steps, ['1', '2', '3', '4', '5', '5', '6', '7']);
  const blocks = guide.pages.flatMap(page => page.blocks);
  for (const block of blocks) {
    if (block.type === 'pair') assert(block.text.length === 2 && block.text.every(text => text.length > 0));
    if (block.type === 'actions') assert(block.items.every(item => item.length === 2 && item.every(Boolean)));
    if (block.type === 'table') {
      assert.equal(block.headers.length, block.widths.length);
      assert(Math.abs(block.widths.reduce((sum, width) => sum + width, 0) - 7.2) < 0.001);
      assert(block.rows.every(row => row.length === block.headers.length));
    }
  }
  assert.deepEqual(blocks.filter(block => block.type === 'subject').map(block => block.en), ['Maths', 'Physics', 'Chemistry', 'Biology', 'Engineering', 'IT']);
  const timetable = guide.pages[6].blocks.find(block => block.type === 'table');
  const intervals = timetable.rows.map(row => row[0].split('\n')[0].split('-').map(Number));
  assert.deepEqual(intervals, [[0, 5], [5, 10], [10, 17], [17, 27], [27, 35], [35, 40], [40, 45]]);
  assert.equal(intervals.reduce((sum, [start, end]) => sum + end - start, 0), 45);
  assert(JSON.stringify(guide).includes('not issued or endorsed by Cambridge'));
  assert(readPage('module-2').includes('7 video-aligned steps'));
});

test('Module 2 Instruction Video exposes the uploaded MP4 with native playback controls', () => {
  const html = readPage('module-2');
  const video = html.match(/<video\b[\s\S]*?<\/video>/)?.[0];
  assert(video);
  assert.match(video, /\bcontrols\s/);
  assert.match(video, /\bplaysinline\s/);
  assert.match(video, /preload="metadata"/);
  assert.match(video, /aria-label="Module 2 instruction video/);
  assert.match(video, /poster="\.\.\/assets\/videos\/module-2-instruction-20261012-poster\.jpg"/);
  assert.match(video, /<source src="\.\.\/assets\/videos\/module-2-instruction-20261012\.mp4" type="video\/mp4">/);
  assert(!/\b(?:autoplay|muted)\b/.test(video));
  assert(!html.includes('Video has not been added yet.'));
  assert(html.includes('module-2-video.css?v=20261012'));
});

test('Module 2 hosted video retains the original file bytes and a real poster image', () => {
  const bytes = fs.readFileSync(new URL('../public/assets/videos/module-2-instruction-20261012.mp4', import.meta.url));
  assert.equal(bytes.length, 10102424);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), '8c5fc6064b0d9b6de2cee5f56f269410431ac99086d90c6165e15f351c6462f5');
  assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
  assert(bytes.length < 25 * 1024 * 1024);
  const poster = fs.readFileSync(new URL('../public/assets/videos/module-2-instruction-20261012-poster.jpg', import.meta.url));
  assert.equal(poster.subarray(0, 3).toString('hex'), 'ffd8ff');
});
