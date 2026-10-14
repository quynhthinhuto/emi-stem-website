import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('scripts/data/module-4-lesson-plans.json', root), 'utf8'));
const plans = JSON.parse(fs.readFileSync(new URL('lib/subject-lesson-plans.json', root), 'utf8'));
const books = JSON.parse(fs.readFileSync(new URL('lib/subject-books.json', root), 'utf8'));
const subjectKeys = ['maths', 'physics', 'chemistry', 'biology', 'engineering', 'it'];

test('all six subjects have distinct bilingual templates and examples with verified assets', () => {
  assert.equal(plans.length, 12);
  for (const subject of subjectKeys) {
    for (const kind of ['template', 'example']) {
      const matches = plans.filter(p => p.subject === subject && p.kind === kind);
      assert.equal(matches.length, 1, `${subject}/${kind}`);
      const p = matches[0];
      assert(p.pages >= 3 && p.pages <= 8);
      assert(books.some(b => b.subject === subject && b.id === p.bookId));
      for (const [format, file] of Object.entries(p.files)) {
        assert(file.path.startsWith('/assets/lesson-plans/module-4/'));
        const bytes = fs.readFileSync(new URL(`public${file.path}`, root));
        assert.equal(bytes.length, file.bytes);
        assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
        const magic = format === 'pdf' ? '%PDF' : format === 'docx' ? 'PK' : '\x89PNG';
        assert.equal(bytes.subarray(0, magic.length).toString('latin1'), magic);
      }
    }
  }
});

test('examples include bilingual subject-specific teaching, assessment and original tasks', () => {
  assert.deepEqual(data.subjects.map(s => s.key), subjectKeys);
  for (const s of data.subjects) {
    assert.equal(s.goals.length, 3);
    assert.equal(s.success.length, 3);
    assert.equal(s.vocabulary.length, 8);
    assert.equal(s.tasks.length, s.answers.length);
    assert.equal(s.stages.reduce((sum, stage) => sum + stage[0], 0), 45);
    assert.equal(s.stages.filter(row => row[1] === 'Middle').reduce((sum, stage) => sum + stage[0], 0), 35);
    for (const key of ['topic', 'learning', 'prior', 'misconception', 'support', 'challenge', 'assessment', 'safety', 'exit', 'exitAnswer', 'homework', 'homeworkAnswer']) {
      assert.equal(s[key].length, 2, `${s.key}: ${key}`);
      assert(s[key].every(text => typeof text === 'string' && text.length > 10));
    }
    assert(s.goals.every(row => row.length === 2));
    assert(s.stages.every(row => row.length === 5 && row[2].length > 10 && row[3].length > 10));
  }
  assert.equal(data.subjects.find(s => s.key === 'engineering').syllabusBased, true);
  assert(data.subjects.find(s => s.key === 'engineering').supplement.includes('no full textbook supplied'));
  assert(data.subjects.find(s => s.key === 'biology').misconception[0].includes('lack chloroplasts'));
});

test('all lesson plans describe one 45-minute period with contiguous activity timings', () => {
  assert.equal(data.lessonMinutes, 45);
  for (const s of data.subjects) {
    let elapsed = 0;
    const ranges = s.stages.map(([minutes]) => {
      assert(Number.isInteger(minutes) && minutes > 0);
      const start = elapsed;
      elapsed += minutes;
      return `${start}-${elapsed}`;
    });
    assert.deepEqual(ranges, ['0-5', '5-12', '12-18', '18-30', '30-37', '37-40', '40-45']);
  }
  for (const p of plans) {
    assert.equal(p.lessonMinutes, 45);
    const html = fs.readFileSync(new URL(`public/modules/subject-resources-${p.subject}-${p.kind}.html`, root), 'utf8');
    assert(html.includes('45 minutes / phút'));
    for (const file of Object.values(p.files)) assert(html.includes(`${file.path}?v=${file.sha256.slice(0, 12)}`));
  }
});

test('every resource page exposes the correct cover PDF Word and source for its subject', () => {
  for (const p of plans) {
    const html = fs.readFileSync(new URL(`public/modules/subject-resources-${p.subject}-${p.kind}.html`, root), 'utf8');
    for (const f of Object.values(p.files)) assert(html.includes(f.path));
    assert(html.includes(`data-subject="${p.subject}"`));
    assert(html.includes(`file=${p.bookId}`));
    assert(html.includes('not issued or endorsed by Cambridge'));
    assert(html.includes('Mẫu kế hoạch bài dạy') || html.includes('Giáo án minh họa'));
    assert(!html.includes('This page is ready'));
    if (p.subject === 'engineering') assert(html.includes('chưa có sách giáo khoa'));
  }
});

test('lesson-plan-only regeneration preserves unrelated module pages', () => {
  const dir = new URL('public/modules/', root);
  const snapshot = new Map(fs.readdirSync(dir).filter(name => name.endsWith('.html')).map(name => [name, fs.readFileSync(new URL(name, dir), 'utf8')]));
  execFileSync(process.execPath, [new URL('scripts/generate-subject-resources.mjs', root).pathname, '--lesson-plans-only']);
  for (const [name, before] of snapshot) {
    assert.equal(fs.readFileSync(new URL(name, dir), 'utf8'), before, name);
  }
});
