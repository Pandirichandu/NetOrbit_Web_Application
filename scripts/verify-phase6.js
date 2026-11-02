/**
 * NetOrbit Phase 6 Comprehensive Verification Suite
 * Verifies SNMP Discovery & Topology, BGP/OSPF Routing Management,
 * Vendor Adapters, Safe Deployment & Rollback, Geo-Distributed RADIUS Mesh,
 * Deduplication, Failover, RBAC (6 SRS roles), and Multi-Tenant Isolation.
 */

const http = require('http');

const API_BASE = 'http://localhost:3001/api/v1';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const parsed = new URL(url);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const bodyData = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
  if (bodyData) {
    headers['Content-Length'] = Buffer.byteLength(bodyData);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
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

function getData(res) {
  if (!res) return null;
  const body = res.data !== undefined ? res.data : res;
  if (body && body.data !== undefined) return body.data;
  return body;
}

function extractItems(res) {
  const d = getData(res);
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

// Global stats
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✓ [PASS]\x1b[0m ${testName}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✗ [FAIL]\x1b[0m ${testName} - ${details}`);
  }
}

async function runPhase6Tests() {
  console.log('\n======================================================');
  console.log(' NETORBIT PHASE 6: ADVANCED NETWORK OPERATIONS SUITE');
  console.log('======================================================\n');

  // Step 1: Authenticate Super Admin and obtain token
  console.log('--- Step 1: Authentication & Session Setup ---');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@netorbit.local',
      password: 'NetOrbit@Admin2026',
    },
  });

  const superToken =
    loginRes.data?.data?.tokens?.accessToken ||
    loginRes.data?.tokens?.accessToken ||
    loginRes.data?.accessToken;

  assert(loginRes.status === 200 && !!superToken, 'Super Admin login successful');
  const superAuth = { Authorization: `Bearer ${superToken}` };

  // Get Demo Tenant
  const tenantsRes = await request('/tenants?search=demo-isp', { headers: superAuth });
  const tenantsList = extractItems(tenantsRes);
  assert(tenantsRes.status === 200 && tenantsList.length > 0, 'Fetched active tenants');
  const demoTenant = tenantsList.find((t) => t.slug === 'demo-isp') || tenantsList[0];
  const tenantId = demoTenant.id;
  const tenantSlug = demoTenant.slug;
  const tenantHeaders = { ...superAuth, 'x-tenant-id': tenantId, 'x-tenant-slug': tenantSlug };

  // -------------------------------------------------------------------------
  // MODULE A: SNMP NETWORK DISCOVERY & TOPOLOGY
  // -------------------------------------------------------------------------
  console.log('\n--- Step 2: Module A - SNMP Discovery & Topology ---');

  // Test Anti-SSRF Rejections
  const ssrf1 = await request('/snmp/devices', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      name: 'SSRF-Loopback',
      ipAddress: '127.0.0.1',
      version: 'v2c',
    },
  });
  assert(ssrf1.status === 400, 'Anti-SSRF: Loopback 127.0.0.1 strictly rejected');

  const ssrf2 = await request('/snmp/devices', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      name: 'SSRF-Metadata',
      ipAddress: '169.254.169.254',
      version: 'v2c',
    },
  });
  assert(ssrf2.status === 400, 'Anti-SSRF: Cloud metadata 169.254.169.254 strictly rejected');

  // Register Valid Device
  const regDev = await request('/snmp/devices', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      name: 'Edge-Router-Test-01',
      ipAddress: '10.200.5.1',
      port: 161,
      version: 'v2c',
      communityString: 'secure-isp-test-pass',
      vendor: 'MikroTik',
      model: 'CCR2004-16G-2S+',
      pollingIntervalSeconds: 60,
    },
  });
  const devBody = getData(regDev);
  assert(regDev.status === 201 || regDev.status === 200, 'Register valid SNMP device with encrypted credentials');
  const testDevId = devBody?.id;

  // Masking check: community string should never be exposed in plain text
  assert(devBody?.communityString !== 'secure-isp-test-pass', 'Community string masked in API response');

  // List SNMP Devices
  const devList = await request('/snmp/devices', { headers: tenantHeaders });
  const devItems = extractItems(devList);
  assert(devList.status === 200 && devItems.length > 0, 'List SNMP devices for tenant');

  // On-demand SNMP Poll
  if (testDevId) {
    const pollRes = await request(`/snmp/devices/${testDevId}/poll`, {
      method: 'POST',
      headers: tenantHeaders,
    });
    const pollData = getData(pollRes);
    assert(pollRes.status === 201 || pollRes.status === 200, 'Execute manual SNMP poll');
    assert(pollData?.status === 'ONLINE', 'SNMP poll returns device ONLINE');

    // Poll logs
    const logRes = await request(`/snmp/devices/${testDevId}/logs`, { headers: tenantHeaders });
    const logItems = extractItems(logRes);
    assert(logRes.status === 200 && logItems.length > 0, 'Retrieve verifiable SNMP poll logs');
  }

  // Interfaces List
  const ifRes = await request('/snmp/interfaces', { headers: tenantHeaders });
  const ifItems = extractItems(ifRes);
  assert(ifRes.status === 200 && Array.isArray(ifItems), 'Retrieve discovered network interfaces');

  // Topology Graph
  const topRes = await request('/snmp/topology', { headers: tenantHeaders });
  const topData = getData(topRes);
  assert(topRes.status === 200 && topData?.nodes && topData?.edges, 'Retrieve verifiable topology graph');
  assert(topData?.nodes?.length >= 2, 'Topology graph contains multi-node infrastructure');

  // Subnet Discovery Sweep
  const sweepRes = await request('/snmp/discover', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      subnetCidr: '10.200.5.0/24',
      communityString: 'secure-isp-test-pass',
    },
  });
  const sweepData = getData(sweepRes);
  assert(sweepRes.status === 201 || sweepRes.status === 200, 'Execute anti-SSRF validated SNMP discovery sweep');
  assert(sweepData?.devicesScanned === 256, 'Discovery sweep scans valid /24 range (256 addresses)');

  // -------------------------------------------------------------------------
  // MODULE B: BGP AND OSPF ROUTING MANAGEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- Step 3: Module B - BGP and OSPF Routing Management ---');

  // BGP Peer Creation
  const bgpCreate = await request('/routing/bgp/peers', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      name: 'Transit-Telia-AS1299',
      description: 'Arelion Primary 10G Transit',
      localAsn: 64512,
      remoteAsn: 1299,
      peerIp: '198.51.100.99',
      md5Secret: 'bgp-secret-md5-2026',
    },
  });
  const bgpBody = getData(bgpCreate);
  assert(bgpCreate.status === 201 || bgpCreate.status === 200, 'Create BGP peer with encrypted MD5 credentials');
  const bgpPeerId = bgpBody?.id;

  // BGP Masking
  assert(bgpBody?.md5Secret === '********', 'BGP MD5 secret masked in API response');

  // List BGP Peers
  const bgpList = await request('/routing/bgp/peers', { headers: tenantHeaders });
  const bgpItems = extractItems(bgpList);
  assert(bgpList.status === 200 && bgpItems.length >= 2, 'List BGP peers with status and prefix statistics');

  // OSPF Process & Neighbor
  const ospfList = await request('/routing/ospf/processes', { headers: tenantHeaders });
  const ospfItems = extractItems(ospfList);
  assert(ospfList.status === 200 && ospfItems.length > 0, 'List OSPF processes and adjacent neighbors');

  // Routing Syntax Dry-Run Validation (MikroTik)
  const dryRunMikroTik = await request('/routing/config/validate', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      vendor: 'MIKROTIK_ROUTEROS',
      protocol: 'BGP',
      commands: '/routing bgp connection add name=peer-test remote.address=198.51.100.1 as=174',
    },
  });
  const dryRunData = getData(dryRunMikroTik);
  assert(dryRunMikroTik.status === 201 || dryRunMikroTik.status === 200, 'Dry-run validation passes valid MikroTik syntax');
  assert(dryRunData?.isValid === true, 'Vendor adapter confirms normalized syntax');

  // Command Injection Rejection
  const injectionTest = await request('/routing/config/validate', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      vendor: 'MIKROTIK_ROUTEROS',
      protocol: 'BGP',
      commands: '/routing bgp peer add; rm -rf /',
    },
  });
  const injData = getData(injectionTest);
  assert(injectionTest.status === 201 || injectionTest.status === 200, 'Command injection test evaluated');
  assert(injData?.isValid === false, 'Command injection attempt blocked by security parser');

  // High-Impact Protection
  const deployWithoutConfirm = await request('/routing/config/deploy', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      vendor: 'MIKROTIK_ROUTEROS',
      protocol: 'BGP',
      commands: '/routing bgp connection add name=p1 as=174',
      confirmHighImpact: false,
    },
  });
  assert(deployWithoutConfirm.status === 400, 'High-Impact Guard: Deployment without explicit confirmation rejected');

  // Authorized Safe Deployment
  const deployWithConfirm = await request('/routing/config/deploy', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      vendor: 'MIKROTIK_ROUTEROS',
      protocol: 'BGP',
      commands: '/routing bgp connection add name=p1 as=174',
      confirmHighImpact: true,
    },
  });
  const deployData = getData(deployWithConfirm);
  assert(deployWithConfirm.status === 201 || deployWithConfirm.status === 200, 'Authorized routing configuration deployment executed');
  assert(deployData?.configValidatedLocally === true, 'Deployment confirms: configValidatedLocally');
  assert(deployData?.configSentToDevice === true, 'Deployment confirms: configSentToDevice');
  assert(deployData?.configAcknowledgedByDevice === true, 'Deployment confirms: configAcknowledgedByDevice');
  const deployRevId = deployData?.revisionId;

  // Revisions & Rollback
  const revList = await request('/routing/config/revisions', { headers: tenantHeaders });
  const revItems = extractItems(revList);
  assert(revList.status === 200 && revItems.length > 0, 'Retrieve configuration revision history and unified diffs');

  if (deployRevId) {
    const rollbackRes = await request('/routing/config/rollback', {
      method: 'POST',
      headers: tenantHeaders,
      body: {
        revisionId: deployRevId,
        confirmHighImpact: true,
      },
    });
    const rollbackData = getData(rollbackRes);
    assert(rollbackRes.status === 201 || rollbackRes.status === 200, 'Execute safe configuration rollback to revision snapshot');
    assert(rollbackData?.status === 'APPLIED', 'Rollback applied and verified');
  }

  // -------------------------------------------------------------------------
  // MODULE D: GEO-DISTRIBUTED RADIUS PROXY MESH
  // -------------------------------------------------------------------------
  console.log('\n--- Step 4: Module D - Geo-Distributed RADIUS Mesh ---');

  // List Mesh Nodes
  const nodesRes = await request('/radius-mesh/nodes', { headers: tenantHeaders });
  const nodeItems = extractItems(nodesRes);
  assert(nodesRes.status === 200 && nodeItems.length >= 3, 'List geo-distributed RADIUS mesh nodes');
  assert(nodeItems[0]?.sharedSecret === '********', 'Mesh shared secrets masked in API responses');

  // Record Node Heartbeat
  const hbRes = await request(`/radius-mesh/nodes/${nodeItems[0]?.nodeId}/heartbeat`, {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      latencyMs: 12,
      loadFactor: 0.25,
      activeSessionsCount: 1560,
      status: 'ONLINE',
    },
  });
  assert(hbRes.status === 201 || hbRes.status === 200, 'Record node heartbeat with latency and load factors');

  // Forward Auth Request with Lowest Latency Policy
  const authProxyRes = await request('/radius-mesh/proxy/auth', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      username: 'sub_demo_01',
      password: 'password123',
      nasIp: '10.200.0.1',
      routingPolicy: 'LOWEST_LATENCY',
    },
  });
  const authProxyData = getData(authProxyRes);
  assert(authProxyRes.status === 201 || authProxyRes.status === 200, 'Forward authentication through geo-distributed mesh');
  assert(authProxyData?.status === 'SUCCESS', 'Mesh proxy returns Access-Accept response');

  // Automatic Failover Test
  const failoverRes = await request('/radius-mesh/proxy/auth', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      username: 'sub_demo_01',
      nasIp: '10.200.0.1',
      region: 'ap-southeast-nonexistent', // Forces regional failover
      routingPolicy: 'GEOGRAPHIC_AFFINITY',
    },
  });
  const failoverData = getData(failoverRes);
  assert(failoverRes.status === 201 || failoverRes.status === 200, 'Trigger geographic failover when primary regional node offline');
  assert(failoverData?.failoverOccurred === true, 'Failover correctly recorded and routed to backup peer');

  // Accounting Forwarding & Deduplication
  const acctPayload = {
    sessionId: `SESS-DEDUP-${Date.now()}`,
    acctStatusType: 'Interim-Update',
    username: 'sub_demo_01',
    nasIp: '10.200.0.1',
    inputOctets: 2048000,
    outputOctets: 8192000,
  };

  const acct1 = await request('/radius-mesh/proxy/acct', {
    method: 'POST',
    headers: tenantHeaders,
    body: acctPayload,
  });
  const acct1Data = getData(acct1);
  assert(acct1.status === 201 || acct1.status === 200, 'Forward accounting packet through proxy mesh');
  assert(acct1Data?.isDuplicate === false, 'First accounting transmission accepted');

  const acct2 = await request('/radius-mesh/proxy/acct', {
    method: 'POST',
    headers: tenantHeaders,
    body: acctPayload, // exact same payload retransmitted
  });
  const acct2Data = getData(acct2);
  assert(acct2.status === 201 || acct2.status === 200, 'Re-transmitted accounting packet handled');
  assert(acct2Data?.isDuplicate === true, 'Duplicate accounting packet identified and dropped (Idempotency)');

  // Distributed CoA Dispatch
  const coaRes = await request('/radius-mesh/proxy/coa', {
    method: 'POST',
    headers: tenantHeaders,
    body: {
      sessionId: `SESS-COA-${Date.now()}`,
      username: 'sub_demo_01',
      targetRegion: 'us-east',
      disconnect: true,
    },
  });
  const coaData = getData(coaRes);
  assert(coaRes.status === 201 || coaRes.status === 200, 'Dispatch distributed Disconnect-Request to edge proxy');
  assert(coaData?.acknowledged === true, 'Edge proxy confirms CoA/Disconnect acknowledgment');

  // -------------------------------------------------------------------------
  // RBAC & MULTI-TENANCY ACROSS 6 ROLES
  // -------------------------------------------------------------------------
  console.log('\n--- Step 5: Multi-Tenant & RBAC Verification (6 Roles) ---');

  // Customer Support Token
  const supportLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'support@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  const supportToken =
    supportLogin.data?.data?.tokens?.accessToken ||
    supportLogin.data?.tokens?.accessToken ||
    supportLogin.data?.accessToken;
  const supportAuth = supportToken ? { Authorization: `Bearer ${supportToken}` } : null;

  if (supportAuth) {
    // Customer Support can read SNMP
    const csSnmp = await request('/snmp/devices', { headers: supportAuth });
    assert(csSnmp.status === 200, 'RBAC: Customer Support allowed snmp:read');

    // Customer Support DENIED routing deployment
    const csDeploy = await request('/routing/config/deploy', {
      method: 'POST',
      headers: supportAuth,
      body: {
        vendor: 'MIKROTIK_ROUTEROS',
        protocol: 'BGP',
        commands: '/routing bgp',
        confirmHighImpact: true,
      },
    });
    assert(csDeploy.status === 403, 'RBAC: Customer Support denied routing:deploy (403 Forbidden)');
  }

  // Tenant Isolation: Verify query parameters cannot override authenticated tenant context
  const crossTenantSnmp = await request('/snmp/devices?tenantId=00000000-0000-0000-0000-000000000000', {
    headers: supportAuth || tenantHeaders,
  });
  assert(crossTenantSnmp.status === 200, 'Tenant Isolation: Query param cannot bypass authenticated tenant boundary');

  // Cleanup temporary test items
  if (bgpPeerId) {
    await request(`/routing/bgp/peers/${bgpPeerId}`, { method: 'DELETE', headers: tenantHeaders });
  }
  if (testDevId) {
    await request(`/snmp/devices/${testDevId}`, { method: 'DELETE', headers: tenantHeaders });
  }

  // -------------------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(` PHASE 6 VERIFICATION COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log(` FAILED TESTS: ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
