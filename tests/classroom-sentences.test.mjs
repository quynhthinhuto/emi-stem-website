import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {topics, sentences} from '../public/classroom-sentences.js';
import {createSentenceTest, sentencePool, normaliseSentence, recognisesSentence, recordSpeakingResult, speakingSummary} from '../public/classroom-sentence-core.js';
import {checkMatch, sessionResult} from '../public/vocabulary-core.js';

test('80 distinct bilingual sentence pairs cover classroom situations and all six subjects', () => {
  assert.equal(sentences.length, 80);
  assert.equal(topics.length, 10);
  for (const key of ['id', 'word', 'meaning', 'audio']) assert.equal(new Set(sentences.map(item => item[key])).size, 80);
  for (const topic of topics) {
    assert(topic.en && topic.vi);
    assert.equal(sentencePool(sentences, topic.id).length, 8);
  }
  for (const id of ['maths', 'physics', 'chemistry', 'biology', 'engineering', 'it']) assert(topics.some(topic => topic.id === id));
});

test('each mode samples six unique sentences from the selected pool without changing the bank', () => {
  const before = JSON.stringify(sentences);
  for (const topic of ['all', ...topics.map(item => item.id)]) {
    for (const mode of ['meaning', 'audio', 'speaking']) {
      for (let round = 0; round < 12; round++) {
        const session = createSentenceTest(sentences, topic, mode);
        assert.equal(session.words.length, 6);
        assert.equal(new Set(session.words.map(item => item.id)).size, 6);
        assert(session.words.every(item => topic === 'all' || item.topic === topic));
        assert.deepEqual(new Set(session.left.map(item => item.id)), new Set(session.right.map(item => item.id)));
      }
    }
  }
  assert.equal(JSON.stringify(sentences), before);
  assert.throws(() => createSentenceTest(sentences, 'unknown', 'meaning'));
  assert.throws(() => createSentenceTest(sentences, 'all', 'invalid'));
});

test('all sentence audio files are actual AAC MP4 assets with safe unique names', () => {
  for (const sentence of sentences) {
    assert.match(sentence.audio, /^sentence-\d{3}\.m4a$/);
    const bytes = fs.readFileSync(new URL(`../public/assets/classroom-english/audio/${sentence.audio}`, import.meta.url));
    assert(bytes.length > 1000);
    assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
  }
});

test('matching counts correct pairs once and allows retries after a wrong pair', () => {
  const session = createSentenceTest(sentences, 'maths', 'meaning');
  const [one, two] = session.words;
  assert.equal(checkMatch(session, one.id, two.id), false);
  assert.equal(session.answered.size, 0);
  for (const sentence of session.words) assert.equal(checkMatch(session, sentence.id, sentence.id), true);
  assert.equal(checkMatch(session, one.id, one.id), null);
  assert.equal(session.answered.size, 6);
  assert.equal(sessionResult(session).correct, 4);
});

test('speech comparison ignores case and punctuation but preserves the actual words and their order', () => {
  assert.equal(normaliseSentence('  Work with a partner! '), 'work with a partner');
  assert(recognisesSentence('Work with a partner.', ['work with a partner!']));
  assert(recognisesSentence('Count the atoms on each side.', ['other words', 'COUNT THE ATOMS ON EACH SIDE']));
  assert(recognisesSentence('You have two minutes.', ['You have 2 minutes']));
  assert(recognisesSentence('Do not share personal information.', ["Don't share personal information"]));
  assert(recognisesSentence('We will practise this next lesson.', ["We'll practice this next lesson"]));
  assert(!recognisesSentence('You have two minutes.', ['You have 1 minute']));
  assert(!recognisesSentence('Use the tools safely.', ['use the tools']));
  assert(!recognisesSentence('Use the tools safely.', ['safely the tools use']));
  assert(!recognisesSentence('', ['']));
});

test('speaking distinguishes browser recognition self-review and skipped sentences with no fake pronunciation score', () => {
  const session = createSentenceTest(sentences, 'opening', 'speaking');
  assert(recordSpeakingResult(session, true, 'self'));
  assert.equal(recordSpeakingResult(session, true, 'recognition'), false);
  session.index++;
  assert(recordSpeakingResult(session, true, 'recognition', session.words[1].word));
  session.index++;
  assert(recordSpeakingResult(session, false, 'self'));
  session.index++;
  assert(recordSpeakingResult(session, false, 'skipped'));
  assert.deepEqual(speakingSummary(session), {recognised: 1, selfPassed: 1, needsPractice: 1, skipped: 1});
});

test('speech capture is opt-in and records stay in memory with explicit cleanup', () => {
  const source = fs.readFileSync(new URL('../public/classroom-sentence-practice.js', import.meta.url), 'utf8');
  assert(source.includes('let recognitionAllowed = false'));
  assert(source.includes('if (!recognitionAllowed || !Recognition) return'));
  assert(source.includes('getUserMedia({audio: true})'));
  assert(source.includes('track.stop()'));
  assert(source.includes('URL.revokeObjectURL(recordingUrl)'));
  assert(source.includes("window.addEventListener('pagehide', cleanUp)"));
  assert(!source.includes('localStorage'));
  assert(!source.includes('fetch('));
});
