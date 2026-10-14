import {sampleTerms, shuffle, createSession} from './vocabulary-core.js?v=62';

export function sentencePool(bank, topic) {
  return topic === 'all' ? bank : bank.filter(sentence => sentence.topic === topic);
}

export function createSentenceTest(bank, topic, mode, random = Math.random) {
  if (!['meaning', 'audio', 'speaking'].includes(mode)) throw new Error('Invalid sentence mode');
  const words = sampleTerms(sentencePool(bank, topic), 6, random);
  const session = createSession(words, mode === 'speaking' ? 'choice' : mode, random);
  session.sentenceMode = mode;
  session.left = shuffle(session.words, random);
  session.right = shuffle(session.words, random);
  session.heard = new Set();
  session.speaking = new Map();
  return session;
}

export function normaliseSentence(text) {
  const contractions = {"let's": 'let us', "it's": 'it is', "don't": 'do not', "we'll": 'we will', "you're": 'you are'};
  return String(text).normalize('NFKC').toLocaleLowerCase('en').replace(/’/g, "'")
    .replace(/\b(?:let's|it's|don't|we'll|you're)\b/g, word => contractions[word])
    .replace(/\b[12]\b/g, number => number === '1' ? 'one' : 'two')
    .replace(/\bpractise\b/g, 'practice')
    .replace(/'/g, '').replace(/[^a-z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ');
}

export function recognisesSentence(expected, alternatives) {
  const target = normaliseSentence(expected);
  return Boolean(target) && alternatives.some(text => normaliseSentence(text) === target);
}

export function recordSpeakingResult(session, accepted, method, transcript = '') {
  if (!['recognition', 'self', 'skipped'].includes(method)) throw new Error('Invalid speaking result method');
  const sentence = session.words[session.index];
  if (!sentence || session.answered.has(sentence.id)) return false;
  session.answered.add(sentence.id);
  if (!accepted) session.missed.add(sentence.id);
  session.speaking.set(sentence.id, {accepted, method, transcript});
  return true;
}

export function speakingSummary(session) {
  const results = [...session.speaking.values()];
  return {
    recognised: results.filter(result => result.method === 'recognition' && result.accepted).length,
    selfPassed: results.filter(result => result.method === 'self' && result.accepted).length,
    needsPractice: results.filter(result => !result.accepted && result.method !== 'skipped').length,
    skipped: results.filter(result => result.method === 'skipped').length,
  };
}
