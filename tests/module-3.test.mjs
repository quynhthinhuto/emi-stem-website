import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

test('Module 3 Video uses the uploaded file with accessible native controls', () => {
  const html = fs.readFileSync(new URL('../public/modules/module-3-video.html', import.meta.url), 'utf8');
  const video = html.match(/<video\b[\s\S]*?<\/video>/)?.[0];
  assert(video);
  assert.match(video, /\bcontrols\s/);
  assert.match(video, /\bplaysinline\s/);
  assert.match(video, /preload="metadata"/);
  assert.match(video, /aria-label="Module 3 classroom management video/);
  assert.match(video, /poster="\.\.\/assets\/videos\/module-3-instruction-20261012-poster\.jpg"/);
  assert.match(video, /<source src="\.\.\/assets\/videos\/module-3-instruction-20261012\.mp4" type="video\/mp4">/);
  assert(!/\b(?:autoplay|muted)\b/.test(video));
  assert(!html.includes('Video has not been added yet.'));
  assert(html.includes('module-3-video.css?v=20261012'));
  const parent = fs.readFileSync(new URL('../public/modules/module-3.html', import.meta.url), 'utf8');
  assert(parent.includes('href="module-3-video.html"'));
  assert(parent.includes('href="module-3-instruction.html"'));
});

test('Module 3 hosted video preserves original bytes and has a real JPEG poster', () => {
  const bytes = fs.readFileSync(new URL('../public/assets/videos/module-3-instruction-20261012.mp4', import.meta.url));
  assert.equal(bytes.length, 9242046);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), 'f71598e044f00342b9f7410d3b93b48ff03416cf85ac6c277ef82ec38f762b9f');
  assert.equal(bytes.subarray(4, 8).toString(), 'ftyp');
  assert(bytes.length < 25 * 1024 * 1024);
  const poster = fs.readFileSync(new URL('../public/assets/videos/module-3-instruction-20261012-poster.jpg', import.meta.url));
  assert.equal(poster.subarray(0, 3).toString('hex'), 'ffd8ff');
});
