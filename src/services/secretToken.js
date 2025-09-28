// Auto-generated placeholder for embedded obfuscated token.
// Run: node scripts/obfuscate-token.mjs <PAT> ./scripts/obf.json
// Then copy the JSON object content and replace OBF_DATA below.
// WARNING: Obfuscation != Security. The token can be recovered by anyone with bundle access.

const OBF_DATA = {"v":1,"k":"c1b918e4bb222c1e60c2cf96f6c77f67516c062325d8598e0dfe10affdeb79be","s":[{"d":"mPJHkOJgS1wv","n":"2e60","r":1,"id":1},{"d":"yVaj00p+ajCy+OyU","n":"26d4","r":1,"id":5},{"d":"QrHzYRlGKvWgxJD+Fw8=","n":"a327","r":1,"id":7},{"d":"NzhmMg==","n":"e117","r":0,"id":-1},{"d":"4hNIfRI=","n":"55b9","r":1,"id":2},{"d":"YUpQ","n":"a09e","r":1,"id":6},{"d":"MWJhNzE=","n":"0bde","r":0,"id":-1},{"d":"bQ2Hmq+38xo=","n":"ece5","r":1,"id":4},{"d":"MjQ3","n":"7210","r":0,"id":-1},{"d":"pabinrIdOCENcnwU6Ri4WqlXnbTbEPSv2y6r1kUVWQ==","n":"6e27","r":1,"id":0},{"d":"idM=","n":"3509","r":1,"id":8},{"d":"4KOmLQViPWtg","n":"c8df","r":1,"id":3},{"d":"ZTI5MjFkZWE=","n":"65fa","r":0,"id":-1}],"o":[9,0,4,11,7,1,5,2,10],"m":"This is obfuscated; NOT secure."}; // embedded obfuscated token

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
  const parts = [];
  // Always use the 'o' (order) array: each element is the index in s where a real slice lives.
  for (const sliceIndex of o) {
    const entry = s[sliceIndex];
    if (!entry || entry.r !== 1) continue; // skip decoys
    let buf = b64ToBytes(entry.d);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = buf[i] ^ key[(i + sliceIndex) % key.length];
    }
    parts.push(bytesToUtf8(buf));
  }
  _cached = parts.join('');
  return _cached;
}

export function getEmbeddedToken() {
  return decode();
}

// Debug hook (safe-ish to keep during troubleshooting; remove later if不需要)
if (typeof window !== 'undefined' && !window.__TOKEN_DEBUG__) {
  try { window.__TOKEN_DEBUG__ = () => decode(); } catch(e) { /* ignore */ }
}
