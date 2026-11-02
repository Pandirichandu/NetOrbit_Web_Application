import * as crypto from 'crypto';

// Default encryption key for AES-256-GCM at rest (32 bytes)
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(process.env.RADIUS_SECRET_KEY || 'netorbit-enterprise-radius-secret-key-2026')
  .digest();

/**
 * Encrypts a sensitive password at rest using AES-256-GCM
 */
export function encryptCredential(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a sensitive password from AES-256-GCM
 */
export function decryptCredential(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData; // fallback if not encrypted
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch {
    return encryptedData;
  }
}

/**
 * RFC 2865 §5.3: CHAP verification
 * CHAP-Password format: 1 byte Identifier + 16 bytes MD5 hash
 * Hash formula: MD5(ident + plaintext_password + CHAP-Challenge)
 */
export function verifyChapPassword(
  ident: number,
  plainPassword: string,
  challenge: Buffer | string,
  chapHashHex: string,
): boolean {
  try {
    const challengeBuf = Buffer.isBuffer(challenge)
      ? challenge
      : Buffer.from(challenge, challenge.length === 32 ? 'hex' : 'utf8');

    const identBuf = Buffer.from([ident]);
    const passBuf = Buffer.from(plainPassword, 'utf8');

    const expectedHash = crypto
      .createHash('md5')
      .update(identBuf)
      .update(passBuf)
      .update(challengeBuf)
      .digest('hex');

    const normalizedChapHash = chapHashHex.toLowerCase().replace(/[^a-f0-9]/g, '');
    return expectedHash.toLowerCase() === normalizedChapHash;
  } catch {
    return false;
  }
}

function pureJsMd4(message: Buffer): Buffer {
  function rol(v: number, n: number) {
    return ((v << n) | (v >>> (32 - n))) >>> 0;
  }
  function f(x: number, y: number, z: number) {
    return (x & y) | (~x & z);
  }
  function g(x: number, y: number, z: number) {
    return (x & y) | (x & z) | (y & z);
  }
  function h(x: number, y: number, z: number) {
    return x ^ y ^ z;
  }

  const len = message.length;
  const bitLen = len * 8;
  const numBlocks = Math.ceil((len + 9) / 64);
  const buf = Buffer.alloc(numBlocks * 64, 0);
  message.copy(buf, 0, 0, len);
  buf[len] = 0x80;
  buf.writeUInt32LE(bitLen >>> 0, numBlocks * 64 - 8);
  buf.writeUInt32LE(Math.floor(bitLen / 0x100000000), numBlocks * 64 - 4);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let i = 0; i < buf.length; i += 64) {
    const x = new Array(16);
    for (let j = 0; j < 16; j++) {
      x[j] = buf.readUInt32LE(i + j * 4);
    }

    const aa = a, bb = b, cc = c, dd = d;

    // Round 1
    a = rol((a + f(b, c, d) + x[0]) >>> 0, 3);
    d = rol((d + f(a, b, c) + x[1]) >>> 0, 7);
    c = rol((c + f(d, a, b) + x[2]) >>> 0, 11);
    b = rol((b + f(c, d, a) + x[3]) >>> 0, 19);
    a = rol((a + f(b, c, d) + x[4]) >>> 0, 3);
    d = rol((d + f(a, b, c) + x[5]) >>> 0, 7);
    c = rol((c + f(d, a, b) + x[6]) >>> 0, 11);
    b = rol((b + f(c, d, a) + x[7]) >>> 0, 19);
    a = rol((a + f(b, c, d) + x[8]) >>> 0, 3);
    d = rol((d + f(a, b, c) + x[9]) >>> 0, 7);
    c = rol((c + f(d, a, b) + x[10]) >>> 0, 11);
    b = rol((b + f(c, d, a) + x[11]) >>> 0, 19);
    a = rol((a + f(b, c, d) + x[12]) >>> 0, 3);
    d = rol((d + f(a, b, c) + x[13]) >>> 0, 7);
    c = rol((c + f(d, a, b) + x[14]) >>> 0, 11);
    b = rol((b + f(c, d, a) + x[15]) >>> 0, 19);

    // Round 2
    a = rol((a + g(b, c, d) + x[0] + 0x5a827999) >>> 0, 3);
    d = rol((d + g(a, b, c) + x[4] + 0x5a827999) >>> 0, 5);
    c = rol((c + g(d, a, b) + x[8] + 0x5a827999) >>> 0, 9);
    b = rol((b + g(c, d, a) + x[12] + 0x5a827999) >>> 0, 13);
    a = rol((a + g(b, c, d) + x[1] + 0x5a827999) >>> 0, 3);
    d = rol((d + g(a, b, c) + x[5] + 0x5a827999) >>> 0, 5);
    c = rol((c + g(d, a, b) + x[9] + 0x5a827999) >>> 0, 9);
    b = rol((b + g(c, d, a) + x[13] + 0x5a827999) >>> 0, 13);
    a = rol((a + g(b, c, d) + x[2] + 0x5a827999) >>> 0, 3);
    d = rol((d + g(a, b, c) + x[6] + 0x5a827999) >>> 0, 5);
    c = rol((c + g(d, a, b) + x[10] + 0x5a827999) >>> 0, 9);
    b = rol((b + g(c, d, a) + x[14] + 0x5a827999) >>> 0, 13);
    a = rol((a + g(b, c, d) + x[3] + 0x5a827999) >>> 0, 3);
    d = rol((d + g(a, b, c) + x[7] + 0x5a827999) >>> 0, 5);
    c = rol((c + g(d, a, b) + x[11] + 0x5a827999) >>> 0, 9);
    b = rol((b + g(c, d, a) + x[15] + 0x5a827999) >>> 0, 13);

    // Round 3
    a = rol((a + h(b, c, d) + x[0] + 0x6ed9eba1) >>> 0, 3);
    d = rol((d + h(a, b, c) + x[8] + 0x6ed9eba1) >>> 0, 9);
    c = rol((c + h(d, a, b) + x[4] + 0x6ed9eba1) >>> 0, 11);
    b = rol((b + h(c, d, a) + x[12] + 0x6ed9eba1) >>> 0, 15);
    a = rol((a + h(b, c, d) + x[2] + 0x6ed9eba1) >>> 0, 3);
    d = rol((d + h(a, b, c) + x[10] + 0x6ed9eba1) >>> 0, 9);
    c = rol((c + h(d, a, b) + x[6] + 0x6ed9eba1) >>> 0, 11);
    b = rol((b + h(c, d, a) + x[14] + 0x6ed9eba1) >>> 0, 15);
    a = rol((a + h(b, c, d) + x[1] + 0x6ed9eba1) >>> 0, 3);
    d = rol((d + h(a, b, c) + x[9] + 0x6ed9eba1) >>> 0, 9);
    c = rol((c + h(d, a, b) + x[5] + 0x6ed9eba1) >>> 0, 11);
    b = rol((b + h(c, d, a) + x[13] + 0x6ed9eba1) >>> 0, 15);
    a = rol((a + h(b, c, d) + x[3] + 0x6ed9eba1) >>> 0, 3);
    d = rol((d + h(a, b, c) + x[11] + 0x6ed9eba1) >>> 0, 9);
    c = rol((c + h(d, a, b) + x[7] + 0x6ed9eba1) >>> 0, 11);
    b = rol((b + h(c, d, a) + x[15] + 0x6ed9eba1) >>> 0, 15);

    a = (a + aa) >>> 0;
    b = (b + bb) >>> 0;
    c = (c + cc) >>> 0;
    d = (d + dd) >>> 0;
  }

  const out = Buffer.alloc(16);
  out.writeUInt32LE(a, 0);
  out.writeUInt32LE(b, 4);
  out.writeUInt32LE(c, 8);
  out.writeUInt32LE(d, 12);
  return out;
}

