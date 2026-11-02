import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationExecution } from './entities/automation-execution.entity';
import { Subscriber, SubscriberStatus } from '../subscribers/entities/subscriber.entity';
import { Invoice, InvoiceStatus } from '../billing/entities/invoice.entity';
import { RadiusAccounting, RadiusAccountingStatusType } from '../radius/entities/radius-accounting.entity';
import { RadiusService } from '../radius/radius.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAutomationRuleDto } from './dto/automation.dto';
import { AutomationTrigger, NotificationChannel } from '@netorbit/shared-types';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    @InjectRepository(AutomationRule)
    private readonly ruleRepo: Repository<AutomationRule>,
    @InjectRepository(AutomationExecution)
    private readonly execRepo: Repository<AutomationExecution>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(RadiusAccounting)
    private readonly acctRepo: Repository<RadiusAccounting>,
    private readonly radiusService: RadiusService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAllRules(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};
    return this.ruleRepo.find({
      where: whereTenant,
      relations: ['executions'],
      order: { createdAt: 'DESC' },
    });
  }

  async createRule(dto: CreateAutomationRuleDto, tenantId: string) {
    const rule = this.ruleRepo.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      triggerEvent: dto.triggerEvent,
      actionType: dto.actionType,
      actionPayload: dto.actionPayload || {},
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return this.ruleRepo.save(rule);
  }

  async toggleRule(id: string, tenantId: string | null, isSuperAdmin = false) {
    const rule = await this.ruleRepo.findOne({
      where: { id, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!rule) {
      throw new NotFoundException(`Automation rule with ID ${id} not found`);
    }

    rule.isActive = !rule.isActive;
    return this.ruleRepo.save(rule);
  }

  /**
   * Run Plan Expiry Sweeper:
   * Finds active subscribers whose expiryDate < now, sets status to 'expired',
   * and terminates their active RADIUS sessions via CoA disconnect.
   */
  async runExpirySweep(tenantId?: string | null, isSuperAdmin = false) {
    this.logger.log(`[AUTOMATION] Initiating Plan Expiry Sweeper (Tenant: ${tenantId || 'ALL'})...`);
    const now = new Date();

    const qb = this.subscriberRepo
      .createQueryBuilder('sub')
      .where('sub.status = :status', { status: SubscriberStatus.ACTIVE })
      .andWhere('sub.expiryDate < :now', { now });

    if (!isSuperAdmin && tenantId) {
      qb.andWhere('sub.tenantId = :tenantId', { tenantId });
    }

    const expiredSubs = await qb.getMany();
    const recordsAffected: Array<{ id: string; identifier: string; actionTaken: string }> = [];

    for (const sub of expiredSubs) {
      sub.status = SubscriberStatus.EXPIRED;
      await this.subscriberRepo.save(sub);

      // Check and terminate active RADIUS sessions
      const activeSessions = await this.acctRepo.find({
        where: {
          username: sub.username,
          acctStatusType: In([RadiusAccountingStatusType.START, RadiusAccountingStatusType.INTERIM_UPDATE]),
        },
      });

      let coaSent = false;
      for (const session of activeSessions) {
        try {
          await this.radiusService.disconnectSession(
            session.acctSessionId || String(session.id),
            { reason: 'Plan-Expired-AutoDisconnect' },
            sub.tenantId,
            undefined,
            'system-automation@netorbit.local',
            true,
          );
          coaSent = true;
        } catch (err: any) {
          this.logger.warn(`Failed CoA disconnect for session ${session.acctSessionId}: ${err.message}`);
        }
      }

      // Dispatch expiry notification
      try {
        await this.notificationsService.send(
          {
            recipient: sub.email,
            channel: NotificationChannel.EMAIL,
            title: 'Your NetOrbit Broadband Plan Has Expired',
            message: `Hello ${sub.firstName}, your subscription expired on ${sub.expiryDate?.toLocaleDateString()}. Please recharge your account to restore high-speed internet access.`,
          },
          sub.tenantId,
        );
      } catch (e) {
        // Notification failure should not block sweep
      }

      recordsAffected.push({
        id: sub.id,
        identifier: sub.username,
        actionTaken: coaSent ? 'Status -> EXPIRED | CoA Disconnected' : 'Status -> EXPIRED',
      });
    }

    // Find rule for execution logging
    const rule = await this.ruleRepo.findOne({
      where: {
        triggerEvent: AutomationTrigger.EXPIRY_REACHED,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (rule) {
      const execution = this.execRepo.create({
        ruleId: rule.id,
        triggerPayload: { timestamp: now.toISOString(), tenantId },
        resultStatus: 'SUCCESS',
        affectedRecordsCount: expiredSubs.length,
        logDetails: `Expired ${expiredSubs.length} subscribers and issued session disconnects.`,
      });
      await this.execRepo.save(execution);
    }

    this.logger.log(`[AUTOMATION] Expiry Sweeper complete: ${expiredSubs.length} subscribers processed.`);

    return {
      success: true,
      timestamp: now.toISOString(),
      affectedCount: expiredSubs.length,
      affectedSubscribers: expiredSubs.length,
      details: `Processed ${expiredSubs.length} expired subscribers.`,
      records: recordsAffected,
    };
  }

  /**
   * Run Overdue Invoice Sweeper:
   * Finds pending invoices whose dueDate < now, marks them as 'overdue',
   * and triggers reminder notifications.
   */
  async runOverdueSweep(tenantId?: string | null, isSuperAdmin = false) {
    this.logger.log(`[AUTOMATION] Initiating Overdue Invoice Sweeper (Tenant: ${tenantId || 'ALL'})...`);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.subscriber', 'subscriber')
      .where('inv.status = :status', { status: InvoiceStatus.PENDING })
      .andWhere('inv.dueDate < :todayStr', { todayStr });

    if (!isSuperAdmin && tenantId) {
      qb.andWhere('inv.tenantId = :tenantId', { tenantId });
    }

    const overdueInvoices = await qb.getMany();
    const recordsAffected: Array<{ id: string; identifier: string; actionTaken: string }> = [];

    for (const inv of overdueInvoices) {
      inv.status = InvoiceStatus.OVERDUE;
      await this.invoiceRepo.save(inv);

      if (inv.subscriber?.email) {
        try {
          await this.notificationsService.send(
            {
              recipient: inv.subscriber.email,
              channel: NotificationChannel.EMAIL,
              title: `Overdue Invoice Alert: ${inv.invoiceNumber}`,
              message: `Dear ${inv.subscriber.firstName}, invoice ${inv.invoiceNumber} for $${inv.totalAmount} was due on ${inv.dueDate} and is now overdue. Please settle your balance.`,
            },
            inv.tenantId,
          );
        } catch (e) {
          // ignore
        }
      }

      recordsAffected.push({
        id: inv.id,
        identifier: inv.invoiceNumber,
        actionTaken: 'Status -> OVERDUE | Reminder Sent',
      });
    }

    // Find rule for execution logging
    const rule = await this.ruleRepo.findOne({
      where: {
        triggerEvent: AutomationTrigger.INVOICE_OVERDUE,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (rule) {
      const execution = this.execRepo.create({
        ruleId: rule.id,
        triggerPayload: { timestamp: now.toISOString(), tenantId },
        resultStatus: 'SUCCESS',
        affectedRecordsCount: overdueInvoices.length,
        logDetails: `Marked ${overdueInvoices.length} invoices as OVERDUE.`,
      });
      await this.execRepo.save(execution);
    }

    this.logger.log(`[AUTOMATION] Overdue Sweeper complete: ${overdueInvoices.length} invoices updated.`);

    return {
      success: true,
      timestamp: now.toISOString(),
      affectedCount: overdueInvoices.length,
      overdueInvoicesMarked: overdueInvoices.length,
      details: `Marked ${overdueInvoices.length} invoices as overdue.`,
      records: recordsAffected,
    };
  }

  // Daily midnight cron sweep
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCronSweeps() {
    this.logger.log('[CRON] Running daily automated scheduled sweeps...');
    try {
      await this.runExpirySweep(null, true);
      await this.runOverdueSweep(null, true);
    } catch (err: any) {
      this.logger.error(`[CRON ERROR] Scheduled sweep error: ${err.message}`);
    }
  }
}
