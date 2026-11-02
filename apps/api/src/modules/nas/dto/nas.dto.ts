import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { NasVendorType, NasDeviceStatus } from '../entities/nas-device.entity';

export class CreateNasDto {
  @ApiProperty({ description: 'Name or identifier of the NAS / Gateway device' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: 'Optional NAS Identifier string' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  identifier?: string;

  @ApiProperty({ description: 'IP address or FQDN of the NAS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ipAddress: string;

  @ApiProperty({ description: 'RADIUS shared secret used to authenticate NAS requests' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  secret: string;

  @ApiPropertyOptional({ enum: NasVendorType, default: NasVendorType.MIKROTIK })
  @IsOptional()
  @IsEnum(NasVendorType)
  type?: NasVendorType;

  @ApiPropertyOptional({ default: 'other', description: 'FreeRADIUS NAS type attribute' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nasType?: string;

  @ApiPropertyOptional({ default: 1812 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  port?: number;

  @ApiPropertyOptional({ default: 3799, description: 'CoA / Disconnect port (RFC 3576)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  coaPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: NasDeviceStatus, default: NasDeviceStatus.ACTIVE })
  @IsOptional()
  @IsEnum(NasDeviceStatus)
  status?: NasDeviceStatus;

  @ApiPropertyOptional({ description: 'Target tenant ID (Super Admin override)' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class UpdateNasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  identifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  secret?: string;

  @ApiPropertyOptional({ enum: NasVendorType })
  @IsOptional()
  @IsEnum(NasVendorType)
  type?: NasVendorType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nasType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  port?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @Type(() => Number)
  coaPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: NasDeviceStatus })
  @IsOptional()
  @IsEnum(NasDeviceStatus)
  status?: NasDeviceStatus;
}

export class NasQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: NasDeviceStatus })
  @IsOptional()
  @IsEnum(NasDeviceStatus)
  status?: NasDeviceStatus;

  @ApiPropertyOptional({ enum: NasVendorType })
  @IsOptional()
  @IsEnum(NasVendorType)
  type?: NasVendorType;
}
