import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { Installation } from './entities/installation.entity';
import { Technician } from './entities/technician.entity';
import { Complaint } from './entities/complaint.entity';
import { Subscriber, SubscriberStatus } from '../subscribers/entities/subscriber.entity';
import { Package } from '../packages/entities/package.entity';
import {
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
  CreateInstallationDto,
  UpdateInstallationDto,
  CreateTechnicianDto,
  CreateComplaintDto,
} from './dto/crm.dto';
import { LeadStatus } from '@netorbit/shared-types';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Installation)
    private readonly installationRepo: Repository<Installation>,
    @InjectRepository(Technician)
    private readonly technicianRepo: Repository<Technician>,
    @InjectRepository(Complaint)
    private readonly complaintRepo: Repository<Complaint>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
  ) {}

  async getOverview(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};

    const [leadsCount, installationsCount, complaintsCount, techniciansCount] = await Promise.all([
      this.leadRepo.count({ where: whereTenant }),
      this.installationRepo.count({ where: whereTenant }),
      this.complaintRepo.count({ where: whereTenant }),
      this.technicianRepo.count({ where: whereTenant }),
    ]);

    return {
      totalLeads: leadsCount,
      scheduledInstallations: installationsCount,
      activeComplaints: complaintsCount,
      totalTechnicians: techniciansCount,
    };
  }

  // --- Leads ---
  async findAllLeads(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};
    return this.leadRepo.find({
      where: whereTenant,
      relations: ['convertedSubscriber'],
      order: { createdAt: 'DESC' },
    });
  }

  async createLead(dto: CreateLeadDto, tenantId: string) {
    const lead = this.leadRepo.create({
      tenantId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      interestedPackage: dto.interestedPackage,
      status: LeadStatus.NEW,
      notes: dto.notes,
    });
    return this.leadRepo.save(lead);
  }

  async updateLead(
    id: string,
    dto: UpdateLeadDto,
    tenantId: string | null,
    isSuperAdmin = false,
  ) {
    const lead = await this.leadRepo.findOne({
      where: { id, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (dto.status) lead.status = dto.status;
    if (dto.notes !== undefined) lead.notes = dto.notes;
    if (dto.interestedPackage !== undefined) lead.interestedPackage = dto.interestedPackage;

    return this.leadRepo.save(lead);
  }

  async convertLead(
    id: string,
    dto: ConvertLeadDto,
    tenantId: string | null,
    isSuperAdmin = false,
  ) {
    const lead = await this.leadRepo.findOne({
      where: { id, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    if (lead.status === LeadStatus.CONVERTED || lead.convertedSubscriberId) {
      throw new BadRequestException('Lead has already been converted to a subscriber');
    }

    const pkg = await this.packageRepo.findOne({
      where: { id: dto.packageId, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!pkg) {
      throw new BadRequestException(`Target package with ID ${dto.packageId} does not exist`);
    }

    // Split name
    const parts = (lead.name || 'Subscriber').trim().split(/\s+/);
    const firstName = parts[0] || 'Subscriber';
    const lastName = parts.slice(1).join(' ') || 'Customer';

    const timestamp = Date.now().toString().slice(-4);
    const username = dto.username || `${firstName.toLowerCase()}_${timestamp}`;
    const accountNumber = `SUB-${Date.now().toString().slice(-6)}`;

    const subscriber = this.subscriberRepo.create({
      tenantId: lead.tenantId,
      accountNumber,
      username,
      firstName,
      lastName,
      email: lead.email || `${username}@customer.netorbit.local`,
      phone: lead.phone,
      addressLine1: dto.installationAddress || lead.address || 'Standard Address',
      city: 'City',
      state: 'State',
      postalCode: '10001',
      packageId: pkg.id,
      status: SubscriberStatus.ACTIVE,
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 86400 * 1000),
      autoRenew: true,
      notes: `Converted from Lead ${lead.name} (${lead.id})`,
    });

    const savedSubscriber = await this.subscriberRepo.save(subscriber);

    // Update lead to link with subscriber
    lead.status = LeadStatus.CONVERTED;
    lead.convertedSubscriberId = savedSubscriber.id;
    lead.convertedAt = new Date();
    await this.leadRepo.save(lead);

    return {
      lead,
      subscriber: savedSubscriber,
    };
  }

  // --- Installations ---
  async findAllInstallations(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};
    return this.installationRepo.find({
      where: whereTenant,
      relations: ['technician', 'lead'],
      order: { scheduledDate: 'ASC' },
    });
  }

  async createInstallation(dto: CreateInstallationDto, tenantId: string) {
    const installation = this.installationRepo.create({
      tenantId,
      customerName: dto.customerName,
      contactPhone: dto.contactPhone,
      address: dto.address,
      scheduledDate: new Date(dto.scheduledDate),
      technicianId: dto.technicianId,
      leadId: dto.leadId,
      subscriberId: dto.subscriberId,
      notes: dto.notes,
    });
    return this.installationRepo.save(installation);
  }

  async updateInstallation(
    id: string,
    dto: UpdateInstallationDto,
    tenantId: string | null,
    isSuperAdmin = false,
  ) {
    const inst = await this.installationRepo.findOne({
      where: { id, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!inst) {
      throw new NotFoundException(`Installation with ID ${id} not found`);
    }

    if (dto.status) inst.status = dto.status;
    if (dto.technicianId !== undefined) inst.technicianId = dto.technicianId;
    if (dto.notes !== undefined) inst.notes = dto.notes;

    return this.installationRepo.save(inst);
  }

  // --- Technicians ---
  async findAllTechnicians(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};
    return this.technicianRepo.find({
      where: whereTenant,
      order: { name: 'ASC' },
    });
  }

  async createTechnician(dto: CreateTechnicianDto, tenantId: string) {
    const tech = this.technicianRepo.create({
      tenantId,
      name: dto.name,
      mobile: dto.mobile,
      email: dto.email,
      serviceZone: dto.serviceZone,
      status: dto.status,
    });
    return this.technicianRepo.save(tech);
  }

  // --- Complaints ---
  async findAllComplaints(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};
    return this.complaintRepo.find({
      where: whereTenant,
      order: { createdAt: 'DESC' },
    });
  }

  async createComplaint(dto: CreateComplaintDto, tenantId: string) {
    const comp = this.complaintRepo.create({
      tenantId,
      customerName: dto.customerName,
      phone: dto.phone,
      category: dto.category,
      description: dto.description,
      status: 'OPEN',
    });
    return this.complaintRepo.save(comp);
  }
}
