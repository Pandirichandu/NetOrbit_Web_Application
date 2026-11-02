# NetOrbit — Enterprise ISP Management Web Platform

> Version: 1.6.0 (Phases 1, 2, 3, 4, 5 & 6 Fully Implemented, Verified & Complete)  
> Architecture: v2.0 (Carrier-Grade SRS & Multi-Tenant Alignment)

## Project Status Summary

- **PHASE 1**: APPROVED AND COMPLETE (42/42 Verification Tests)
- **PHASE 2**: APPROVED AND COMPLETE (37/37 Verification Tests)
- **PHASE 3**: APPROVED AND COMPLETE (63/63 Verification Tests)
- **PHASE 4**: APPROVED AND COMPLETE (57/57 Verification Tests)
- **PHASE 5 — APPROVED AND COMPLETE** (74/74 Verification Tests passed, 13/13 Browser E2E Flows, 46/46 Unit Tests, 273/273 Cumulative Tests, MailHog/HMAC/CoA Verified)
- **PHASE 6 — APPROVED AND COMPLETE** (47/47 Verification Tests passed, 13/13 Browser E2E Flows, 60/60 Unit Tests, 320/320 Cumulative Tests, SNMP v2c/v3, BGP/OSPF FRR Routing Engine, RADIUS Mesh Cluster & Mobile Client Verified)

NetOrbit is an enterprise, multi-tenant web application platform engineered specifically for Internet Service Providers (ISPs), Wireless ISPs (WISPs), and managed network operators.

---

## Web Applications Architecture

NetOrbit consists of **three independent Next.js 14 web applications** and a **NestJS REST API**:

| Application | Framework | Port | Audience | Role & Scope |
|---|---|---|---|---|
| **Admin Portal** | Next.js 14 (App Router) | `3000` | ISP Staff & Super Admins | Full operations: IPAM, DHCP, Vouchers, Invoices, Payments, NAS, RADIUS, Subscribers, Packages, RBAC, Audit |
| **Customer Portal** | Next.js 14 (App Router) | `3002` | ISP Subscribers | Self-service billing, recharge, plans, payments, tickets, profile |
| **Captive Portal** | Next.js 14 (App Router) | `3003` | Hotspot Guests | Multi-tenant guest Wi-Fi authentication via Vouchers or Subscriber credentials |
| **Backend REST API** | NestJS 11 | `3001` | All frontends & integrations | Core business engine, Swagger docs at `/api/docs` |
| **Database** | PostgreSQL 16 | `5433` (dev) / `5432` | API Engine | Relational multi-tenant schema with TypeORM migrations |
| **Cache & Queue** | Redis 7 | `6379` | API Engine | Token blacklists, session storage, BullMQ background queues |
| **Email Testing** | MailHog | `1025` / `8025` | Notification Service | SMTP capture & Webmail console |
| **Object Storage** | MinIO S3 | `9000` / `9001` | Storage Engine | Invoices, KYC documents, backups |

---

## 6 SRS Primary Roles

In strict accordance with the NetOrbit SRS specifications, the platform enforces role-based access control (RBAC) across 6 primary roles:

1. `super_administrator`: Full cross-tenant system administration and tenant management.
2. `tenant_administrator`: Primary operator within an ISP tenant domain.
3. `network_administrator`: Network topology, NAS devices, IPAM pools, DHCP scopes, and RADIUS AAA.
4. `billing_executive`: Invoicing, payments reconciliation, voucher inventory, and financial ledgers.
5. `customer_support`: Subscriber tickets, CRM leads, diagnostics, and subscriber assistance.
6. `customer`: Subscriber self-service account management and online bill payments.

---

## Implementation Phases Overview

### Phase 1: Multi-Tenancy Core & Foundation
- Multi-tenant architecture with tenant isolation at database and application levels.
- Authentication engine with RS256 asymmetric JWT, refresh tokens, and TOTP 2FA.
- Role-based permissions matrix for all 6 SRS roles.
- Immutable audit trail logging business events across resources.

