import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../core/database/typeorm.config';
import { Tenant, TenantPlan, TenantStatus } from '../modules/tenants/entities/tenant.entity';
import { User, UserStatus } from '../modules/users/entities/user.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { Permission } from '../modules/roles/entities/permission.entity';
import { ALL_PERMISSIONS, SRS_PRIMARY_ROLES } from '../modules/roles/roles.service';
import { Package, PackageType, BillingCycle } from '../modules/packages/entities/package.entity';
import { Subscriber, SubscriberStatus } from '../modules/subscribers/entities/subscriber.entity';
import { NasDevice, NasVendorType, NasDeviceStatus } from '../modules/nas/entities/nas-device.entity';
import { RadiusUser, RadiusAuthMethod, RadiusAccountStatus } from '../modules/radius/entities/radius-user.entity';
import { RadiusAccounting, RadiusAccountingStatusType } from '../modules/radius/entities/radius-accounting.entity';
import { encryptCredential } from '../modules/radius/radius-crypto.util';
import { IpPool, IpPoolType, IpVersion } from '../modules/ipam/entities/ip-pool.entity';
import { IpAddressAllocation, IpAllocationStatus } from '../modules/ipam/entities/ip-allocation.entity';
import { DhcpScope, DhcpScopeStatus } from '../modules/dhcp/entities/dhcp-scope.entity';
import { DhcpLease, DhcpLeaseStatus } from '../modules/dhcp/entities/dhcp-lease.entity';
import { Voucher, VoucherStatus } from '../modules/vouchers/entities/voucher.entity';
import { Invoice, InvoiceStatus } from '../modules/billing/entities/invoice.entity';
import { PaymentTransaction, PaymentGateway, PaymentStatus } from '../modules/payments/entities/payment-transaction.entity';
import { Ticket } from '../modules/tickets/entities/ticket.entity';
import { TicketComment } from '../modules/tickets/entities/ticket-comment.entity';
import { Lead } from '../modules/crm/entities/lead.entity';
import { Installation } from '../modules/crm/entities/installation.entity';
import { Technician } from '../modules/crm/entities/technician.entity';
import { NotificationTemplate } from '../modules/notifications/entities/notification-template.entity';
import { AutomationRule } from '../modules/automation/entities/automation-rule.entity';
import { Webhook } from '../modules/webhooks/entities/webhook.entity';
import { SnmpDevice } from '../modules/snmp/entities/snmp-device.entity';
import { NetworkInterface } from '../modules/snmp/entities/network-interface.entity';
import { TopologyLink } from '../modules/snmp/entities/topology-link.entity';
import { BgpPeer } from '../modules/routing/entities/bgp-peer.entity';
import { OspfProcess } from '../modules/routing/entities/ospf-process.entity';
import { OspfNeighbor } from '../modules/routing/entities/ospf-neighbor.entity';
import { RadiusMeshNode } from '../modules/radius-mesh/entities/radius-mesh-node.entity';
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  LeadStatus,
  InstallationStatus,
  TechnicianStatus,
  NotificationChannel,
  AutomationTrigger,
  AutomationAction,
  SnmpVersion,
  NetworkDeviceStatus,
  InterfaceAdminStatus,
  InterfaceOperStatus,
  TopologyLinkType,
  BgpPeerStatus,
  OspfNeighborState,
  RadiusMeshNodeStatus,
  RadiusMeshNodeRole,
} from '@netorbit/shared-types';

