import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/roles.dto';
import { RedisClientService } from '../../core/cache/redis-client.service';

export const SRS_PRIMARY_ROLES = [
  {
    name: 'Super Administrator',
    slug: 'super_administrator',
    description: 'Complete system-wide administrative control across all tenants and infrastructure.',
    isSystem: true,
    isSrsRole: true,
  },
  {
    name: 'Tenant Administrator',
    slug: 'tenant_administrator',
    description: 'Full management authority within the ISP tenant workspace.',
    isSystem: true,
    isSrsRole: true,
  },
  {
    name: 'Network Administrator',
    slug: 'network_administrator',
    description: 'Manages routers, NAS devices, IPAM pools, RADIUS servers, and bandwidth profiles.',
    isSystem: true,
    isSrsRole: true,
  },
  {
    name: 'Billing Executive',
    slug: 'billing_executive',
    description: 'Oversees billing cycles, invoices, payment gateways, wallets, and financial logs.',
    isSystem: true,
    isSrsRole: true,
  },
  {
    name: 'Customer Support',
    slug: 'customer_support',
    description: 'Handles subscriber inquiries, support tickets, CRM leads, and voucher issuance.',
    isSystem: true,
    isSrsRole: true,
  },
  {
    name: 'Customer',
    slug: 'customer',
    description: 'Subscriber self-service role for account overview, payments, and ticket submissions.',
    isSystem: true,
    isSrsRole: true,
  },
];