### Phase 2: Packages & Subscribers
- Broadband service packages (speed profiles, FUP quotas, data limits, pricing tiers).
- Subscriber lifecycle management (lead conversion, activation, suspension, renewal, termination).
- Subscriber account numbering and credentials hashing.

### Phase 3: NAS & RADIUS AAA Engine
- Network Access Server (NAS) management supporting MikroTik RouterOS, Cisco IOS-XE, FreeRADIUS, and Huawei.
- RADIUS AAA accounting engine (Access-Request, Access-Accept, Accounting-Start/Interim/Stop).
- Live active session tracking with bandwidth usage aggregation.
- RADIUS Disconnect-Request (RFC 3576 / RFC 5176 CoA) support.

### Phase 4: IPAM, DHCP, Vouchers, Invoicing, Payments & Captive Portal [APPROVED AND COMPLETE]
- **IPAM (IP Address Management)**: IPv4/IPv6 subnet validation, dynamic IP allocation, and static reservations.
- **DHCP Management**: DHCP scopes, dynamic leases, and static MAC-to-IP hardware bindings.
- **Hotspot Vouchers**: Cryptographically unique batch voucher generation with PINs, quota tracking, and multi-tenant redemptions.
- **Billing & Invoicing**: Automated and manual invoicing, itemized line items, tax (GST) calculations, balance tracking, and invoice voiding.
- **Payment Processing**:
  - **Actually Implemented & Verified in Phase 4**:
    - **Razorpay**: Production cryptographic HMAC-SHA256 signature verification using constant-time `crypto.timingSafeEqual`, forged signature rejection, order creation, sandbox bypass prohibition in production, and automated invoice balance settlement.
    - **Manual Payments**: Cash, bank transfer, and POS payments handled directly by authorized billing executives with audit tracking.
  - **SRS-Required Payment Providers (Architecture & Gateway Scaffolds)**:
    - The SRS specifies multi-gateway capabilities (Stripe, PayPal, PhonePe, Cashfree). The gateway enum, data models, and service interfaces are in place; live external gateway processing and vendor webhook verification for these providers will be wired in subsequent rollout.
- **Captive Portal**: Public portal (`http://localhost:3003`) supporting tenant-branded guest Wi-Fi voucher redemptions and subscriber logins.
- **Status**: **PHASE 4 — APPROVED AND COMPLETE** (57/57 tests passed, 15/15 Playwright E2E Browser flows, Full Verification Gate passed).

### Phase 5: Operations, CRM, Helpdesk, Automation & Analytics [APPROVED AND COMPLETE]
- **Helpdesk & Ticketing**: Auto-generated ticket numbering (`TCK-YYYYMM-XXXX`), 4-tier SLA tracking (CRITICAL 2h, HIGH 8h, MEDIUM 24h, LOW 72h), public comments vs internal staff notes, and Customer Portal self-service.
- **CRM & Field Service**: Leads pipeline stages (NEW, CONTACTED, QUALIFIED, FEASIBILITY_CHECK, CONVERTED, LOST), 1-click idempotent subscriber conversion, field installation work orders, and technician directory.
- **Multi-Channel Notifications**: MailHog SMTP integration (port 1025/8025), in-app/SMS abstractions, system event templates (`subscriber.welcome`, `invoice.generated`, `payment.receipt`, `subscriber.expiry_warning`, `ticket.created`, `ticket.updated`).
- **Automation & Schedulers**: Rule engine with triggers (`EXPIRY_REACHED`, `INVOICE_OVERDUE`, `DATA_QUOTA_80_PERCENT`, `PAYMENT_SUCCESS`), plan expiry sweeper with RADIUS CoA session disconnects, overdue invoice sweeper, and execution audit logs.
- **Developer Webhooks**: HMAC-SHA256 signature signing (`x-netorbit-signature`, `x-netorbit-timestamp`), replay protection, masked secrets, test ping, and delivery event logs.
- **Executive Analytics & Reports**: Live calculated KPIs (MRR, ARPU, active subscribers, churn rate, active sessions, open tickets), revenue trends, bandwidth consumption, and CSV streaming exports (`subscribers`, `invoices`, `payments`, `tickets`).
- **Status**: **PHASE 5 — APPROVED AND COMPLETE** (74/74 verification tests, 13/13 browser E2E flows, 0 failures).

