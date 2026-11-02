let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  try {
    playwright = require('C:/Users/HP/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
  } catch (err) {
    playwright = require('C:/Users/HP/AppData/Local/npm-cache/_npx/15c61037b1978c83/node_modules/playwright');
  }
}
const { chromium } = playwright;
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/HP/.gemini/antigravity-ide/brain/b52f3794-e121-4220-927f-dcbe5afc91a4';

async function capture() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Capturing Light Theme screenshots...');

  // 1. Login Page
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_01_login.png') });
  console.log('✓ Captured Login screen');

  // Login as demo tenant
  const slugInput = page.locator('input[placeholder="e.g. demo-isp"]');
  if ((await slugInput.count()) > 0) await slugInput.fill('demo-isp');
  await page.locator('input[type="email"]').fill('tenant@demo-isp.com');
  await page.locator('input[type="password"]').fill('NetOrbit@Staff2026');
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_02_dashboard.png') });
  console.log('✓ Captured Dashboard in light theme');

  // 2. SNMP & Topology
  await page.goto('http://localhost:3000/snmp', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_03_snmp.png') });
  console.log('✓ Captured SNMP & Topology in light theme');

  // 3. Routing
  await page.goto('http://localhost:3000/routing', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_04_routing.png') });
  console.log('✓ Captured Routing in light theme');

  // 4. RADIUS Mesh
  await page.goto('http://localhost:3000/radius-mesh', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_05_radius_mesh.png') });
  console.log('✓ Captured RADIUS Mesh in light theme');

  // 5. Helpdesk Tickets
  await page.goto('http://localhost:3000/tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_06_tickets.png') });
  console.log('✓ Captured Tickets in light theme');

  // 6. CRM & Field Service
  await page.goto('http://localhost:3000/crm', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_06b_crm.png') });
  console.log('✓ Captured CRM in light theme');

  // 6. Customer Portal
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_07_customer_portal.png') });
  console.log('✓ Captured Customer Portal in light theme');

  // 7. Captive Portal
  await page.goto('http://localhost:3003/demo-isp', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'light_08_captive_portal.png') });
  console.log('✓ Captured Captive Portal in light theme');

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(console.error);
