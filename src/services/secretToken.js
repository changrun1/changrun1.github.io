// Auto-generated placeholder for embedded obfuscated token.
// Run: node scripts/obfuscate-token.mjs <PAT> ./scripts/obf.json
// Then copy the JSON object content and replace OBF_DATA below.
// WARNING: Obfuscation != Security. The token can be recovered by anyone with bundle access.

const OBF_DATA = null; // <-- paste object produced by obfuscate script here

let _cached;

function decode() {
  if (_cached) return _cached;
  if (!OBF_DATA) {
    throw new Error('No obfuscated token data embedded. Please run obfuscate script and paste JSON.');
  }
  const { v, k, s, o } = OBF_DATA;
  if (v !== 1) throw new Error('Unsupported obfuscation version');
  const key = Buffer.from(k, 'hex');
  // Reconstruct real slices in original order using index map o
  const realSlices = [];
  for (const sliceIndex of o) {
    const entry = s[sliceIndex];
    if (!entry || entry.r !== 1) continue;
    const buf = Buffer.from(entry.d, 'base64');
    for (let i = 0; i < buf.length; i++) {
      buf[i] = buf[i] ^ key[(i + sliceIndex) % key.length];
    }
    realSlices.push(buf.toString('utf8'));
  }
  _cached = realSlices.join('');
  return _cached;
}

export function getEmbeddedToken() {
  return decode();
}
