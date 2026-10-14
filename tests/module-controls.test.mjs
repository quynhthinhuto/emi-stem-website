import test from 'node:test';
import assert from 'node:assert/strict';
import {icons} from '../public/module-control-icons.js';

test('module controls use decorative Lucide icons with fixed dimensions', () => {
  for (const [name, markup] of Object.entries(icons)) {
    assert.match(markup, /^<svg\b/, name);
    assert.match(markup, /class="lucide /, name);
    assert.match(markup, /width="20" height="20"/, name);
    assert.match(markup, /viewBox="0 0 24 24"/, name);
    assert.match(markup, /aria-hidden="true" focusable="false"/, name);
    assert.match(markup, /<\/svg>$/, name);
  }
});

test('each STEM subject has a distinct icon available', () => {
  const subjectIcons = ['Calculator','Atom','FlaskConical','Sprout','DraftingCompass','Monitor'];
  assert.equal(new Set(subjectIcons.map(name => icons[name])).size, 6);
  for (const name of subjectIcons) assert(icons[name], name);
});
