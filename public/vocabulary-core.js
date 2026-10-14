export function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function sampleTerms(pool, count = 6, random = Math.random) {
  const words = new Set();
  const meanings = new Set();
  const terms = [];
  // Distinct meanings prevent synonymous headwords from creating ambiguous pairs.
  for (const term of shuffle(pool, random)) {
    const word = term.word.toLocaleLowerCase("en");
    const meaning = term.meaning.toLocaleLowerCase("vi");
    if (words.has(word) || meanings.has(meaning)) continue;
    words.add(word);
    meanings.add(meaning);
    terms.push(term);
    if (terms.length === count) return terms;
  }
  throw new Error(`Vocabulary pool needs ${count} distinct pairs`);
}

export function makeChoices(term, pool, random = Math.random) {
  const meanings = new Set([term.meaning]);
  const distractors = shuffle(pool, random).filter(other => {
    if (meanings.has(other.meaning)) return false;
    meanings.add(other.meaning);
    return true;
  }).slice(0, 3);
  return shuffle([term, ...distractors], random);
}

export function createSession(terms, mode, random = Math.random) {
  if (!terms.length || !["choice", "meaning", "audio"].includes(mode)) throw new Error("Invalid vocabulary session");
  return {
    words: shuffle(terms, random), mode, index: 0,
    answered: new Set(), missed: new Set(), selected: {left: null, right: null},
    choice: null, checked: false, round: 0, matched: new Set(), locked: false
  };
}

export function matchingRound(session, random = Math.random) {
  const terms = session.words.slice(session.round * 3, session.round * 3 + 3);
  session.left = shuffle(terms, random);
  session.right = shuffle(terms, random);
  session.matched = new Set();
  session.selected = {left: null, right: null};
  session.locked = false;
  return terms;
}

export function checkChoice(session, choiceId) {
  if (session.checked || !choiceId) return null;
  const term = session.words[session.index];
  const correct = term.id === choiceId;
  session.checked = true;
  session.answered.add(term.id);
  if (!correct) session.missed.add(term.id);
  return correct;
}

export function checkMatch(session, leftId, rightId) {
  const valid = session.left.some(term => term.id === leftId) && session.right.some(term => term.id === rightId);
  if (!valid || session.locked || session.matched.has(leftId) || session.matched.has(rightId)) return null;
  const correct = leftId === rightId;
  if (correct) {
    session.matched.add(leftId);
    session.answered.add(leftId);
  } else {
    session.missed.add(leftId);
    session.missed.add(rightId);
  }
  return correct;
}

export function sessionResult(session) {
  const missed = session.words.filter(term => session.missed.has(term.id));
  return {total: session.words.length, correct: session.words.length - missed.length, missed};
}