async function seed() {
  console.log('--- NetOrbit Phase 1 Seed Initializing ---');
  await AppDataSource.initialize();
  console.log('Connected to PostgreSQL Database.');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const permRepo = AppDataSource.getRepository(Permission);
    const roleRepo = AppDataSource.getRepository(Role);
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const userRepo = AppDataSource.getRepository(User);

    // 1. Seed Permissions
    console.log('Seeding SRS Permissions...');
    for (const p of ALL_PERMISSIONS) {
      const exists = await permRepo.findOne({
        where: { resource: p.resource, action: p.action },
      });
      if (!exists) {
        await permRepo.save(permRepo.create(p));
      }
    }
    const allPerms = await permRepo.find();
    console.log(`Permissions verified (${allPerms.length} permissions loaded).`);

    // 2. Seed 6 SRS Primary Roles
    console.log('Seeding 6 SRS Primary Roles...');
    const savedRoles: Record<string, Role> = {};
    for (const r of SRS_PRIMARY_ROLES) {
      let role = await roleRepo.findOne({
        where: { slug: r.slug, isSystem: true },
        relations: ['permissions'],
      });

      if (!role) {
        role = roleRepo.create({
          name: r.name,
          slug: r.slug,
          description: r.description,
          isSystem: true,
          isSrsRole: true,
          tenantId: null,
        });
      }

      if (r.slug === 'super_administrator') {
        role.permissions = allPerms;
      } else if (r.slug === 'tenant_administrator') {
        role.permissions = allPerms.filter((p) => p.resource !== 'tenants' || p.action === 'read');
      } else if (r.slug === 'network_administrator') {
        role.permissions = allPerms.filter((p) =>
          ['network', 'nas', 'radius', 'packages', 'subscribers', 'snmp', 'routing', 'radius_mesh'].includes(p.resource),
        );
      } else if (r.slug === 'billing_executive') {
        role.permissions = allPerms.filter((p) =>
          ['billing', 'payments', 'packages', 'subscribers', 'vouchers'].includes(p.resource),
        );
      } else if (r.slug === 'customer_support') {
        role.permissions = allPerms.filter((p) =>
          (['tickets', 'crm', 'subscribers', 'vouchers'].includes(p.resource) &&
          ['read', 'create', 'update'].includes(p.action)) ||
          (p.resource === 'snmp' && p.action === 'read'),
        );
      } else if (r.slug === 'customer') {
        role.permissions = allPerms.filter((p) =>
          (p.resource === 'tickets' && ['create', 'read'].includes(p.action)) ||
          (p.resource === 'billing' && p.action === 'read') ||
          (p.resource === 'payments' && ['create', 'read'].includes(p.action)),
        );
      }

      savedRoles[r.slug] = await roleRepo.save(role);
      console.log(` - Role ready: ${role.name} (${role.slug}) with ${role.permissions.length} permissions`);
    }

    // 3. Seed Super Administrator
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@netorbit.local';
    const superAdminPass = process.env.SUPER_ADMIN_PASSWORD || 'NetOrbit@Admin2026';
    let superAdmin = await userRepo.findOne({
      where: { email: superAdminEmail },
      relations: ['roles'],
    });

    if (!superAdmin) {
      console.log(`Creating initial Super Administrator (${superAdminEmail})...`);
      const passwordHash = await bcrypt.hash(superAdminPass, 10);
      superAdmin = userRepo.create({
        email: superAdminEmail,
        firstName: 'System',
        lastName: 'SuperAdmin',
        passwordHash,
        isSuperAdmin: true,
        status: UserStatus.ACTIVE,
        tenantId: null,
        roles: [savedRoles['super_administrator']],
      });
      await userRepo.save(superAdmin);
      console.log('Super Administrator successfully created.');
    } else {
      console.log('Super Administrator already exists.');
    }

    // 4. Seed Demo ISP Tenant
    const demoSlug = 'demo-isp';
    let demoTenant = await tenantRepo.findOne({ where: { slug: demoSlug } });
    if (!demoTenant) {
      console.log(`Creating Demonstration ISP Tenant (${demoSlug})...`);
      demoTenant = tenantRepo.create({
        name: 'Orbit Fiber ISP',
        slug: demoSlug,
        plan: TenantPlan.ENTERPRISE,
        status: TenantStatus.ACTIVE,
        config: {
          branding: {
            companyName: 'Orbit Fiber Communications',
            logo: null,
            primaryColor: '#0ea5e9',
            favicon: null,
          },
          features: {
            captivePortal: true,
            vouchers: true,
            whatsappNotifications: true,
            multiNas: true,
            apiAccess: true,
            radiusIntegration: true,
            maxSubscribers: 10000,
            maxNasDevices: 50,
            customDomain: null,
          },
          billing: {
            currency: 'USD',
            taxRate: 18,
            taxName: 'GST',
            invoicePrefix: 'OFB',
            paymentGateways: ['razorpay', 'stripe', 'paypal', 'phonepe', 'cashfree'],
          },
        },
      });
      demoTenant = await tenantRepo.save(demoTenant);
      console.log('Demo ISP Tenant created.');
    }

    // 5. Seed Demo Tenant Staff Accounts for all SRS roles
    const demoUsers = [
      {
        email: 'tenant@demo-isp.com',
        firstName: 'Arthur',
        lastName: 'Dent',
        roleSlug: 'tenant_administrator',
      },
      {
        email: 'network@demo-isp.com',
        firstName: 'Miles',
        lastName: 'O\'Brien',
        roleSlug: 'network_administrator',
      },
      {
        email: 'billing@demo-isp.com',
        firstName: 'Scrooge',
        lastName: 'McDuck',
        roleSlug: 'billing_executive',
      },
      {
        email: 'support@demo-isp.com',
        firstName: 'Deanna',
        lastName: 'Troi',
        roleSlug: 'customer_support',
      },
      {
        email: 'customer@demo-isp.com',
        firstName: 'Sarah',
        lastName: 'Connor',
        roleSlug: 'customer',
      },
    ];

    const defaultStaffPass = 'NetOrbit@Staff2026';
    const staffHash = await bcrypt.hash(defaultStaffPass, 10);

    for (const u of demoUsers) {
      const exists = await userRepo.findOne({
        where: { email: u.email, tenantId: demoTenant.id },
      });
      if (!exists) {
        const assignedRole = savedRoles[u.roleSlug];
        const newUser = userRepo.create({
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          passwordHash: staffHash,
          tenantId: demoTenant.id,
          isSuperAdmin: false,
          status: UserStatus.ACTIVE,
          roles: assignedRole ? [assignedRole] : [],
        });
        await userRepo.save(newUser);
        console.log(` - Demo user created: ${u.email} [${u.roleSlug}]`);
      }
    }

    // 6. Seed Demo Packages
    console.log('Seeding Demo Packages...');
    const packageRepo = AppDataSource.getRepository(Package);
    const demoPackages = [
      {
        name: 'Fiber Basic 30M',
        slug: 'fiber-basic-30m',
        description: 'Affordable everyday high-speed fiber for basic web browsing and streaming.',
        type: PackageType.BROADBAND,
        price: 29.99,
        currency: 'USD',
        billingCycle: BillingCycle.MONTHLY,
        validityDays: 30,
        downloadSpeedMbps: 30,
        uploadSpeedMbps: 15,
        dataQuotaGb: 250,
        isActive: true,
        isPublic: true,
        features: ['Standard Support', 'Wi-Fi 5 Router', 'Free Installation'],
      },
      {
        name: 'Fiber Pro 100M',
        slug: 'fiber-pro-100m',
        description: 'High-speed broadband for HD multi-device streaming and remote work.',
        type: PackageType.BROADBAND,
        price: 49.99,
        currency: 'USD',
        billingCycle: BillingCycle.MONTHLY,
        validityDays: 30,
        downloadSpeedMbps: 100,
        uploadSpeedMbps: 50,
        dataQuotaGb: null,
        burstSpeedMbps: 120,
        isActive: true,
        isPublic: true,
        features: ['Priority Support', 'Wi-Fi 6 Router', 'Unlimited Data', 'Free Cloud Storage'],
      },
      {
        name: 'Fiber Ultra 300M',
        slug: 'fiber-ultra-300m',
        description: 'Ultra-fast low-latency broadband for 4K streaming, heavy downloads, and gaming.',
        type: PackageType.BROADBAND,
        price: 79.99,
        currency: 'USD',
        billingCycle: BillingCycle.MONTHLY,
        validityDays: 30,
        downloadSpeedMbps: 300,
        uploadSpeedMbps: 150,
        dataQuotaGb: null,
        burstSpeedMbps: 350,
        isActive: true,
        isPublic: true,
        features: ['24/7 VIP Support', 'Mesh Wi-Fi Included', 'Static IP Available', 'Zero Throttling'],
      },
      {
        name: 'Gigabit Enterprise',
        slug: 'gigabit-enterprise',
        description: 'Symmetrical gigabit dedicated fiber line with 99.99% SLA guarantee.',
        type: PackageType.DEDICATED,
        price: 149.99,
        currency: 'USD',
        billingCycle: BillingCycle.MONTHLY,
        validityDays: 30,
        downloadSpeedMbps: 1000,
        uploadSpeedMbps: 1000,
        dataQuotaGb: null,
        isActive: true,
        isPublic: false,
        features: ['99.99% SLA', 'Dedicated Account Manager', '2 Static IPs', 'DDoS Protection'],
      },
    ];

    const savedPackages: Record<string, Package> = {};
    for (const p of demoPackages) {
      let pkg = await packageRepo.findOne({
        where: { tenantId: demoTenant.id, slug: p.slug },
      });
      if (!pkg) {
        pkg = packageRepo.create({
          ...p,
          tenantId: demoTenant.id,
        });
        pkg = await packageRepo.save(pkg);
        console.log(` - Package created: ${pkg.name} ($${pkg.price})`);
      }
      savedPackages[p.slug] = pkg;
    }

    // 7. Seed Demo Subscribers
    console.log('Seeding Demo Subscribers...');
    const subscriberRepo = AppDataSource.getRepository(Subscriber);
    const customerUser = await userRepo.findOne({
      where: { email: 'customer@demo-isp.com', tenantId: demoTenant.id },
    });

    const demoSubscribers = [
      {
        accountNumber: 'SUB-1001',
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'customer@demo-isp.com',
        phone: '+1-555-0101',
        companyName: 'Resistance Cybernetics',
        addressLine1: '8404 Tech Center Blvd',
        city: 'Los Angeles',
        state: 'California',
        postalCode: '90001',
        country: 'US',
        username: 'sarah_connor',
        status: SubscriberStatus.ACTIVE,
        packageSlug: 'fiber-pro-100m',
        userId: customerUser ? customerUser.id : null,
      },
      {
        accountNumber: 'SUB-1002',
        firstName: 'John',
        lastName: 'Connor',
        email: 'john.connor@cyberdyne.org',
        phone: '+1-555-0102',
        companyName: null,
        addressLine1: '124 Elm Street',
        city: 'Los Angeles',
        state: 'California',
        postalCode: '90002',
        country: 'US',
        username: 'john_connor',
        status: SubscriberStatus.ACTIVE,
        packageSlug: 'fiber-ultra-300m',
        userId: null,
      },
      {
        accountNumber: 'SUB-1003',
        firstName: 'Kyle',
        lastName: 'Reese',
        email: 'kyle.reese@techcom.mil',
        phone: '+1-555-0103',
        companyName: 'TechCom Security',
        addressLine1: '520 Military Way',
        city: 'San Francisco',
        state: 'California',
        postalCode: '94101',
        country: 'US',
        username: 'kyle_reese',
        status: SubscriberStatus.SUSPENDED,
        packageSlug: 'fiber-basic-30m',
        userId: null,
      },
      {
        accountNumber: 'SUB-1004',
        firstName: 'Miles',
        lastName: 'Dyson',
        email: 'miles.dyson@cyberdyne.org',
        phone: '+1-555-0104',
        companyName: 'Cyberdyne Systems Corp',
        addressLine1: '18144 El Camino Real',
        city: 'Sunnyvale',
        state: 'California',
        postalCode: '94086',
        country: 'US',
        username: 'miles_dyson',
        status: SubscriberStatus.PENDING,
        packageSlug: 'gigabit-enterprise',
        userId: null,
      },
    ];

    for (const s of demoSubscribers) {
      const existing = await subscriberRepo.findOne({
        where: { tenantId: demoTenant.id, accountNumber: s.accountNumber },
      });
      if (!existing) {
        const assignedPkg = savedPackages[s.packageSlug];
        const startDate = new Date();
        const expiryDate = new Date();
        if (assignedPkg) {
          expiryDate.setDate(expiryDate.getDate() + assignedPkg.validityDays);
        }

        const sub = subscriberRepo.create({
          tenantId: demoTenant.id,
          accountNumber: s.accountNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          phone: s.phone,
          companyName: s.companyName,
          addressLine1: s.addressLine1,
          city: s.city,
          state: s.state,
          postalCode: s.postalCode,
          country: s.country,
          username: s.username,
          status: s.status,
          packageId: assignedPkg ? assignedPkg.id : null,
          userId: s.userId,
          passwordHash: await bcrypt.hash('Broadband@2026', 10),
          startDate: s.status === SubscriberStatus.ACTIVE ? startDate : null,
          expiryDate: s.status === SubscriberStatus.ACTIVE ? expiryDate : null,
        });
        await subscriberRepo.save(sub);
        console.log(` - Subscriber created: ${sub.fullName} (${sub.accountNumber})`);
      }
    }

    // 6. Seed Demo NAS Devices
    console.log('Seeding Demo NAS Devices...');
    const nasRepo = AppDataSource.getRepository(NasDevice);
    const radiusUserRepo = AppDataSource.getRepository(RadiusUser);
    const acctRepo = AppDataSource.getRepository(RadiusAccounting);

    let primaryNas = await nasRepo.findOne({
      where: { tenantId: demoTenant.id, name: 'Core MikroTik CCR2004' },
    });
    if (!primaryNas) {
      primaryNas = nasRepo.create({
        tenantId: demoTenant.id,
        name: 'Core MikroTik CCR2004',
        ipAddress: '192.168.1.1',
        secret: 'NetOrbit@RadiusSecret2026',
        type: NasVendorType.MIKROTIK,
        nasType: 'mikrotik',
        port: 1812,
        coaPort: 3799,
        description: 'Core BNG router for Fiber & PPPoE subscribers',
        isActive: true,
        status: NasDeviceStatus.ACTIVE,
      });
      primaryNas = await nasRepo.save(primaryNas);
      console.log(` - NAS created: ${primaryNas.name} (${primaryNas.ipAddress})`);
    }

    const secondaryNas = await nasRepo.findOne({
      where: { tenantId: demoTenant.id, name: 'Edge Cisco ASR1001' },
    });
    if (!secondaryNas) {
      const edgeNas = nasRepo.create({
        tenantId: demoTenant.id,
        name: 'Edge Cisco ASR1001',
        ipAddress: '10.0.0.1',
        secret: 'NetOrbit@RadiusSecret2026',
        type: NasVendorType.CISCO,
        nasType: 'cisco',
        port: 1812,
        coaPort: 3799,
        description: 'Aggregation router for metro enterprise connections',
        isActive: true,
        status: NasDeviceStatus.ACTIVE,
      });
      await nasRepo.save(edgeNas);
    }

    // 7. Seed Demo RADIUS Users
    console.log('Seeding Demo RADIUS Users...');
    const demoSubs = await subscriberRepo.find({ where: { tenantId: demoTenant.id } });
    for (const sub of demoSubs) {
      const existingRu = await radiusUserRepo.findOne({
        where: { tenantId: demoTenant.id, username: sub.username },
      });
      if (!existingRu) {
        const passwordPlain = 'Broadband@2026';
        const passwordHash = await bcrypt.hash(passwordPlain, 10);
        const cleartextPassword = encryptCredential(passwordPlain);
        const ru = radiusUserRepo.create({
          tenantId: demoTenant.id,
          subscriberId: sub.id,
          username: sub.username,
          passwordHash,
          cleartextPassword,
          authType: RadiusAuthMethod.PAP,
          status: RadiusAccountStatus.ACTIVE,
          simultaneousUse: 1,
          framedIpAddress: sub.staticIp || null,
          macAddress: sub.macAddress || null,
          expiryDate: sub.expiryDate || null,
        });
        await radiusUserRepo.save(ru);
        console.log(` - RADIUS User ready: ${ru.username}`);
      }
    }

    // 8. Seed Demo Active RADIUS Session
    if (demoSubs.length > 0 && primaryNas) {
      const activeSub = demoSubs[0];
      const existingSession = await acctRepo.findOne({
        where: { tenantId: demoTenant.id, username: activeSub.username, acctStatusType: RadiusAccountingStatusType.START },
      });
      if (!existingSession) {
        const session = acctRepo.create({
          tenantId: demoTenant.id,
          subscriberId: activeSub.id,
          nasId: primaryNas.id,
          username: activeSub.username,
          acctSessionId: 'sess-' + Date.now().toString().slice(-6),
          acctUniqueId: 'uniq-' + Date.now().toString().slice(-6),
          nasIpAddress: primaryNas.ipAddress,
          nasPort: 1,
          framedIpAddress: '100.64.1.25',
          callingStationId: '00:1A:2B:3C:4D:5E',
          calledStationId: 'Core-Fiber-01',
          acctStatusType: RadiusAccountingStatusType.START,
          acctSessionTime: 3600,
          bytesIn: '524288000',
          bytesOut: '104857600',
          startTime: new Date(Date.now() - 3600 * 1000),
          lastUpdate: new Date(),
        });
        await acctRepo.save(session);
        console.log(` - Demo Active RADIUS Session seeded: ${session.acctSessionId}`);
      }
    }

    // 9. Seed Demo IPAM Pools & Allocations
    console.log('Seeding Demo IPAM Pools & Allocations...');
    const ipPoolRepo = AppDataSource.getRepository(IpPool);
    const ipAllocRepo = AppDataSource.getRepository(IpAddressAllocation);

    let primaryPool = await ipPoolRepo.findOne({
      where: { tenantId: demoTenant.id, name: 'Primary CGNAT Pool' },
    });
    if (!primaryPool) {
      primaryPool = ipPoolRepo.create({
        tenantId: demoTenant.id,
        name: 'Primary CGNAT Pool',
        subnet: '100.64.0.0/20',
        startIp: '100.64.0.10',
        endIp: '100.64.15.250',
        gateway: '100.64.0.1',
        dnsServers: '8.8.8.8, 1.1.1.1',
        type: IpPoolType.DYNAMIC,
        ipVersion: IpVersion.IPV4,
        totalIps: 4080,
        allocatedIps: demoSubs.length,
        reservedIps: 10,
        isActive: true,
      });
      primaryPool = await ipPoolRepo.save(primaryPool);
      console.log(' - IP Pool created: Primary CGNAT Pool');
    }

    let staticPool = await ipPoolRepo.findOne({
      where: { tenantId: demoTenant.id, name: 'Static Commercial Pool' },
    });
    if (!staticPool) {
      staticPool = ipPoolRepo.create({
        tenantId: demoTenant.id,
        name: 'Static Commercial Pool',
        subnet: '198.51.100.0/24',
        startIp: '198.51.100.10',
        endIp: '198.51.100.100',
        gateway: '198.51.100.1',
        dnsServers: '8.8.8.8, 8.8.4.4',
        type: IpPoolType.STATIC,
        ipVersion: IpVersion.IPV4,
        totalIps: 91,
        allocatedIps: 1,
        reservedIps: 5,
        isActive: true,
      });
      staticPool = await ipPoolRepo.save(staticPool);
      console.log(' - IP Pool created: Static Commercial Pool');
    }

    for (let i = 0; i < Math.min(demoSubs.length, 3); i++) {
      const sub = demoSubs[i];
      const allocIp = `100.64.0.${20 + i}`;
      const existingAlloc = await ipAllocRepo.findOne({
        where: { tenantId: demoTenant.id, ipAddress: allocIp },
      });
      if (!existingAlloc) {
        const alloc = ipAllocRepo.create({
          tenantId: demoTenant.id,
          poolId: primaryPool.id,
          ipAddress: allocIp,
          macAddress: sub.macAddress || `00:1A:2B:3C:4D:${(10 + i).toString(16).toUpperCase()}`,
          status: IpAllocationStatus.ALLOCATED,
          allocatedToType: 'subscriber',
          allocatedToId: sub.id,
        });
        await ipAllocRepo.save(alloc);
      }
    }

    // 10. Seed Demo DHCP Scopes & Leases
    console.log('Seeding Demo DHCP Scopes & Leases...');
    const dhcpScopeRepo = AppDataSource.getRepository(DhcpScope);
    const dhcpLeaseRepo = AppDataSource.getRepository(DhcpLease);

    let primaryScope = await dhcpScopeRepo.findOne({
      where: { tenantId: demoTenant.id, name: 'Core LAN Hotspot Subnet' },
    });
    if (!primaryScope) {
      primaryScope = dhcpScopeRepo.create({
        tenantId: demoTenant.id,
        poolId: primaryPool.id,
        name: 'Core LAN Hotspot Subnet',
        interfaceName: 'ether2-lan',
        leaseTimeSeconds: 86400,
        domainName: 'hotspot.demo-isp.local',
        dnsServers: '8.8.8.8, 1.1.1.1',
        gateway: '100.64.0.1',
        subnetMask: '255.255.240.0',
        status: DhcpScopeStatus.ACTIVE,
      });
      primaryScope = await dhcpScopeRepo.save(primaryScope);
      console.log(' - DHCP Scope created: Core LAN Hotspot Subnet');
    }

    const demoLeaseIp = '100.64.0.50';
    const existingLease = await dhcpLeaseRepo.findOne({
      where: { tenantId: demoTenant.id, ipAddress: demoLeaseIp },
    });
    if (!existingLease) {
      const lease = dhcpLeaseRepo.create({
        tenantId: demoTenant.id,
        scopeId: primaryScope.id,
        ipAddress: demoLeaseIp,
        macAddress: '02:42:C0:A8:0A:64',
        hostname: 'demo-hotspot-client',
        isStatic: false,
        status: DhcpLeaseStatus.ACTIVE,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 86400 * 1000),
      });
      await dhcpLeaseRepo.save(lease);
      console.log(' - Demo DHCP Lease created: 100.64.0.50');
    }

    // 11. Seed Demo Hotspot Vouchers
    console.log('Seeding Demo Hotspot Vouchers...');
    const voucherRepo = AppDataSource.getRepository(Voucher);
    const seededPackages = await packageRepo.find({ where: { tenantId: demoTenant.id } });
    const voucherPkg = seededPackages[0] || null;

    const sampleVouchers = [
      {
        code: 'NET-WIFI-1001',
        pin: '4821',
        batchNumber: 'BATCH-2026-001',
        durationMinutes: 60,
        dataQuotaMb: 1024,
        price: 1.99,
        status: VoucherStatus.ACTIVE,
      },
      {
        code: 'NET-WIFI-2002',
        pin: '9134',
        batchNumber: 'BATCH-2026-001',
        durationMinutes: 1440,
        dataQuotaMb: 5120,
        price: 4.99,
        status: VoucherStatus.ACTIVE,
      },
      {
        code: 'NET-WIFI-3003',
        pin: '1287',
        batchNumber: 'BATCH-2026-002',
        durationMinutes: 10080,
        dataQuotaMb: 20480,
        price: 14.99,
        status: VoucherStatus.ACTIVE,
      },
      {
        code: 'NET-WIFI-4004',
        pin: '5561',
        batchNumber: 'BATCH-2026-002',
        durationMinutes: 1440,
        dataQuotaMb: 5120,
        price: 4.99,
        status: VoucherStatus.REDEEMED,
        usedCount: 1,
        redeemedByMac: '02:42:C0:A8:0A:64',
        redeemedAt: new Date(Date.now() - 3600 * 1000),
      },
    ];

    for (const v of sampleVouchers) {
      const exists = await voucherRepo.findOne({
        where: { tenantId: demoTenant.id, code: v.code },
      });
      if (!exists) {
        const voucher = voucherRepo.create({
          tenantId: demoTenant.id,
          packageId: voucherPkg ? voucherPkg.id : null,
          ...v,
          expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
        });
        await voucherRepo.save(voucher);
        console.log(` - Voucher created: ${v.code}`);
      }
    }

    // 12. Seed Demo Invoices & Payments
    console.log('Seeding Demo Invoices & Payments...');
    const invoiceRepo = AppDataSource.getRepository(Invoice);
    const paymentRepo = AppDataSource.getRepository(PaymentTransaction);

    if (demoSubs.length > 0) {
      const sub1 = demoSubs[0];
      const existingInv1 = await invoiceRepo.findOne({
        where: { tenantId: demoTenant.id, invoiceNumber: 'INV-2026-0001' },
      });
      let inv1 = existingInv1;
      if (!inv1) {
        inv1 = invoiceRepo.create({
          tenantId: demoTenant.id,
          subscriberId: sub1.id,
          invoiceNumber: 'INV-2026-0001',
          billingCycle: BillingCycle.MONTHLY,
          status: InvoiceStatus.PAID,
          subtotal: 49.99,
          taxRate: 18.0,
          taxAmount: 9.0,
          discountAmount: 0.0,
          totalAmount: 58.99,
          paidAmount: 58.99,
          balanceAmount: 0.0,
          currency: 'USD',
          issueDate: new Date(Date.now() - 30 * 86400 * 1000),
          dueDate: new Date(Date.now() - 15 * 86400 * 1000),
          paidAt: new Date(Date.now() - 16 * 86400 * 1000),
          items: [
            {
              description: 'Fiber Pro 100M - Monthly Subscription',
              quantity: 1,
              unitPrice: 49.99,
              amount: 49.99,
            },
          ],
          notes: 'Auto-billed for recurring broadband plan',
        });
        inv1 = await invoiceRepo.save(inv1);
        console.log(' - Demo Paid Invoice created: INV-2026-0001');

        const pay1 = paymentRepo.create({
          tenantId: demoTenant.id,
          invoiceId: inv1.id,
          subscriberId: sub1.id,
          gateway: PaymentGateway.STRIPE,
          gatewayTransactionId: 'ch_stripe_demo_3N8792019481029',
          gatewayOrderId: 'ord_stripe_9921',
          amount: 58.99,
          currency: 'USD',
          status: PaymentStatus.SUCCESS,
          paymentMethod: 'credit_card',
          gatewayResponse: { brand: 'visa', last4: '4242' },
          idempotencyKey: 'idem-pay-0001',
          notes: 'Credit Card payment processed successfully via Stripe',
        });
        await paymentRepo.save(pay1);
        console.log(' - Demo Payment Transaction created for INV-2026-0001');
      }

      const existingInv2 = await invoiceRepo.findOne({
        where: { tenantId: demoTenant.id, invoiceNumber: 'INV-2026-0002' },
      });
      if (!existingInv2) {
        const inv2 = invoiceRepo.create({
          tenantId: demoTenant.id,
          subscriberId: sub1.id,
          invoiceNumber: 'INV-2026-0002',
          billingCycle: BillingCycle.MONTHLY,
          status: InvoiceStatus.PENDING,
          subtotal: 49.99,
          taxRate: 18.0,
          taxAmount: 9.0,
          discountAmount: 0.0,
          totalAmount: 58.99,
          paidAmount: 0.0,
          balanceAmount: 58.99,
          currency: 'USD',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 86400 * 1000),
          items: [
            {
              description: 'Fiber Pro 100M - Monthly Subscription (Upcoming)',
              quantity: 1,
              unitPrice: 49.99,
              amount: 49.99,
            },
          ],
          notes: 'Monthly billing cycle renewal',
        });
        await invoiceRepo.save(inv2);
        console.log(' - Demo Pending Invoice created: INV-2026-0002');
      }
      // ----------------------------------------------------------------------
      // PHASE 5: Helpdesk, CRM, Notifications, Automation, Webhooks
      // ----------------------------------------------------------------------
      console.log('Seeding Phase 5: Notification Templates, Automation, CRM, and Helpdesk...');
      const ticketRepo = AppDataSource.getRepository(Ticket);
      const commentRepo = AppDataSource.getRepository(TicketComment);
      const leadRepo = AppDataSource.getRepository(Lead);
      const installRepo = AppDataSource.getRepository(Installation);
      const techRepo = AppDataSource.getRepository(Technician);
      const tmplRepo = AppDataSource.getRepository(NotificationTemplate);
      const autoRepo = AppDataSource.getRepository(AutomationRule);
      const webhookRepo = AppDataSource.getRepository(Webhook);

      // 1. Notification Templates
      const templates = [
        {
          eventKey: 'subscriber.welcome',
          channel: NotificationChannel.EMAIL,
          subject: 'Welcome to NetOrbit High-Speed Broadband',
          bodyTemplate: 'Hello {{name}},\n\nWelcome to {{tenantName}}! Your subscriber account {{username}} has been activated on the {{packageName}} plan.\n\nThank you for choosing us!',
        },
        {
          eventKey: 'invoice.generated',
          channel: NotificationChannel.EMAIL,
          subject: 'Invoice #{{invoiceNumber}} Generated',
          bodyTemplate: 'Dear {{name}},\n\nYour monthly statement for {{amount}} {{currency}} is now available. Due date: {{dueDate}}.\n\nPlease pay promptly to ensure uninterrupted service.',
        },
        {
          eventKey: 'payment.receipt',
          channel: NotificationChannel.EMAIL,
          subject: 'Payment Receipt: {{invoiceNumber}}',
          bodyTemplate: 'Dear {{name}},\n\nWe have received your payment of {{amount}} {{currency}} via {{gateway}}.\nTransaction ID: {{transactionId}}.\n\nThank you!',
        },
        {
          eventKey: 'subscriber.expiry_warning',
          channel: NotificationChannel.EMAIL,
          subject: 'Action Required: Your NetOrbit Plan is Expiring Soon',
          bodyTemplate: 'Hello {{name}},\n\nYour broadband subscription will expire on {{expiryDate}}. Please renew your package to prevent speed suspension.',
        },
        {
          eventKey: 'ticket.created',
          channel: NotificationChannel.EMAIL,
          subject: 'Support Ticket Created: [{{ticketNumber}}] {{subject}}',
          bodyTemplate: 'Hello {{name}},\n\nYour support ticket #{{ticketNumber}} has been logged with {{priority}} priority.\nOur team will review your inquiry shortly.',
        },
        {
          eventKey: 'ticket.updated',
          channel: NotificationChannel.EMAIL,
          subject: 'Update on Support Ticket #{{ticketNumber}}',
          bodyTemplate: 'Hello {{name}},\n\nThere is a new update on your ticket #{{ticketNumber}}:\n\n{{message}}\n\nLog in to your customer portal to respond.',
        },
      ];

      for (const t of templates) {
        const existing = await tmplRepo.findOne({
          where: { tenantId: demoTenant.id, eventKey: t.eventKey, channel: t.channel },
        });
        if (!existing) {
          await tmplRepo.save(
            tmplRepo.create({
              tenantId: demoTenant.id,
              eventKey: t.eventKey,
              channel: t.channel,
              subject: t.subject,
              bodyTemplate: t.bodyTemplate,
              isActive: true,
            }),
          );
        }
      }
      console.log(' - Notification Templates seeded.');

      // 2. Technicians
      let tech1 = await techRepo.findOne({ where: { tenantId: demoTenant.id, mobile: '+15550192831' } });
      if (!tech1) {
        tech1 = await techRepo.save(
          techRepo.create({
            tenantId: demoTenant.id,
            name: 'John Wire',
            mobile: '+15550192831',
            email: 'john.wire@netorbit.local',
            serviceZone: 'North Zone',
            status: TechnicianStatus.ACTIVE,
          }),
        );
      }
      let tech2 = await techRepo.findOne({ where: { tenantId: demoTenant.id, mobile: '+15550192832' } });
      if (!tech2) {
        tech2 = await techRepo.save(
          techRepo.create({
            tenantId: demoTenant.id,
            name: 'Sarah Cable',
            mobile: '+15550192832',
            email: 'sarah.cable@netorbit.local',
            serviceZone: 'East Zone',
            status: TechnicianStatus.BUSY,
          }),
        );
      }
      console.log(' - Technicians seeded.');

      // 3. CRM Leads
      const existingLead1 = await leadRepo.findOne({ where: { tenantId: demoTenant.id, email: 'contact@acme.corp' } });
      if (!existingLead1) {
        await leadRepo.save(
          leadRepo.create({
            tenantId: demoTenant.id,
            name: 'Acme Corporation HQ',
            phone: '+15550192999',
            email: 'contact@acme.corp',
            address: '500 Corporate Blvd, Tech District',
            interestedPackage: 'Fiber 500M Enterprise',
            status: LeadStatus.QUALIFIED,
            notes: 'High-value business account. Ready for site survey.',
          }),
        );
      }

      const existingLead2 = await leadRepo.findOne({ where: { tenantId: demoTenant.id, email: 'jane.doe@example.com' } });
      if (!existingLead2) {
        await leadRepo.save(
          leadRepo.create({
            tenantId: demoTenant.id,
            name: 'Jane Doe',
            phone: '+15550192888',
            email: 'jane.doe@example.com',
            address: '742 Evergreen Terrace',
            interestedPackage: 'Fiber Pro 100M',
            status: LeadStatus.NEW,
            notes: 'Inquired via website lead form.',
          }),
        );
      }
      console.log(' - CRM Leads seeded.');

      // 4. Field Installation Work Order
      const existingInst = await installRepo.findOne({ where: { tenantId: demoTenant.id, customerName: 'Acme Corporation HQ' } });
      if (!existingInst) {
        await installRepo.save(
          installRepo.create({
            tenantId: demoTenant.id,
            customerName: 'Acme Corporation HQ',
            contactPhone: '+15550192999',
            address: '124 Innovation Way, Tech Park',
            scheduledDate: new Date(Date.now() + 2 * 86400 * 1000),
            status: InstallationStatus.SCHEDULED,
            technicianId: tech1.id,
            subscriberId: sub1 ? sub1.id : null,
            notes: 'Install GPON ONT and verify optical power levels (-18dBm).',
          }),
        );
      }
      console.log(' - Field Installation Work Order seeded.');

      // 5. Support Tickets & Comments
      const existingTicket = await ticketRepo.findOne({ where: { tenantId: demoTenant.id, ticketNumber: 'TCK-202610-0001' } });
      if (!existingTicket) {
        const dueAt = new Date();
        dueAt.setHours(dueAt.getHours() + 8); // High priority SLA = 8 hours

        const ticket = await ticketRepo.save(
          ticketRepo.create({
            tenantId: demoTenant.id,
            ticketNumber: 'TCK-202610-0001',
            subject: 'Frequent latency spikes during peak hours',
            description: 'Experiencing packet loss and 120ms ping times between 8 PM and 10 PM on streaming services.',
            category: TicketCategory.TECHNICAL,
            priority: TicketPriority.HIGH,
            status: TicketStatus.IN_PROGRESS,
            subscriberId: sub1 ? sub1.id : null,
            assignedToId: null,
            slaDueAt: dueAt,
          }),
        );

        const customerUserId = sub1?.userId || superAdmin.id;
        await commentRepo.save([
          commentRepo.create({
            ticketId: ticket.id,
            userId: customerUserId,
            comment: 'We noticed the jitter starting 3 days ago. Rebooting the router did not resolve.',
            isInternal: false,
          }),
          commentRepo.create({
            ticketId: ticket.id,
            userId: superAdmin.id,
            comment: 'Internal Note: OLT uplink shows 85% saturation. Scheduled traffic re-routing via Tier-1 transit.',
            isInternal: true,
          }),
          commentRepo.create({
            ticketId: ticket.id,
            userId: superAdmin.id,
            comment: 'Our network team is investigating the uplink node in your sector. We will keep you updated.',
            isInternal: false,
          }),
        ]);
        console.log(' - Support Ticket TCK-202610-0001 & comments seeded.');
      }

      // 6. Automation Rules
      const autoRules = [
        {
          name: 'Auto-Suspend Expired Accounts & Terminate RADIUS Sessions',
          description: 'Runs periodic sweep to suspend expired accounts and disconnect live PPPoE/IPoE sessions via CoA',
          triggerEvent: AutomationTrigger.EXPIRY_REACHED,
          actionType: AutomationAction.SUSPEND_SUBSCRIBER,
          actionPayload: { disconnectSession: true, notifySubscriber: true },
        },
        {
          name: 'Overdue Invoices Dunning Reminder',
          description: 'Identifies overdue unpaid invoices and dispatches payment reminders',
          triggerEvent: AutomationTrigger.INVOICE_OVERDUE,
          actionType: AutomationAction.SEND_NOTIFICATION,
          actionPayload: { channel: 'EMAIL', template: 'invoice.overdue' },
        },
      ];

      for (const ar of autoRules) {
        const existingRule = await autoRepo.findOne({
          where: { tenantId: demoTenant.id, name: ar.name },
        });
        if (!existingRule) {
          await autoRepo.save(
            autoRepo.create({
              tenantId: demoTenant.id,
              name: ar.name,
              description: ar.description,
              triggerEvent: ar.triggerEvent,
              actionType: ar.actionType,
              actionPayload: ar.actionPayload,
              isActive: true,
            }),
          );
        }
      }
      console.log(' - Automation Rules seeded.');

      // 7. Developer Outbound Webhook
      const existingWh = await webhookRepo.findOne({
        where: { tenantId: demoTenant.id, endpointUrl: 'https://erp.netorbit.local/webhooks' },
      });
      if (!existingWh) {
        await webhookRepo.save(
          webhookRepo.create({
            tenantId: demoTenant.id,
            name: 'Corporate ERP Integration Webhook',
            endpointUrl: 'https://erp.netorbit.local/webhooks',
            secretKey: 'whsec_7d9e481b0a3240e980f839c4125b740a12e8b93',
            subscribedEvents: ['subscriber.created', 'payment.success', 'invoice.created'],
            isActive: true,
          }),
        );
        console.log(' - Developer Outbound Webhook seeded.');
      }

      // 8. Phase 6: SNMP Devices & Network Interfaces
      const snmpDeviceRepo = AppDataSource.getRepository(SnmpDevice);
      const ifaceRepo = AppDataSource.getRepository(NetworkInterface);
      const linkRepo = AppDataSource.getRepository(TopologyLink);

      let coreRouter = await snmpDeviceRepo.findOne({
        where: { tenantId: demoTenant.id, ipAddress: '10.200.1.1' },
      });
      if (!coreRouter) {
        coreRouter = await snmpDeviceRepo.save(
          snmpDeviceRepo.create({
            tenantId: demoTenant.id,
            name: 'Core-MikroTik-CCR2004',
            ipAddress: '10.200.1.1',
            port: 161,
            version: SnmpVersion.V2C,
            communityString: encryptCredential('isp-secure-community-2026'),
            vendor: 'MikroTik',
            model: 'CCR2004-16G-2S+',
            sysName: 'core-ccr2004.netorbit.internal',
            sysDescr: 'RouterOS v7.14 Carrier Core Router',
            sysLocation: 'POP-1 Data Center Rack 4',
            uptimeSeconds: 1450000,
            status: NetworkDeviceStatus.ONLINE,
            pollingIntervalSeconds: 60,
          }),
        );

        await ifaceRepo.save(
          ifaceRepo.create({
            deviceId: coreRouter.id,
            ifIndex: 1,
            name: 'sfp-plus1',
            alias: 'Transit Upstream 10G',
            macAddress: 'D4:CA:6D:E1:01:A1',
            adminStatus: InterfaceAdminStatus.UP,
            operStatus: InterfaceOperStatus.UP,
            speedBps: 10000000000,
            inOctets: 154829384920,
            outOctets: 98472938410,
            lastPolledAt: new Date(),
          }),
        );

        const coreIf2 = await ifaceRepo.save(
          ifaceRepo.create({
            deviceId: coreRouter.id,
            ifIndex: 2,
            name: 'ether1',
            alias: 'Distribution Trunk to Switch-01',
            macAddress: 'D4:CA:6D:E1:01:A2',
            adminStatus: InterfaceAdminStatus.UP,
            operStatus: InterfaceOperStatus.UP,
            speedBps: 1000000000,
            inOctets: 58291049280,
            outOctets: 12492810480,
            lastPolledAt: new Date(),
          }),
        );

        const aggSwitch = await snmpDeviceRepo.save(
          snmpDeviceRepo.create({
            tenantId: demoTenant.id,
            name: 'Agg-Cisco-Cat3850',
            ipAddress: '10.200.1.2',
            port: 161,
            version: SnmpVersion.V2C,
            communityString: encryptCredential('isp-secure-community-2026'),
            vendor: 'Cisco',
            model: 'Catalyst 3850',
            sysName: 'agg-c3850.netorbit.internal',
            sysDescr: 'Cisco IOS-XE 16.6.4 High-Density Switch',
            sysLocation: 'POP-1 Distribution Rack 2',
            uptimeSeconds: 2900000,
            status: NetworkDeviceStatus.ONLINE,
            pollingIntervalSeconds: 60,
          }),
        );

        const aggIf1 = await ifaceRepo.save(
          ifaceRepo.create({
            deviceId: aggSwitch.id,
            ifIndex: 1,
            name: 'GigabitEthernet1/0/1',
            alias: 'Uplink to Core-MikroTik',
            macAddress: '00:1E:F7:2C:98:01',
            adminStatus: InterfaceAdminStatus.UP,
            operStatus: InterfaceOperStatus.UP,
            speedBps: 1000000000,
            inOctets: 12492810480,
            outOctets: 58291049280,
            lastPolledAt: new Date(),
          }),
        );

        // Topology Link
        await linkRepo.save(
          linkRepo.create({
            tenantId: demoTenant.id,
            sourceDeviceId: coreRouter.id,
            sourceInterfaceId: coreIf2.id,
            targetDeviceId: aggSwitch.id,
            targetInterfaceId: aggIf1.id,
            linkType: TopologyLinkType.LLDP,
            speedBps: 1000000000,
            status: 'UP',
          }),
        );

        console.log(' - SNMP Devices, Interfaces & Topology Link seeded.');
      }

      // 9. Phase 6: BGP Peers & OSPF Processes
      const bgpRepo = AppDataSource.getRepository(BgpPeer);
      const ospfProcRepo = AppDataSource.getRepository(OspfProcess);
      const ospfNeighRepo = AppDataSource.getRepository(OspfNeighbor);

      const existingBgp = await bgpRepo.findOne({
        where: { tenantId: demoTenant.id, peerIp: '198.51.100.1' },
      });
      if (!existingBgp) {
        await bgpRepo.save(
          bgpRepo.create({
            tenantId: demoTenant.id,
            deviceId: coreRouter ? coreRouter.id : undefined,
            name: 'Transit-Upstream-AS174',
            description: 'Cogent Primary 10G Transit Link',
            localAsn: 64512,
            remoteAsn: 174,
            peerIp: '198.51.100.1',
            md5Secret: encryptCredential('bgp-md5-secret-key-2026'),
            status: BgpPeerStatus.ESTABLISHED,
            prefixesReceived: 850120,
            prefixesAdvertised: 16,
            uptimeSeconds: 86400 * 21,
            isActive: true,
          }),
        );

        await bgpRepo.save(
          bgpRepo.create({
            tenantId: demoTenant.id,
            deviceId: coreRouter ? coreRouter.id : undefined,
            name: 'IXP-Peering-AS6939',
            description: 'Hurricane Electric Internet Exchange',
            localAsn: 64512,
            remoteAsn: 6939,
            peerIp: '198.51.100.2',
            md5Secret: encryptCredential('bgp-md5-secret-he-2026'),
            status: BgpPeerStatus.ESTABLISHED,
            prefixesReceived: 145200,
            prefixesAdvertised: 16,
            uptimeSeconds: 86400 * 45,
            isActive: true,
          }),
        );
        console.log(' - BGP Peers seeded.');
      }

      const existingOspf = await ospfProcRepo.findOne({
        where: { tenantId: demoTenant.id, processId: 1 },
      });
      if (!existingOspf) {
        const ospfProc = await ospfProcRepo.save(
          ospfProcRepo.create({
            tenantId: demoTenant.id,
            deviceId: coreRouter ? coreRouter.id : undefined,
            processId: 1,
            routerId: '10.200.1.1',
            areaId: '0.0.0.0',
            authType: 'NONE',
            status: 'RUNNING',
            interfacesCount: 2,
          }),
        );

        await ospfNeighRepo.save(
          ospfNeighRepo.create({
            processId: ospfProc.id,
            neighborId: '10.200.1.2',
            ipAddress: '10.200.1.2',
            interfaceName: 'ether1',
            priority: 1,
            deadTimeSeconds: 38,
            state: OspfNeighborState.FULL,
          }),
        );
        console.log(' - OSPF Process & Neighbor seeded.');
      }

      // 10. Phase 6: Geo-Distributed RADIUS Mesh Nodes
      const meshNodeRepo = AppDataSource.getRepository(RadiusMeshNode);
      const existingMeshNode = await meshNodeRepo.findOne({
        where: { tenantId: demoTenant.id, nodeId: 'us-east-proxy-01' },
      });
      if (!existingMeshNode) {
        await meshNodeRepo.save([
          meshNodeRepo.create({
            tenantId: demoTenant.id,
            nodeId: 'us-east-proxy-01',
            name: 'US East Primary Gateway',
            region: 'us-east',
            ipAddress: '198.51.100.10',
            authPort: 1812,
            acctPort: 1813,
            coaPort: 3799,
            sharedSecret: encryptCredential('radius-mesh-secret-useast-2026'),
            status: RadiusMeshNodeStatus.ONLINE,
            role: RadiusMeshNodeRole.PRIMARY,
            priority: 20,
            latencyMs: 14,
            loadFactor: 0.22,
            activeSessionsCount: 1420,
            lastHeartbeatAt: new Date(),
          }),
          meshNodeRepo.create({
            tenantId: demoTenant.id,
            nodeId: 'us-west-proxy-02',
            name: 'US West Regional Edge Proxy',
            region: 'us-west',
            ipAddress: '198.51.100.20',
            authPort: 1812,
            acctPort: 1813,
            coaPort: 3799,
            sharedSecret: encryptCredential('radius-mesh-secret-uswest-2026'),
            status: RadiusMeshNodeStatus.ONLINE,
            role: RadiusMeshNodeRole.SECONDARY,
            priority: 15,
            latencyMs: 28,
            loadFactor: 0.18,
            activeSessionsCount: 890,
            lastHeartbeatAt: new Date(),
          }),
          meshNodeRepo.create({
            tenantId: demoTenant.id,
            nodeId: 'eu-central-proxy-03',
            name: 'EU Central Gateway Node',
            region: 'eu-central',
            ipAddress: '198.51.100.30',
            authPort: 1812,
            acctPort: 1813,
            coaPort: 3799,
            sharedSecret: encryptCredential('radius-mesh-secret-eucentral-2026'),
            status: RadiusMeshNodeStatus.ONLINE,
            role: RadiusMeshNodeRole.EDGE_PROXY,
            priority: 10,
            latencyMs: 82,
            loadFactor: 0.09,
            activeSessionsCount: 310,
            lastHeartbeatAt: new Date(),
          }),
        ]);
        console.log(' - Geo-Distributed RADIUS Mesh Nodes seeded.');
      }
    }

    console.log('--- NetOrbit Full Seed (Phases 1-6) Completed Successfully! ---');
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed();
