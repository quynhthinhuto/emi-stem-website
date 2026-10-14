import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {vocabularySubjects, bankTerms, topicTerms as filterTerms} from '../public/vocabulary-data.js';
import {shuffle, sampleTerms, makeChoices, createSession, matchingRound, checkChoice, checkMatch, sessionResult} from '../public/vocabulary-core.js';

const banks = Object.fromEntries(Object.keys(vocabularySubjects).map(id => [id, JSON.parse(fs.readFileSync(new URL(`../public/assets/vocabulary/${id}-practice.json`, import.meta.url)))]));
const terms = Object.fromEntries(Object.entries(banks).map(([id,bank]) => [id,bankTerms(id,bank)]));
const topicTerms = (id, topic) => filterTerms(id, topic, terms[id] ?? []);

test('all subjects and topics have English and Vietnamese display names', () => {
  for (const subject of Object.values(vocabularySubjects)) {
    assert(subject.label.trim());
    assert(subject.labelVi.trim());
    assert.notEqual(subject.label, subject.labelVi);
    for (const topic of subject.topics) {
      assert(topic.title.trim());
      assert(topic.titleEn.trim());
      assert.notEqual(topic.title, topic.titleEn);
    }
  }
});

test('all six pages provide bilingual loading and JavaScript fallback states', () => {
  for (const id of Object.keys(vocabularySubjects)) {
    const html = fs.readFileSync(new URL(`../public/modules/subject-resources-${id}-vocabulary.html`, import.meta.url), 'utf8');
    assert.match(html, /lang="en">Vocabulary Practice/);
    assert.match(html, /lang="en">Loading practice/);
    assert.match(html, /<noscript><span class="vq-bilingual"><span lang="en">JavaScript is required/);
    assert.match(html, /<noscript>.*<span lang="vi">/);
    assert.match(html, /vocabulary-practice\.css\?v=64/);
    assert.match(html, /vocabulary-practice\.js\?v=64/);
  }
});

test('six full banks retain their published PDF provenance and pronunciations', () => {
  assert.equal(Object.keys(vocabularySubjects).length, 6);
  const counts = {maths:428, physics:1609, chemistry:1304, biology:2401, engineering:101, it:492};
  const ids = new Set();
  for (const [id, subject] of Object.entries(vocabularySubjects)) {
    assert.equal(subject.topics.length, 3);
    const all = topicTerms(id, 'all');
    assert.equal(all.length, counts[id]);
    assert.equal(new Set(all.map(term => term.word.toLowerCase())).size, all.length);
    const pdf = fs.readFileSync(new URL(`../public/assets/vocabulary/${banks[id].source}`, import.meta.url));
    assert.equal(createHash('sha256').update(pdf).digest('hex'), banks[id].sha256);
    for (const topic of subject.topics) assert(sampleTerms(topicTerms(id, topic.id)).length === 6);
    for (const term of all) {
      assert(!ids.has(term.id));
      ids.add(term.id);
      assert(term.word && term.meaning);
      assert(term.page >= 3 && term.page <= banks[id].pages);
      assert.equal(term.source, banks[id].source);
      assert.equal(term.audio, `term-${createHash('sha256').update(term.word.toLowerCase()).digest('hex').slice(0,16)}`);
      const audio = fs.readFileSync(new URL(`../public/assets/vocabulary/audio/${term.audio}.m4a`, import.meta.url));
      assert.equal(audio.subarray(4,8).toString(), 'ftyp');
      assert(audio.length > 1000);
    }
  }
  assert.equal(ids.size, 6335);
  assert.deepEqual(topicTerms('unknown', 'all'), []);
  assert.deepEqual(topicTerms('maths', 'unknown'), []);
});

test('every new test draws six distinct PDF pairs without changing its pool', () => {
  for (const id of Object.keys(vocabularySubjects)) {
    const pool = topicTerms(id, 'all');
    const before = pool.map(term => term.id);
    const seen = new Set();
    const draws = new Set();
    for (let run = 0; run < 100; run++) {
      const sample = sampleTerms(pool);
      assert.equal(sample.length, 6);
      assert.equal(new Set(sample.map(t => t.word.toLowerCase())).size, 6);
      assert.equal(new Set(sample.map(t => t.meaning.toLowerCase())).size, 6);
      sample.forEach(term => { assert(pool.includes(term)); seen.add(term.id); });
      draws.add(sample.map(term => term.id).sort().join(','));
    }
    assert(seen.size > 80, 'Sampling is limited to the old fixed list');
    assert.equal(draws.size, 100);
    assert.deepEqual(pool.map(term => term.id), before);
    assert.deepEqual(sampleTerms(pool,6,()=>0.5), sampleTerms(pool,6,()=>0.5));
  }
  const duplicates = [{id:'a',word:'word',meaning:'nghĩa'}, {id:'b',word:'WORD',meaning:'khác'}, {id:'c',word:'other',meaning:'NGHĨA'}];
  assert.throws(() => sampleTerms(duplicates));
});

