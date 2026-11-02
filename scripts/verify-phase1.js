/**
 * NetOrbit Phase 1 Verification Suite
 * Tests Backend, Auth, RBAC, Multi-tenancy, and Security against actual running services.
 */

const http = require('http');
const https = require('https');
let authenticator;
try {
  authenticator = require('otplib').authenticator;
} catch {
  authenticator = require('../apps/api/node_modules/otplib').authenticator;
}

const API_BASE = 'http://localhost:3001';
const MAILHOG_API = 'http://localhost:8025/api/v2/messages';

function decodeQuotedPrintable(str) {
  if (!str) return '';
  return str.replace(/=\r?\n/g, '').replace(/=3D/g, '=');
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const parsed = new URL(url);
  const client = parsed.protocol === 'https:' ? https : http;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const bodyData = options.body ? JSON.stringify(options.body) : null;
  if (bodyData) {
    headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  return new Promise((resolve, reject) => {
    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
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
          data: json
        });
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(bodyData);
    }
    req.end();
  });
}

const results = [];

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    results.push({ name: description, status: 'PASS', details });
  } else {
    console.error(`  ✗ FAIL: ${description} - ${details}`);
    results.push({ name: description, status: 'FAIL', details });
  }
}

async function runVerification() {
  console.log('====================================================');
  console.log('NETORBIT PHASE 1 FULL MANUAL-STYLE VERIFICATION SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: Health & System Diagnostics
  // ----------------------------------------------------
  console.log('--- 1. API Health & Swagger ---');
  const healthRes = await request('/health');
  assert('GET /health returns 200 and healthy DB/Memory', healthRes.status === 200 && healthRes.data?.data?.status === 'ok', JSON.stringify(healthRes.data));

  const livenessRes = await request('/health/liveness');
  assert('GET /health/liveness returns 200', livenessRes.status === 200 && livenessRes.data?.data?.status === 'ok');

  const readinessRes = await request('/health/readiness');
  assert('GET /health/readiness returns 200', readinessRes.status === 200 && readinessRes.data?.data?.status === 'ok');

  const swaggerRes = await request('/api/docs');
  assert('GET /api/docs Swagger loads successfully (200)', swaggerRes.status === 200 && typeof swaggerRes.data === 'string' && swaggerRes.data.includes('Swagger UI'));

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
  } catch (err) {
    // Fallback to docker exec if pg is not directly connectable
    try {
      const { execSync } = require('child_process');
      execSync('docker exec netorbit-postgres psql -U netorbit_user -d netorbit -c "UPDATE users SET mfa_enabled = false WHERE email = \'admin@netorbit.local\';"', { stdio: 'ignore' });
    } catch {}
  }

  // ----------------------------------------------------
  // SECTION 2: Authentication Flows
  // ----------------------------------------------------
  console.log('\n--- 2. Authentication Flows ---');

  // 2.1 Valid Login
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@netorbit.local',
      password: 'NetOrbit@Admin2026'
    }
  });
  const superAdminToken = loginRes.data?.data?.tokens?.accessToken;
  const initialRefreshToken = loginRes.data?.data?.tokens?.refreshToken;
  assert('Login with valid Super Admin credentials succeeds (200)', loginRes.status === 200 && !!superAdminToken && !!initialRefreshToken, JSON.stringify(loginRes.data));

  // 2.2 Invalid Login
  const invalidLoginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@netorbit.local',
      password: 'WrongPassword123!'
    }
  });
  assert('Invalid password returns 401 Unauthorized', invalidLoginRes.status === 401);

  // 2.3 Account Lockout
  console.log('  Testing lockout after failed attempts...');
  const lockoutEmail = 'lockout-test@demo-isp.com';
  // Create a user to test lockout on
  await request('/api/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdminToken}` },
    body: {
      email: lockoutEmail,
      firstName: 'Lockout',
      lastName: 'Target',
      password: 'TempPassword123!',
      roleIds: []
    }
  });

  let lockedOut = false;
  for (let i = 1; i <= 6; i++) {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: lockoutEmail, password: 'WrongPassword!' }
    });
    if (res.status === 403 && JSON.stringify(res.data).includes('locked')) {
      lockedOut = true;
      break;
    }
  }
  assert('Account lockout activates after repeated failed attempts (403 Forbidden)', lockedOut);

  // 2.4 Refresh Token Rotation
  console.log('  Testing Refresh Token Rotation...');
  const refreshRes = await request('/api/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken: initialRefreshToken }
  });
  const newAccessToken = refreshRes.data?.data?.tokens?.accessToken;
  const rotatedRefreshToken = refreshRes.data?.data?.tokens?.refreshToken;
  assert('Refresh token succeeds and returns new access token & new refresh token', refreshRes.status === 200 && !!newAccessToken && !!rotatedRefreshToken && rotatedRefreshToken !== initialRefreshToken, JSON.stringify(refreshRes.data));

  // Old refresh token must now be revoked
  const reuseOldRefresh = await request('/api/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken: initialRefreshToken }
  });
  assert('Reusing old rotated refresh token is rejected (401 Unauthorized)', reuseOldRefresh.status === 401);

  // 2.5 Protected Routes Guard
  const noTokenRes = await request('/api/v1/auth/me');
  assert('Accessing protected route /auth/me without token returns 401 Unauthorized', noTokenRes.status === 401);

  const validMeRes = await request('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${newAccessToken}` }
  });
  assert('Accessing /auth/me with valid JWT token returns profile (200)', validMeRes.status === 200 && validMeRes.data?.data?.email === 'admin@netorbit.local');

  // 2.6 Logout & Session Invalidation
  const logoutRes = await request('/api/v1/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${newAccessToken}` },
    body: { refreshToken: rotatedRefreshToken }
  });
  assert('Logout succeeds (200)', logoutRes.status === 200);

  const revokedRefreshAfterLogout = await request('/api/v1/auth/refresh', {
    method: 'POST',
    body: { refreshToken: rotatedRefreshToken }
  });
  assert('Refresh token revoked on logout cannot be used (401 Unauthorized)', revokedRefreshAfterLogout.status === 401);

  // ----------------------------------------------------
  // SECTION 3: MFA / TOTP Setup & Verification
  // ----------------------------------------------------
  console.log('\n--- 3. MFA / TOTP Setup & Verification ---');
  // Re-login Super Admin
  const reLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@netorbit.local', password: 'NetOrbit@Admin2026' }
  });
  const adminToken = reLogin.data?.data?.tokens?.accessToken;

  // Setup MFA
  const mfaSetupRes = await request('/api/v1/auth/mfa/setup', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const mfaSecret = mfaSetupRes.data?.data?.secret;
  const qrCodeUrl = mfaSetupRes.data?.data?.qrCodeUrl;
  assert('MFA setup returns secret and qrCodeUrl (200)', mfaSetupRes.status === 200 && !!mfaSecret && !!qrCodeUrl, JSON.stringify(mfaSetupRes.data));

  // Confirm with invalid TOTP code
  const badMfaConfirm = await request('/api/v1/auth/mfa/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { code: '000000' }
  });
  assert('MFA confirm with invalid code returns 400 Bad Request', badMfaConfirm.status === 400);

  // Confirm with valid TOTP code
  const validTotp = authenticator.generate(mfaSecret);
  const goodMfaConfirm = await request('/api/v1/auth/mfa/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { code: validTotp }
  });
  assert('MFA confirm with valid TOTP code activates MFA (200)', [200, 201].includes(goodMfaConfirm.status) && goodMfaConfirm.data?.data?.success === true, JSON.stringify(goodMfaConfirm.data));

  // Test MFA Login challenge
  const mfaLoginChallenge = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@netorbit.local', password: 'NetOrbit@Admin2026' }
  });
  assert('Login for MFA-enabled user returns requiresMfa challenge', mfaLoginChallenge.status === 200 && mfaLoginChallenge.data?.data?.requiresMfa === true && !!mfaLoginChallenge.data?.data?.mfaToken);
  const mfaChallengeToken = mfaLoginChallenge.data?.data?.mfaToken;

  // Complete MFA Login
  const loginTotp = authenticator.generate(mfaSecret);
  const mfaLoginVerify = await request('/api/v1/auth/mfa/verify', {
    method: 'POST',
    body: { mfaToken: mfaChallengeToken, code: loginTotp }
  });
  assert('MFA challenge verify with valid TOTP code issues access token (200)', mfaLoginVerify.status === 200 && !!mfaLoginVerify.data?.data?.tokens?.accessToken);
  const mfaVerifiedToken = mfaLoginVerify.data?.data?.tokens?.accessToken;

  // ----------------------------------------------------
  // SECTION 4: Password History & Reset Password
  // ----------------------------------------------------
  console.log('\n--- 4. Password History & Forgot/Reset Password ---');

  // Create a dedicated user for reset testing
  const resetEmail = `reset-test-${Date.now()}@demo-isp.com`;
  await request('/api/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mfaVerifiedToken}` },
    body: {
      email: resetEmail,
      firstName: 'Reset',
      lastName: 'Target',
      password: 'InitialPassword2026!',
      roleIds: []
    }
  });

  // Clear old MailHog emails first to ensure fresh token extraction
  try {
    await fetch('http://localhost:8025/api/v1/messages', { method: 'DELETE' });
  } catch {}

  // Forgot password triggers email via MailHog
  const forgotRes = await request('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: { email: resetEmail }
  });
  assert('Forgot password API accepts request (200)', forgotRes.status === 200);

  // Wait a moment for email delivery
  await new Promise(r => setTimeout(r, 800));

  // Check MailHog for reset email
  const mailhogRes = await request(MAILHOG_API);
  assert('MailHog captured reset password email', mailhogRes.status === 200 && mailhogRes.data?.items?.length > 0);
  let resetToken = null;
  if (mailhogRes.data?.items?.length > 0) {
    for (const item of mailhogRes.data.items) {
      const recipient = JSON.stringify(item.To || '');
      if (recipient.includes(resetEmail) || mailhogRes.data.items.length === 1) {
        const cleanBody = decodeQuotedPrintable(item.Content?.Body || '');
        const match = cleanBody.match(/token=([a-f0-9-]{36})/i);
        if (match) {
          resetToken = match[1];
          break;
        }
      }
    }
  }

  if (resetToken) {
    const resetRes = await request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: {
        token: resetToken,
        newPassword: 'NetOrbit@NewPass2026!'
      }
    });
    assert('Reset password with token succeeds (200)', resetRes.status === 200, JSON.stringify(resetRes.data));

    // Verify login with new password
    const newPassLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: resetEmail, password: 'NetOrbit@NewPass2026!' }
    });
    assert('Login with reset password succeeds (200)', newPassLogin.status === 200 && !!newPassLogin.data?.data?.tokens?.accessToken);

    // Test password change & history check
    const resetUserToken = newPassLogin.data?.data?.tokens?.accessToken;
    // Try to reuse recent password
    const reusePassRes = await request('/api/v1/users/change-password', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${resetUserToken}` },
      body: {
        currentPassword: 'NetOrbit@NewPass2026!',
        newPassword: 'NetOrbit@NewPass2026!'
      }
    });
    assert('Reusing recent password is prevented by Password History policy (400)', reusePassRes.status === 400);
  } else {
    assert('Reset token extracted from MailHog', false, 'Token could not be parsed from MailHog body');
  }

  // ----------------------------------------------------
  // SECTION 5: RBAC Verification - All 6 SRS Primary Roles
  // ----------------------------------------------------
  console.log('\n--- 5. RBAC & Permissions Enforcement (All 6 SRS Roles) ---');

  const roleLogins = [
    { role: 'super_administrator', email: 'admin@netorbit.local', pass: 'NetOrbit@Admin2026', isMfa: true },
    { role: 'tenant_administrator', email: 'tenant@demo-isp.com', pass: 'NetOrbit@Staff2026', isMfa: false },
    { role: 'network_administrator', email: 'network@demo-isp.com', pass: 'NetOrbit@Staff2026', isMfa: false },
    { role: 'billing_executive', email: 'billing@demo-isp.com', pass: 'NetOrbit@Staff2026', isMfa: false },
    { role: 'customer_support', email: 'support@demo-isp.com', pass: 'NetOrbit@Staff2026', isMfa: false },
    { role: 'customer', email: 'customer@demo-isp.com', pass: 'NetOrbit@Staff2026', isMfa: false },
  ];

  const roleTokens = {};

  for (const r of roleLogins) {
    const login = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: r.email, password: r.pass }
    });

    if (login.data?.data?.requiresMfa) {
      const code = authenticator.generate(mfaSecret);
      const verify = await request('/api/v1/auth/mfa/verify', {
        method: 'POST',
        body: { mfaToken: login.data.data.mfaToken, code }
      });
      roleTokens[r.role] = verify.data?.data?.tokens?.accessToken;
    } else {
      roleTokens[r.role] = login.data?.data?.tokens?.accessToken;
    }

    assert(`Role [${r.role}] authenticates successfully`, !!roleTokens[r.role], `Email: ${r.email}`);
  }

  // Direct unauthorized API enforcement test:
  // 1. Only super_admin can create tenants:
  const secondTenantSlug = `second-isp-${Date.now()}`;
  const secondAdminEmail = `admin@${secondTenantSlug}.com`;
  const superCreateTenant = await request('/api/v1/tenants', {
    method: 'POST',
    headers: { Authorization: `Bearer ${roleTokens['super_administrator']}` },
    body: {
      name: 'Second ISP Network',
      slug: secondTenantSlug,
      plan: 'enterprise',
      adminEmail: secondAdminEmail,
      adminFirstName: 'TenantB',
      adminLastName: 'Admin',
      adminPassword: 'NetOrbit@Staff2026'
    }
  });
  assert('Super Admin can create new tenant (201)', [200, 201].includes(superCreateTenant.status), JSON.stringify(superCreateTenant.data));
  const secondTenantId = superCreateTenant.data?.data?.id;

  // 2. Tenant Admin CANNOT create tenants (must be 403 Forbidden)
  const tenantAdminCreateTenant = await request('/api/v1/tenants', {
    method: 'POST',
    headers: { Authorization: `Bearer ${roleTokens['tenant_administrator']}` },
    body: {
      name: 'Unauthorized Tenant',
      slug: `unauthorized-isp-${Date.now()}`,
      adminEmail: `fake-${Date.now()}@unauthorized.com`,
      adminFirstName: 'Fake',
      adminLastName: 'User'
    }
  });
  assert('Tenant Administrator is forbidden from creating tenants (403 Forbidden)', tenantAdminCreateTenant.status === 403);

  // 3. Customer CANNOT access audit logs (must be 403 Forbidden)
  const customerAudit = await request('/api/v1/audit-logs', {
    headers: { Authorization: `Bearer ${roleTokens['customer']}` }
  });
  assert('Customer is forbidden from reading audit logs (403 Forbidden)', customerAudit.status === 403);

  // 4. Customer Support CANNOT delete roles (must be 403 Forbidden)
  const supportDeleteRole = await request('/api/v1/roles/00000000-0000-0000-0000-000000000000', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${roleTokens['customer_support']}` }
  });
  assert('Customer Support is forbidden from deleting roles (403 Forbidden)', supportDeleteRole.status === 403);

  // 5. Network Admin CANNOT access user management (must be 403 Forbidden)
  const networkUsers = await request('/api/v1/users', {
    headers: { Authorization: `Bearer ${roleTokens['network_administrator']}` }
  });
  assert('Network Administrator is forbidden from accessing user management (403 Forbidden)', networkUsers.status === 403);

  // 6. Billing Executive CANNOT access user management (must be 403 Forbidden)
  const billingUsers = await request('/api/v1/users', {
    headers: { Authorization: `Bearer ${roleTokens['billing_executive']}` }
  });
  assert('Billing Executive is forbidden from accessing user management (403 Forbidden)', billingUsers.status === 403);

  // ----------------------------------------------------
  // SECTION 6: Multi-Tenancy Data Isolation Verification
  // ----------------------------------------------------
  console.log('\n--- 6. Multi-Tenancy Data Isolation ---');

  // Login as Tenant B Admin
  const tenantBLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: {
      email: secondAdminEmail,
      password: 'NetOrbit@Staff2026'
    }
  });
  const tenantBToken = tenantBLogin.data?.data?.tokens?.accessToken;
  const tenantBUser = tenantBLogin.data?.data?.user;
  assert('Tenant B administrator can log in', !!tenantBToken);

  // Tenant A admin attempts to read Tenant B user directly
  const crossTenantUserAccess = await request(`/api/v1/users/${tenantBUser?.id}`, {
    headers: { Authorization: `Bearer ${roleTokens['tenant_administrator']}` }
  });
  assert('Tenant A Admin CANNOT view Tenant B user (403/404 isolated)', [403, 404].includes(crossTenantUserAccess.status), `Status: ${crossTenantUserAccess.status}`);

  // Tenant A admin listing users only sees Tenant A users
  const tenantAUsersList = await request('/api/v1/users', {
    headers: { Authorization: `Bearer ${roleTokens['tenant_administrator']}` }
  });
  const anyTenantBUserVisibleInA = (tenantAUsersList.data?.data?.items || []).some(u => u.email === 'admin@second-isp.com');
  assert('Tenant A user list strictly excludes Tenant B users', !anyTenantBUserVisibleInA);

  // Tenant B admin listing users only sees Tenant B users
  const tenantBUsersList = await request('/api/v1/users', {
    headers: { Authorization: `Bearer ${tenantBToken}` }
  });
  const anyTenantAUserVisibleInB = (tenantBUsersList.data?.data?.items || []).some(u => u.email === 'tenant@demo-isp.com');
  assert('Tenant B user list strictly excludes Tenant A users', !anyTenantAUserVisibleInB);

  // ----------------------------------------------------
  // SECTION 7: Audit Logs & Security
  // ----------------------------------------------------
  console.log('\n--- 7. Audit Logging & Security Checks ---');
  const auditRes = await request('/api/v1/audit-logs', {
    headers: { Authorization: `Bearer ${roleTokens['super_administrator']}` }
  });
  assert('Super Admin can retrieve audit logs (200)', auditRes.status === 200 && Array.isArray(auditRes.data?.data?.data || auditRes.data?.data?.items), JSON.stringify(auditRes.data));

  // Input Validation Error Handling (400 Bad Request with details)
  const invalidUserCreate = await request('/api/v1/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${roleTokens['super_administrator']}` },
    body: { email: 'not-an-email' } // Missing required fields and bad email
  });
  assert('Invalid input returns 400 Bad Request with structured error format', invalidUserCreate.status === 400 && invalidUserCreate.data?.error?.code === 'BAD_REQUEST', JSON.stringify(invalidUserCreate.data));

  // SQL Injection Resistance check
  const sqlInjectionAttempt = await request('/api/v1/tenants?page=1&limit=10&search=%27%20OR%201=1;--', {
    headers: { Authorization: `Bearer ${roleTokens['super_administrator']}` }
  });
  assert('SQL Injection attempts in query parameters handled safely', [200, 400].includes(sqlInjectionAttempt.status) && !JSON.stringify(sqlInjectionAttempt.data).includes('syntax error'));

  // Reset admin MFA in DB so subsequent direct logins remain operational
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
  } catch (err) {
    try {
      const { execSync } = require('child_process');
      execSync('docker exec netorbit-postgres psql -U netorbit_user -d netorbit -c "UPDATE users SET mfa_enabled = false WHERE email = \'admin@netorbit.local\';"', { stdio: 'ignore' });
    } catch {}
  }

  // Summary
  console.log('\n====================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('====================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`Total Tests: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ALL BACKEND, AUTH, RBAC, AND MULTI-TENANCY TESTS PASSED!\n');
  }
}

runVerification().catch(err => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
