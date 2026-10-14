import {icons as quizIcons} from './vocabulary-icons.js?v=64';
import {icons as speechIcons} from './classroom-sentence-icons.js?v=1';
import {createSentenceTest, sentencePool, recognisesSentence, recordSpeakingResult, speakingSummary} from './classroom-sentence-core.js?v=1';
import {checkMatch, sessionResult} from './vocabulary-core.js?v=62';

const root = document.querySelector('[data-classroom-sentences]');
const icons = {...quizIcons, ...speechIcons};
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const bi = (en, vi) => `<span class="ce-bilingual"><span lang="en">${escape(en)}</span><span lang="vi">${escape(vi)}</span></span>`;
const label = (en, vi) => `${en} / ${vi}`;
const iconButton = (action, icon, en, vi) => `<button type="button" class="ce-icon-button" data-ce-action="${action}" aria-label="${escape(label(en, vi))}" title="${escape(label(en, vi))}">${icons[icon]}</button>`;

if (root) {
  try {
    const {topics, sentences} = await import('./classroom-sentences.js?v=1');
    mount(topics, sentences);
  } catch {
    root.innerHTML = `<p role="alert">${bi('Unable to load the sentence test.', 'Không tải được bài luyện mẫu câu.')}</p><button type="button" class="button secondary" data-ce-reload>${bi('Reload', 'Tải lại')}</button>`;
    root.querySelector('[data-ce-reload]').addEventListener('click', () => location.reload());
  }
}

