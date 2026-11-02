/**
 * NetOrbit Phase 2 Verification Suite
 * Tests Packages, Subscribers, Multi-tenancy, RBAC, and Audit Logging against running services.
 */

const http = require('http');
const https = require('https');

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
  console.log('NETORBIT PHASE 2 VERIFICATION SUITE');
  console.log('Subscribers & ISP Packages Implementation Verification');
  console.log('====================================================\n');

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

  // Step 0: Authenticate required roles
  console.log('--- Step 0: Authenticating Test Accounts ---');

  // Super Admin
  const superLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@netorbit.local', password: 'NetOrbit@Admin2026' },
  });
  let superToken = superLogin.data?.data?.tokens?.accessToken;
  assert('Super Admin authenticated', !!superToken);

  // Tenant A Admin
  const tenantALogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'tenant@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const tenantAToken = tenantALogin.data?.data?.tokens?.accessToken;
  const tenantAId = tenantALogin.data?.data?.user?.tenantId;
  assert('Tenant A Admin authenticated', !!tenantAToken && !!tenantAId);

  // Create a Second Tenant (Tenant B) to test strict cross-tenant isolation
  const bSuffix = Date.now().toString().slice(-6);
  const bEmail = `admin@skyline-${bSuffix}.com`;
  const tenantBRes = await request('/api/v1/tenants', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      name: 'Skyline Fiber Net',
      slug: 'skyline-isp-' + bSuffix,
      plan: 'pro',
      adminEmail: bEmail,
      adminFirstName: 'Skyline',
      adminLastName: 'Operator',
      adminPassword: 'NetOrbit@Staff2026',
    },
  });
  const tenantBId = tenantBRes.data?.data?.id;
  assert('Second Tenant (Tenant B) created for isolation testing', !!tenantBId);

  const tenantBLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: bEmail, password: 'NetOrbit@Staff2026' },
  });
  const tenantBToken = tenantBLogin.data?.data?.tokens?.accessToken;
  assert('Tenant B Admin authenticated', !!tenantBToken);

  // Other SRS roles for Tenant A
  const networkLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'network@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const networkToken = networkLogin.data?.data?.tokens?.accessToken;

  const supportLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'support@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const supportToken = supportLogin.data?.data?.tokens?.accessToken;

  const customerLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'customer@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const customerToken = customerLogin.data?.data?.tokens?.accessToken;

  // ----------------------------------------------------
  // SECTION 1: ISP Packages CRUD & Lifecycle
  // ----------------------------------------------------
  console.log('\n--- 1. ISP Packages CRUD & Lifecycle ---');

  // 1.1 Create Package
  const createPkgRes = await request('/api/v1/packages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      name: 'Fiber Gold 500M',
      slug: 'fiber-gold-' + Date.now(),
      description: 'Ultra-fast fiber package for power users.',
      type: 'fiber',
      price: 99.99,
      validityDays: 30,
      downloadSpeedMbps: 500,
      uploadSpeedMbps: 250,
      burstSpeedMbps: 600,
      isActive: true,
      isPublic: true,
    },
  });
  const packageAId = createPkgRes.data?.data?.id;
  assert('Tenant Admin creates new package (201/200)', [200, 201].includes(createPkgRes.status) && !!packageAId, JSON.stringify(createPkgRes.data));

  // 1.2 Read Packages List
  const listPkgsRes = await request('/api/v1/packages?page=1&limit=10', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    'Tenant Admin lists packages (200)',
    listPkgsRes.status === 200 && Array.isArray(listPkgsRes.data?.data?.data || listPkgsRes.data?.data?.items),
  );

  // 1.3 Read Single Package
  const getPkgRes = await request(`/api/v1/packages/${packageAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    'Tenant Admin retrieves package details by ID (200)',
    getPkgRes.status === 200 && getPkgRes.data?.data?.name === 'Fiber Gold 500M',
  );

  // 1.4 Update Package
  const updatePkgRes = await request(`/api/v1/packages/${packageAId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      price: 89.99,
      description: 'Updated promotion pricing.',
    },
  });
  assert('Tenant Admin updates package (200)', updatePkgRes.status === 200 && Number(updatePkgRes.data?.data?.price) === 89.99);

  // 1.5 Deactivate and Activate Package
  const deactPkgRes = await request(`/api/v1/packages/${packageAId}/deactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert('Package deactivation succeeds (200)', deactPkgRes.status === 200 && deactPkgRes.data?.data?.isActive === false);

  const actPkgRes = await request(`/api/v1/packages/${packageAId}/activate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert('Package reactivation succeeds (200)', actPkgRes.status === 200 && actPkgRes.data?.data?.isActive === true);

  // 1.6 Package Validation Rejection (Negative price)
  const invalidPkgRes = await request('/api/v1/packages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      name: 'Bad Price Plan',
      price: -10, // Invalid negative price
      validityDays: 30,
      downloadSpeedMbps: 50,
      uploadSpeedMbps: 25,
    },
  });
  assert('Package validation rejects invalid input (400 Bad Request)', invalidPkgRes.status === 400);

  // ----------------------------------------------------
  // SECTION 2: Packages Multi-Tenancy Isolation
  // ----------------------------------------------------
  console.log('\n--- 2. Packages Multi-Tenancy Isolation ---');

  // Tenant B Admin creates a package in Tenant B
  const pkgBRes = await request('/api/v1/packages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantBToken}` },
    body: {
      name: 'Skyline Starter 20M',
      slug: 'skyline-starter-' + Date.now(),
      type: 'broadband',
      price: 19.99,
      validityDays: 30,
      downloadSpeedMbps: 20,
      uploadSpeedMbps: 10,
    },
  });
  const packageBId = pkgBRes.data?.data?.id;
  assert('Tenant B creates their own package', !!packageBId);

  // Tenant A attempts to read Tenant B's package directly by ID -> Must be 404 or 403
  const crossTenantPkgGet = await request(`/api/v1/packages/${packageBId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    'Tenant A Admin CANNOT view Tenant B package (404/403 isolated)',
    [403, 404].includes(crossTenantPkgGet.status),
    `Status: ${crossTenantPkgGet.status}`,
  );

  // Tenant A attempts to update Tenant B's package -> Must be 404 or 403
  const crossTenantPkgUpdate = await request(`/api/v1/packages/${packageBId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { price: 1.0 },
  });
  assert(
    'Tenant A Admin CANNOT update Tenant B package (404/403 isolated)',
    [403, 404].includes(crossTenantPkgUpdate.status),
  );

  // Tenant B package list must NOT contain Tenant A package
  const tenantBPkgsList = await request('/api/v1/packages', {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  const pkgAInB = (tenantBPkgsList.data?.data?.data || []).some((p) => p.id === packageAId);
  assert('Tenant B package list strictly excludes Tenant A packages', !pkgAInB);

  // ----------------------------------------------------
  // SECTION 3: Subscribers CRUD & Lifecycle
  // ----------------------------------------------------
  console.log('\n--- 3. Subscribers CRUD & Lifecycle ---');

  const subscriberUsername = 'test_sub_' + Date.now().toString().slice(-4);
  const createSubRes = await request('/api/v1/subscribers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      firstName: 'Neo',
      lastName: 'Anderson',
      email: 'neo.anderson@matrix.org',
      phone: '+1-555-0199',
      addressLine1: '304 Downtown Ave',
      city: 'Mega City',
      state: 'Capital',
      postalCode: '10001',
      country: 'US',
      username: subscriberUsername,
      password: 'Broadband@Password2026',
      packageId: packageAId,
      ipAssignmentType: 'dynamic',
      autoRenew: true,
      createPortalUser: true,
    },
  });
  const subscriberAId = createSubRes.data?.data?.id;
  assert(
    'Tenant Admin registers new subscriber with package (201/200)',
    [200, 201].includes(createSubRes.status) && !!subscriberAId,
    JSON.stringify(createSubRes.data),
  );

  // 3.2 List Subscribers
  const listSubsRes = await request('/api/v1/subscribers?page=1&limit=10', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    'Tenant Admin lists subscribers (200)',
    listSubsRes.status === 200 && Array.isArray(listSubsRes.data?.data?.data || listSubsRes.data?.data?.items),
  );

  // 3.3 Read Single Subscriber Details
  const getSubRes = await request(`/api/v1/subscribers/${subscriberAId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    'Tenant Admin retrieves subscriber details with package (200)',
    getSubRes.status === 200 && getSubRes.data?.data?.username === subscriberUsername && !!getSubRes.data?.data?.package,
  );

  // 3.4 Update Subscriber Profile
  const updateSubRes = await request(`/api/v1/subscribers/${subscriberAId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      phone: '+1-555-0999',
      companyName: 'Nebuchadnezzar Crew',
    },
  });
  assert('Tenant Admin updates subscriber profile (200)', updateSubRes.status === 200 && updateSubRes.data?.data?.companyName === 'Nebuchadnezzar Crew');

  // 3.5 Subscriber Status Transitions: Active -> Suspended -> Active
  const suspendSubRes = await request(`/api/v1/subscribers/${subscriberAId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { status: 'suspended', reason: 'Temporary suspension for maintenance' },
  });
  assert('Subscriber transition to SUSPENDED succeeds (200)', suspendSubRes.status === 200 && suspendSubRes.data?.data?.status === 'suspended');

  const reactivateSubRes = await request(`/api/v1/subscribers/${subscriberAId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { status: 'active', reason: 'Service reactivated' },
  });
  assert('Subscriber transition to ACTIVE succeeds (200)', reactivateSubRes.status === 200 && reactivateSubRes.data?.data?.status === 'active');

  // 3.6 Change Subscriber Package
  // Fetch another package in Tenant A
  const pkgsList = await request('/api/v1/packages', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const allPkgsA = pkgsList.data?.data?.data || [];
  const secondPkgA = allPkgsA.find((p) => p.id !== packageAId);
  if (secondPkgA) {
    const changePkgRes = await request(`/api/v1/subscribers/${subscriberAId}/package`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tenantAToken}` },
      body: { packageId: secondPkgA.id },
    });
    assert('Subscriber package plan changed successfully (200)', changePkgRes.status === 200 && changePkgRes.data?.data?.packageId === secondPkgA.id);
  }

  // 3.7 Prevent Duplicate Username within Tenant
  const dupUserRes = await request('/api/v1/subscribers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      firstName: 'Clone',
      lastName: 'User',
      email: 'clone@example.com',
      phone: '+1-555-0888',
      addressLine1: '304 Downtown Ave',
      city: 'City',
      state: 'State',
      postalCode: '10001',
      username: subscriberUsername, // Duplicate!
    },
  });
  assert('Prevent duplicate subscriber username within same tenant (409 Conflict)', dupUserRes.status === 409);

  // 3.8 Prevent Cross-Tenant Package Assignment!
  // Tenant A Admin attempts to register subscriber using Tenant B's package
  const crossTenantPkgAssign = await request('/api/v1/subscribers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      firstName: 'Illicit',
      lastName: 'Plan',
      email: 'illicit@example.com',
      phone: '+1-555-0777',
      addressLine1: '123 Fake',
      city: 'City',
      state: 'State',
      postalCode: '10001',
      username: 'illicit_sub_' + Date.now(),
      packageId: packageBId, // Belongs to Tenant B!
    },
  });
  assert(
    'Prevent assigning package from another tenant to subscriber (400 Bad Request)',
    crossTenantPkgAssign.status === 400,
    `Status: ${crossTenantPkgAssign.status}`,
  );

  // ----------------------------------------------------
  // SECTION 4: Subscribers Multi-Tenancy Isolation
  // ----------------------------------------------------
  console.log('\n--- 4. Subscribers Multi-Tenancy Isolation ---');

  // Tenant B Admin registers a subscriber in Tenant B
  const subBRes = await request('/api/v1/subscribers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantBToken}` },
    body: {
      firstName: 'Trinity',
      lastName: 'Moss',
      email: 'trinity@matrix.org',
      phone: '+1-555-0200',
      addressLine1: '500 Skyline Blvd',
      city: 'Skyline City',
      state: 'Coast',
      postalCode: '90210',
      username: 'trinity_' + Date.now().toString().slice(-4),
      packageId: packageBId,
    },
  });
  const subscriberBId = subBRes.data?.data?.id;
  assert('Tenant B creates subscriber in Tenant B', !!subscriberBId);

  // Tenant A attempts to view Tenant B subscriber -> Must be 404 or 403
  const crossTenantSubGet = await request(`/api/v1/subscribers/${subscriberBId}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert(
    'Tenant A Admin CANNOT view Tenant B subscriber (404/403 isolated)',
    [403, 404].includes(crossTenantSubGet.status),
  );

  // Tenant A attempts to update Tenant B subscriber -> Must be 404 or 403
  const crossTenantSubUpdate = await request(`/api/v1/subscribers/${subscriberBId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: { firstName: 'Hacked' },
  });
  assert(
    'Tenant A Admin CANNOT update Tenant B subscriber (404/403 isolated)',
    [403, 404].includes(crossTenantSubUpdate.status),
  );

  // Tenant B subscriber list must NOT contain Tenant A subscribers
  const tenantBSubsList = await request('/api/v1/subscribers', {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  const subAInB = (tenantBSubsList.data?.data?.data || []).some((s) => s.id === subscriberAId);
  assert('Tenant B subscriber list strictly excludes Tenant A subscribers', !subAInB);

  // ----------------------------------------------------
  // SECTION 5: RBAC Enforcement Across SRS Roles
  // ----------------------------------------------------
  console.log('\n--- 5. RBAC Enforcement Across SRS Roles ---');

  // Network Administrator CAN read packages and subscribers
  const netPkgs = await request('/api/v1/packages', {
    headers: { Authorization: `Bearer ${networkToken}` },
  });
  assert('Network Administrator can read packages (200)', netPkgs.status === 200);

  const netSubs = await request('/api/v1/subscribers', {
    headers: { Authorization: `Bearer ${networkToken}` },
  });
  assert('Network Administrator can read subscribers (200)', netSubs.status === 200);

  // Customer Support CAN read subscribers
  const csSubs = await request('/api/v1/subscribers', {
    headers: { Authorization: `Bearer ${supportToken}` },
  });
  assert('Customer Support can read subscribers (200)', csSubs.status === 200);

  // Customer Support CANNOT delete packages (403 Forbidden)
  const csDeletePkg = await request(`/api/v1/packages/${packageAId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${supportToken}` },
  });
  assert('Customer Support is forbidden from deleting packages (403 Forbidden)', csDeletePkg.status === 403);

  // Customer CANNOT create packages (403 Forbidden)
  const custCreatePkg = await request('/api/v1/packages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { name: 'Customer Rogue Plan', price: 1, validityDays: 30, downloadSpeedMbps: 10, uploadSpeedMbps: 5 },
  });
  assert('Customer is forbidden from creating packages (403 Forbidden)', custCreatePkg.status === 403);

  // Customer CANNOT create subscribers (403 Forbidden)
  const custCreateSub = await request('/api/v1/subscribers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { firstName: 'Fake', lastName: 'Sub', email: 'f@f.com', phone: '123', addressLine1: 'A', city: 'B', state: 'C', postalCode: 'D', username: 'fake' },
  });
  assert('Customer is forbidden from creating subscribers (403 Forbidden)', custCreateSub.status === 403);

  // ----------------------------------------------------
  // SECTION 6: Audit Logging Verification for Phase 2
  // ----------------------------------------------------
  console.log('\n--- 6. Audit Logging Verification ---');

  const auditRes = await request('/api/v1/audit-logs', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  const auditEntries = auditRes.data?.data?.data || auditRes.data?.data?.items || [];

  const foundPkgCreateAudit = auditEntries.some((e) => e.action === 'packages.create');
  assert('Audit trail recorded packages.create event', foundPkgCreateAudit);

  const foundSubCreateAudit = auditEntries.some((e) => e.action === 'subscribers.create');
  assert('Audit trail recorded subscribers.create event', foundSubCreateAudit);

  const foundSubStatusAudit = auditEntries.some((e) => e.action === 'subscribers.status_changed');
  assert('Audit trail recorded subscribers.status_changed event', foundSubStatusAudit);

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('PHASE 2 VERIFICATION SUMMARY');
  console.log('====================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Tests: ${results.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PHASE 2 SUBSCRIBERS & PACKAGES INTEGRATION TESTS PASSED!\n');
  }
}

runVerification().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
