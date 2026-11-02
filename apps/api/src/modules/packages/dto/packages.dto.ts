import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PackageType, BillingCycle } from '../entities/package.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreatePackageDto {
  @ApiProperty({ example: 'Fiber Ultra 100M' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'fiber-ultra-100m' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'High-speed fiber broadband for home offices.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PackageType, default: PackageType.BROADBAND })
  @IsOptional()
  @IsEnum(PackageType)
  type?: PackageType;

  @ApiProperty({ example: 49.99 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: BillingCycle, default: BillingCycle.MONTHLY })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;

  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays: number;

  @ApiProperty({ example: 100, description: 'Download bandwidth limit in Mbps' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  downloadSpeedMbps: number;

  @ApiProperty({ example: 50, description: 'Upload bandwidth limit in Mbps' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  uploadSpeedMbps: number;

  @ApiPropertyOptional({ example: 500, description: 'Monthly data allowance in GB. Null for unlimited' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  dataQuotaGb?: number;

  @ApiPropertyOptional({ example: 120, description: 'QoS burst speed in Mbps' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  burstSpeedMbps?: number;

  @ApiPropertyOptional({ example: 5, description: 'FUP throttled speed in Mbps after quota exhaustion' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  speedAfterQuotaMbps?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['24/7 Priority Support', 'Free Dual-band Router'] })
  @IsOptional()
  @IsArray()
  features?: string[];

  @ApiPropertyOptional({ description: 'Tenant ID (used only by Super Admin to create in target tenant)' })
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;
}

export class UpdatePackageDto extends PartialType(CreatePackageDto) {}

export class PackageFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PackageType })
  @IsOptional()
  @IsEnum(PackageType)
  type?: PackageType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
