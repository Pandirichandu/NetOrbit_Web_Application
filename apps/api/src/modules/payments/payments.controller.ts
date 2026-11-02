import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, VerifyPaymentDto, PaymentQueryDto } from './dto/payments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ICurrentUser } from '../../common/interfaces/current-user.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscriber } from '../subscribers/entities/subscriber.entity';

@ApiTags('Payment Gateways & Transactions')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Subscriber)
    private readonly subscriberRepo: Repository<Subscriber>,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List payment transactions with filters and tenant isolation' })
  async findAll(@Query() query: PaymentQueryDto, @CurrentUser() user: ICurrentUser) {
    let subscriberFilter: string | undefined = undefined;

    // Customer isolation
    if (user.roles.includes('customer') && !user.isSuperAdmin && !user.roles.includes('tenant_administrator')) {
      const sub = await this.subscriberRepo.findOne({
        where: { userId: user.id },
      });
      subscriberFilter = sub ? sub.id : '00000000-0000-0000-0000-000000000000';
    }

    return this.paymentsService.findAll(query, user.tenantId, user.isSuperAdmin, subscriberFilter);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'Get payment transaction details by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.paymentsService.findOne(id, user.tenantId, user.isSuperAdmin);
  }

  @Post('create')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Initiate payment order with selected gateway' })
  async createPayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: ICurrentUser) {
    return this.paymentsService.createPayment(dto, user.tenantId!, user.id, user.email);
  }

  @Post('verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments:create')
  @ApiOperation({ summary: 'Verify gateway payment signature and reconcile invoice' })
  async verifyPayment(@Body() dto: VerifyPaymentDto, @CurrentUser() user: ICurrentUser) {
    return this.paymentsService.verifyPayment(dto, user.tenantId!, user.id, user.email);
  }

  @Post('webhook/:gateway')
  @ApiOperation({ summary: 'Public webhook receiver for payment gateways' })
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    // Webhook entry point
    const signature = headers['x-razorpay-signature'] || headers['stripe-signature'] || headers['x-verify'] || '';
    return {
      received: true,
      gateway,
      timestamp: new Date().toISOString(),
      signatureReceived: Boolean(signature),
    };
  }
}
