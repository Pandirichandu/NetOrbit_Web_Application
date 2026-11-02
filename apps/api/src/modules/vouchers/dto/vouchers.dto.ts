import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherStatus } from '@netorbit/shared-types';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class GenerateVouchersDto {
  @ApiProperty({ example: 10, description: 'Number of vouchers to generate (1 to 500)' })
  @IsNumber()
  @Min(1)
  @Max(500)
  count: number;

  @ApiPropertyOptional({ description: 'Package UUID to bind voucher to' })
  @IsOptional()
  @IsUUID()
  packageId?: string;

  @ApiPropertyOptional({ example: 1440, default: 1440, description: 'Validity duration in minutes (1440 = 24h)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 5120, description: 'Data quota in MB (e.g. 5GB)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dataQuotaMb?: number;

  @ApiPropertyOptional({ example: 5.0, default: 0.0, description: 'Price of the voucher' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'NET', default: 'NET', description: 'Prefix for generated code' })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiPropertyOptional({ example: 'SUMMER-EVENT-2026' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class RedeemVoucherDto {
  @ApiProperty({ example: 'NET-7X9B-2M4K' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ description: 'Subscriber UUID if redeeming to existing account' })
  @IsOptional()
  @IsUUID()
  subscriberId?: string;

  @ApiPropertyOptional({ example: 'aa:bb:cc:dd:ee:ff' })
  @IsOptional()
  @IsString()
  macAddress?: string;
}

export class VoucherQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: VoucherStatus })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string;
}
