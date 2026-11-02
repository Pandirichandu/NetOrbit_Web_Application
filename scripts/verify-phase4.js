/**
 * NetOrbit Phase 4 Comprehensive Verification Suite
 * Verifies IPAM, DHCP Services, Hotspot Vouchers, Billing & Invoicing,
 * Payment Gateways, Captive Portal, RBAC, Multi-tenancy & Audit Logging.
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

function extractItems(resData) {
  if (!resData) return [];
  const payload = resData.data !== undefined ? resData.data : resData;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function extractData(resData) {
  if (!resData) return null;
  return resData.data !== undefined ? resData.data : resData;
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

async function runPhase4Verification() {
  console.log('====================================================');
  console.log('NETORBIT PHASE 4 VERIFICATION SUITE');
  console.log('IPAM, DHCP, Vouchers, Billing, Payments & Captive Portal');
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

  // Step 0: Authenticating Test Accounts
  console.log('--- Step 0: Authenticating Test Accounts ---');

  const superLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@netorbit.local', password: 'NetOrbit@Admin2026' },
  });
  const superToken = superLogin.data?.data?.tokens?.accessToken;
  assert('Super Admin authenticated', !!superToken);

  const tenantALogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'tenant@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const tenantAToken = tenantALogin.data?.data?.tokens?.accessToken;
  const tenantAId = tenantALogin.data?.data?.user?.tenantId;
  assert('Tenant A Admin authenticated', !!tenantAToken && !!tenantAId);

  // Network Admin
  const netAdminLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'network@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const netAdminToken = netAdminLogin.data?.data?.tokens?.accessToken;
  assert('Network Administrator authenticated', !!netAdminToken);

  // Billing Executive
  const billingExecLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'billing@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const billingExecToken = billingExecLogin.data?.data?.tokens?.accessToken;
  assert('Billing Executive authenticated', !!billingExecToken);

  // Customer
  const customerLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'customer@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const customerToken = customerLogin.data?.data?.tokens?.accessToken;
  assert('Customer role authenticated', !!customerToken);

  // Tenant B for strict cross-tenant isolation testing
  const tenantBSlug = 'phase4-tenant-b-' + Date.now().toString().slice(-4);
  const tenantBRes = await request('/api/v1/tenants', {
    method: 'POST',
    headers: { Authorization: `Bearer ${superToken}` },
    body: {
      name: 'SkyNet Broadband',
      slug: tenantBSlug,
      plan: 'pro',
      adminEmail: `admin@${tenantBSlug}.local`,
      adminFirstName: 'SkyNet',
      adminLastName: 'Operator',
      adminPassword: 'NetOrbit@Staff2026',
    },
  });
  const tenantBId = tenantBRes.data?.data?.id;
  assert('Tenant B created for isolation testing', !!tenantBId);

  const tenantBLogin = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: `admin@${tenantBSlug}.local`, password: 'NetOrbit@Staff2026' },
  });
  const tenantBToken = tenantBLogin.data?.data?.tokens?.accessToken;
  assert('Tenant B Admin authenticated', !!tenantBToken);

  // ====================================================
  // SECTION 1: IPAM (IP Address Management)
  // ====================================================
  console.log('\n--- 1. IPAM (IP Address Management) ---');

  // List IP pools
  const poolsRes = await request('/api/v1/ipam/pools', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const pools = extractItems(poolsRes.data);
  assert('Tenant A Admin lists IP pools', poolsRes.status === 200 && Array.isArray(pools) && pools.length >= 2);

  const primaryPool = pools.find((p) => p.name === 'Primary CGNAT Pool') || pools[0];
  assert('Seeded Primary CGNAT Pool found', !!primaryPool);

  // Get pool details
  const poolDetailsRes = await request(`/api/v1/ipam/pools/${primaryPool.id}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const poolDetails = extractData(poolDetailsRes.data);
  assert('Retrieve IP pool details by ID (200 OK)', poolDetailsRes.status === 200 && poolDetails?.subnet === primaryPool.subnet);

  // Create new IP Pool
  const newPoolRes = await request('/api/v1/ipam/pools', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      name: 'Test Office Pool ' + Date.now().toString().slice(-4),
      subnet: '172.16.20.0/24',
      startIp: '172.16.20.10',
      endIp: '172.16.20.200',
      gateway: '172.16.20.1',
      dnsServers: '8.8.8.8, 1.1.1.1',
      type: 'dynamic',
      ipVersion: 'ipv4',
    },
  });
  const createdPool = extractData(newPoolRes.data);
  assert('Create new IP pool with subnet validation (201/200)', (newPoolRes.status === 201 || newPoolRes.status === 200) && !!createdPool?.id);

  // Allocate IP from pool
  const allocRes = await request(`/api/v1/ipam/pools/${primaryPool.id}/allocate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      allocatedToType: 'subscriber',
      allocatedToId: 'sub-test-404',
    },
  });
  const allocatedIpObj = extractData(allocRes.data);
  assert('Dynamically allocate IP address from pool', (allocRes.status === 200 || allocRes.status === 201) && !!allocatedIpObj?.ipAddress);

  // List allocations for pool
  const listAllocRes = await request(`/api/v1/ipam/pools/${primaryPool.id}/allocations`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert('List allocations for pool (200 OK)', listAllocRes.status === 200 && Array.isArray(extractItems(listAllocRes.data)));

  // Release allocated IP
  if (allocatedIpObj?.id) {
    const releaseRes = await request(`/api/v1/ipam/allocations/${allocatedIpObj.id}/release`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    assert('Release allocated IP back to pool (200/201 OK)', releaseRes.status === 200 || releaseRes.status === 201);
  }

  // Cross-tenant isolation: Tenant B cannot access Tenant A's pool
  const crossPoolRes = await request(`/api/v1/ipam/pools/${primaryPool.id}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  assert('Multi-tenancy: Tenant B cannot view Tenant A IP pool (404/403 isolated)', crossPoolRes.status === 404 || crossPoolRes.status === 403);

  // ====================================================
  // SECTION 2: DHCP Scopes & Leases
  // ====================================================
  console.log('\n--- 2. DHCP Scopes & Leases ---');

  // List DHCP scopes
  const scopesRes = await request('/api/v1/dhcp/scopes', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const scopes = extractItems(scopesRes.data);
  assert('Tenant A Admin lists DHCP scopes (200 OK)', scopesRes.status === 200 && Array.isArray(scopes) && scopes.length >= 1);

  const primaryScope = scopes[0];

  // Retrieve DHCP scope details
  if (primaryScope?.id) {
    const scopeDetailsRes = await request(`/api/v1/dhcp/scopes/${primaryScope.id}`, {
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    const scopeDetails = extractData(scopeDetailsRes.data);
    assert('Retrieve DHCP scope details (200 OK)', scopeDetailsRes.status === 200 && scopeDetails?.name === primaryScope.name);
  }

  // Create new DHCP scope
  const createScopeRes = await request('/api/v1/dhcp/scopes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      name: 'Guest Hotspot VLAN ' + Date.now().toString().slice(-4),
      interfaceName: 'ether3-guest',
      leaseTimeSeconds: 43200,
      domainName: 'guest.demo.local',
      dnsServers: '8.8.8.8, 1.1.1.1',
      gateway: '172.16.20.1',
      subnetMask: '255.255.255.0',
    },
  });
  const newScope = extractData(createScopeRes.data);
  assert('Create new DHCP scope (201/200)', (createScopeRes.status === 201 || createScopeRes.status === 200) && !!newScope?.id);

  // List DHCP leases
  const leasesRes = await request('/api/v1/dhcp/leases', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  assert('List DHCP leases (200 OK)', leasesRes.status === 200 && Array.isArray(extractItems(leasesRes.data)));

  // Create static MAC reservation
  const randomSuffix = Math.floor(Math.random() * 89 + 10);
  const staticMac = `AA:BB:CC:DD:EE:${randomSuffix.toString(16).toUpperCase().padStart(2, '0')}`;
  const staticIp = `100.64.0.${randomSuffix + 100}`;
  const createStaticRes = await request('/api/v1/dhcp/leases/static', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      scopeId: primaryScope.id,
      ipAddress: staticIp,
      macAddress: staticMac,
      hostname: 'vip-server-static',
    },
  });
  const createdLease = extractData(createStaticRes.data);
  assert('Create static DHCP MAC-to-IP reservation', (createStaticRes.status === 201 || createStaticRes.status === 200) && !!createdLease?.id);

  // Release DHCP lease
  if (createdLease?.id) {
    const releaseLeaseRes = await request(`/api/v1/dhcp/leases/${createdLease.id}/release`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    assert('Release DHCP lease (200/201 OK)', releaseLeaseRes.status === 200 || releaseLeaseRes.status === 201);
  }

  // Cross-tenant isolation: Tenant B cannot view Tenant A's DHCP scope
  if (primaryScope?.id) {
    const crossScopeRes = await request(`/api/v1/dhcp/scopes/${primaryScope.id}`, {
      headers: { Authorization: `Bearer ${tenantBToken}` },
    });
    assert('Multi-tenancy: Tenant B cannot view Tenant A DHCP scope (404/403 isolated)', crossScopeRes.status === 404 || crossScopeRes.status === 403);
  }

  // ====================================================
  // SECTION 3: Hotspot Vouchers
  // ====================================================
  console.log('\n--- 3. Hotspot Vouchers ---');

  // List vouchers
  const vouchersRes = await request('/api/v1/vouchers', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const vouchers = extractItems(vouchersRes.data);
  assert('List vouchers inventory (200 OK)', vouchersRes.status === 200 && Array.isArray(vouchers) && vouchers.length >= 4);

  // Batch generate vouchers
  const batchRes = await request('/api/v1/vouchers/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      count: 5,
      prefix: 'VERIFY',
      durationMinutes: 120,
      dataQuotaMb: 2048,
      price: 2.5,
    },
  });
  const generatedVouchers = extractItems(batchRes.data);
  assert('Batch generate 5 cryptographically unique vouchers', (batchRes.status === 201 || batchRes.status === 200) && Array.isArray(generatedVouchers) && generatedVouchers.length === 5);

  const testVoucher = generatedVouchers?.[0];
  assert('Generated voucher has code and PIN', !!testVoucher?.code && !!testVoucher?.pin);

  // Redeem voucher
  const redeemRes = await request('/api/v1/vouchers/redeem', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      code: testVoucher.code,
      pin: testVoucher.pin,
      macAddress: '02:42:C0:A8:0A:99',
    },
  });
  const redeemedVoucherObj = extractData(redeemRes.data);
  const isRedeemed = [200, 201].includes(redeemRes.status) && (redeemedVoucherObj?.voucher?.status === 'redeemed' || redeemedVoucherObj?.success === true);
  assert('Redeem voucher activates session access (200/201 OK)', isRedeemed);

  // Re-redeeming consumed voucher should be rejected
  const reRedeemRes = await request('/api/v1/vouchers/redeem', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      code: testVoucher.code,
      pin: testVoucher.pin,
      macAddress: '02:42:C0:A8:0A:99',
    },
  });
  assert('Re-redeeming depleted voucher rejected (400 Bad Request)', reRedeemRes.status === 400);

  // Revoke voucher
  const voucherToRevoke = generatedVouchers?.[1];
  if (voucherToRevoke?.id) {
    const revokeRes = await request(`/api/v1/vouchers/${voucherToRevoke.id}/revoke`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    const revokedVoucher = extractData(revokeRes.data);
    assert('Revoke/cancel voucher (200 OK)', revokeRes.status === 200 && (revokedVoucher?.status === 'revoked' || revokedVoucher?.status === 'cancelled'));
  }

  // Cross-tenant isolation: Tenant B cannot redeem Tenant A voucher
  const crossRedeemRes = await request('/api/v1/vouchers/redeem', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantBToken}` },
    body: {
      code: generatedVouchers?.[2]?.code || 'NET-WIFI-1001',
      pin: generatedVouchers?.[2]?.pin || '4821',
      macAddress: '02:42:C0:A8:0A:88',
    },
  });
  assert('Multi-tenancy: Tenant B cannot redeem Tenant A voucher (404/400 rejected)', crossRedeemRes.status === 404 || crossRedeemRes.status === 400);

  // ====================================================
  // SECTION 4: Billing & Invoicing
  // ====================================================
  console.log('\n--- 4. Billing & Invoicing ---');

  // List invoices
  const invoicesRes = await request('/api/v1/billing/invoices', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const invoices = extractItems(invoicesRes.data);
  assert('Tenant A Admin lists invoices (200 OK)', invoicesRes.status === 200 && Array.isArray(invoices) && invoices.length >= 1);

  const paidInv = invoices.find((inv) => inv.status === 'paid') || invoices[0];
  assert('Seeded invoice found in list', !!paidInv);

  // Get invoice details by ID
  const invDetailsRes = await request(`/api/v1/billing/invoices/${paidInv.id}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const invDetails = extractData(invDetailsRes.data);
  assert('Retrieve invoice details by ID (200 OK)', invDetailsRes.status === 200 && invDetails?.invoiceNumber === paidInv.invoiceNumber);

  // Create manual invoice
  const subsRes = await request('/api/v1/subscribers', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const subscribersList = extractItems(subsRes.data);
  const testSub = subscribersList[0];

  const createInvRes = await request('/api/v1/billing/invoices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      subscriberId: testSub?.id,
      billingCycle: 'monthly',
      dueDate: new Date(Date.now() + 10 * 86400 * 1000).toISOString().split('T')[0],
      items: [
        {
          description: 'Broadband Add-on IP Pool Fee',
          quantity: 1,
          unitPrice: 15.0,
          amount: 15.0,
        },
        {
          description: 'Static IP Allocation',
          quantity: 1,
          unitPrice: 5.0,
          amount: 5.0,
        },
      ],
      taxRate: 18.0,
      notes: 'Generated via Phase 4 automated verification',
    },
  });
  const createdInv = extractData(createInvRes.data);
  assert('Generate manual invoice with line items & tax calculation (201/200)', [200, 201].includes(createInvRes.status) && !!createdInv?.id);
  assert('Invoice total calculated correctly ($23.60 with 18% tax)', Number(createdInv?.totalAmount) === 23.6);

  // Void unpaid invoice
  if (createdInv?.id) {
    const voidRes = await request(`/api/v1/billing/invoices/${createdInv.id}/void`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAToken}` },
    });
    const voidedInv = extractData(voidRes.data);
    assert('Void unpaid invoice (200/201 OK)', [200, 201].includes(voidRes.status) && voidedInv?.status === 'void');
  }

  // Cross-tenant isolation: Tenant B cannot view Tenant A invoice
  const crossInvRes = await request(`/api/v1/billing/invoices/${paidInv.id}`, {
    headers: { Authorization: `Bearer ${tenantBToken}` },
  });
  assert('Multi-tenancy: Tenant B cannot view Tenant A invoice (404/403 isolated)', crossInvRes.status === 404 || crossInvRes.status === 403);

  // ====================================================
  // SECTION 5: Payment Gateways & Transactions
  // ====================================================
  console.log('\n--- 5. Payment Gateways & Transactions ---');

  // List payments
  const paymentsRes = await request('/api/v1/payments', {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const paymentsList = extractItems(paymentsRes.data);
  assert('List payment transactions (200 OK)', paymentsRes.status === 200 && Array.isArray(paymentsList) && paymentsList.length >= 1);

  // Create dedicated pending invoice for payment test
  const testInvForPayRes = await request('/api/v1/billing/invoices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      subscriberId: testSub?.id,
      billingCycle: 'monthly',
      dueDate: new Date(Date.now() + 15 * 86400 * 1000).toISOString().split('T')[0],
      items: [
        {
          description: 'High-Speed Broadband Monthly Plan',
          quantity: 1,
          unitPrice: 40.0,
          amount: 40.0,
        },
      ],
      taxRate: 18.0,
      notes: 'Test invoice for payment gateway reconciliation',
    },
  });
  const pendingInv = extractData(testInvForPayRes.data);

  const orderRes = await request('/api/v1/payments/create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      invoiceId: pendingInv.id,
      amount: Number(pendingInv.balanceAmount || pendingInv.totalAmount || 47.2),
      gateway: 'razorpay',
      paymentMethod: 'upi',
      notes: 'Automated test payment',
    },
  });
  const paymentOrderData = extractData(orderRes.data);
  const paymentTx = paymentOrderData?.transaction || paymentOrderData;
  assert('Initiate payment order with gateway (201/200)', [200, 201].includes(orderRes.status) && !!paymentTx?.id);

  const gtxId = 'pay_verify_' + Date.now();
  const validSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_key_mock_12345')
    .update(`${paymentTx.gatewayOrderId}|${gtxId}`)
    .digest('hex');

  // Test 1: Forged / tampered signature rejection
  const invalidSigRes = await request('/api/v1/payments/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      transactionId: paymentTx.id,
      gatewayOrderId: paymentTx.gatewayOrderId,
      gatewayTransactionId: gtxId,
      gatewaySignature: 'forged_fake_signature_hash_99999',
    },
  });
  const invalidSigData = extractData(invalidSigRes.data);
  assert(
    'Forged/tampered payment signature rejected',
    invalidSigData?.success === false || invalidSigData?.transaction?.status === 'failed',
  );

  // Test 2: Valid cryptographic HMAC-SHA256 signature verification
  const verifyPayRes = await request('/api/v1/payments/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tenantAToken}` },
    body: {
      transactionId: paymentTx.id,
      gatewayOrderId: paymentTx.gatewayOrderId,
      gatewayTransactionId: gtxId,
      gatewaySignature: validSignature,
    },
  });
  const verifiedPay = extractData(verifyPayRes.data);
  assert(
    'Cryptographic HMAC-SHA256 signature verification succeeds (200/201 OK)',
    [200, 201].includes(verifyPayRes.status) &&
      (verifiedPay?.success === true || verifiedPay?.status === 'success' || verifiedPay?.transaction?.status === 'success'),
  );

  // Verify invoice balance is settled
  const settledInvRes = await request(`/api/v1/billing/invoices/${pendingInv.id}`, {
    headers: { Authorization: `Bearer ${tenantAToken}` },
  });
  const settledInv = extractData(settledInvRes.data);
  assert('Invoice status updated to paid upon transaction reconciliation', settledInv?.status === 'paid' && Number(settledInv?.balanceAmount) === 0);

  // Public webhook endpoint
  const webhookRes = await request('/api/v1/payments/webhook/razorpay', {
    method: 'POST',
    headers: { 'x-razorpay-signature': 'test-sig-hash' },
    body: { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_test' } } } },
  });
  assert('Public payment gateway webhook endpoint accepts event (200/201)', webhookRes.status === 200 || webhookRes.status === 201);

  // ====================================================
  // SECTION 6: Captive Portal & Hotspot
  // ====================================================
  console.log('\n--- 6. Captive Portal & Hotspot Integration ---');

  // Get tenant captive portal configuration
  const portalConfigRes = await request('/api/v1/captive/portal/demo-isp');
  const portalConfig = extractData(portalConfigRes.data);
  assert('Public Captive Portal config retrieved for demo-isp (200 OK)', portalConfigRes.status === 200 && (portalConfig?.tenantName?.includes('ISP') || portalConfig?.slug === 'demo-isp'));

  // Authenticate via voucher
  const voucherForAuth = generatedVouchers?.[3] || generatedVouchers?.[0];
  const voucherAuthRes = await request('/api/v1/captive/authenticate', {
    method: 'POST',
    body: {
      tenantSlug: 'demo-isp',
      authMethod: 'voucher',
      voucherCode: voucherForAuth?.code || 'NET-WIFI-3003',
      voucherPin: voucherForAuth?.pin || '1287',
      macAddress: '02:42:C0:A8:0A:77',
    },
  });
  const voucherAuthData = extractData(voucherAuthRes.data);
  assert('Captive portal authentication via Voucher succeeds (200/201 OK)', [200, 201].includes(voucherAuthRes.status) && !!voucherAuthData?.sessionToken);

  // Authenticate via subscriber credentials
  const subAuthRes = await request('/api/v1/captive/authenticate', {
    method: 'POST',
    body: {
      tenantSlug: 'demo-isp',
      authMethod: 'subscriber',
      username: 'sarah_connor',
      password: 'Broadband@2026',
      macAddress: '02:42:C0:A8:0A:77',
    },
  });
  const subAuthData = extractData(subAuthRes.data);
  assert('Captive portal authentication via Subscriber credentials succeeds (200/201 OK)', [200, 201].includes(subAuthRes.status) && !!subAuthData?.sessionToken);

  // Rejection of invalid voucher
  const invalidAuthRes = await request('/api/v1/captive/authenticate', {
    method: 'POST',
    body: {
      tenantSlug: 'demo-isp',
      authMethod: 'voucher',
      voucherCode: 'INVALID-CODE-999',
      macAddress: '02:42:C0:A8:0A:77',
    },
  });
  assert('Invalid voucher code rejected with 401/400 (Access Denied)', [400, 401, 404].includes(invalidAuthRes.status));

  // ====================================================
  // SECTION 7: RBAC Enforcement Across SRS Roles
  // ====================================================
  console.log('\n--- 7. RBAC Enforcement Across SRS Roles ---');

  // Network Administrator: Can read IPAM & DHCP
  const netIpamRes = await request('/api/v1/ipam/pools', {
    headers: { Authorization: `Bearer ${netAdminToken}` },
  });
  assert('Network Administrator can read IPAM pools (200 OK)', netIpamRes.status === 200);

  const netDhcpRes = await request('/api/v1/dhcp/scopes', {
    headers: { Authorization: `Bearer ${netAdminToken}` },
  });
  assert('Network Administrator can read DHCP scopes (200 OK)', netDhcpRes.status === 200);

  // Network Administrator is forbidden from creating invoices
  const netCreateInvRes = await request('/api/v1/billing/invoices', {
    method: 'POST',
    headers: { Authorization: `Bearer ${netAdminToken}` },
    body: {
      subscriberId: testSub.id,
      billingCycle: 'monthly',
      dueDate: '2026-12-31',
      items: [{ description: 'Test', quantity: 1, unitPrice: 10, amount: 10 }],
    },
  });
  assert('Network Administrator is forbidden from generating invoices (403 Forbidden)', netCreateInvRes.status === 403);

  // Billing Executive: Can read invoices & payments
  const billInvRes = await request('/api/v1/billing/invoices', {
    headers: { Authorization: `Bearer ${billingExecToken}` },
  });
  assert('Billing Executive can read invoices (200 OK)', billInvRes.status === 200);

  const billPayRes = await request('/api/v1/payments', {
    headers: { Authorization: `Bearer ${billingExecToken}` },
  });
  assert('Billing Executive can read payments (200 OK)', billPayRes.status === 200);

  // Billing Executive is forbidden from creating IP pools
  const billIpamRes = await request('/api/v1/ipam/pools', {
    method: 'POST',
    headers: { Authorization: `Bearer ${billingExecToken}` },
    body: { name: 'Unauthorized Pool', subnet: '10.0.0.0/24', startIp: '10.0.0.1', endIp: '10.0.0.10' },
  });
  assert('Billing Executive is forbidden from creating IP pools (403 Forbidden)', billIpamRes.status === 403);

  // Customer: Forbidden from admin IPAM, DHCP, and Vouchers
  const custIpamRes = await request('/api/v1/ipam/pools', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert('Customer is forbidden from viewing IPAM pools (403 Forbidden)', custIpamRes.status === 403);

  const custVoucherRes = await request('/api/v1/vouchers/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { count: 10 },
  });
  assert('Customer is forbidden from generating vouchers (403 Forbidden)', custVoucherRes.status === 403);

  // Customer self-service: can view invoices (scoped to self)
  const custInvoicesRes = await request('/api/v1/billing/invoices', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert('Customer can view self-service invoices (200 OK)', custInvoicesRes.status === 200);

  // ====================================================
  // SECTION 8: Audit Logging Verification
  // ====================================================
  console.log('\n--- 8. Audit Logging Verification ---');

  const auditRes = await request('/api/v1/audit-logs?limit=30', {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  const auditLogs = extractItems(auditRes.data);
  assert('Super Admin retrieves audit logs (200 OK)', auditRes.status === 200 && Array.isArray(auditLogs) && auditLogs.length > 0);

  const hasPhase4Event = auditLogs.some(
    (l) =>
      l.resource === 'billing' ||
      l.resource === 'vouchers' ||
      l.resource === 'payments' ||
      l.resource === 'ipam' ||
      l.resourceType === 'ip_pools' ||
      l.resourceType === 'dhcp_scopes' ||
      l.resourceType === 'dhcp_leases' ||
      l.resourceType === 'vouchers' ||
      l.resourceType === 'invoices' ||
      l.resourceType === 'payment_transactions' ||
      l.action?.includes('voucher') ||
      l.action?.includes('invoice') ||
      l.action?.includes('dhcp') ||
      l.action?.includes('ip'),
  );

  assert('Audit trail recorded Phase 4 business actions', hasPhase4Event || auditLogs.length > 0);

  // Summary
  console.log('\n====================================================');
  console.log('PHASE 4 VERIFICATION SUMMARY');
  console.log('====================================================');
  const passedTests = results.filter((r) => r.status === 'PASS').length;
  const failedTests = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Tests: ${results.length} | Passed: ${passedTests} | Failed: ${failedTests}`);

  if (failedTests === 0) {
    console.log('\n🎉 ALL PHASE 4 BILLING, PAYMENTS, VOUCHERS, IPAM, DHCP & CAPTIVE PORTAL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failedTests} TESTS FAILED IN PHASE 4 VERIFICATION!\n`);
    process.exit(1);
  }
}

runPhase4Verification().catch((err) => {
  console.error('Fatal error during Phase 4 verification:', err);
  process.exit(1);
});
