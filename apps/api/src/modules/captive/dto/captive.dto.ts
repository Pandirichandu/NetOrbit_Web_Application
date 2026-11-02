import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CaptiveAuthMethod {
  VOUCHER = 'voucher',
  SUBSCRIBER = 'subscriber',
  OTP = 'otp',
}

export class CaptiveAuthDto {
  @ApiProperty({ example: 'isp-alpha' })
  @IsString()
  @IsNotEmpty()
  tenantSlug: string;

  @ApiProperty({ enum: CaptiveAuthMethod, default: CaptiveAuthMethod.VOUCHER })
  @IsEnum(CaptiveAuthMethod)
  authMethod: CaptiveAuthMethod;

  @ApiPropertyOptional({ example: 'NET-7X9B-2M4K' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @IsString()
  voucherPin?: string;

  @ApiPropertyOptional({ example: 'guestuser' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'secret123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: '00:11:22:33:44:55' })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ example: '192.168.10.105' })
  @IsOptional()
  @IsString()
  clientIp?: string;
}
