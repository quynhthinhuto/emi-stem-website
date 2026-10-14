import {icons} from './module-control-icons.js?v=68';

const tabs = [...document.querySelectorAll('[data-module2-tab]')];
const panels = [...document.querySelectorAll('[data-module2-panel]')];

document.querySelectorAll('[data-module2-icon]').forEach(element => {
  element.innerHTML = icons[element.dataset.module2Icon];
});

function selectTab(key, {focus = false, updateHistory = false} = {}) {
  const selected = tabs.find(tab => tab.dataset.module2Tab === key) || tabs[0];
  if (!selected) return;
  const selectedKey = selected.dataset.module2Tab;
  tabs.forEach(tab => {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach(panel => {
    panel.hidden = panel.dataset.module2Panel !== selectedKey;
    if (panel.hidden) panel.querySelectorAll('video, audio').forEach(media => media.pause());
  });
  if (focus) selected.focus({preventScroll: true});
  if (updateHistory && location.hash !== `#${selectedKey}`) {
    history.pushState(null, '', `#${selectedKey}`);
  }
  document.dispatchEvent(new CustomEvent('module2-tabchange', {detail: {key: selectedKey}}));
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab.dataset.module2Tab, {updateHistory: true}));
  tab.addEventListener('keydown', event => {
    const target = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    selectTab(tabs[target].dataset.module2Tab, {focus: true, updateHistory: true});
  });
});

function syncHash() {
  selectTab(location.hash.slice(1));
}

window.addEventListener('hashchange', syncHash);
syncHash();
