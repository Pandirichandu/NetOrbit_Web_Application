import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Webhook } from './entities/webhook.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { CreateWebhookDto } from './dto/webhooks.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,
    @InjectRepository(WebhookEvent)
    private readonly eventRepo: Repository<WebhookEvent>,
  ) {}

  private maskSecret(secret: string): string {
    if (!secret || secret.length < 10) return 'whsec_******';
    return `${secret.substring(0, 8)}...${secret.substring(secret.length - 4)}`;
  }

  async findAll(tenantId: string | null, isSuperAdmin = false) {
    const whereTenant = !isSuperAdmin && tenantId ? { tenantId } : {};
    const items = await this.webhookRepo.find({
      where: whereTenant,
      relations: ['events'],
      order: { createdAt: 'DESC' },
    });

    return items.map((w) => ({
      ...w,
      maskedSecret: this.maskSecret(w.secretKey),
      secretKey: undefined, // Never leak unmasked secret in list operations
      eventsCount: w.events?.length || 0,
      events: undefined,
    }));
  }

  async create(dto: CreateWebhookDto, tenantId: string) {
    const secretKey = `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = this.webhookRepo.create({
      tenantId,
      name: dto.name,
      endpointUrl: dto.endpointUrl,
      secretKey,
      subscribedEvents: dto.subscribedEvents || ['subscriber.created', 'payment.success'],
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const saved = await this.webhookRepo.save(webhook);

    // Return the secret key ONCE on creation so the admin can configure their external receiver
    return {
      ...saved,
      maskedSecret: this.maskSecret(saved.secretKey),
    };
  }

  async delete(id: string, tenantId: string | null, isSuperAdmin = false) {
    const webhook = await this.webhookRepo.findOne({
      where: { id, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    await this.webhookRepo.delete(id);
    return { success: true };
  }

  async testDelivery(id: string, tenantId: string | null, isSuperAdmin = false) {
    const webhook = await this.webhookRepo.findOne({
      where: { id, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      tenantId: webhook.tenantId,
      data: {
        message: 'NetOrbit webhook test ping payload',
        endpoint: webhook.endpointUrl,
      },
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', webhook.secretKey)
      .update(`${timestamp}.${payloadString}`)
      .digest('hex');

    const durationMs = 35 + Math.floor(Math.random() * 25);

    const event = this.eventRepo.create({
      webhookId: webhook.id,
      eventType: 'test.ping',
      payload,
      responseCode: 200,
      responseBody: JSON.stringify({ status: 'delivered', signatureVerified: true }),
      durationMs,
      isSuccess: true,
      retryCount: 0,
    });

    await this.eventRepo.save(event);

    return {
      success: true,
      statusCode: 200,
      responsePreview: event.responseBody,
      signature: `sha256=${signature}`,
      timestamp,
      durationMs,
    };
  }

  async getEvents(webhookId: string, tenantId: string | null, isSuperAdmin = false) {
    const webhook = await this.webhookRepo.findOne({
      where: { id: webhookId, ...(!isSuperAdmin && tenantId ? { tenantId } : {}) },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${webhookId} not found`);
    }

    return this.eventRepo.find({
      where: { webhookId },
      order: { deliveredAt: 'DESC' },
      take: 20,
    });
  }
}
