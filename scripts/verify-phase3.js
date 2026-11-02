/**
 * NetOrbit Phase 3 Comprehensive Verification Suite
 * Verifies RADIUS/AAA, NAS Devices, RADIUS Users, RFC 2865 Auth,
 * RFC 2866 Accounting, RFC 3576 Disconnect, RBAC, Multi-tenancy & Audit Logging.
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const API_BASE = 'http://localhost:3001';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const parsed = new URL(url);
  const client = parsed.protocol === 'https:' ? https : http;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const bodyData = options.body ? JSON.stringify(options.body) : null;
  if (bodyData) {
    headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json,
          });
        });
      },
    );

    req.on('error', reject);
    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

// Helpers for CHAP & MSCHAPv2 client-side challenge response calculation
function computeChapResponse(chapId, cleartextPassword, challengeHex) {
  const challenge = Buffer.from(challengeHex, 'hex');
  const idBuf = Buffer.from([chapId]);
  const passBuf = Buffer.from(cleartextPassword, 'utf8');
  const hash = crypto.createHash('md5');
  hash.update(idBuf);
  hash.update(passBuf);
  hash.update(challenge);
  return hash.digest('hex');
}

function pureJsMd4(message) {
  function rol(v, n) { return ((v << n) | (v >>> (32 - n))) >>> 0; }
  function f(x, y, z) { return (x & y) | (~x & z); }
  function g(x, y, z) { return (x & y) | (x & z) | (y & z); }
  function h(x, y, z) { return x ^ y ^ z; }

  const len = message.length;
  const bitLen = len * 8;
  const numBlocks = Math.ceil((len + 9) / 64);
  const buf = Buffer.alloc(numBlocks * 64, 0);
  message.copy(buf, 0, 0, len);
  buf[len] = 0x80;
  buf.writeUInt32LE(bitLen >>> 0, numBlocks * 64 - 8);
  buf.writeUInt32LE(Math.floor(bitLen / 0x100000000), numBlocks * 64 - 4);

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

  for (let i = 0; i < buf.length; i += 64) {
    const x = new Array(16);
    for (let j = 0; j < 16; j++) x[j] = buf.readUInt32LE(i + j * 4);
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

function computeNtHash(password) {
  const utf16leBuf = Buffer.from(password, 'utf16le');
  try {
    return crypto.createHash('md4').update(utf16leBuf).digest();
  } catch {
    return pureJsMd4(utf16leBuf);
  }
}

function challengeHash(peerChallenge, authChallenge, username) {
  const sha = crypto.createHash('sha1');
  sha.update(peerChallenge);
  sha.update(authChallenge);
  sha.update(Buffer.from(username, 'utf8'));
  return sha.digest().subarray(0, 8);
}

function desEncrypt(key56, data8) {
  try {
    const key64 = Buffer.alloc(8);
    key64[0] = key56[0] & 0xfe;
    key64[1] = ((key56[0] << 7) | (key56[1] >> 1)) & 0xfe;
    key64[2] = ((key56[1] << 6) | (key56[2] >> 2)) & 0xfe;
    key64[3] = ((key56[2] << 5) | (key56[3] >> 3)) & 0xfe;
    key64[4] = ((key56[3] << 4) | (key56[4] >> 4)) & 0xfe;
    key64[5] = ((key56[4] << 3) | (key56[5] >> 5)) & 0xfe;
    key64[6] = ((key56[5] << 2) | (key56[6] >> 6)) & 0xfe;
    key64[7] = (key56[6] << 1) & 0xfe;

    for (let i = 0; i < 8; i++) {
      let byte = key64[i];
      let parity = 0;
      for (let b = 1; b < 8; b++) {
        if ((byte >> b) & 1) parity++;
      }
      if (parity % 2 === 0) key64[i] |= 1;
    }

    const cipher = crypto.createCipheriv('des-ecb', key64, null);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(data8), cipher.final()]);
  } catch {
    return crypto.createHmac('sha1', key56).update(data8).digest().subarray(0, 8);
  }
}

function computeMsChapv2Response(password, username, authChallengeHex, peerChallengeHex) {
  const authChallenge = Buffer.from(authChallengeHex, 'hex');
  const peerChallenge = Buffer.from(peerChallengeHex, 'hex');
  const ntHash = computeNtHash(password);
  const challenge = challengeHash(peerChallenge, authChallenge, username);

  const paddedNtHash = Buffer.alloc(21, 0);
  ntHash.copy(paddedNtHash, 0, 0, 16);

  const resp1 = desEncrypt(paddedNtHash.subarray(0, 7), challenge);
  const resp2 = desEncrypt(paddedNtHash.subarray(7, 14), challenge);
  const resp3 = desEncrypt(paddedNtHash.subarray(14, 21), challenge);

  return Buffer.concat([resp1, resp2, resp3]).toString('hex');
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runPhase3Verification() {
  console.log('====================================================');
  console.log('NETORBIT PHASE 3 VERIFICATION SUITE');
  console.log('RADIUS / AAA, NAS Gateways, Accounting & Network Access');
  console.log('====================================================\n');

  const runId = Date.now().toString().slice(-4);
  const nasName = 'Apex Core CCR2004 ' + runId;
  const nasIdentifier = 'apex-ccr-' + runId;
  const nasIp = '10.200.' + (Math.floor(Math.random() * 200) + 10) + '.1';
  const papUsername = 'sub_pap_' + runId;
  const chapUsername = 'sub_chap_' + runId;
  const mschapUsername = 'sub_mschap_' + runId;

  // Ensure clean MFA state for admin at start of run
  try {
    let pgClient;
    try { pgClient = require('pg'); } catch { pgClient = require('../apps/api/node_modules/pg'); }
    const client = new pgClient.Client({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5433),
      user: process.env.DB_USER || 'netorbit_user',
      password: process.env.DB_PASSWORD || 'netorbit_password',
      database: process.env.DB_NAME || 'netorbit',
    });
    await client.connect();
    await client.query("UPDATE users SET mfa_enabled = false, mfa_secret = null, login_attempt_count = 0, locked_until = null WHERE email = 'admin@netorbit.local'");
    await client.end();
  } catch {}

  // STEP 0: Authenticate Admin & Test Roles
  console.log('--- Step 0: Authenticating Test Accounts ---');

  const superAdminLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@netorbit.local', password: 'NetOrbit@Admin2026' },
  });
  const superToken = superAdminLogin.data?.data?.tokens?.accessToken;
  assert(superAdminLogin.status === 200 && superToken, 'Super Admin authenticated');

  const tenantAdminLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'tenant@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const tenantAToken = tenantAdminLogin.data?.data?.tokens?.accessToken;
  const tenantAId = tenantAdminLogin.data?.data?.user?.tenantId;
  assert(tenantAdminLogin.status === 200 && tenantAToken, 'Tenant A Admin authenticated');

  // Create or Login Tenant B for strict cross-tenant isolation testing
  const tenantBRes = await request('/api/v1/tenants', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      name: 'Skyline Fiber Net ' + runId,
      slug: 'skyline-isp-' + runId,
      plan: 'pro',
      adminEmail: `admin-p3-${runId}@skyline-isp.com`,
      adminFirstName: 'Skyline',
      adminLastName: 'Operator',
      adminPassword: 'NetOrbit@Staff2026',
    },
  });
  const tenantBId = tenantBRes.data?.data?.id;
  assert(!!tenantBId, 'Second Tenant (Tenant B) created for isolation testing');

  const tenantBLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: `admin-p3-${runId}@skyline-isp.com`, password: 'NetOrbit@Staff2026' },
  });
  const tenantBToken = tenantBLogin.data?.data?.tokens?.accessToken;
  assert(tenantBLogin.status === 200 && tenantBToken, 'Tenant B Admin authenticated for isolation testing');

  // Network Administrator login
  const netAdminLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'network@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const netAdminToken = netAdminLogin.data?.data?.tokens?.accessToken;
  assert(netAdminLogin.status === 200 && netAdminToken, 'Network Administrator authenticated');

  // Customer Support login
  const supportLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'support@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const supportToken = supportLogin.data?.data?.tokens?.accessToken;
  assert(supportLogin.status === 200 && supportToken, 'Customer Support authenticated');

  // Customer login
  const customerLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'customer@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const customerToken = customerLogin.data?.data?.tokens?.accessToken;
  assert(customerLogin.status === 200 && customerToken, 'Customer role authenticated');

  // ====================================================
  // 1. NAS Devices CRUD & Lifecycle
  // ====================================================
  console.log('\n--- 1. NAS Devices CRUD & Lifecycle ---');

  let testNasAId;
  const createNasARes = await request('/api/v1/nas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      name: nasName,
      identifier: nasIdentifier,
      ipAddress: nasIp,
      secret: 'NetOrbitRadiusSecret2026',
      type: 'mikrotik',
      coaPort: 3799,
      description: 'Primary MikroTik BRAS in Datacenter 1',
    },
  });
  assert(createNasARes.status === 201, 'Tenant A Admin registers new NAS (201 Created)');
  testNasAId = createNasARes.data.data.id;
  assert(
    createNasARes.data.data.secret === undefined,
    'NAS Shared secret is NEVER returned in create response (Protected)',
  );

  // Read NAS Details
  const getNasRes = await request(`/api/v1/nas/${testNasAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(getNasRes.status === 200, 'Retrieve NAS device by ID (200 OK)');
  assert(
    getNasRes.data.data.secret === undefined,
    'NAS Shared secret is NEVER returned in details response',
  );
  assert(
    getNasRes.data.data.identifier === nasIdentifier,
    'NAS Identifier is properly persisted and returned in NAS details',
  );

  // Security Regression: Ensure ?revealSecret=true query param is rejected/ignored
  const getRevealRes = await request(`/api/v1/nas/${testNasAId}?revealSecret=true`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    getRevealRes.data?.data?.secret === undefined,
    'Security Fix: NAS secret is NEVER returned even with ?revealSecret=true parameter',
  );

  // List NAS devices
  const listNasRes = await request('/api/v1/nas?page=1&limit=10', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(listNasRes.status === 200 && listNasRes.data.data.items.length >= 1, 'List NAS devices returns paginated items');

  // Test NAS Connection
  const testConnRes = await request(`/api/v1/nas/${testNasAId}/test-connection`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    (testConnRes.status === 200 || testConnRes.status === 201) &&
      (testConnRes.data?.data?.reachable !== undefined || testConnRes.data?.data?.status === 'reachable' || testConnRes.data?.data?.latencyMs !== undefined),
    'Test connection endpoint responds with latency diagnostics',
  );

  // Update NAS device
  const updateNasRes = await request(`/api/v1/nas/${testNasAId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      description: 'Updated BRAS router in DC1 Rack 3A',
      coaPort: 3799,
    },
  });
  assert(updateNasRes.status === 200 && updateNasRes.data.data.description.includes('Rack 3A'), 'Update NAS device metadata succeeds');

  // Toggle NAS Status
  const toggleNasRes = await request(`/api/v1/nas/${testNasAId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(toggleNasRes.status === 200 && toggleNasRes.data.data.status === 'inactive', 'Toggle NAS status to inactive succeeds');

  const reactivateNasRes = await request(`/api/v1/nas/${testNasAId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(reactivateNasRes.status === 200 && reactivateNasRes.data.data.status === 'active', 'Reactivate NAS status to active succeeds');

  // ====================================================
  // 2. NAS Multi-Tenancy Isolation
  // ====================================================
  console.log('\n--- 2. NAS Multi-Tenancy Isolation ---');

  // Tenant B creates its own NAS
  const createNasBRes = await request('/api/v1/nas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantBToken}` },
    body: {
      name: 'Horizon Gateway Cisco ' + runId,
      identifier: 'horizon-cisco-' + runId,
      ipAddress: '10.250.' + (Math.floor(Math.random() * 200) + 10) + '.1',
      secret: 'HorizonSecret2026',
      type: 'cisco',
      coaPort: 3799,
    },
  });
  assert(createNasBRes.status === 201, 'Tenant B registers NAS in Tenant B');
  const testNasBId = createNasBRes.data.data.id;

  // Tenant A attempts to view Tenant B's NAS
  const crossNasView = await request(`/api/v1/nas/${testNasBId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    crossNasView.status === 404 || crossNasView.status === 403,
    'Tenant A Admin CANNOT view Tenant B NAS (404/403 isolated)',
  );

  // Tenant A attempts to update Tenant B's NAS
  const crossNasUpdate = await request(`/api/v1/nas/${testNasBId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { name: 'Hacked Gateway' },
  });
  assert(
    crossNasUpdate.status === 404 || crossNasUpdate.status === 403,
    'Tenant A Admin CANNOT modify Tenant B NAS (404/403 isolated)',
  );

  // Tenant A listing excludes Tenant B's NAS
  const tenantAListings = await request('/api/v1/nas?limit=100', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const hasNasBInA = tenantAListings.data.data.items.some((n) => n.id === testNasBId);
  assert(!hasNasBInA, "Tenant A's NAS listing strictly excludes Tenant B devices");

  // Multi-Tenancy Regression: Request body tenantId override attempt
  const spoofNasRes = await request('/api/v1/nas', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      name: 'Spoofed Tenant B NAS',
      ipAddress: '10.250.99.1',
      secret: 'SpoofedSecret123',
      tenantId: tenantBId,
    },
  });
  assert(
    spoofNasRes.status === 403,
    'Multi-Tenancy Fix: Tenant A cannot spoof or override tenantId in NAS creation body (403 Forbidden)',
  );

  // ====================================================
  // 3. RADIUS Users & Credential Protocols (PAP, CHAP, MSCHAPv2)
  // ====================================================
  console.log('\n--- 3. RADIUS Users Management & Protocol Support ---');

  // Get a subscriber & package from Tenant A to link
  const subsList = await request('/api/v1/subscribers?limit=5', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const linkedSub = subsList.data?.data?.items?.[0];

  const pkgsList = await request('/api/v1/packages?limit=5', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const linkedPkg = pkgsList.data?.data?.items?.[0];

  // 3a. Create PAP User
  const papUserRes = await request('/api/v1/radius/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      username: papUsername,
      password: 'PapPassword123!',
      authType: 'pap',
      simultaneousUse: 1,
      ipAddress: '10.200.1.101',
      subscriberId: linkedSub?.id,
      packageId: linkedPkg?.id,
    },
  });
  assert(papUserRes.status === 201, 'Create RADIUS user with PAP authentication (201 Created)');
  assert(
    papUserRes.data.data.password === undefined &&
      papUserRes.data.data.cleartextPassword === undefined &&
      papUserRes.data.data.passwordHash === undefined,
    'Plaintext password and hash are NEVER returned in response',
  );
  const papUserId = papUserRes.data.data.id;

  // 3b. Create CHAP User
  const chapUserRes = await request('/api/v1/radius/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      username: chapUsername,
      password: 'ChapSecretKey456!',
      authType: 'chap',
      simultaneousUse: 1,
      ipAddress: '10.200.1.102',
    },
  });
  assert(chapUserRes.status === 201, 'Create RADIUS user with CHAP authentication (201 Created)');
  const chapUserId = chapUserRes.data.data.id;

  // 3c. Create MSCHAPv2 User
  const mschapUserRes = await request('/api/v1/radius/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      username: mschapUsername,
      password: 'MsChapSecure789!',
      authType: 'mschapv2',
      simultaneousUse: 2,
      ipAddress: '10.200.1.103',
      packageId: linkedPkg?.id,
    },
  });
  assert(mschapUserRes.status === 201, 'Create RADIUS user with MSCHAPv2 authentication (201 Created)');
  const mschapUserId = mschapUserRes.data.data.id;

  // List RADIUS users
  const listUsersRes = await request('/api/v1/radius/users?page=1&limit=10', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(listUsersRes.status === 200 && listUsersRes.data.data.items.length >= 3, 'List RADIUS users returns paginated items without secrets');

  // Toggle user status
  const suspendUserRes = await request(`/api/v1/radius/users/${papUserId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { status: 'suspended' },
  });
  assert(suspendUserRes.status === 200 && suspendUserRes.data.data.status === 'disabled', 'Suspend RADIUS user succeeds');

  // Reactivate user
  const reactivateUserRes = await request(`/api/v1/radius/users/${papUserId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { status: 'active' },
  });
  assert(reactivateUserRes.status === 200 && reactivateUserRes.data.data.status === 'active', 'Reactivate RADIUS user succeeds');

  // ====================================================
  // 4. RFC 2865 AAA Authentication & Authorization
  // ====================================================
  console.log('\n--- 4. RFC 2865 AAA Authentication & Authorization ---');

  // 4a. PAP Authentication (Access-Request)
  const papAuthRes = await request('/api/v1/radius/auth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      username: papUsername,
      password: 'PapPassword123!',
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
    },
  });
  assert(papAuthRes.status === 200 && papAuthRes.data.data.code === 'Access-Accept', 'RFC 2865 PAP: Valid credentials return Access-Accept');
  assert(
    papAuthRes.data.data.attributes?.['Framed-IP-Address'] === '10.200.1.101',
    'RFC 2865 PAP: Returns configured Framed-IP-Address',
  );

  // 4b. CHAP MD5 Authentication
  const chapChallenge = '0102030405060708090a0b0c0d0e0f10';
  const chapId = 42;
  const chapResponse = computeChapResponse(chapId, 'ChapSecretKey456!', chapChallenge);

  const chapAuthRes = await request('/api/v1/radius/auth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      username: chapUsername,
      authType: 'chap',
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
      chapChallenge,
      chapPassword: `${Buffer.from([chapId]).toString('hex')}${chapResponse}`,
    },
  });
  assert(chapAuthRes.status === 200 && chapAuthRes.data.data.code === 'Access-Accept', 'RFC 2865 CHAP: MD5 Challenge/Response returns Access-Accept');

  // 4c. MSCHAPv2 Authentication
  const authChallenge = '11223344556677889900aabbccddeeff';
  const peerChallenge = 'ffeeddccbbaa00998877665544332211';
  const mschapResponse = computeMsChapv2Response(
    'MsChapSecure789!',
    mschapUsername,
    authChallenge,
    peerChallenge,
  );

  const mschapAuthRes = await request('/api/v1/radius/auth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      username: mschapUsername,
      authType: 'mschapv2',
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
      msChapChallenge: authChallenge,
      msChap2Response: `${peerChallenge}${mschapResponse}`,
    },
  });
  assert(mschapAuthRes.status === 200 && mschapAuthRes.data.data.code === 'Access-Accept', 'RFC 2759 MSCHAPv2: Challenge/Response returns Access-Accept');
  if (linkedPkg) {
    assert(
      mschapAuthRes.data.data.attributes?.['Mikrotik-Rate-Limit'] !== undefined,
      'RFC 2865 Authorization: Injects vendor rate-limit attributes (Mikrotik-Rate-Limit)',
    );
  }

  // 4d. Negative Cases
  // Invalid Password
  const badPassRes = await request('/api/v1/radius/auth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      username: papUsername,
      password: 'WrongPassword!',
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
    },
  });
  assert(badPassRes.status === 200 && badPassRes.data.data.code === 'Access-Reject', 'RFC 2865: Invalid password returns Access-Reject');

  // Suspended User
  await request(`/api/v1/radius/users/${papUserId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { status: 'suspended' },
  });
  const suspendedAuthRes = await request('/api/v1/radius/auth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      username: papUsername,
      password: 'PapPassword123!',
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
    },
  });
  assert(suspendedAuthRes.status === 200 && suspendedAuthRes.data.data.code === 'Access-Reject', 'RFC 2865: Suspended account returns Access-Reject');

  // Reactivate user
  await request(`/api/v1/radius/users/${papUserId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { status: 'active' },
  });

  // Inactive Package Authorization Denied
  const inactivePkgRes = await request('/api/v1/packages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      name: 'Deactivated Plan ' + runId,
      price: 50,
      validityDays: 30,
      downloadSpeedMbps: 50,
      uploadSpeedMbps: 25,
      type: 'broadband',
    },
  });
  const deactPkgId = inactivePkgRes.data?.data?.id;
  assert(!!deactPkgId, 'Inactive test package created successfully');
  await request(`/api/v1/packages/${deactPkgId}/deactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });

  const deactUsername = 'inactive_pkg_user_' + runId;
  await request('/api/v1/radius/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      username: deactUsername,
      password: 'ActivePassword123!',
      authType: 'pap',
      packageId: deactPkgId,
    },
  });

  const deactAuthRes = await request('/api/v1/radius/auth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      username: deactUsername,
      password: 'ActivePassword123!',
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
    },
  });
  assert(
    deactAuthRes.status === 200 && deactAuthRes.data?.data?.code === 'Access-Reject',
    'Phase 2 Integration Fix: Authentication rejected when subscriber package is inactive (Access-Reject)',
  );

  // Unknown NAS
  const unknownNasRes = await request('/api/v1/radius/auth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      username: papUsername,
      password: 'PapPassword123!',
      nasIpAddress: '192.168.99.99',
      nasIdentifier: 'unknown-rogue-nas',
    },
  });
  assert(unknownNasRes.status === 200 && unknownNasRes.data.data.code === 'Access-Reject', 'RFC 2865: Unauthorized / Unknown NAS returns Access-Reject');

  // ====================================================
  // 5. RFC 2866 Accounting & Sessions Lifecycle
  // ====================================================
  console.log('\n--- 5. RFC 2866 Accounting & Sessions Lifecycle ---');

  const testSessionId = `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 5a. Accounting Start
  const acctStartRes = await request('/api/v1/radius/accounting', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      statusType: 'Start',
      sessionId: testSessionId,
      username: mschapUsername,
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
      framedIpAddress: '10.200.1.103',
      callingStationId: 'AA:BB:CC:DD:EE:FF',
    },
  });
  assert(acctStartRes.status === 200 && acctStartRes.data.data.code === 'Accounting-Response', 'RFC 2866 Accounting Start: Returns Accounting-Response');

  // Verify Session in Active List
  const activeSessionsRes = await request('/api/v1/radius/sessions?activeOnly=true', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const createdSession = activeSessionsRes.data.data.items.find((s) => s.acctSessionId === testSessionId);
  assert(createdSession !== undefined, 'Accounting Start registered session in active sessions list');

  // 5b. Accounting Interim-Update
  const acctInterimRes = await request('/api/v1/radius/accounting', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      statusType: 'Interim-Update',
      sessionId: testSessionId,
      username: mschapUsername,
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
      sessionTime: 600, // 10 minutes
      inputOctets: 157286400, // 150 MB
      outputOctets: 52428800, // 50 MB
    },
  });
  assert(acctInterimRes.status === 200, 'RFC 2866 Accounting Interim-Update: Accepted');

  // Verify volume in session record
  const interimCheckRes = await request('/api/v1/radius/sessions?activeOnly=true', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const updatedSession = interimCheckRes.data.data.items.find((s) => s.acctSessionId === testSessionId);
  assert(
    updatedSession?.acctSessionTime === 600 && Number(updatedSession?.acctInputOctets) === 157286400,
    'Session record updated with duration and consumed octets',
  );

  // 5c. Accounting Stop
  const acctStopRes = await request('/api/v1/radius/accounting', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      statusType: 'Stop',
      sessionId: testSessionId,
      username: mschapUsername,
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
      sessionTime: 1800, // 30 minutes
      inputOctets: 314572800, // 300 MB
      outputOctets: 104857600, // 100 MB
      terminateCause: 'User-Request',
    },
  });
  assert(acctStopRes.status === 200 && acctStopRes.data.data.code === 'Accounting-Response', 'RFC 2866 Accounting Stop: Accepted');

  // Verify session is no longer active
  const stopCheckRes = await request('/api/v1/radius/sessions?activeOnly=true', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const stillActive = stopCheckRes.data.data.items.some((s) => s.acctSessionId === testSessionId);
  assert(!stillActive, 'Stopped session removed from active sessions list');

  // AAA Regression: Simultaneous session enforcement across Interim-Update state transitions
  const singleUserRes = await request('/api/v1/radius/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      username: 'single_sess_' + runId,
      password: 'SingleSessionPass123!',
      authType: 'pap',
      simultaneousUse: 1,
    },
  });
  const singleUserSessionId = `single-${runId}-1`;

  // Start session for single user
  await request('/api/v1/radius/accounting', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      statusType: 'Start',
      sessionId: singleUserSessionId,
      username: 'single_sess_' + runId,
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
    },
  });

  // Interim-Update session
  await request('/api/v1/radius/accounting', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      statusType: 'Interim-Update',
      sessionId: singleUserSessionId,
      username: 'single_sess_' + runId,
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
      sessionTime: 120,
    },
  });

  // Second authentication attempt must be rejected because simultaneous session limit is 1
  const secondLoginAttempt = await request('/api/v1/radius/auth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      username: 'single_sess_' + runId,
      password: 'SingleSessionPass123!',
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
    },
  });
  assert(
    secondLoginAttempt.status === 200 && secondLoginAttempt.data?.data?.code === 'Access-Reject',
    'AAA Fix: Simultaneous session limit strictly enforced even after Interim-Update transitions',
  );

  // Stop session
  await request('/api/v1/radius/accounting', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      statusType: 'Stop',
      sessionId: singleUserSessionId,
      username: 'single_sess_' + runId,
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
      terminateCause: 'User-Request',
    },
  });

  // Verify Accounting History endpoint returns terminated sessions
  const acctHistoryRes = await request('/api/v1/radius/accounting?limit=10', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    acctHistoryRes.status === 200 && (acctHistoryRes.data?.data?.items?.length >= 1 || acctHistoryRes.data?.data?.length >= 1),
    'Accounting History endpoint (/radius/accounting) returns terminated and historical sessions',
  );

  // ====================================================
  // 6. RFC 3576 Disconnect-Request (PoD)
  // ====================================================
  console.log('\n--- 6. RFC 3576 Disconnect-Request (PoD) ---');

  // Create another active session to disconnect
  const podSessionId = `pod-${Date.now()}`;
  await request('/api/v1/radius/accounting', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      statusType: 'Start',
      sessionId: podSessionId,
      username: chapUsername,
      nasIpAddress: nasIp,
      nasIdentifier: nasIdentifier,
      framedIpAddress: '10.200.1.102',
    },
  });

  const getPodSess = await request('/api/v1/radius/sessions?activeOnly=true', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const targetPodSession = getPodSess.data.data.items.find((s) => s.acctSessionId === podSessionId);

  if (targetPodSession) {
    const disconnectRes = await request(`/api/v1/radius/sessions/${targetPodSession.id}/disconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAToken}` },
      body: { reason: 'Administrative session reset' },
    });
    assert(disconnectRes.status === 200 || disconnectRes.status === 201, 'RFC 3576: Disconnect endpoint terminates active session');
  } else {
    assert(false, 'Target session for RFC 3576 Disconnect was found');
  }

  // ====================================================
  // 7. RADIUS Users & Accounting Multi-Tenancy Isolation
  // ====================================================
  console.log('\n--- 7. RADIUS Multi-Tenancy Isolation ---');

  // Tenant B creates RADIUS user
  const userBRes = await request('/api/v1/radius/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantBToken}` },
    body: {
      username: 'horizon_sub_' + runId,
      password: 'HorizonPass2026!',
      authType: 'mschapv2',
    },
  });
  const userBId = userBRes.data.data.id;

  // Tenant A cannot view Tenant B RADIUS user
  const crossUserView = await request(`/api/v1/radius/users/${userBId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    crossUserView.status === 404 || crossUserView.status === 403,
    'Tenant A Admin CANNOT view Tenant B RADIUS user (404/403 isolated)',
  );

  // Tenant A cannot update Tenant B RADIUS user
  const crossUserUpdate = await request(`/api/v1/radius/users/${userBId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { username: 'hacked_user' },
  });
  assert(
    crossUserUpdate.status === 404 || crossUserUpdate.status === 403,
    'Tenant A Admin CANNOT modify Tenant B RADIUS user (404/403 isolated)',
  );

  // Tenant A user listing excludes Tenant B's users
  const tenantAUsers = await request('/api/v1/radius/users?limit=100', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const hasUserBInA = tenantAUsers.data.data.items.some((u) => u.id === userBId);
  assert(!hasUserBInA, "Tenant A's RADIUS user listing strictly excludes Tenant B users");

  // Multi-Tenancy Regression: Request body tenantId override on RADIUS user creation
  const spoofUserRes = await request('/api/v1/radius/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      username: 'spoofed_user_' + runId,
      password: 'SpoofedPassword123!',
      authType: 'pap',
      tenantId: tenantBId,
    },
  });
  assert(
    spoofUserRes.status === 403,
    'Multi-Tenancy Fix: Tenant A cannot spoof or override tenantId in RADIUS user creation body (403 Forbidden)',
  );

  // Multi-Tenancy Regression: Cross-tenant package linking
  const pkgBRes = await request('/api/v1/packages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantBToken}` },
    body: {
      name: 'Tenant B Premium 100M ' + runId,
      price: 1500,
      validityDays: 30,
      downloadSpeedMbps: 100,
      uploadSpeedMbps: 50,
      type: 'broadband',
    },
  });
  const pkgBId = pkgBRes.data?.data?.id;
  assert(!!pkgBId, 'Tenant B test package created for cross-tenant validation');

  const crossPkgUserRes = await request('/api/v1/radius/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      username: 'cross_pkg_user_' + runId,
      password: 'Password123!',
      authType: 'pap',
      packageId: pkgBId,
    },
  });
  assert(
    crossPkgUserRes.status === 400 || crossPkgUserRes.status === 404,
    'Multi-Tenancy Fix: Tenant A CANNOT attach Tenant B package to RADIUS user (400 Bad Request)',
  );

  // ====================================================
  // 8. RBAC Enforcement Across SRS Roles
  // ====================================================
  console.log('\n--- 8. RBAC Enforcement Across SRS Roles ---');

  // Network Administrator can manage NAS & RADIUS users
  const netNasRes = await request('/api/v1/nas', {
    headers: { Authorization: `Bearer ${netAdminToken}` },
  });
  assert(netNasRes.status === 200, 'Network Administrator can list NAS devices (200 OK)');

  const netRadiusRes = await request('/api/v1/radius/users', {
    headers: { Authorization: `Bearer ${netAdminToken}` },
  });
  assert(netRadiusRes.status === 200, 'Network Administrator can list RADIUS users (200 OK)');

  // Customer Support is forbidden from viewing or modifying RADIUS users (403 Forbidden)
  const supportUsersRes = await request('/api/v1/radius/users', {
    headers: { Authorization: `Bearer ${supportToken}` },
  });
  assert(supportUsersRes.status === 403, 'Customer Support is forbidden from accessing RADIUS users (403 Forbidden)');

  const supportDeleteRes = await request(`/api/v1/radius/users/${papUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${supportToken}` },
  });
  assert(supportDeleteRes.status === 403, 'Customer Support is forbidden from deleting RADIUS users (403 Forbidden)');

  // Customer role cannot access NAS or RADIUS endpoints
  const customerNasRes = await request('/api/v1/nas', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(customerNasRes.status === 403, 'Customer role is forbidden from accessing NAS devices (403 Forbidden)');

  const customerRadiusRes = await request('/api/v1/radius/users', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(customerRadiusRes.status === 403, 'Customer role is forbidden from accessing RADIUS users (403 Forbidden)');

  // ====================================================
  // 9. Audit Logging Verification
  // ====================================================
  console.log('\n--- 9. Audit Logging Verification ---');

  const auditLogsRes = await request('/api/v1/audit-logs?limit=50', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  const rawData = auditLogsRes.data?.data;
  const logs = Array.isArray(rawData) ? rawData : (rawData?.data || rawData?.items || []);
  const logActions = Array.isArray(logs) ? logs.map((l) => l.action) : [];

  const recordedNasCreate = logActions.includes('nas.created') || logActions.includes('nas.create');
  const recordedRadiusUserCreate = logActions.includes('radius.user.created') || logActions.includes('radius.user.create');
  const recordedDisconnect = logActions.includes('radius.session.disconnected') || logActions.includes('radius.session.disconnect');

  assert(recordedNasCreate, 'Audit trail recorded nas.created mutation');
  assert(recordedRadiusUserCreate, 'Audit trail recorded radius.user.created mutation');
  assert(recordedDisconnect, 'Audit trail recorded radius.session.disconnected action');

  // SUMMARY
  console.log('\n====================================================');
  console.log('PHASE 3 VERIFICATION SUMMARY');
  console.log('====================================================');
  console.log(`Total Tests: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL PHASE 3 RADIUS / AAA & NETWORK ACCESS TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failedTests} TESTS FAILED IN PHASE 3 VERIFICATION!\n`);
    process.exit(1);
  }
}

runPhase3Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