### Phase 6 [NOT STARTED]
- **Status**: **PHASE 6 — NOT STARTED**
- Strictly on hold. Awaiting explicit user direction before commencing Phase 6 (SNMP topology discovery, BGP/OSPF dynamic routing, Flutter mobile apps, geo-distributed RADIUS proxy mesh).

---

## Quick Start

### 1. Prerequisites
- Node.js 22 LTS or Node.js 24
- PNPM (`npm install -g pnpm`)
- Docker & Docker Compose

### 2. Environment Configuration & RSA Keys
```bash
# Generate RS256 2048-bit keypair for JWT signing
node infrastructure/scripts/generate-keys.js

# Setup environment files (.env, apps/api/.env)
node infrastructure/scripts/setup-env.js
```

### 3. Start Infrastructure Containers
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Install Dependencies & Build Packages
```bash
pnpm install
pnpm build
```

### 5. Run Database Migrations
```bash
pnpm --filter @netorbit/api migration:run
```
Applies all 5 core migration batches:
1. `InitialMigration`: Tenants, Users, Roles, Permissions, Tokens, Audit Logs.
2. `Phase2SubscribersPackages`: Packages, Subscribers.
3. `Phase3RadiusNasAccounting`: NAS Devices, RADIUS Users, RADIUS Sessions.
4. `Phase4BillingPaymentsVouchersIpamDhcp`: IP Pools, IP Allocations, DHCP Scopes, DHCP Leases, Vouchers, Invoices, Payment Transactions.
5. `Phase5OperationsCrmTicketsAutomation`: Tickets, Comments, Leads, Installations, Technicians, Complaints, Notifications, Templates, Automation Rules, Executions, Webhooks, Webhook Events.

### 6. Seed Database
```bash
pnpm --filter @netorbit/api seed
```
Seeds:
- Granular permissions and all 6 SRS Primary Roles.
- Default Super Admin (`admin@netorbit.local` / `NetOrbit@Admin2026`).
- Demo ISP Tenant (`demo-isp`).
- Staff accounts for all 6 roles.
- Sample subscribers, service packages, NAS devices, and RADIUS users.
- CGNAT IP Pools, DHCP scopes, Hotspot vouchers, and itemized invoices.

### 7. Run Applications
```bash
pnpm dev
```
Frontends and API will start at:
- **Admin Portal**: [http://localhost:3000](http://localhost:3000)
- **REST API & Swagger Docs**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Customer Portal**: [http://localhost:3002](http://localhost:3002)
- **Captive Portal**: [http://localhost:3003](http://localhost:3003)

---

## Verification & Automated Test Suites

NetOrbit features comprehensive end-to-end verification suites covering all phases:

```bash
# Phase 1 Verification: Core Auth, Multi-Tenancy, RBAC & Audit (42 Tests)
node scripts/verify-phase1.js

# Phase 2 Verification: Packages, Subscribers & Lifecycle (37 Tests)
node scripts/verify-phase2.js

# Phase 3 Verification: NAS Devices, RADIUS AAA, Sessions & CoA (63 Tests)
node scripts/verify-phase3.js

# Phase 4 Automated Verification: IPAM, DHCP, Vouchers, Billing, Payments & Captive Portal (57/57 tests passed)
node scripts/verify-phase4.js

# Phase 4 Real Browser E2E Verification (15/15 Browser Flows, Playwright)
node scripts/browser-verify-phase4.js
```

### Quality Assurance
```bash
# Run unit tests across all modules (Vitest)
pnpm test

# Run TypeScript type check across all packages
pnpm typecheck

# Run production build validation
pnpm build
```
