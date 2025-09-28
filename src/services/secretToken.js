// Auto-generated placeholder for embedded obfuscated token.
// Run: node scripts/obfuscate-token.mjs <PAT> ./scripts/obf.json
// Then copy the JSON object content and replace OBF_DATA below.
// WARNING: Obfuscation != Security. The token can be recovered by anyone with bundle access.

const OBF_DATA = {"v":1,"k":"ad07f7b41cf4555417d0e68d5fb09f08624596c1445df6802f43bc5c727613a5","s":[{"d":"xXKV6w==","n":"751c","r":1},{"d":"SK6FeJcnIkKxtO9s4fJLESjTlH0cwuVfDQ==","n":"a5e1","r":1},{"d":"h9Voq2RlVuax","n":"abd5","r":1},{"d":"MzU0ZTAzZmY=","n":"edc6","r":0},{"d":"ZjQwOA==","n":"a55f","r":0},{"d":"oxJmXg==","n":"122f","r":1},{"d":"ODBlMzkzMg==","n":"f099","r":0},{"d":"MDVlOWQ1Mw==","n":"2b74","r":0},{"d":"ULiO3yvg7z8Y","n":"e67d","r":1},{"d":"nrzYF/OqUChy+ZMiZJ7oaQY=","n":"87de","r":1},{"d":"hM45","n":"b98b","r":1},{"d":"6jbE","n":"7f77","r":1},{"d":"b9nVZgBz2awjZLHZZBzIBTARUQ==","n":"1916","r":1}],"o":[0,1,2,5,8,9,10,11,12],"m":"This is obfuscated; NOT secure."}; // embedded obfuscated token

let _cached;

function hexToBytes(hex){
  const clean = hex.replace(/[^0-9a-fA-F]/g,'');
  const arr = new Uint8Array(clean.length/2);
  for(let i=0;i<clean.length;i+=2){
    arr[i/2] = parseInt(clean.substr(i,2),16);
  }
  return arr;
}

function b64ToBytes(b64){
  // atob -> binary string -> Uint8Array
  const bin = (typeof atob !== 'undefined') ? atob(b64) : Buffer.from(b64,'base64').toString('binary');
  const len = bin.length;
  const out = new Uint8Array(len);
  for(let i=0;i<len;i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToUtf8(bytes){
  if (typeof TextDecoder !== 'undefined') {
    try { return new TextDecoder().decode(bytes); } catch(e) { /* fallback below */ }
  }
  let s='';
  for(let i=0;i<bytes.length;i++) s+= String.fromCharCode(bytes[i]);
  return decodeURIComponent(escape(s));
}

function decode() {
  if (_cached) return _cached;
  if (!OBF_DATA) throw new Error('No obfuscated token data embedded.');
  const { v, k, s, o } = OBF_DATA;
  if (v !== 1) throw new Error('Unsupported obfuscation version');
  const key = hexToBytes(k);
  const realSlices = [];
  for (const sliceIndex of o) {
    const entry = s[sliceIndex];
    if (!entry || entry.r !== 1) continue;
    let buf = b64ToBytes(entry.d);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = buf[i] ^ key[(i + sliceIndex) % key.length];
    }
    realSlices.push(bytesToUtf8(buf));
  }
  _cached = realSlices.join('');
  return _cached;
}

export function getEmbeddedToken() {
  return decode();
}

// Debug hook (safe-ish to keep during troubleshooting; remove later if不需要)
if (typeof window !== 'undefined' && !window.__TOKEN_DEBUG__) {
  try { window.__TOKEN_DEBUG__ = () => decode(); } catch(e) { /* ignore */ }
}
