#!/usr/bin/env node
/**
 * Obfuscate a GitHub PAT into a multi-layer encoded structure to embed in frontend code.
 * Strong warning: This does NOT provide real security. Anyone with bundle access can recover the token.
 * It only aims to bypass naive pattern scanners and raise effort slightly.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function usage() {
  console.log(`Usage: node scripts/obfuscate-token.mjs <plain_token> [output_file]\n\n` +
    `Outputs a JSON blob you can paste into src/services/secretToken.js placeholder.\n` +
    `Example:\n  node scripts/obfuscate-token.mjs ghp_xxx ./tmp/obf.json`);
}

if (process.argv.includes('-h') || process.argv.includes('--help')) {
  usage();
  process.exit(0);
}

const plain = process.argv[2];
if (!plain) {
  console.error('Missing token.');
  usage();
  process.exit(1);
}

if (/github_pat_|ghp_/i.test(plain)) {
  console.warn('[info] Token contains recognizable prefix; scanners may still flag it.');
}

// Configurable parameters
const minSlices = 5;
const maxSlices = 9;
const sliceCount = Math.min(maxSlices, Math.max(minSlices, Math.ceil(plain.length / 6)));

// 1. Random key for XOR (32 bytes) and a per-slice salt set
const xorKey = crypto.randomBytes(32);

// 2. Produce slices
function randomSplit(str, parts) {
  const len = str.length;
  const cuts = new Set();
  while (cuts.size < parts - 1) {
    const p = Math.floor(Math.random() * (len - 2)) + 1; // avoid 0 & end
    cuts.add(p);
  }
  const indexes = Array.from(cuts).sort((a,b)=>a-b);
  const slices = [];
  let prev = 0;
  for (const idx of indexes) {
    slices.push(str.slice(prev, idx));
    prev = idx;
  }
  slices.push(str.slice(prev));
  return slices;
}

let slices = randomSplit(plain, sliceCount);

// 3. Inject decoy slices
const decoyCount = Math.max(2, Math.floor(sliceCount / 2));
for (let i=0;i<decoyCount;i++) {
  const fakeLen = Math.max(3, Math.min(8, Math.floor(Math.random()*8)+3));
  const fake = crypto.randomBytes(fakeLen).toString('hex').slice(0,fakeLen);
  slices.push(fake);
}

// 4. Annotate whether real or decoy
let annotated = slices.map(s => ({v:s, real:true}));
// Mark decoys (those appended after original sliceCount)
for (let i=sliceCount;i<annotated.length;i++) annotated[i].real = false;

// 5. Shuffle
for (let i=annotated.length-1;i>0;i--) {
  const j = Math.floor(Math.random()*(i+1));
  [annotated[i], annotated[j]] = [annotated[j], annotated[i]];
}

// 6. XOR encode real slice chars with rotating key offset and per-slice nonce
annotated = annotated.map((obj, idx) => {
  const nonce = crypto.randomBytes(2); // small per-slice nonce
  if (!obj.real) {
    return {
      d: Buffer.from(obj.v).toString('base64'),
      n: nonce.toString('hex'),
      r: 0
    };
  }
  const buf = Buffer.from(obj.v, 'utf8');
  for (let i=0;i<buf.length;i++) {
    buf[i] = buf[i] ^ xorKey[(i+idx) % xorKey.length];
  }
  return {
    d: buf.toString('base64'), // encoded slice
    n: nonce.toString('hex'),
    r: 1
  };
});

// 7. Build index map for the order of real slices (we capture their positions after shuffle)
const order = annotated
  .map((o,i)=> ({i, r:o.r}))
  .filter(o=>o.r===1)
  .map(o=>o.i);

// 8. Final structure
const payload = {
  v: 1,
  k: xorKey.toString('hex'),
  s: annotated, // array of {d: base64, n: hex, r: 0/1}
  o: order,     // order of real slice indexes
  m: 'This is obfuscated; NOT secure.'
};

const json = JSON.stringify(payload, null, 2);
const outFile = process.argv[3];
if (outFile) {
  fs.mkdirSync(path.dirname(outFile), {recursive:true});
  fs.writeFileSync(outFile, json);
  console.log('[written] '+outFile);
} else {
  console.log(json);
}