test('each topic only draws matching PDF terms while the all-file pool stays complete', () => {
  for (const [id, subject] of Object.entries(vocabularySubjects)) {
    const all = topicTerms(id, 'all');
    for (const topic of subject.topics) {
      const selected = topicTerms(id, topic.id);
      assert(selected.length < all.length);
      assert(selected.every(term => all.includes(term) && term.topics.includes(topic.id)));
      for (let run = 0; run < 20; run++) {
        const sample = sampleTerms(selected);
        assert.equal(sample.length, 6);
        assert(sample.every(term => term.topics.includes(topic.id)));
      }
    }
    assert.deepEqual(topicTerms(id, 'all'), terms[id]);
  }
});

test('shuffle preserves input and answer choices include exactly one correct answer', () => {
  const terms = topicTerms('maths', 'numbers');
  const original = terms.map(term => term.id);
  for (let run = 0; run < 100; run++) {
    assert.deepEqual(shuffle(terms).map(term => term.id).sort(), [...original].sort());
    for (const term of terms) {
      const options = makeChoices(term, terms);
      assert.equal(options.length, 4);
      assert.equal(options.filter(item => item.id === term.id).length, 1);
      assert.equal(new Set(options.map(item => item.meaning)).size, 4);
    }
  }
  assert.deepEqual(terms.map(term => term.id), original);
});

test('choice score counts first answers once and retains missed terms', () => {
  const session = createSession(sampleTerms(topicTerms('physics', 'energy')), 'choice', () => 0.99);
  assert.equal(checkChoice(session, null), null);
  assert.equal(session.answered.size, 0);
  assert.equal(checkChoice(session, session.words[1].id), false);
  assert.equal(checkChoice(session, session.words[0].id), null);
  for (let index = 1; index < session.words.length; index++) {
    session.index = index;
    session.checked = false;
    assert.equal(checkChoice(session, session.words[index].id), true);
  }
  assert.equal(session.answered.size, 6);
  const result = sessionResult(session);
  assert.equal(result.correct, 5);
  assert.equal(result.total, 6);
  assert.equal(result.missed[0].id, session.words[0].id);
});

for (const mode of ['meaning', 'audio']) {
  test(`${mode}: incorrect pairs can be retried, matched pairs cannot score twice`, () => {
    const session = createSession(sampleTerms(topicTerms('engineering', 'feedback')), mode, () => 0.99);
    const round = matchingRound(session);
    assert.equal(round.length, 3);
    assert.deepEqual(new Set(session.left.map(t => t.id)), new Set(session.right.map(t => t.id)));
    assert.equal(checkMatch(session, 'missing', 'missing'), null);
    assert.equal(checkMatch(session, round[0].id, round[1].id), false);
    assert.equal(session.answered.size, 0);
    assert.equal(session.missed.size, 2);
    session.locked = true;
    assert.equal(checkMatch(session, round[0].id, round[0].id), null);
    session.locked = false;
    for (const term of round) assert.equal(checkMatch(session, term.id, term.id), true);
    assert.equal(checkMatch(session, round[0].id, round[0].id), null);
    assert.equal(session.answered.size, 3);
    session.round++;
    for (const term of matchingRound(session)) assert.equal(checkMatch(session, term.id, term.id), true);
    assert.equal(session.answered.size, 6);
    assert.equal(sessionResult(session).correct, 4);
  });
}

test('review supports a single missed word and retains full-pool distractors', () => {
  const pool = topicTerms('biology', 'cells');
  const session = createSession([pool[0]], 'meaning');
  assert.equal(matchingRound(session).length, 1);
  assert.equal(checkMatch(session, pool[0].id, pool[0].id), true);
  assert.deepEqual(sessionResult(session), {total:1, correct:1, missed:[]});
  assert.equal(makeChoices(pool[0], pool).length, 4);
  assert.throws(() => createSession([], 'choice'));
  assert.throws(() => createSession(pool, 'unknown'));
});
