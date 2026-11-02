import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { CreateTicketDto, UpdateTicketDto, CreateCommentDto, TicketQueryDto } from './dto/tickets.dto';
import { TicketPriority, TicketStatus } from '@netorbit/shared-types';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment)
    private readonly commentRepo: Repository<TicketComment>,
  ) {}

  /**
   * Determine SLA thresholds according to SRS
   */
  private getSlaHours(priority: TicketPriority): number {
    switch (priority) {
      case TicketPriority.CRITICAL:
        return 2;
      case TicketPriority.HIGH:
        return 8;
      case TicketPriority.MEDIUM:
        return 24;
      case TicketPriority.LOW:
      default:
        return 72;
    }
  }

  /**
   * Generate sequential/unique ticket number: TCK-YYYYMM-XXXX
   */
  private generateTicketNumber(): string {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `TCK-${yyyymm}-${randomSuffix}`;
  }

  async findAll(
    query: TicketQueryDto,
    tenantId: string | null,
    isSuperAdmin = false,
    subscriberFilter?: string,
  ) {
    const { page = 1, limit = 20, search, status, priority, category, subscriberId } = query;
    const skip = (page - 1) * limit;

    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.subscriber', 'subscriber')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .loadRelationCountAndMap('ticket.commentsCount', 'ticket.comments')
      .where('ticket.deletedAt IS NULL');

    if (!isSuperAdmin && tenantId) {
      qb.andWhere('ticket.tenantId = :tenantId', { tenantId });
    }

    if (subscriberFilter) {
      qb.andWhere('ticket.subscriberId = :subscriberFilter', { subscriberFilter });
    } else if (subscriberId) {
      qb.andWhere('ticket.subscriberId = :subscriberId', { subscriberId });
    }

    if (status) {
      qb.andWhere('ticket.status = :status', { status });
    }

    if (priority) {
      qb.andWhere('ticket.priority = :priority', { priority });
    }

    if (category) {
      qb.andWhere('ticket.category = :category', { category });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(ticket.ticketNumber) LIKE LOWER(:search) OR LOWER(ticket.subject) LIKE LOWER(:search) OR LOWER(ticket.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('ticket.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const now = new Date();

    const mappedItems = items.map((t) => ({
      ...t,
      isSlaBreached:
        t.status !== TicketStatus.RESOLVED &&
        t.status !== TicketStatus.CLOSED &&
        now > new Date(t.slaDueAt),
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    tenantId: string | null,
    isSuperAdmin = false,
    isCustomer = false,
    callerSubscriberId?: string,
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.subscriber', 'subscriber')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.comments', 'comments')
      .leftJoinAndSelect('comments.user', 'commentUser')
      .where('ticket.id = :id', { id })
      .andWhere('ticket.deletedAt IS NULL');

    if (!isSuperAdmin && tenantId) {
      qb.andWhere('ticket.tenantId = :tenantId', { tenantId });
    }

    if (isCustomer && callerSubscriberId) {
      qb.andWhere('ticket.subscriberId = :callerSubscriberId', { callerSubscriberId });
    }

    qb.orderBy('comments.createdAt', 'ASC');

    const ticket = await qb.getOne();
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    // Filter out internal comments for customer callers
    if (isCustomer && ticket.comments) {
      ticket.comments = ticket.comments.filter((c) => !c.isInternal);
    }

    const now = new Date();
    return {
      ...ticket,
      isSlaBreached:
        ticket.status !== TicketStatus.RESOLVED &&
        ticket.status !== TicketStatus.CLOSED &&
        now > new Date(ticket.slaDueAt),
    };
  }

  async create(
    dto: CreateTicketDto,
    tenantId: string,
    createdById: string,
    subscriberId?: string,
  ) {
    const priority = dto.priority || TicketPriority.MEDIUM;
    const slaHours = this.getSlaHours(priority);
    const slaDueAt = new Date(Date.now() + slaHours * 3600 * 1000);

    const ticket = this.ticketRepo.create({
      tenantId,
      ticketNumber: this.generateTicketNumber(),
      subject: dto.subject,
      description: dto.description,
      category: dto.category,
      priority,
      status: TicketStatus.OPEN,
      subscriberId: dto.subscriberId || subscriberId,
      createdById,
      assignedToId: dto.assignedToId,
      slaHours,
      slaDueAt,
    });

    return this.ticketRepo.save(ticket);
  }

  async update(
    id: string,
    dto: UpdateTicketDto,
    tenantId: string | null,
    isSuperAdmin = false,
  ) {
    const ticket = await this.ticketRepo.findOne({
      where: { id, ...(isSuperAdmin ? {} : { tenantId: tenantId || undefined }) },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    if (dto.status) {
      ticket.status = dto.status;
      if (dto.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }
      if (dto.status === TicketStatus.CLOSED && !ticket.closedAt) {
        ticket.closedAt = new Date();
      }
    }

    if (dto.priority && dto.priority !== ticket.priority) {
      ticket.priority = dto.priority;
      ticket.slaHours = this.getSlaHours(dto.priority);
      ticket.slaDueAt = new Date(ticket.createdAt.getTime() + ticket.slaHours * 3600 * 1000);
    }

    if (dto.category) {
      ticket.category = dto.category;
    }

    if (dto.assignedToId !== undefined) {
      ticket.assignedToId = dto.assignedToId;
    }

    return this.ticketRepo.save(ticket);
  }

  async addComment(
    ticketId: string,
    dto: CreateCommentDto,
    userId: string,
    tenantId: string | null,
    isSuperAdmin = false,
    isCustomer = false,
    callerSubscriberId?: string,
  ) {
    const ticket = await this.findOne(ticketId, tenantId, isSuperAdmin, isCustomer, callerSubscriberId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    const comment = this.commentRepo.create({
      ticketId,
      userId,
      comment: dto.comment,
      isInternal: isCustomer ? false : Boolean(dto.isInternal),
    });

    // If customer replies, optionally set status back to IN_PROGRESS if waiting
    if (isCustomer && ticket.status === TicketStatus.WAITING_CUSTOMER) {
      await this.ticketRepo.update(ticketId, { status: TicketStatus.IN_PROGRESS });
    }

    return this.commentRepo.save(comment);
  }
}
