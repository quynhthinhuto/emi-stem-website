import {vocabularySubjects, loadVocabulary, topicTerms} from "./vocabulary-data.js?v=64";
import {sampleTerms, createSession, makeChoices, matchingRound, checkChoice, checkMatch, sessionResult} from "./vocabulary-core.js?v=62";
import {icons} from "./vocabulary-icons.js?v=64";

const root = document.querySelector("[data-vocabulary-practice]");
const subjectId = root?.dataset.subject;
const subject = vocabularySubjects[subjectId];
const storageKey = "emi-vocabulary-progress-v2";
const modes = {choice: ["Multiple Choice", "Chọn đáp án"], meaning: ["Match Meanings", "Nối nghĩa"], audio: ["Listen & Match", "Nghe & nối"]};
const scopes = {all: ["Whole Vocabulary File", "Toàn bộ file Vocabulary"], topic: ["By Topic", "Theo từng chủ đề"]};
const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
const bilingual = (en, vi) => `<span class="vq-bilingual"><span lang="en">${escape(en)}</span><span lang="vi">${escape(vi)}</span></span>`;
const bilingualText = (en, vi) => `${en} / ${vi}`;
const pronunciation = "Play pronunciation / Nghe phát âm";
const definition = term => `<span class="vq-definition"><span lang="en">${escape(term.word)}</span> = <span lang="vi">${escape(term.meaning)}</span></span>`;

let vocabulary;
if (root && subject) {
  try {
    vocabulary = await loadVocabulary(subjectId);
  } catch {
    root.querySelector("p").innerHTML = bilingual("Unable to load the vocabulary file.", "Không tải được tài liệu từ vựng.");
    const retry = document.createElement("button");
    retry.className = "button secondary";
    retry.type = "button";
    retry.innerHTML = bilingual("Try Again", "Thử lại");
    retry.addEventListener("click", () => window.location.reload());
    root.append(retry);
  }
}

