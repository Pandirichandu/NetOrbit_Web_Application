const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.resolve(__dirname, '../../keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

fs.writeFileSync(path.join(keysDir, 'jwt-private.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'jwt-public.pem'), publicKey);

console.log('RS256 JWT Keys successfully generated:');
console.log(' - Private:', path.join(keysDir, 'jwt-private.pem'));
console.log(' - Public:', path.join(keysDir, 'jwt-public.pem'));