export const ALL_PERMISSIONS = [
  // Tenants
  { resource: 'tenants', action: 'create', description: 'Create new ISP tenants' },
  { resource: 'tenants', action: 'read', description: 'View ISP tenants' },
  { resource: 'tenants', action: 'update', description: 'Update ISP tenants' },
  { resource: 'tenants', action: 'delete', description: 'Suspend or delete ISP tenants' },

  // Users
  { resource: 'users', action: 'create', description: 'Create and invite users' },
  { resource: 'users', action: 'read', description: 'View user accounts' },
  { resource: 'users', action: 'update', description: 'Update user profiles' },
  { resource: 'users', action: 'delete', description: 'Deactivate user accounts' },

  // Roles & Permissions
  { resource: 'roles', action: 'create', description: 'Create custom roles' },
  { resource: 'roles', action: 'read', description: 'View roles and permissions' },
  { resource: 'roles', action: 'update', description: 'Update role permissions' },
  { resource: 'roles', action: 'delete', description: 'Delete custom roles' },

  // Subscribers
  { resource: 'subscribers', action: 'create', description: 'Register new subscribers' },
  { resource: 'subscribers', action: 'read', description: 'View subscriber details and status' },
  { resource: 'subscribers', action: 'update', description: 'Update subscriber info and plans' },
  { resource: 'subscribers', action: 'delete', description: 'Terminate subscriber accounts' },

  // Packages & Plans
  { resource: 'packages', action: 'create', description: 'Create internet service packages' },
  { resource: 'packages', action: 'read', description: 'View service packages' },
  { resource: 'packages', action: 'update', description: 'Update pricing and bandwidth profiles' },
  { resource: 'packages', action: 'delete', description: 'Retire service packages' },

  // Billing & Invoices
  { resource: 'billing', action: 'create', description: 'Generate manual invoices' },
  { resource: 'billing', action: 'read', description: 'View invoices and statements' },
  { resource: 'billing', action: 'update', description: 'Apply credits and waivers' },
  { resource: 'billing', action: 'delete', description: 'Void invoices' },

  // Payments
  { resource: 'payments', action: 'create', description: 'Record manual and online payments' },
  { resource: 'payments', action: 'read', description: 'View payment transactions' },
  { resource: 'payments', action: 'update', description: 'Process payment adjustments' },
  { resource: 'payments', action: 'refund', description: 'Initiate payment refunds' },

  // NAS Devices
  { resource: 'nas', action: 'create', description: 'Register new NAS devices' },
  { resource: 'nas', action: 'read', description: 'View NAS devices and status' },
  { resource: 'nas', action: 'update', description: 'Update NAS configuration and secrets' },
  { resource: 'nas', action: 'delete', description: 'Remove NAS devices' },

  // RADIUS & AAA
  { resource: 'radius', action: 'create', description: 'Create and configure RADIUS users' },
  { resource: 'radius', action: 'read', description: 'View active sessions and accounting logs' },
  { resource: 'radius', action: 'update', description: 'Update RADIUS user credentials and profiles' },
  { resource: 'radius', action: 'delete', description: 'Remove or disable RADIUS users' },
  { resource: 'radius', action: 'disconnect', description: 'Disconnect sessions and send CoA' },
  { resource: 'radius', action: 'manage', description: 'Manage RADIUS server settings' },

  // Network & Topology
  { resource: 'network', action: 'create', description: 'Add routers and IP pools' },
  { resource: 'network', action: 'read', description: 'View network topology and IPAM' },
  { resource: 'network', action: 'update', description: 'Edit router and pool parameters' },
  { resource: 'network', action: 'delete', description: 'Remove network devices' },

  // Vouchers
  { resource: 'vouchers', action: 'create', description: 'Generate voucher batches' },
  { resource: 'vouchers', action: 'read', description: 'View voucher inventory and status' },
  { resource: 'vouchers', action: 'update', description: 'Activate or suspend vouchers' },
  { resource: 'vouchers', action: 'delete', description: 'Revoke vouchers' },

  // CRM & Helpdesk
  { resource: 'tickets', action: 'create', description: 'Open support tickets' },
  { resource: 'tickets', action: 'read', description: 'View support tickets' },
  { resource: 'tickets', action: 'update', description: 'Update and resolve tickets' },
  { resource: 'tickets', action: 'delete', description: 'Close tickets' },

  // Audit Logs
  { resource: 'audit', action: 'read', description: 'Inspect audit trail logs' },
  { resource: 'audit', action: 'export', description: 'Export audit logs to CSV' },

  // Settings & Branding
  { resource: 'settings', action: 'read', description: 'View tenant configuration' },
  { resource: 'settings', action: 'update', description: 'Update branding, webhooks, and gateway keys' },

  // Phase 6: SNMP Discovery & Topology
  { resource: 'snmp', action: 'create', description: 'Register and discover SNMP devices' },
  { resource: 'snmp', action: 'read', description: 'View SNMP devices and topology' },
  { resource: 'snmp', action: 'update', description: 'Update SNMP configurations and poll settings' },
  { resource: 'snmp', action: 'delete', description: 'Remove SNMP devices' },

  // Phase 6: BGP & OSPF Routing Management
  { resource: 'routing', action: 'create', description: 'Configure BGP peers and OSPF processes' },
  { resource: 'routing', action: 'read', description: 'View routing status and peers' },
  { resource: 'routing', action: 'update', description: 'Update routing configurations' },
  { resource: 'routing', action: 'delete', description: 'Remove routing configurations' },
  { resource: 'routing', action: 'deploy', description: 'Deploy and rollback routing configurations' },

  // Phase 6: Geo-Distributed RADIUS Proxy Mesh
  { resource: 'radius_mesh', action: 'create', description: 'Enroll RADIUS mesh nodes' },
  { resource: 'radius_mesh', action: 'read', description: 'View RADIUS mesh nodes and health' },
  { resource: 'radius_mesh', action: 'update', description: 'Update mesh node parameters and policies' },
  { resource: 'radius_mesh', action: 'manage', description: 'Trigger mesh failover and CoA routing' },
];

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permRepo: Repository<Permission>,
    private readonly redis: RedisClientService,
  ) {}

  async findAll(tenantId?: string | null): Promise<Role[]> {
    const qb = this.roleRepo
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('role.isSystem = true');

    if (tenantId) {
      qb.orWhere('role.tenantId = :tenantId', { tenantId });
    }

    return qb.orderBy('role.name', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async create(dto: CreateRoleDto, tenantId?: string): Promise<Role> {
    const existing = await this.roleRepo.findOne({
      where: { slug: dto.slug, tenantId: tenantId ?? IsNull() },
    });
    if (existing) {
      throw new BadRequestException(`Role with slug '${dto.slug}' already exists`);
    }

    let permissions: Permission[] = [];
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      permissions = await this.permRepo.findBy({ id: In(dto.permissionIds) });
    }

    const role = this.roleRepo.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description || null,
      tenantId: tenantId || null,
      isSystem: false,
      isSrsRole: false,
      permissions,
    });

    return this.roleRepo.save(role);
  }

  async update(id: string, dto: UpdateRoleDto, tenantId?: string): Promise<Role> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ForbiddenException('Cannot modify core system roles');
    }
    if (tenantId && role.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant role modification disallowed');
    }

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permissionIds) {
      role.permissions = await this.permRepo.findBy({ id: In(dto.permissionIds) });
    }

    const saved = await this.roleRepo.save(role);
    await this.redis.del(`role_perms:${id}`);
    return saved;
  }

  async remove(id: string, tenantId?: string): Promise<{ success: boolean }> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }
    if (tenantId && role.tenantId !== tenantId) {
      throw new ForbiddenException('Cross-tenant deletion disallowed');
    }
    await this.roleRepo.softDelete(id);
    await this.redis.del(`role_perms:${id}`);
    return { success: true };
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.permRepo.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  async seedDefaultRolesAndPermissions(): Promise<void> {
    // 1. Seed Permissions
    for (const p of ALL_PERMISSIONS) {
      const exists = await this.permRepo.findOne({
        where: { resource: p.resource, action: p.action },
      });
      if (!exists) {
        await this.permRepo.save(this.permRepo.create(p));
      }
    }

    const allPerms = await this.permRepo.find();

    // 2. Seed 6 SRS Primary Roles
    for (const r of SRS_PRIMARY_ROLES) {
      let role = await this.roleRepo.findOne({
        where: { slug: r.slug, isSystem: true },
        relations: ['permissions'],
      });

      if (!role) {
        role = this.roleRepo.create({
          name: r.name,
          slug: r.slug,
          description: r.description,
          isSystem: true,
          isSrsRole: true,
          tenantId: null,
        });
      }

      // Assign permissions based on role
      if (r.slug === 'super_administrator') {
        role.permissions = allPerms;
      } else if (r.slug === 'tenant_administrator') {
        role.permissions = allPerms.filter((p) => p.resource !== 'tenants' || p.action === 'read');
      } else if (r.slug === 'network_administrator') {
        role.permissions = allPerms.filter((p) =>
          ['network', 'radius', 'packages', 'subscribers'].includes(p.resource),
        );
      } else if (r.slug === 'billing_executive') {
        role.permissions = allPerms.filter((p) =>
          ['billing', 'payments', 'packages', 'subscribers', 'vouchers'].includes(p.resource),
        );
      } else if (r.slug === 'customer_support') {
        role.permissions = allPerms.filter((p) =>
          ['tickets', 'crm', 'subscribers', 'vouchers'].includes(p.resource) &&
          ['read', 'create', 'update'].includes(p.action),
        );
      } else if (r.slug === 'customer') {
        role.permissions = allPerms.filter((p) =>
          (p.resource === 'tickets' && ['create', 'read'].includes(p.action)) ||
          (p.resource === 'billing' && p.action === 'read') ||
          (p.resource === 'payments' && ['create', 'read'].includes(p.action)),
        );
      }

      await this.roleRepo.save(role);
    }
  }
}
