import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {sentences} from '../public/classroom-sentences.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/assets/classroom-english/audio');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'classroom-speech-'));
fs.mkdirSync(output, {recursive: true});
try {
  for (const sentence of sentences) {
    const wav = path.join(temp, `${sentence.id}.aiff`);
    const destination = path.join(output, sentence.audio);
    for (const [command, args] of [
      ['/usr/bin/say', ['-v', 'Samantha', '-r', '145', '-o', wav, sentence.word]],
      ['/usr/bin/afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '64000', wav, destination]],
    ]) {
      const result = spawnSync(command, args, {encoding: 'utf8'});
      if (result.status !== 0) throw new Error(`${sentence.id}: ${result.stderr || result.error}`);
    }
    if (fs.statSync(destination).size < 1000) throw new Error(`Empty audio: ${sentence.id}`);
    console.log(`${sentence.id}: ${sentence.word}`);
  }
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
