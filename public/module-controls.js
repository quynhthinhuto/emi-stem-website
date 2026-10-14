import {icons} from './module-control-icons.js?v=68';

const subjects = {
  maths: {icon:'Calculator', accent:'#2455cf'},
  physics: {icon:'Atom', accent:'#08727a'},
  chemistry: {icon:'FlaskConical', accent:'#b83657'},
  biology: {icon:'Sprout', accent:'#28754b'},
  engineering: {icon:'DraftingCompass', accent:'#8b5b16'},
  it: {icon:'Monitor', accent:'#596177'},
};

function iconFor(control) {
  if (control.hasAttribute('data-open-modules')) return 'LayoutGrid';
  if (control.hasAttribute('download')) return 'Download';
  const label = control.textContent.trim();
  if (/^(Back|Previous)\b/i.test(label)) return 'ArrowLeft';
  if (/^Next\b/i.test(label)) return 'ArrowRight';
  const path = new URL(control.href, location.href).pathname.replace(/\.html$/, '');
  if (/-(videos?|video-resources)$/.test(path)) return 'Clapperboard';
  if (/-pedagogies$/.test(path)) return 'GraduationCap';
  if (/-policies$/.test(path)) return 'ShieldCheck';
  if (/-vocabulary$/.test(path)) return 'Languages';
  if (/-(lesson-plans|template)$/.test(path)) return 'FilePenLine';
  if (/-practice$/.test(path)) return 'ListChecks';
  if (/-(instruction|example|strategies)$/.test(path)) return 'FileText';
  if (/-(books|curriculum)$/.test(path)) return 'BookOpen';
  return 'LayoutGrid';
}

function iconElement(name, className) {
  const element = document.createElement('span');
  element.className = className;
  element.setAttribute('aria-hidden', 'true');
  element.innerHTML = icons[name];
  return element;
}

const selector = '.page-actions .button, .subject-button-grid .subject-button, .subject-material-buttons .subject-button, .module-page-button, .local-nav-links a';
document.querySelectorAll(selector).forEach(control => {
  if (control.classList.contains('module-control')) return;
  const isSubject = control.matches('.subject-button-grid .subject-button');
  const subjectKey = isSubject ? new URL(control.href).pathname.match(/lesson-plan-(maths|physics|chemistry|biology|engineering|it)(?:\.html)?$/)?.[1] : undefined;
  const subject = subjects[subjectKey];
  const iconName = subject?.icon || iconFor(control);
  const label = document.createElement('span');
  label.className = 'module-control-label';
  label.append(...control.childNodes);
  const icon = iconElement(iconName, 'module-control-icon');
  control.replaceChildren(icon, label);
  control.classList.add('module-control');
  if (subject) control.style.setProperty('--control-accent', subject.accent);
  if (control.matches('.subject-button, .module-page-button')) {
    control.append(iconElement('ArrowRight', 'module-control-arrow'));
  }
});

document.querySelectorAll('.local-nav-links').forEach(list => {
  const current = list.querySelector('[aria-current="page"]');
  if (!current) return;
  list.scrollLeft += current.getBoundingClientRect().left - list.getBoundingClientRect().left - (list.clientWidth - current.clientWidth) / 2;
});