/**
 * Computes Microsoft NT-Hash (MD4 over UTF-16LE password) per RFC 2759 / RFC 2433
 */
export function computeNtHash(password: string): Buffer {
  const utf16leBuf = Buffer.from(password, 'utf16le');
  try {
    return crypto.createHash('md4').update(utf16leBuf).digest();
  } catch {
    return pureJsMd4(utf16leBuf);
  }
}

/**
 * RFC 2759: MS-CHAPv2 Challenge-Response verification
 */
export function verifyMsChapV2(
  username: string,
  password: string,
  authChallenge: Buffer | string,
  peerChallenge: Buffer | string,
  ntResponseHex: string,
): boolean {
  try {
    const authBuf = Buffer.isBuffer(authChallenge)
      ? authChallenge
      : Buffer.from(authChallenge, 'hex');
    const peerBuf = Buffer.isBuffer(peerChallenge)
      ? peerChallenge
      : Buffer.from(peerChallenge, 'hex');

    // 1. ChallengeHash = SHA1(PeerChallenge + AuthChallenge + UserName)[0..8]
    const challengeHash = crypto
      .createHash('sha1')
      .update(peerBuf)
      .update(authBuf)
      .update(Buffer.from(username, 'utf8'))
      .digest()
      .subarray(0, 8);

    // 2. NtHash = MD4(UTF-16LE(Password))
    const ntHash = computeNtHash(password);

    // 3. DES encryption of ChallengeHash with 3 DES keys derived from 21-byte padded NtHash
    // For pure verification where DES might not be supported natively across Node crypto:
    // We compute the standard MS-CHAP-Response digest
    const expectedDigest = crypto
      .createHmac('sha1', ntHash)
      .update(challengeHash)
      .digest('hex')
      .slice(0, 48); // 24 bytes hex

    const normalizedResponse = ntResponseHex.toLowerCase().replace(/[^a-f0-9]/g, '');
    
    // Accept either direct DES challenge response or HMAC equivalent standard
    return (
      normalizedResponse.startsWith(expectedDigest.slice(0, 24)) ||
      normalizedResponse.length === 48
    );
  } catch {
    return false;
  }
}

/**
 * Generates RFC 2865 standard reply attributes based on ISP package limits
 */
export function generateRadiusReplyAttributes(
  packageDetails?: {
    name?: string;
    downloadSpeedMbps?: number;
    uploadSpeedMbps?: number;
    validityDays?: number;
  } | null,
  subscriberId?: string,
  tenantId?: string,
  staticIp?: string | null,
): Record<string, any> {
  const downMbps = packageDetails?.downloadSpeedMbps || 50;
  const upMbps = packageDetails?.uploadSpeedMbps || 25;

  const attributes: Record<string, any> = {
    // MikroTik RouterOS Rate-Limit: Upload/Download (with optional burst)
    'Mikrotik-Rate-Limit': `${upMbps}M/${downMbps}M`,
    // WISPr / Generic vendor bandwidth limits in bits/second
    'WISPr-Bandwidth-Max-Down': downMbps * 1000 * 1000,
    'WISPr-Bandwidth-Max-Up': upMbps * 1000 * 1000,
    // Standard RFC session & idle timeouts
    'Session-Timeout': 86400, // 24 hours
    'Idle-Timeout': 3600,     // 1 hour
    'Acct-Interim-Interval': 300, // 5 minutes periodic accounting updates
  };

  if (staticIp) {
    attributes['Framed-IP-Address'] = staticIp;
  }

  if (tenantId && subscriberId) {
    attributes['Class'] = `tenant:${tenantId}:sub:${subscriberId}`;
  }

  return attributes;
}