if (root && subject && vocabulary) {
  let mode = "choice";
  let session = null;
  let reviewing = false;
  let choices = [];
  let retryTimer;
  let playId = 0;
  let playingButton;
  let results = {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) results = saved;
  } catch {}

  root.innerHTML = `
    <div class="section-heading"><div><p class="eyebrow">${bilingual(subject.label, subject.labelVi)}</p><h2 id="vocabulary-practice-title">${bilingual("Vocabulary Practice", "Luyện từ vựng")}</h2></div></div>
    <div class="vq-toolbar">
      <div class="vq-topic-settings">
        <label class="vq-topic-label" for="vq-scope">${bilingual("Topic", "Chủ đề")}<span class="vq-select"><select id="vq-scope">${Object.entries(scopes).map(([id, labels]) => `<option value="${id}">${escape(bilingualText(...labels))}</option>`).join("")}</select><span class="vq-select-value" data-vq-scope-value aria-hidden="true"></span>${icons.ChevronDown}</span></label>
        <label class="vq-topic-label" for="vq-topic" data-vq-topic-label hidden>${bilingual("Select Topic", "Chọn chủ đề")}<span class="vq-select"><select id="vq-topic" disabled>${subject.topics.map(topic => `<option value="${topic.id}">${escape(bilingualText(topic.titleEn, topic.title))}</option>`).join("")}</select><span class="vq-select-value" data-vq-topic-value aria-hidden="true"></span>${icons.ChevronDown}</span></label>
      </div>
      <fieldset class="vq-modes"><legend>${bilingual("Test Type", "Dạng bài")}</legend><div class="vq-mode-options">${Object.entries(modes).map(([id,labels]) => `<label><input type="radio" name="vocabulary-mode" value="${id}"><span>${icons[id === "choice" ? "ListChecks" : id === "meaning" ? "Link2" : "Headphones"]}${bilingual(...labels)}</span></label>`).join("")}</div></fieldset>
      <label class="vq-rate-label" for="vq-rate">${bilingual("Audio Speed", "Tốc độ nghe")}<select id="vq-rate"><option value="1">1x</option><option value="0.75">0.75x</option></select></label>
    </div>
    <p class="vq-audio-error" role="status" aria-live="polite" hidden></p>
    <div class="vq-stage" data-vq-stage></div>
    <audio data-vq-audio preload="none"></audio>`;

  const scopeSelect = root.querySelector("#vq-scope");
  const topicSelect = root.querySelector("#vq-topic");
  const topicLabel = root.querySelector("[data-vq-topic-label]");
  const stage = root.querySelector("[data-vq-stage]");
  const audio = root.querySelector("audio");
  const audioError = root.querySelector(".vq-audio-error");
  const rate = root.querySelector("#vq-rate");
  const selectedTopic = () => scopeSelect.value === "topic" ? topicSelect.value : "all";
  const resultKey = () => `${subjectId}:${selectedTopic()}:${mode}`;
  const pool = () => topicTerms(subjectId, selectedTopic(), vocabulary);
  const topicTitles = () => {
    const topic = subject.topics.find(topic => topic.id === selectedTopic());
    return topic ? [topic.titleEn, topic.title] : [`${subject.label} Vocabulary`, `Từ vựng ${subject.labelVi}`];
  };
  const topicTitle = () => bilingual(...topicTitles());

  // Keep native keyboard/select semantics while allowing both language lines to wrap.
  function updateSelectLabels() {
    root.querySelector("[data-vq-scope-value]").innerHTML = bilingual(...scopes[scopeSelect.value]);
    const topic = subject.topics.find(topic => topic.id === topicSelect.value);
    root.querySelector("[data-vq-topic-value]").innerHTML = bilingual(topic.titleEn, topic.title);
  }

  function stopAudio() {
    playId++;
    audio.pause();
    if (playingButton) {
      playingButton.classList.remove("is-playing");
      playingButton.removeAttribute("aria-busy");
    }
    playingButton = null;
  }

  async function playTerm(term, button) {
    stopAudio();
    const request = playId;
    playingButton = button;
    audioError.hidden = true;
    button.setAttribute("aria-busy", "true");
    audio.src = new URL(`./assets/vocabulary/audio/${term.audio}.m4a`, import.meta.url).href;
    audio.playbackRate = Number(rate.value);
    let timeout;
    try {
      await Promise.race([
        audio.play(),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Audio timeout")), 8000); })
      ]);
      if (request !== playId) return false;
      button.classList.add("is-playing");
      button.removeAttribute("aria-busy");
      return true;
    } catch {
      if (request === playId) {
        stopAudio();
        audioError.innerHTML = bilingual("Unable to play audio.", "Không phát được âm thanh.");
        audioError.hidden = false;
      }
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  audio.addEventListener("ended", () => {
    playingButton?.classList.remove("is-playing");
    playingButton?.removeAttribute("aria-busy");
  });
  rate.addEventListener("change", () => { audio.playbackRate = Number(rate.value); });

  function setControls(active) {
    scopeSelect.disabled = active;
    topicLabel.hidden = scopeSelect.value !== "topic";
    topicSelect.disabled = active || topicLabel.hidden;
    root.querySelectorAll('.vq-modes input').forEach(input => { input.disabled = active; });
  }

  function ready() {
    clearTimeout(retryTimer);
    stopAudio();
    session = null;
    reviewing = false;
    audioError.hidden = true;
    setControls(false);
    updateSelectLabels();
    root.querySelectorAll('.vq-modes input').forEach(input => { input.checked = false; });
    const count = 6;
    const saved = results[resultKey()];
    const valid = saved && Number.isInteger(saved.correct) && saved.correct >= 0 && saved.correct <= count && saved.total === count;
    stage.innerHTML = `<div class="vq-ready">
      <div><h3>${topicTitle()}</h3><p>${bilingual(`6 words per test · ${pool().length} words in ${selectedTopic() === "all" ? "the file" : "this topic"}`, `6 từ / bài · ${pool().length} từ ${selectedTopic() === "all" ? "trong tài liệu" : "trong chủ đề"}`)}</p>${valid ? `<p class="vq-best">${bilingual(`${modes[mode][0]} · Best: ${saved.correct}/${saved.total} correct on the first try`, `${modes[mode][1]} · Tốt nhất: ${saved.correct}/${saved.total} đúng lần đầu`)}</p>` : ""}</div>
    </div>`;
  }

  function start(terms, review = false) {
    clearTimeout(retryTimer);
    stopAudio();
    reviewing = review;
    session = createSession(terms, mode);
    session.heard = new Set();
    setControls(true);
    if (mode === "choice") renderChoice();
    else {
      matchingRound(session);
      renderMatching();
    }
    stage.scrollIntoView({block: "nearest", behavior: "smooth"});
  }

  function sessionHeader() {
    return `<div class="vq-session-header">
      <div><span>${reviewing ? bilingual("Review Missed Words", "Ôn từ sai") : topicTitle()}</span><span class="vq-counter" data-vq-counter>${session.answered.size}/${session.words.length}</span></div>
      <button class="vq-icon-button" type="button" data-vq-exit aria-label="Exit practice / Thoát bài luyện" title="Exit practice / Thoát bài luyện">${icons.X}</button>
      </div><progress class="vq-progress" max="${session.words.length}" value="${session.answered.size}" aria-label="Practice progress / Tiến độ bài luyện"></progress>`;
  }

  function bindExit() {
    stage.querySelector("[data-vq-exit]").addEventListener("click", () => {
      if (window.confirm("Stop this test? Unfinished results will not be saved.\n\nDừng bài luyện hiện tại? Kết quả chưa hoàn thành sẽ không được lưu.")) ready();
    });
  }

  function updateProgress() {
    stage.querySelector(".vq-progress").value = session.answered.size;
    stage.querySelector("[data-vq-counter]").textContent = `${session.answered.size}/${session.words.length}`;
  }

  function feedback(html, correct) {
    const node = stage.querySelector(".vq-feedback");
    node.className = `vq-feedback ${correct ? "is-correct" : "is-incorrect"}`;
    node.innerHTML = `${icons[correct ? "Check" : "X"]}<span>${html}</span>`;
  }

  function focusQuestion() {
    stage.querySelector("h3").focus({preventScroll:true});
  }

  function renderChoice() {
    const term = session.words[session.index];
    choices = makeChoices(term, pool());
    stage.innerHTML = `${sessionHeader()}
      <div class="vq-question"><p class="vq-question-number">${bilingual(`Question ${session.index + 1}/${session.words.length}`, `Câu ${session.index + 1}/${session.words.length}`)}</p><h3 tabindex="-1" aria-describedby="vq-current-word">${bilingual("What is the Vietnamese meaning of this word?", "Nghĩa tiếng Việt của từ này là gì?")}</h3>
      <div class="vq-word-row"><p class="vq-word" id="vq-current-word" lang="en">${escape(term.word)}</p><button class="vq-icon-button" type="button" data-vq-listen aria-label="${escape(`${pronunciation}: ${term.word}`)}" title="${pronunciation}">${icons.Volume2}</button></div>
      <fieldset class="vq-choices"><legend class="vq-sr-only">${bilingual("Choose the Vietnamese meaning", "Chọn nghĩa tiếng Việt")}</legend>${choices.map((option, index) => `<label class="vq-choice"><input type="radio" name="vq-answer" value="${option.id}"><span class="vq-option-letter" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span lang="vi">${escape(option.meaning)}</span><span class="vq-answer-mark" aria-hidden="true"></span></label>`).join("")}</fieldset></div>
      <div class="vq-feedback" role="status" aria-live="polite"></div>
      <div class="vq-session-actions"><button class="button primary" type="button" data-vq-check disabled>${bilingual("Check", "Kiểm tra")} ${icons.Check}</button><button class="button primary" type="button" data-vq-next hidden>${session.index + 1 === session.words.length ? bilingual("View Results", "Xem kết quả") : bilingual("Continue", "Tiếp tục")} ${icons.ArrowRight}</button></div>`;
    bindExit();
    stage.querySelector("[data-vq-listen]").addEventListener("click", event => playTerm(term, event.currentTarget));
    stage.querySelectorAll('.vq-choices input').forEach(input => input.addEventListener("change", () => {
      session.choice = input.value;
      stage.querySelector("[data-vq-check]").disabled = false;
    }));
    stage.querySelector("[data-vq-check]").addEventListener("click", () => {
      const correct = checkChoice(session, session.choice);
      if (correct === null) return;
      stage.querySelectorAll('.vq-choices input').forEach(input => {
        input.disabled = true;
        const right = input.value === term.id;
        const wrong = input.checked && !right;
        input.closest("label").classList.toggle("is-correct", right);
        input.closest("label").classList.toggle("is-incorrect", wrong);
        input.closest("label").querySelector(".vq-answer-mark").innerHTML = right ? icons.Check : wrong ? icons.X : "";
      });
      feedback(`${correct ? bilingual("Correct!", "Chính xác!") : bilingual("Not quite.", "Chưa đúng.")}${definition(term)}`, correct);
      stage.querySelector("[data-vq-check]").hidden = true;
      const next = stage.querySelector("[data-vq-next]");
      next.hidden = false;
      updateProgress();
      next.focus({preventScroll:true});
    });
    stage.querySelector("[data-vq-next]").addEventListener("click", () => {
      if (!session.checked) return;
      stopAudio();
      session.index++;
      session.choice = null;
      session.checked = false;
      if (session.index === session.words.length) finish();
      else renderChoice();
    });
    focusQuestion();
  }

  function renderMatching() {
    const listening = mode === "audio";
    const columns = [session.left, session.right];
    stage.innerHTML = `${sessionHeader()}
      <div class="vq-question"><p class="vq-question-number">${bilingual(`Round ${session.round + 1}/${Math.ceil(session.words.length / 3)}`, `Vòng ${session.round + 1}/${Math.ceil(session.words.length / 3)}`)}</p><h3 tabindex="-1">${listening ? bilingual("Match the audio to the English word", "Nối âm thanh với từ tiếng Anh") : bilingual("Match the English word to its Vietnamese meaning", "Nối từ tiếng Anh với nghĩa tiếng Việt")}</h3>
      <div class="vq-matching"><div class="vq-column-heading">${listening ? bilingual("Pronunciation", "Phát âm") : bilingual("English", "Tiếng Anh")}</div><div class="vq-column-heading">${listening ? bilingual("English", "Tiếng Anh") : bilingual("Vietnamese", "Tiếng Việt")}</div>
      ${columns.map((terms, column) => `<div class="vq-match-column">${terms.map((term, index) => `<button class="vq-match-tile${listening && column === 0 ? " vq-audio-tile" : ""}" type="button" data-side="${column === 0 ? "left" : "right"}" data-term="${term.id}" aria-pressed="false"${listening && column === 0 ? ` aria-label="Pronunciation ${index + 1} / Phát âm ${index + 1}" title="Replay pronunciation ${index + 1} / Nghe lại phát âm ${index + 1}"` : ` lang="${column === 0 || listening ? "en" : "vi"}"`}>
      ${listening && column === 0 ? `${icons.Volume2}<span>${index + 1}</span>` : `<span>${escape(column === 0 || listening ? term.word : term.meaning)}</span>`}<span class="vq-match-mark" aria-hidden="true">${icons.Check}</span></button>`).join("")}</div>`).join("")}</div></div>
      <div class="vq-feedback" role="status" aria-live="polite"></div>
      <div class="vq-session-actions"><button class="button primary" type="button" data-vq-next disabled>${(session.round + 1) * 3 >= session.words.length ? bilingual("View Results", "Xem kết quả") : bilingual("Continue", "Tiếp tục")} ${icons.ArrowRight}</button></div>`;
    bindExit();
    stage.querySelectorAll(".vq-match-tile").forEach(button => button.addEventListener("click", async () => {
      if (session.locked || button.disabled) return;
      const current = session;
      const {side, term: id} = button.dataset;
      current.selected[side] = id;
      paintMatching();
      if (listening && side === "left") {
        const term = current.left.find(item => item.id === id);
        const played = await playTerm(term, button);
        if (session !== current || current.selected.left !== id) return;
        if (!played) {
          current.selected.left = null;
          paintMatching();
          return;
        }
        current.heard.add(id);
      }
      tryMatch();
    }));
    stage.querySelector("[data-vq-next]").addEventListener("click", () => {
      if (session.matched.size !== session.left.length) return;
      stopAudio();
      session.round++;
      if (session.round * 3 >= session.words.length) finish();
      else {
        matchingRound(session);
        renderMatching();
      }
    });
    focusQuestion();
  }

  function paintMatching(wrong = []) {
    stage.querySelectorAll(".vq-match-tile").forEach(button => {
      const {side, term: id} = button.dataset;
      const matched = session.matched.has(id);
      button.disabled = matched;
      button.classList.toggle("is-matched", matched);
      button.classList.toggle("is-selected", !matched && session.selected[side] === id);
      button.classList.toggle("is-incorrect", wrong.includes(`${side}:${id}`));
      button.setAttribute("aria-pressed", String(!matched && session.selected[side] === id));
    });
    stage.querySelector("[data-vq-next]").disabled = session.matched.size !== session.left.length;
  }

  function tryMatch() {
    const {left, right} = session.selected;
    if (!left || !right || (mode === "audio" && !session.heard.has(left))) return;
    const correct = checkMatch(session, left, right);
    if (correct === null) return;
    if (correct) {
      const term = session.words.find(item => item.id === left);
      feedback(`${bilingual("Correct!", "Chính xác!")}${definition(term)}`, true);
      session.selected = {left:null, right:null};
      paintMatching();
      updateProgress();
      if (session.matched.size === session.left.length) stage.querySelector("[data-vq-next]").focus({preventScroll:true});
    } else {
      feedback(bilingual("Not quite. These two items do not match.", "Chưa đúng. Hai mục này không cùng một cặp."), false);
      session.locked = true;
      paintMatching([`left:${left}`, `right:${right}`]);
      const current = session;
      retryTimer = setTimeout(() => {
        if (session !== current) return;
        session.selected = {left:null, right:null};
        session.locked = false;
        paintMatching();
      }, 550);
    }
  }

  function finish() {
    clearTimeout(retryTimer);
    stopAudio();
    const result = sessionResult(session);
    if (!reviewing) {
      const key = resultKey();
      const previous = results[key];
      if (!previous || previous.total !== result.total || !Number.isInteger(previous.correct) || previous.correct < result.correct || previous.correct > result.total) {
        results[key] = {correct:result.correct, total:result.total, completedAt:new Date().toISOString()};
        try { localStorage.setItem(storageKey, JSON.stringify(results)); } catch {}
      }
    }
    stage.innerHTML = `<div class="vq-result">
      <div class="vq-result-heading">${icons.Trophy}<div><p class="vq-question-number">${bilingual(`${topicTitles()[0]} · ${modes[mode][0]}`, `${topicTitles()[1]} · ${modes[mode][1]}`)}</p><h3 tabindex="-1">${reviewing ? bilingual("Review Complete", "Đã ôn xong") : bilingual("Test Complete", "Hoàn thành")}</h3></div></div>
      <p class="vq-result-score"><strong>${result.correct}/${result.total}</strong>${bilingual("correct on the first try", "đúng lần đầu")}</p>
      <p>${result.correct === result.total ? bilingual("Great work! You know this set of words well.", "Tuyệt vời! Bạn đã nắm chắc nhóm từ này.") : bilingual(`${result.missed.length} ${result.missed.length === 1 ? "word" : "words"} to review.`, `${result.missed.length} từ cần ôn lại.`)}</p>
      ${result.missed.length ? `<div class="vq-review"><h4>${bilingual("Words to Review", "Từ cần ôn")}</h4><dl>${result.missed.map(term => `<div><dt lang="en">${escape(term.word)}</dt><dd lang="vi">${escape(term.meaning)}</dd><button class="vq-icon-button" type="button" data-review-audio="${term.id}" aria-label="${escape(`${pronunciation}: ${term.word}`)}" title="${pronunciation}">${icons.Volume2}</button></div>`).join("")}</dl></div>` : ""}
      <div class="vq-result-actions">${result.missed.length ? `<button class="button primary" type="button" data-vq-review>${icons.RotateCcw} ${bilingual("Review Missed Words", "Ôn từ sai")}</button>` : ""}<button class="button ${result.missed.length ? "secondary" : "primary"}" type="button" data-vq-again>${icons.RotateCcw} ${bilingual("Try Again", "Làm lại")}</button><button class="button secondary" type="button" data-vq-topics>${icons.LogOut} ${bilingual("Change Test Type", "Đổi dạng bài")}</button></div>
      </div>`;
    stage.querySelector("[data-vq-review]")?.addEventListener("click", () => start(result.missed, true));
    stage.querySelector("[data-vq-again]").addEventListener("click", () => start(sampleTerms(pool())));
    stage.querySelector("[data-vq-topics]").addEventListener("click", () => { ready(); root.querySelector('.vq-modes input').focus({preventScroll:true}); });
    stage.querySelectorAll("[data-review-audio]").forEach(button => button.addEventListener("click", () => playTerm(result.missed.find(term => term.id === button.dataset.reviewAudio), button)));
    focusQuestion();
  }

  scopeSelect.addEventListener("change", ready);
  topicSelect.addEventListener("change", ready);
  root.querySelectorAll('.vq-modes input').forEach(input => input.addEventListener("change", () => { mode = input.value; start(sampleTerms(pool())); }));
  window.addEventListener("pagehide", stopAudio);
  ready();
}
