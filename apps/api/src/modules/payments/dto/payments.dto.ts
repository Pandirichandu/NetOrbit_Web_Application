import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGateway, PaymentStatus } from '@netorbit/shared-types';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreatePaymentDto {
  @ApiPropertyOptional({ description: 'Invoice UUID to pay' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Subscriber UUID paying' })
  @IsOptional()
  @IsUUID()
  subscriberId?: string;

  @ApiProperty({ enum: PaymentGateway })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ example: 49.99 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'card', description: 'card | upi | netbanking | wallet | cash' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'idempotency-key-uuid' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'Payment for Invoice INV-2026-00001' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Payment transaction UUID' })
  @IsUUID()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({ description: 'Gateway Order ID' })
  @IsOptional()
  @IsString()
  gatewayOrderId?: string;

  @ApiPropertyOptional({ description: 'Gateway Transaction / Payment ID' })
  @IsOptional()
  @IsString()
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ description: 'Gateway cryptographic signature / HMAC' })
  @IsOptional()
  @IsString()
  gatewaySignature?: string;

  @ApiPropertyOptional({ description: 'Additional gateway payload or signature details' })
  @IsOptional()
  gatewayResponse?: Record<string, any>;
}

export class PaymentQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PaymentGateway })
  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subscriberId?: string;
}
