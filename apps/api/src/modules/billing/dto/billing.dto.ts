import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle, InvoiceStatus, PaymentGateway } from '@netorbit/shared-types';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class InvoiceItemDto {
  @ApiProperty({ example: 'Fiber Broadband 100 Mbps Plan' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 49.99 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 49.99 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'Subscriber UUID if tied to a customer' })
  @IsOptional()
  @IsUUID()
  subscriberId?: string;

  @ApiProperty({ enum: BillingCycle, default: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiProperty({ example: '2026-11-05' })
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiPropertyOptional({ example: 18.0, default: 18.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ example: 0.0, default: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Monthly subscription for fiber connection' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RechargeDto {
  @ApiProperty({ description: 'Subscriber UUID to recharge' })
  @IsUUID()
  @IsNotEmpty()
  subscriberId: string;

  @ApiProperty({ description: 'Package UUID to apply or renew' })
  @IsUUID()
  @IsNotEmpty()
  packageId: string;

  @ApiPropertyOptional({ enum: PaymentGateway, default: PaymentGateway.MANUAL })
  @IsOptional()
  @IsEnum(PaymentGateway)
  paymentGateway?: PaymentGateway;

  @ApiPropertyOptional({ example: 'cash', description: 'cash | card | online | bank_transfer' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'recharge-key-uuid' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ example: 'Front-desk recharge renewal' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InvoiceQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subscriberId?: string;
}
