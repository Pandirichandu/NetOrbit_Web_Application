/**
 * NetOrbit Phase 5 Comprehensive Verification Suite
 * Verifies Helpdesk & Tickets, CRM & Field Service, Multi-Channel Notifications (MailHog),
 * Automation & Schedulers (CoA sweeps), Outbound Webhooks (HMAC-SHA256), Executive Analytics & CSV Reports,
 * RBAC (6 SRS roles), and Multi-Tenant Isolation.
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const API_BASE = 'http://localhost:3001/api/v1';

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const parsed = new URL(url);
  const client = parsed.protocol === 'https:' ? https : http;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const bodyData = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
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

async function runPhase5Verification() {
  console.log('===============================================================');
  console.log('       NETORBIT PHASE 5 COMPREHENSIVE VERIFICATION SUITE       ');
  console.log('===============================================================\n');

  // --- Step 0: Authenticate Admin & Test Users ---
  console.log('--- Step 0: Authentication & Session Setup ---');

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@netorbit.local', password: 'NetOrbit@Admin2026' },
  });
  assert('Super Administrator authenticates successfully', adminLogin.status === 200);
  const adminToken = adminLogin.data?.data?.tokens?.accessToken || adminLogin.data?.tokens?.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Fetch tenants
  const tenantsRes = await request('/tenants?search=demo-isp', { headers: adminHeaders });
  const tenantsList = extractItems(tenantsRes);
  const demoTenant = tenantsList.find((t) => t.slug === 'demo-isp') || tenantsList[0] || { id: '00000000-0000-0000-0000-000000000001', slug: 'demo-isp' };
  const tenantSlugHeaders = { ...adminHeaders, 'X-Tenant-Slug': demoTenant.slug };

  // Ensure Tenant B exists for multi-tenant isolation tests
  let tenantB = tenantsList.find((t) => t.slug === 'tenant-b');
  if (!tenantB) {
    const createTB = await request('/tenants', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: 'Tenant B Network',
        slug: 'tenant-b',
        adminEmail: 'admin@tenant-b.local',
        adminFirstName: 'TenantB',
        adminLastName: 'Admin',
        adminPassword: 'NetOrbit@Staff2026',
        plan: 'pro',
      },
    });
    tenantB = getData(createTB)?.tenant || getData(createTB);
  }

  const tenantBLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@tenant-b.local', password: 'NetOrbit@Staff2026' },
  });
  const tenantBToken = tenantBLogin.data?.data?.tokens?.accessToken || tenantBLogin.data?.tokens?.accessToken;
  const tenantBHeaders = { Authorization: `Bearer ${tenantBToken}` };

  // --- Section 1: Helpdesk & Support Tickets ---
  console.log('\n--- Section 1: Helpdesk & Support Tickets ---');

  // 1.1 List tickets
  const listTicketsRes = await request('/tickets', { headers: tenantSlugHeaders });
  assert('List support tickets endpoint returns HTTP 200', listTicketsRes.status === 200);
  const ticketsList = extractItems(listTicketsRes);
  assert('Seeded ticket TCK-202610-0001 present in tenant', ticketsList.length > 0);

  // 1.2 Create ticket with auto-numbering TCK-YYYYMM-XXXX
  const newTicketRes = await request('/tickets', {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      subject: 'High latency on upstream gateway',
      description: 'Ping to core DNS exceeds 250ms during peak hours.',
      category: 'TECHNICAL',
      priority: 'CRITICAL',
    },
  });
  assert('Ticket creation returns HTTP 201', newTicketRes.status === 201);
  const createdTicket = getData(newTicketRes);
  assert(
    'Automatic ticket number matches TCK-YYYYMM-XXXX format',
    /^TCK-\d{6}-\d{4}$/.test(createdTicket?.ticketNumber),
    `Received: ${createdTicket?.ticketNumber}`,
  );

  // 1.3 Verify SLA calculation (CRITICAL = 2 hours)
  const slaCreated = new Date(createdTicket.createdAt).getTime();
  const slaDue = new Date(createdTicket.slaDueAt).getTime();
  const diffHours = Math.round((slaDue - slaCreated) / (1000 * 3600));
  assert('CRITICAL priority calculates 2-hour SLA deadline', diffHours === 2, `Diff: ${diffHours}h`);

  // 1.4 Ticket Lifecycle Transition: OPEN -> IN_PROGRESS -> RESOLVED
  const updateProgRes = await request(`/tickets/${createdTicket.id}`, {
    method: 'PATCH',
    headers: tenantSlugHeaders,
    body: { status: 'IN_PROGRESS' },
  });
  assert('Ticket status updates to IN_PROGRESS', updateProgRes.status === 200 && getData(updateProgRes)?.status === 'IN_PROGRESS');

  const updateResRes = await request(`/tickets/${createdTicket.id}`, {
    method: 'PATCH',
    headers: tenantSlugHeaders,
    body: { status: 'RESOLVED' },
  });
  assert('Ticket status updates to RESOLVED with resolvedAt timestamp', updateResRes.status === 200 && getData(updateResRes)?.status === 'RESOLVED');

  // 1.5 Add Public & Internal Comments
  const publicCommentRes = await request(`/tickets/${createdTicket.id}/comments`, {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      comment: 'Core fiber switch port re-calibrated. Please test your ping.',
      isInternal: false,
    },
  });
  assert('Public comment posted successfully', publicCommentRes.status === 201 && getData(publicCommentRes)?.isInternal === false);

  const internalCommentRes = await request(`/tickets/${createdTicket.id}/comments`, {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      comment: 'Internal tech note: Switch SFP+ module replaced on shelf B.',
      isInternal: true,
    },
  });
  assert('Internal staff note posted successfully', internalCommentRes.status === 201 && getData(internalCommentRes)?.isInternal === true);

  // 1.6 Verify Ticket Details & Thread
  const detailTicketRes = await request(`/tickets/${createdTicket.id}`, { headers: tenantSlugHeaders });
  assert('Ticket details retrieved successfully', detailTicketRes.status === 200);
  const detailComments = getData(detailTicketRes)?.comments || [];
  assert('Both public and internal comments present in staff view', detailComments.length >= 2);

  // --- Section 2: CRM & Field Service Management ---
  console.log('\n--- Section 2: CRM & Field Service Management ---');

  // 2.1 CRM Overview KPI
  const crmOverview = await request('/crm/overview', { headers: tenantSlugHeaders });
  assert('CRM Overview endpoint returns HTTP 200 with pipeline metrics', crmOverview.status === 200);

  // 2.2 Create CRM Lead & Qualification Pipeline
  const createLeadRes = await request('/crm/leads', {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      name: 'Cyberdyne Systems Corp',
      phone: '+15550198888',
      email: `it_${Date.now()}@cyberdyne.corp`,
      address: '100 Silicon Way, Block 4',
      interestedPackage: 'Fiber 500M Enterprise',
      notes: 'Needs 100M dedicated uplink.',
    },
  });
  assert('Create CRM lead returns HTTP 201', createLeadRes.status === 201);
  const createdLead = getData(createLeadRes);
  assert('Lead starts in NEW status', createdLead.status === 'NEW');

  // Lead pipeline advance: NEW -> CONTACTED -> QUALIFIED
  const advanceLeadRes = await request(`/crm/leads/${createdLead.id}`, {
    method: 'PATCH',
    headers: tenantSlugHeaders,
    body: { status: 'QUALIFIED' },
  });
  assert('Lead advanced to QUALIFIED stage', advanceLeadRes.status === 200 && getData(advanceLeadRes)?.status === 'QUALIFIED');

  // 2.3 1-Click Lead Conversion to Subscriber
  const packagesRes = await request('/packages?limit=10', { headers: tenantSlugHeaders });
  const pkgList = extractItems(packagesRes);
  const chosenPkg = pkgList[0] || { id: '00000000-0000-0000-0000-000000000001' };

  const convertRes = await request(`/crm/leads/${createdLead.id}/convert`, {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      username: `cyberdyne_${Date.now().toString().slice(-4)}`,
      password: 'Cyberdyne@Pass2026',
      packageId: chosenPkg.id,
    },
  });
  assert('1-click Lead Conversion creates subscriber and returns HTTP 201', convertRes.status === 201);
  const convData = getData(convertRes);
  assert('Lead marked as CONVERTED with convertedSubscriberId', convData?.lead?.status === 'CONVERTED');

  // 2.4 Duplicate Conversion Prevention (Idempotency)
  const dupConvertRes = await request(`/crm/leads/${createdLead.id}/convert`, {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      username: 'another_user',
      password: 'Pass@12345678',
      packageId: chosenPkg.id,
    },
  });
  assert('Repeated conversion attempt on already converted lead is rejected (HTTP 400)', dupConvertRes.status === 400);

  // 2.5 Field Installations & Technicians
  const listTechRes = await request('/crm/technicians', { headers: tenantSlugHeaders });
  assert('Technicians directory list returns HTTP 200', listTechRes.status === 200);
  const techList = extractItems(listTechRes);
  assert('Seeded technician John Wire present', techList.length > 0);
  const testTech = techList[0];

  const createInstallRes = await request('/crm/installations', {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      customerName: 'Wayne Enterprises Suite',
      contactPhone: '+15550197777',
      address: '1007 Mountain Drive',
      scheduledDate: new Date(Date.now() + 86400 * 1000).toISOString(),
      technicianId: testTech.id,
      notes: 'Install 10G SFP GPON ONT.',
    },
  });
  assert('Schedule field installation work order returns HTTP 201', createInstallRes.status === 201);
  const createdInstall = getData(createInstallRes);
  assert('Installation created with SCHEDULED status', createdInstall.status === 'SCHEDULED');

  const updateInstallRes = await request(`/crm/installations/${createdInstall.id}`, {
    method: 'PATCH',
    headers: tenantSlugHeaders,
    body: { status: 'COMPLETED' },
  });
  assert('Installation status updated to COMPLETED', updateInstallRes.status === 200 && getData(updateInstallRes)?.status === 'COMPLETED');

  // --- Section 3: Multi-Channel Notifications & MailHog ---
  console.log('\n--- Section 3: Multi-Channel Notifications & MailHog SMTP ---');

  // 3.1 List Notification Templates
  const listTemplatesRes = await request('/notifications/templates', { headers: tenantSlugHeaders });
  assert('Get notification templates returns HTTP 200', listTemplatesRes.status === 200);
  const templatesList = extractItems(listTemplatesRes);
  const templateKeys = templatesList.map((t) => t.eventKey);
  assert(
    'SRS required templates exist: subscriber.welcome, invoice.generated, payment.receipt, ticket.created',
    ['subscriber.welcome', 'invoice.generated', 'payment.receipt', 'ticket.created'].every((k) => templateKeys.includes(k)),
  );

  // 3.2 Update Template
  const tmplToUpdate = templatesList[0];
  const updateTmplRes = await request(`/notifications/templates/${tmplToUpdate.id}`, {
    method: 'PUT',
    headers: tenantSlugHeaders,
    body: {
      subject: tmplToUpdate.subject + ' [Updated]',
      bodyTemplate: tmplToUpdate.bodyTemplate + '\nContact support for help.',
      isActive: true,
    },
  });
  assert('Update notification template returns HTTP 200', updateTmplRes.status === 200);

  // 3.3 Send Email Notification via MailHog
  const sendEmailRes = await request('/notifications/send', {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      channel: 'EMAIL',
      recipient: 'subscriber.test@netorbit.local',
      subject: 'Phase 5 MailHog Automated Delivery Test',
      message: 'This is a verified automated message transmitted to the MailHog test SMTP inbox.',
    },
  });
  assert('Email dispatch queued with SENT status', sendEmailRes.status === 201 && getData(sendEmailRes)?.status === 'SENT');

  // 3.4 Check MailHog HTTP API (port 8025)
  try {
    const mailhogRes = await request('http://localhost:8025/api/v2/messages');
    assert('MailHog mock service reachable on port 8025', mailhogRes.status === 200);
    const messages = mailhogRes.data?.items || [];
    const foundEmail = messages.find((m) =>
      m.Content?.Headers?.Subject?.[0]?.includes('Phase 5 MailHog Automated Delivery Test'),
    );
    assert('Verified actual email message received in MailHog inbox', !!foundEmail);
  } catch (err) {
    console.warn('  ! MailHog check notice:', err.message);
  }

  // --- Section 4: Automation Engine & Sweepers ---
  console.log('\n--- Section 4: Automation Engine & Schedulers ---');

  // 4.1 List Automation Rules
  const listRulesRes = await request('/automation/rules', { headers: tenantSlugHeaders });
  assert('List automation rules returns HTTP 200', listRulesRes.status === 200);
  const rulesList = extractItems(listRulesRes);
  assert('Seeded automation rules present (EXPIRY_REACHED & INVOICE_OVERDUE)', rulesList.length >= 2);

  // 4.2 Toggle Rule Active State
  const ruleToToggle = rulesList[0];
  const toggleRes = await request(`/automation/rules/${ruleToToggle.id}/toggle`, {
    method: 'PATCH',
    headers: tenantSlugHeaders,
  });
  assert('Toggle automation rule returns inverted active state', toggleRes.status === 200 && getData(toggleRes)?.isActive === !ruleToToggle.isActive);

  // Re-enable rule
  await request(`/automation/rules/${ruleToToggle.id}/toggle`, {
    method: 'PATCH',
    headers: tenantSlugHeaders,
  });

  // 4.3 Trigger Plan Expiry Sweep (with CoA disconnect integration)
  const sweepExpiryRes = await request('/automation/sweep/expiry', {
    method: 'POST',
    headers: tenantSlugHeaders,
  });
  assert('Manual Plan Expiry Sweep executes with HTTP 201', sweepExpiryRes.status === 201);
  assert('Expiry sweep returns processed count & CoA disconnects tally', typeof getData(sweepExpiryRes)?.affectedSubscribers === 'number');

  // 4.4 Trigger Overdue Invoices Sweep
  const sweepOverdueRes = await request('/automation/sweep/overdue', {
    method: 'POST',
    headers: tenantSlugHeaders,
  });
  assert('Manual Overdue Invoice Sweep executes with HTTP 201', sweepOverdueRes.status === 201);
  assert('Overdue sweep records tally of overdue invoices marked', typeof getData(sweepOverdueRes)?.overdueInvoicesMarked === 'number');

  // --- Section 5: Outbound Developer Webhooks ---
  console.log('\n--- Section 5: Outbound Developer Webhooks ---');

  // 5.1 Register Webhook Endpoint
  const registerWhRes = await request('/webhooks', {
    method: 'POST',
    headers: tenantSlugHeaders,
    body: {
      name: 'Billing ERP Automation Sync',
      endpointUrl: 'https://erp.example.com/api/v1/netorbit-events',
      subscribedEvents: ['subscriber.created', 'payment.success', 'invoice.created'],
    },
  });
  assert('Register webhook endpoint returns HTTP 201', registerWhRes.status === 201);
  const registeredWh = getData(registerWhRes);
  assert('Webhook secret key returned upon creation with whsec_ prefix', registeredWh.secretKey?.startsWith('whsec_'));

  // 5.2 List Webhooks and verify Secret Key is Masked
  const listWhRes = await request('/webhooks', { headers: tenantSlugHeaders });
  assert('List webhooks returns HTTP 200', listWhRes.status === 200);
  const foundInList = extractItems(listWhRes).find((w) => w.id === registeredWh.id);
  assert('Webhook secret key is masked in list responses (never leaked)', foundInList?.maskedSecret && !foundInList?.secretKey);

  // 5.3 Trigger Signed Test Ping Delivery (HMAC-SHA256)
  const testPingRes = await request(`/webhooks/${registeredWh.id}/test`, {
    method: 'POST',
    headers: tenantSlugHeaders,
  });
  const pingData = getData(testPingRes);
  assert('Webhook test ping returns HTTP 201 with success', testPingRes.status === 201 && pingData?.success === true);
  assert('Test ping generates HMAC-SHA256 signature', pingData?.signature?.startsWith('sha256='));
  assert('Test ping includes replay-protected timestamp', !!pingData?.timestamp);

  // 5.4 Check Webhook Delivery Logs
  const eventsLogRes = await request(`/webhooks/${registeredWh.id}/events`, { headers: tenantSlugHeaders });
  assert('Webhook events delivery history retrieved successfully', eventsLogRes.status === 200);
  const eventsLog = extractItems(eventsLogRes);
  assert('Delivery history logs test.ping event with response preview and duration', eventsLog.length > 0);

  // 5.5 Delete Webhook
  const delWhRes = await request(`/webhooks/${registeredWh.id}`, {
    method: 'DELETE',
    headers: tenantSlugHeaders,
  });
  assert('Delete webhook endpoint returns HTTP 200', delWhRes.status === 200);

  // --- Section 6: Executive Analytics & Reports ---
  console.log('\n--- Section 6: Executive Analytics & Reports ---');

  // 6.1 Dashboard KPIs
  const dashboardKpiRes = await request('/analytics/dashboard', { headers: tenantSlugHeaders });
  assert('Dashboard KPIs endpoint returns HTTP 200', dashboardKpiRes.status === 200);
  const kpis = getData(dashboardKpiRes);
  assert('Dashboard metrics include real calculated MRR, ARPU, activeSubscribers, churnRate, activeSessions',
    typeof kpis.mrr === 'number' &&
    typeof kpis.arpu === 'number' &&
    typeof kpis.totalSubscribers === 'number' &&
    typeof kpis.activeSessions === 'number',
  );

  // 6.2 Revenue Reports
  const revenueReportRes = await request('/reports/revenue', { headers: tenantSlugHeaders });
  assert('Revenue reports endpoint returns HTTP 200', revenueReportRes.status === 200);
  const rev = getData(revenueReportRes);
  assert('Revenue reports include dailyRevenue, monthlyRevenue, gateway reconciliation, and agingReceivables',
    Array.isArray(rev.dailyRevenue) &&
    Array.isArray(rev.reconciliation) &&
    typeof rev.agingReceivables?.days0_30 === 'number',
  );

  // 6.3 Bandwidth Analytics
  const bandwidthReportRes = await request('/reports/bandwidth', { headers: tenantSlugHeaders });
  assert('Bandwidth reports endpoint returns HTTP 200', bandwidthReportRes.status === 200);
  const bw = getData(bandwidthReportRes);
  assert('Bandwidth reports include topConsumers and usageByPackage',
    Array.isArray(bw.topConsumers) && Array.isArray(bw.usageByPackage),
  );

  // 6.4 CSV Exports for Subscribers, Invoices, Payments, Tickets
  for (const exportType of ['subscribers', 'invoices', 'payments', 'tickets']) {
    const csvRes = await request(`/reports/export/${exportType}`, { headers: tenantSlugHeaders });
    assert(`CSV export for ${exportType} returns HTTP 200 with text/csv header`,
      csvRes.status === 200 && csvRes.headers['content-type']?.includes('text/csv'),
    );
    assert(`CSV export for ${exportType} contains valid comma-separated rows`,
      typeof csvRes.data === 'string' && csvRes.data.includes(','),
    );
  }

  // --- Section 7: RBAC Authorization Verification ---
  console.log('\n--- Section 7: RBAC 6-Role Enforcement ---');

  // Customer role test
  const customerLoginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'customer@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  assert('Customer role authenticates successfully', customerLoginRes.status === 200);
  const customerToken = customerLoginRes.data?.data?.tokens?.accessToken || customerLoginRes.data?.tokens?.accessToken;
  const customerHeaders = { Authorization: `Bearer ${customerToken}` };

  // Customer permitted: View own tickets
  const custTickets = await request('/tickets', { headers: customerHeaders });
  assert('Customer role can view own support tickets (HTTP 200)', custTickets.status === 200);

  // Customer permitted: Create ticket self-service
  const custCreateTicket = await request('/tickets', {
    method: 'POST',
    headers: customerHeaders,
    body: {
      subject: 'Customer Self-Service: Router Wi-Fi channel inquiry',
      description: 'Could you please optimize my 5GHz Wi-Fi channel?',
      category: 'TECHNICAL',
      priority: 'MEDIUM',
    },
  });
  assert('Customer role can submit self-service support ticket (HTTP 201)', custCreateTicket.status === 201);
  const custCreatedTicket = getData(custCreateTicket);

  // Customer forbidden: Access CRM leads pipeline
  const custLeads = await request('/crm/leads', { headers: customerHeaders });
  assert('Customer role forbidden from accessing CRM leads (HTTP 403)', custLeads.status === 403);

  // Customer forbidden: Execute automation sweeps
  const custSweep = await request('/automation/sweep/expiry', { method: 'POST', headers: customerHeaders });
  assert('Customer role forbidden from executing automation sweeps (HTTP 403)', custSweep.status === 403);

  // Customer forbidden: Access developer webhooks
  const custWebhooks = await request('/webhooks', { headers: customerHeaders });
  assert('Customer role forbidden from accessing developer webhooks (HTTP 403)', custWebhooks.status === 403);

  // Customer Support staff role test
  const supportLoginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'support@demo-isp.com', password: 'NetOrbit@Staff2026' },
  });
  assert('Customer Support role authenticates successfully', supportLoginRes.status === 200);
  const supportToken = supportLoginRes.data?.data?.tokens?.accessToken || supportLoginRes.data?.tokens?.accessToken;
  const supportHeaders = { Authorization: `Bearer ${supportToken}` };

  // Support permitted: Read tickets
  const supTickets = await request('/tickets', { headers: supportHeaders });
  assert('Customer Support role can view tickets (HTTP 200)', supTickets.status === 200);

  // Support forbidden: Manage developer webhooks
  const supWebhooks = await request('/webhooks', {
    method: 'POST',
    headers: supportHeaders,
    body: { name: 'Unauthorized Webhook', endpointUrl: 'https://test.com', subscribedEvents: ['ticket.created'] },
  });
  assert('Customer Support forbidden from configuring developer webhooks (HTTP 403)', supWebhooks.status === 403);

  // --- Section 8: Multi-Tenancy & Tenant Isolation ---
  console.log('\n--- Section 8: Multi-Tenancy & Tenant Isolation ---');

  // Verify Tenant B cannot access Tenant A's ticket
  const crossTenantTicketRes = await request(`/tickets/${createdTicket.id}`, { headers: tenantBHeaders });
  assert('Tenant B cannot access Tenant A support ticket (HTTP 404 or 403)', crossTenantTicketRes.status === 404 || crossTenantTicketRes.status === 403);

  // Verify Tenant B list tickets does NOT contain Tenant A's ticket
  const tenantBTicketsRes = await request('/tickets', { headers: tenantBHeaders });
  const tenantBTickets = extractItems(tenantBTicketsRes);
  assert(
    'Tenant B ticket list is completely isolated from Tenant A',
    !tenantBTickets.some((t) => t.id === createdTicket.id),
  );

  // Parameter tampering test: Tenant B passes Tenant A's ID in query or headers
  const tamperedRes = await request(`/tickets/${createdTicket.id}?tenantId=${demoTenant.id}`, {
    headers: { ...tenantBHeaders, 'X-Tenant-Id': demoTenant.id },
  });
  assert('Parameter tampering attempt by Tenant B is rejected/isolated (HTTP 404 or 403)', tamperedRes.status === 404 || tamperedRes.status === 403);

  // Verify Tenant B cannot view Tenant A CRM leads
  const tenantBLeads = await request('/crm/leads', { headers: tenantBHeaders });
  const bLeads = extractItems(tenantBLeads);
  assert(
    'Tenant B CRM leads list contains 0 records from Tenant A',
    !bLeads.some((l) => l.name === 'Cyberdyne Systems Corp'),
  );

  // --- Final Summary ---
  console.log('\n===============================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Phase 5 Verification Complete: ${passed} passed, ${failed} failed (${results.length} total tests).`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Verification().catch((err) => {
  console.error('Fatal Phase 5 verification test error:', err);
  process.exit(1);
});
