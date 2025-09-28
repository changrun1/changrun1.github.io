// Auto-generated placeholder for embedded obfuscated token.
// Run: node scripts/obfuscate-token.mjs <PAT> ./scripts/obf.json
// Then copy the JSON object content and replace OBF_DATA below.
// WARNING: Obfuscation != Security. The token can be recovered by anyone with bundle access.

const OBF_DATA = {"v":1,"k":"98580afbeac2541331e144c829bd67fe2ad926e5a766db3168c5e6d44c92db04","s":[{"d":"6G9wmamkGklkqQf9cfdQkXi/H43P","n":"b6d7","r":1},{"d":"ODkwMg==","n":"3558","r":0},{"d":"TL4=","n":"ae92","r":1},{"d":"pNvzFSU=","n":"774f","r":1},{"d":"ZDIxYw==","n":"1eab","r":0},{"d":"ZTQwNWE0Mw==","n":"0ef3","r":0},{"d":"G0o=","n":"251a","r":1},{"d":"RGamdoEZ1C2QSO9piMBfnGgjmpKNDvWZ","n":"97dc","r":1},{"d":"AIUnul/oBqxI6neI","n":"d4de","r":1},{"d":"kSW8","n":"6e1f","r":1},{"d":"I6Fd1RKcdQ==","n":"4bfa","r":1},{"d":"YTJmZWUwMzM=","n":"0bdc","r":0},{"d":"as4Ku3/gZ9HCFpV2AK20oBw=","n":"b99b","r":1}],"o":[0,2,3,6,7,8,9,10,12],"m":"This is obfuscated; NOT secure."}; // embedded obfuscated token

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
