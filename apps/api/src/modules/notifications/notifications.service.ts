import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { SendNotificationDto, UpdateTemplateDto } from './dto/notifications.dto';
import { NotificationChannel, NotificationStatus } from '@netorbit/shared-types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private mailer: nodemailer.Transporter;

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
  ) {
    this.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      ignoreTLS: true,
    });
  }

  async findAll(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};
    return this.notifRepo.find({
      where: whereTenant,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getTemplates(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};
    return this.templateRepo.find({
      where: whereTenant,
      order: { eventKey: 'ASC' },
    });
  }

  async updateTemplate(
    id: string,
    dto: UpdateTemplateDto,
    tenantId: string | null,
    isSuperAdmin = false,
  ) {
    const template = await this.templateRepo.findOne({
      where: { id, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!template) {
      throw new NotFoundException(`Notification template with ID ${id} not found`);
    }

    if (dto.subject !== undefined) template.subject = dto.subject;
    if (dto.bodyTemplate !== undefined) template.bodyTemplate = dto.bodyTemplate;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;

    return this.templateRepo.save(template);
  }

  async send(dto: SendNotificationDto, tenantId: string) {
    const channel = dto.channel || NotificationChannel.EMAIL;
    let status = NotificationStatus.SENT;
    let errorMessage: string | null = null;
    let sentAt: Date | null = new Date();

    const subject = dto.title || dto.subject || 'NetOrbit ISP Notification';
    if (channel === NotificationChannel.EMAIL) {
      try {
        await this.mailer.sendMail({
          from: process.env.SMTP_FROM || 'noreply@netorbit.local',
          to: dto.recipient,
          subject,
          text: dto.message,
          html: `<div style="font-family:sans-serif;padding:20px;color:#333;"><h2>${subject}</h2><p>${dto.message.replace(/\n/g, '<br/>')}</p><hr/><small>NetOrbit ISP Automated Notification</small></div>`,
        });
        this.logger.log(`Email dispatched to ${dto.recipient} via SMTP`);
      } catch (err: any) {
        this.logger.error(`Failed to dispatch email to ${dto.recipient}: ${err.message}`);
        status = NotificationStatus.FAILED;
        errorMessage = err.message;
        sentAt = null;
      }
    } else {
      // SMS / WhatsApp / In-App abstraction (logged in development)
      this.logger.log(`[${channel} DISPATCH] To: ${dto.recipient} | Msg: ${subject}`);
    }

    const notif = this.notifRepo.create({
      tenantId,
      recipient: dto.recipient,
      channel,
      title: subject,
      message: dto.message,
      status,
      sentAt,
      errorMessage,
      metadata: {
        ...(dto.metadata || {}),
        dispatchedAt: new Date().toISOString(),
      },
    });

    const saved = await this.notifRepo.save(notif);
    return { ...saved, subject: saved.title };
  }
}