function mount(topics, bank) {
  const panel = root.closest('[data-module2-panel]');
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canRecord = Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  let session;
  let mode = 'meaning';
  let retryTimer;
  let audioToken = 0;
  let audioButton;
  let captureToken = 0;
  let capture;
  let recordingUrl;
  let recognitionAllowed = false;
  let speech = {};

  root.innerHTML = `
    <div class="ce-heading"><div><p class="eyebrow">Test · English - Vietnamese</p><h2>${bi('Classroom English', 'Mẫu câu tiếng Anh trong lớp học')}</h2></div></div>
    <div class="ce-toolbar">
      <label class="ce-topic">${bi('Topic', 'Chủ đề')}<span class="ce-select"><select data-ce-topic aria-label="Topic / Chủ đề"><option value="all">All sentences / Tất cả mẫu câu</option>${topics.map(topic => `<option value="${topic.id}">${escape(label(topic.en, topic.vi))}</option>`).join('')}</select><span data-ce-topic-value aria-hidden="true"></span>${icons.ChevronDown}</span></label>
      <fieldset class="ce-modes"><legend>${bi('Test type', 'Dạng bài')}</legend><div>${[
        ['meaning', 'Link2', 'Match', 'Ghép câu'], ['audio', 'Headphones', 'Listen', 'Nghe'], ['speaking', 'Mic', 'Speak', 'Nói'],
      ].map(([id, icon, en, vi]) => `<label><input type="radio" name="classroom-mode" value="${id}" ${id === mode ? 'checked' : ''}><span>${icons[icon]}${bi(en, vi)}</span></label>`).join('')}</div></fieldset>
      <label class="ce-rate">${bi('Audio speed', 'Tốc độ nghe')}<select data-ce-rate aria-label="Audio speed / Tốc độ nghe"><option value="1">1x</option><option value="0.75">0.75x</option></select></label>
    </div>
    <p class="ce-bank-count" data-ce-count></p>
    <p class="ce-audio-error" data-ce-audio-error role="status" hidden></p>
    <div data-ce-stage></div>
    <audio data-ce-model preload="none"></audio>`;

  const topic = root.querySelector('[data-ce-topic]');
  const rate = root.querySelector('[data-ce-rate]');
  const stage = root.querySelector('[data-ce-stage]');
  const audio = root.querySelector('[data-ce-model]');
  const audioError = root.querySelector('[data-ce-audio-error]');
  const audioUrl = sentence => new URL(`./assets/classroom-english/audio/${sentence.audio}`, import.meta.url).href;
  const topicLabel = () => {
    const item = topics.find(item => item.id === topic.value);
    return item ? bi(item.en, item.vi) : bi('All sentences', 'Tất cả mẫu câu');
  };

  function stopAudio() {
    audioToken++;
    audio.pause();
    audioButton?.classList.remove('is-playing');
    audioButton?.removeAttribute('aria-busy');
    audioButton = null;
    stage.querySelector('[data-ce-recorded]')?.pause();
  }

  async function playSentence(sentence, button) {
    stopAudio();
    audioError.hidden = true;
    const token = audioToken;
    audioButton = button;
    button?.setAttribute('aria-busy', 'true');
    audio.src = audioUrl(sentence);
    audio.playbackRate = Number(rate.value);
    let timeout;
    try {
      await Promise.race([audio.play(), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Audio timeout')), 8000); })]);
      if (token !== audioToken) return false;
      button?.removeAttribute('aria-busy');
      button?.classList.add('is-playing');
      return true;
    } catch {
      if (token === audioToken) {
        stopAudio();
        audioError.innerHTML = bi('Audio could not be played. Try again.', 'Chưa phát được âm thanh. Hãy thử lại.');
        audioError.hidden = false;
      }
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
  audio.addEventListener('ended', () => {
    audioButton?.classList.remove('is-playing');
    audioButton?.removeAttribute('aria-busy');
  });
  rate.addEventListener('change', () => { audio.playbackRate = Number(rate.value); });

  function disposeRecording() {
    stage.querySelector('[data-ce-recorded]')?.pause();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    recordingUrl = null;
  }

  function cancelCapture() {
    captureToken++;
    if (capture) {
      clearInterval(capture.interval);
      clearTimeout(capture.timeout);
      try { capture.recognition?.abort(); } catch {}
      if (capture.recorder && capture.recorder.state !== 'inactive') {
        capture.recorder.onstop = null;
        try { capture.recorder.stop(); } catch {}
      }
      capture.stream?.getTracks().forEach(track => track.stop());
      capture = null;
    }
  }

  function cleanUp() {
    clearTimeout(retryTimer);
    stopAudio();
    cancelCapture();
    disposeRecording();
  }

  function header() {
    return `<div class="ce-session-header"><div>${topicLabel()}<span class="ce-counter" data-ce-counter>${session.answered.size}/6</span></div>${iconButton('new', 'RotateCcw', 'New random set', 'Bộ câu ngẫu nhiên mới')}</div><progress class="ce-progress" max="6" value="${session.answered.size}" aria-label="Test progress / Tiến độ bài luyện"></progress>`;
  }
  function updateProgress() {
    stage.querySelector('[data-ce-counter]').textContent = `${session.answered.size}/6`;
    stage.querySelector('progress').value = session.answered.size;
  }
  function feedback(en, vi, kind = '') {
    const element = stage.querySelector('[data-ce-feedback]');
    if (!element) return;
    element.innerHTML = bi(en, vi);
    element.dataset.kind = kind;
  }
  function start() {
    cleanUp();
    rate.disabled = false;
    speech = {};
    session = createSentenceTest(bank, topic.value, mode);
    root.querySelector('[data-ce-topic-value]').innerHTML = topicLabel();
    root.querySelector('[data-ce-count]').innerHTML = bi(`6 sentences per test · ${sentencePool(bank, topic.value).length} available`, `6 câu mỗi bài · ${sentencePool(bank, topic.value).length} mẫu câu`);
    audioError.hidden = true;
    if (mode === 'speaking') renderSpeaking();
    else renderMatching();
  }

  function renderMatching() {
    stage.innerHTML = `${header()}<h3>${mode === 'audio' ? bi('Listen and match the meaning', 'Nghe và ghép nghĩa của câu') : bi('Match sentences with meanings', 'Ghép câu với nghĩa của câu')}</h3>
      <div class="ce-match-grid"><div><h4>${mode === 'audio' ? bi('Audio', 'Âm thanh') : bi('English', 'Tiếng Anh')}</h4><div class="ce-pairs">${session.left.map((sentence, index) => `<button class="ce-pair" type="button" data-ce-side="left" data-ce-id="${sentence.id}" aria-pressed="false"><span class="ce-pair-number" aria-hidden="true">${index + 1}</span><span>${mode === 'audio' ? `${icons.Volume2}${bi(`Sentence ${index + 1}`, `Câu ${index + 1}`)}` : `<span lang="en">${escape(sentence.word)}</span>`}</span></button>`).join('')}</div></div>
      <div><h4>${bi('Vietnamese', 'Tiếng Việt')}</h4><div class="ce-pairs">${session.right.map((sentence, index) => `<button class="ce-pair" type="button" data-ce-side="right" data-ce-id="${sentence.id}" aria-pressed="false"><span class="ce-pair-number" aria-hidden="true">${String.fromCharCode(65 + index)}</span><span lang="vi">${escape(sentence.meaning)}</span></button>`).join('')}</div></div></div>
      <p class="ce-feedback" data-ce-feedback role="status" aria-live="polite"></p>`;
  }

  function updatePairs() {
    stage.querySelectorAll('[data-ce-side]').forEach(button => {
      const {ceSide: side, ceId: id} = button.dataset;
      const matched = session.matched.has(id);
      button.disabled = matched || session.locked;
      button.classList.toggle('is-matched', matched);
      button.classList.toggle('is-selected', session.selected[side] === id && !matched);
      button.setAttribute('aria-pressed', String(session.selected[side] === id && !matched));
      if (matched) {
        const sentence = session.words.find(sentence => sentence.id === id);
        button.innerHTML = `${icons.Check}<span lang="${side === 'left' ? 'en' : 'vi'}">${escape(side === 'left' ? sentence.word : sentence.meaning)}</span>`;
      }
    });
    updateProgress();
  }

  function checkPair() {
    const {left, right} = session.selected;
    if (!left || !right || session.locked || (mode === 'audio' && !session.heard.has(left))) return;
    const correct = checkMatch(session, left, right);
    if (correct === null) return;
    if (correct) {
      session.selected = {left: null, right: null};
      feedback('Correct match.', 'Ghép đúng.', 'correct');
      updatePairs();
      if (session.answered.size === 6) retryTimer = setTimeout(renderResults, 500);
    } else {
      session.locked = true;
      feedback('Not this pair. Try again.', 'Chưa đúng cặp. Thử lại nhé.', 'incorrect');
      stage.querySelectorAll('.is-selected').forEach(button => button.classList.add('is-wrong'));
      updatePairs();
      const current = session;
      retryTimer = setTimeout(() => {
        if (session !== current) return;
        session.locked = false;
        session.selected = {left: null, right: null};
        stage.querySelectorAll('.is-wrong').forEach(button => button.classList.remove('is-wrong'));
        updatePairs();
      }, 500);
    }
  }

  function renderSpeaking() {
    cancelCapture();
    disposeRecording();
    speech = {status: 'idle', transcript: '', recognised: false, error: '', clip: false, seconds: 0};
    const sentence = session.words[session.index];
    stage.innerHTML = `${header()}<h3>${bi('Listen and speak', 'Nghe và nói')}</h3>
      <div class="ce-speaking-prompt"><span class="ce-question-number">${session.index + 1}/6</span><p class="ce-sentence" lang="en">${escape(sentence.word)}</p><p lang="vi">${escape(sentence.meaning)}</p>${iconButton('model', 'Volume2', 'Play model sentence', 'Nghe câu mẫu')}</div>
      <div class="ce-speaking-actions"><button type="button" class="ce-record-button" data-ce-action="record" ${!canRecord ? 'disabled' : ''}></button>${iconButton('skip', 'ArrowRight', 'Skip sentence', 'Bỏ qua câu')}</div>
      <p class="ce-capture-status" data-ce-capture-status role="status" aria-live="polite"></p>
      <div class="ce-recording" data-ce-recording hidden><h4>${bi('Your recording', 'Bản ghi của bạn')}</h4><audio data-ce-recorded controls preload="metadata" aria-label="Your recording / Bản ghi của bạn"></audio></div>
      <div class="ce-recognition-result" data-ce-transcript role="status" aria-live="polite"></div>
      <div class="ce-self-review" data-ce-self-review hidden><button type="button" class="button secondary" data-ce-action="self-pass">${icons.Check}${bi('I said it correctly', 'Tôi đã nói đúng')}</button><button type="button" class="button secondary" data-ce-action="self-retry">${icons.RotateCcw}${bi('Needs more practice', 'Cần luyện thêm')}</button></div>
      <button type="button" class="button primary ce-next" data-ce-action="recognised" hidden>${icons.ArrowRight}${bi('Next sentence', 'Câu tiếp theo')}</button>
      <div class="ce-privacy"><label><input type="checkbox" data-ce-recognition ${recognitionAllowed ? 'checked' : ''} ${!Recognition || !canRecord ? 'disabled' : ''}>${bi('Use browser speech recognition', 'Bật nhận dạng giọng nói của trình duyệt')}</label>
      <p>${bi('Playback recordings stay in this session. When recognition is enabled, your browser may send audio to its speech service. Recognition checks the sentence text, not pronunciation quality.', 'Bản ghi nghe lại chỉ nằm trong phiên này. Khi bật nhận dạng, trình duyệt có thể gửi âm thanh tới dịch vụ giọng nói của trình duyệt. Nhận dạng kiểm tra nội dung câu, không chấm chất lượng phát âm.')}</p>
      ${!Recognition ? `<p>${canRecord ? bi('Speech recognition is unavailable in this browser. Recording and self-review are available.', 'Trình duyệt này chưa hỗ trợ nhận dạng. Có thể ghi âm và tự đánh giá.') : bi('Speech recognition is unavailable in this browser.', 'Trình duyệt này chưa hỗ trợ nhận dạng.')}</p>` : ''}</div>`;
    stage.querySelector('[data-ce-recognition]').addEventListener('change', event => { recognitionAllowed = event.target.checked; });
    if (!canRecord) speech.error = label('Microphone recording is unavailable in this browser.', 'Trình duyệt này chưa hỗ trợ ghi âm micro.');
    updateSpeaking();
  }

  function updateSpeaking() {
    if (mode !== 'speaking' || !stage.querySelector('[data-ce-capture-status]')) return;
    const active = ['requesting', 'recording', 'stopping'].includes(speech.status);
    const record = stage.querySelector('[data-ce-action="record"]');
    const [icon, en, vi] = speech.status === 'requesting' ? ['X', 'Cancel', 'Hủy'] : speech.status === 'recording' ? ['Square', 'Stop recording', 'Dừng ghi âm'] : ['Mic', speech.clip ? 'Record again' : 'Record', speech.clip ? 'Ghi lại' : 'Ghi âm'];
    record.innerHTML = `${icons[icon]}${bi(en, vi)}`;
    record.classList.toggle('is-recording', speech.status === 'recording');
    record.disabled = !canRecord || speech.status === 'stopping';
    record.setAttribute('aria-busy', String(speech.status === 'requesting' || speech.status === 'stopping'));
    stage.querySelector('[data-ce-action="model"]').disabled = active;
    stage.querySelector('[data-ce-recognition]').disabled = active || !Recognition || !canRecord;
    rate.disabled = active;
    const status = stage.querySelector('[data-ce-capture-status]');
    const statusText = speech.error || (speech.status === 'requesting' ? label('Waiting for microphone permission...', 'Đang chờ quyền micro...') : speech.status === 'recording' ? label('Recording...', 'Đang ghi âm...') : speech.clip ? label('Recording ready.', 'Đã có bản ghi.') : '');
    if (status.textContent !== statusText) status.textContent = statusText;
    const transcript = stage.querySelector('[data-ce-transcript]');
    transcript.innerHTML = speech.transcript ? `<h4>${bi('Recognised words', 'Nội dung nhận dạng')}</h4><p lang="en">${escape(speech.transcript)}</p><p>${speech.recognised ? bi('Sentence recognised.', 'Nhận dạng đúng câu.') : bi('The recognised sentence differs from the model.', 'Nội dung nhận dạng khác với câu mẫu.')}</p>` : '';
    transcript.dataset.kind = speech.recognised ? 'correct' : '';
    stage.querySelector('[data-ce-self-review]').hidden = !speech.clip || active || speech.recognised;
    stage.querySelector('[data-ce-action="recognised"]').hidden = !speech.clip || active || !speech.recognised;
  }

  function stopRecording() {
    const current = capture;
    if (!current?.recorder || current.recorder.state === 'inactive') return;
    clearInterval(current.interval);
    clearTimeout(current.timeout);
    speech.status = 'stopping';
    current.duration = (performance.now() - current.started) / 1000;
    try { current.recorder.stop(); } catch {}
    try { current.recognition?.stop(); } catch {}
    current.stream.getTracks().forEach(track => track.stop());
    updateSpeaking();
  }

  function startRecognition(current) {
    if (!recognitionAllowed || !Recognition) return;
    try {
      const recognition = new Recognition();
      current.recognition = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;
      let received = false;
      recognition.onresult = event => {
        if (current.token !== captureToken || !event.results?.length) return;
        const alternatives = Array.from(event.results[0], item => item.transcript);
        received = true;
        speech.recognised = recognisesSentence(current.sentence.word, alternatives);
        speech.transcript = alternatives.find(text => recognisesSentence(current.sentence.word, [text])) || alternatives[0] || '';
        updateSpeaking();
        stopRecording();
      };
      recognition.onerror = event => {
        if (current.token !== captureToken || event.error === 'aborted') return;
        speech.error = label('Speech recognition unavailable. You can self-review the recording.', 'Nhận dạng chưa khả dụng. Bạn có thể tự đánh giá bản ghi.');
        updateSpeaking();
      };
      recognition.onend = () => {
        if (current.token !== captureToken || received || speech.error) return;
        speech.error = label('No recognition result. You can record again or self-review.', 'Chưa có kết quả nhận dạng. Có thể ghi lại hoặc tự đánh giá.');
        updateSpeaking();
      };
      recognition.start();
    } catch {
      speech.error = label('Speech recognition could not start. Recording is still available.', 'Chưa bật được nhận dạng. Vẫn có thể ghi âm.');
      updateSpeaking();
    }
  }

  async function startRecording() {
    cancelCapture();
    stopAudio();
    disposeRecording();
    const token = captureToken;
    speech = {status: 'requesting', transcript: '', recognised: false, error: '', clip: false, seconds: 0};
    const recording = stage.querySelector('[data-ce-recording]');
    recording.hidden = true;
    stage.querySelector('[data-ce-recorded]').removeAttribute('src');
    updateSpeaking();
    const current = {token, sentence: session.words[session.index]};
    capture = current;
    current.timeout = setTimeout(() => {
      if (token !== captureToken || speech.status !== 'requesting') return;
      cancelCapture();
      speech.status = 'idle';
      speech.error = label('Microphone permission is still pending. Try again when ready.', 'Quyền micro chưa được cấp. Thử lại khi sẵn sàng.');
      updateSpeaking();
    }, 30000);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      if (token !== captureToken || panel?.hidden) { stream.getTracks().forEach(track => track.stop()); return; }
      clearTimeout(current.timeout);
      current.stream = stream;
      const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, type ? {mimeType: type} : {});
      current.recorder = recorder;
      current.chunks = [];
      recorder.ondataavailable = event => { if (token === captureToken && event.data.size) current.chunks.push(event.data); };
      recorder.onerror = () => {
        if (token !== captureToken) return;
        cancelCapture();
        speech.status = 'idle';
        speech.error = label('Recording failed. Try again.', 'Ghi âm chưa thành công. Thử lại nhé.');
        updateSpeaking();
      };
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        clearInterval(current.interval);
        clearTimeout(current.timeout);
        if (token !== captureToken) return;
        speech.status = 'idle';
        if (!current.chunks.length || (current.duration || 0) < 0.7) {
          speech.error = label('The recording was too short. Please record again.', 'Bản ghi quá ngắn. Hãy ghi lại.');
          updateSpeaking();
          return;
        }
        recordingUrl = URL.createObjectURL(new Blob(current.chunks, {type: recorder.mimeType}));
        speech.clip = true;
        stage.querySelector('[data-ce-recorded]').src = recordingUrl;
        stage.querySelector('[data-ce-recording]').hidden = false;
        updateSpeaking();
      };
      recorder.start(250);
      current.started = performance.now();
      speech.status = 'recording';
      current.interval = setInterval(() => {
        if (token !== captureToken) return;
        speech.seconds = Math.floor((performance.now() - current.started) / 1000);
        updateSpeaking();
      }, 1000);
      current.timeout = setTimeout(stopRecording, 20000);
      updateSpeaking();
      startRecognition(current);
    } catch (error) {
      if (token !== captureToken) return;
      cancelCapture();
      speech.status = 'idle';
      speech.error = error.name === 'NotAllowedError' ? label('Microphone permission was denied. You can retry or skip this sentence.', 'Chưa được cấp quyền micro. Bạn có thể thử lại hoặc bỏ qua câu.') : label('Microphone unavailable. Check the device and try again.', 'Chưa dùng được micro. Kiểm tra thiết bị rồi thử lại.');
      updateSpeaking();
    }
  }

  function finishSpeaking(accepted, method) {
    if (method !== 'skipped' && (!speech.clip || ['recording', 'requesting', 'stopping'].includes(speech.status))) return;
    if (method === 'recognition' && !speech.recognised) return;
    if (!recordSpeakingResult(session, accepted, method, speech.transcript)) return;
    cleanUp();
    session.index++;
    if (session.index === 6) renderResults();
    else renderSpeaking();
  }

  function renderResults() {
    cleanUp();
    const result = sessionResult(session);
    const summary = speakingSummary(session);
    stage.innerHTML = `${header()}<div class="ce-results"><h3>${bi('Practice complete', 'Hoàn thành bài luyện')}</h3><p class="ce-result-total">6/6</p>
      ${mode === 'speaking' ? `<dl class="ce-result-stats"><div><dt>${bi('Sentence recognised', 'Nhận dạng đúng câu')}</dt><dd>${summary.recognised}</dd></div><div><dt>${bi('Self marked correct', 'Tự đánh giá đạt')}</dt><dd>${summary.selfPassed}</dd></div><div><dt>${bi('Needs practice', 'Cần luyện thêm')}</dt><dd>${summary.needsPractice}</dd></div><div><dt>${bi('Skipped', 'Bỏ qua')}</dt><dd>${summary.skipped}</dd></div></dl>` : `<p>${bi(`${result.correct}/6 pairs without errors`, `${result.correct}/6 cặp không nhầm`)}</p>`}
      <button type="button" class="button primary" data-ce-action="new">${icons.RotateCcw}${bi('New test', 'Bài mới')}</button></div>
      <h4>${bi('Sentence review', 'Ôn lại mẫu câu')}</h4><div class="ce-review">${session.words.map(sentence => `<div>${bi(sentence.word, sentence.meaning)}<button type="button" class="ce-icon-button" data-ce-action="review" data-ce-id="${sentence.id}" aria-label="${escape(label('Play', 'Nghe') + ': ' + sentence.word)}" title="${escape(label('Play', 'Nghe'))}">${icons.Volume2}</button></div>`).join('')}</div>`;
  }

  topic.addEventListener('change', start);
  root.querySelectorAll('[name="classroom-mode"]').forEach(input => input.addEventListener('change', () => { mode = input.value; start(); }));
  root.addEventListener('click', async event => {
    const pair = event.target.closest('[data-ce-side]');
    if (pair && !pair.disabled) {
      const {ceSide: side, ceId: id} = pair.dataset;
      const current = session;
      session.selected[side] = id;
      updatePairs();
      if (mode === 'audio' && side === 'left') {
        const sentence = session.words.find(sentence => sentence.id === id);
        const played = await playSentence(sentence, pair);
        if (!played || session !== current) return;
        session.heard.add(id);
      }
      checkPair();
      return;
    }
    const button = event.target.closest('[data-ce-action]');
    if (!button || button.disabled) return;
    switch (button.dataset.ceAction) {
      case 'new': start(); break;
      case 'model': await playSentence(session.words[session.index], button); break;
      case 'review': await playSentence(session.words.find(sentence => sentence.id === button.dataset.ceId), button); break;
      case 'record':
        if (speech.status === 'requesting') { cancelCapture(); speech.status = 'idle'; updateSpeaking(); }
        else if (speech.status === 'recording') stopRecording();
        else await startRecording();
        break;
      case 'self-pass': finishSpeaking(true, 'self'); break;
      case 'self-retry': finishSpeaking(false, 'self'); break;
      case 'recognised': finishSpeaking(true, 'recognition'); break;
      case 'skip': finishSpeaking(false, 'skipped'); break;
    }
  });
  document.addEventListener('module2-tabchange', event => {
    if (event.detail.key === 'test') return;
    stopAudio();
    cancelCapture();
    disposeRecording();
    if (mode === 'speaking' && session.index < 6) { speech.status = 'idle'; speech.clip = false; renderSpeaking(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopAudio(); cancelCapture(); if (mode === 'speaking') { speech.status = 'idle'; updateSpeaking(); } } });
  window.addEventListener('pagehide', cleanUp);
  start();
}
