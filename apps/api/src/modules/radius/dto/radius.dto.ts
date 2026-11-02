import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsUUID,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { RadiusAuthMethod, RadiusAccountStatus } from '../entities/radius-user.entity';
import { RadiusAccountingStatusType } from '../entities/radius-accounting.entity';

export class CreateRadiusUserDto {
  @ApiProperty({ description: 'RADIUS username for PPPoE / Hotspot / IPoE authentication' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username: string;

  @ApiProperty({ description: 'Password used during RADIUS authentication' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  password: string;

  @ApiPropertyOptional({ description: 'Associated NetOrbit Subscriber UUID' })
  @IsOptional()
  @IsUUID()
  subscriberId?: string;

  @ApiPropertyOptional({ enum: RadiusAuthMethod, default: RadiusAuthMethod.PAP })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.toUpperCase();
      if (v === 'PAP') return RadiusAuthMethod.PAP;
      if (v === 'CHAP') return RadiusAuthMethod.CHAP;
      if (v === 'MSCHAPV2' || v === 'MSCHAP' || v === 'MSCHAP-V2') return RadiusAuthMethod.MSCHAPV2;
      if (v === 'EAP') return RadiusAuthMethod.EAP;
    }
    return value;
  })
  @IsEnum(RadiusAuthMethod)
  authType?: RadiusAuthMethod;

  @ApiPropertyOptional({ enum: RadiusAccountStatus, default: RadiusAccountStatus.ACTIVE })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.toLowerCase();
      if (v === 'active') return RadiusAccountStatus.ACTIVE;
      if (v === 'suspended' || v === 'disabled') return RadiusAccountStatus.DISABLED;
      if (v === 'expired') return RadiusAccountStatus.EXPIRED;
    }
    return value;
  })
  @IsEnum(RadiusAccountStatus)
  status?: RadiusAccountStatus;

  @ApiPropertyOptional({ default: 1, description: 'Maximum allowed simultaneous sessions' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  simultaneousUse?: number;

  @ApiPropertyOptional({ description: 'Static IP address if assigned' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  framedIpAddress?: string;

  @ApiPropertyOptional({ description: 'Static IP address alias' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Assigned package UUID' })
  @IsOptional()
  @IsUUID()
  packageId?: string;

  @ApiPropertyOptional({ description: 'MAC address binding' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  macAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Custom RADIUS check / reply attributes' })
  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Target tenant ID (Super Admin override)' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class UpdateRadiusUserDto {
  @ApiPropertyOptional({ description: 'Update RADIUS username' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional({ description: 'Update RADIUS password' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subscriberId?: string;

  @ApiPropertyOptional({ enum: RadiusAuthMethod })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.toUpperCase();
      if (v === 'PAP') return RadiusAuthMethod.PAP;
      if (v === 'CHAP') return RadiusAuthMethod.CHAP;
      if (v === 'MSCHAPV2' || v === 'MSCHAP' || v === 'MSCHAP-V2') return RadiusAuthMethod.MSCHAPV2;
      if (v === 'EAP') return RadiusAuthMethod.EAP;
    }
    return value;
  })
  @IsEnum(RadiusAuthMethod)
  authType?: RadiusAuthMethod;

  @ApiPropertyOptional({ enum: RadiusAccountStatus })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.toLowerCase();
      if (v === 'active') return RadiusAccountStatus.ACTIVE;
      if (v === 'suspended' || v === 'disabled') return RadiusAccountStatus.DISABLED;
      if (v === 'expired') return RadiusAccountStatus.EXPIRED;
    }
    return value;
  })
  @IsEnum(RadiusAccountStatus)
  status?: RadiusAccountStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  simultaneousUse?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  framedIpAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  packageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  macAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, string>;
}

export class RadiusUserStatusDto {
  @ApiPropertyOptional({ description: 'Target user status' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class RadiusUserQueryDto {
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

  @ApiPropertyOptional({ enum: RadiusAccountStatus })
  @IsOptional()
  @IsEnum(RadiusAccountStatus)
  status?: RadiusAccountStatus;

  @ApiPropertyOptional({ enum: RadiusAuthMethod })
  @IsOptional()
  @IsEnum(RadiusAuthMethod)
  authType?: RadiusAuthMethod;
}

export class RadiusAuthRequestDto {
  @ApiProperty({ description: 'RADIUS User-Name attribute (RFC 2865)' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ description: 'Plaintext User-Password (PAP authentication)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'CHAP-Password (hex format: 1 byte ident + 16 bytes MD5 hash)' })
  @IsOptional()
  @IsString()
  chapPassword?: string;

  @ApiPropertyOptional({ description: 'CHAP-Challenge (hex or string format)' })
  @IsOptional()
  @IsString()
  chapChallenge?: string;

  @ApiPropertyOptional({ description: 'MS-CHAP-Challenge (hex format)' })
  @IsOptional()
  @IsString()
  mschapChallenge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  msChapChallenge?: string;

  @ApiPropertyOptional({ description: 'MS-CHAP2-Response / NT-Response (hex format)' })
  @IsOptional()
  @IsString()
  mschapResponse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  msChap2Response?: string;

  @ApiPropertyOptional({ description: 'Auth protocol hint' })
  @IsOptional()
  @IsString()
  authType?: string;

  @ApiProperty({ description: 'IP address of NAS sending Access-Request' })
  @IsString()
  @IsNotEmpty()
  nasIpAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nasIdentifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  nasPort?: number;

  @ApiPropertyOptional({ description: 'Calling-Station-Id (Client MAC or phone)' })
  @IsOptional()
  @IsString()
  callingStationId?: string;

  @ApiPropertyOptional({ description: 'Called-Station-Id (NAS SSID or MAC)' })
  @IsOptional()
  @IsString()
  calledStationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  framedProtocol?: string;

  @ApiPropertyOptional({ description: 'NAS RADIUS shared secret for verification' })
  @IsOptional()
  @IsString()
  sharedSecret?: string;
}

export class RadiusAcctRequestDto {
  @ApiPropertyOptional({ enum: RadiusAccountingStatusType, description: 'Acct-Status-Type (RFC 2866)' })
  @IsOptional()
  acctStatusType?: RadiusAccountingStatusType | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusType?: string;

  @ApiProperty({ description: 'RADIUS User-Name' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ description: 'Acct-Session-Id generated by NAS' })
  @IsOptional()
  @IsString()
  acctSessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acctUniqueId?: string;

  @ApiProperty({ description: 'NAS IP Address' })
  @IsString()
  @IsNotEmpty()
  nasIpAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  nasPort?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nasIdentifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  framedIpAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callingStationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calledStationId?: string;

  @ApiPropertyOptional({ default: 0, description: 'Acct-Session-Time in seconds' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acctSessionTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sessionTime?: number;

  @ApiPropertyOptional({ default: 0, description: 'Acct-Input-Octets (download bytes)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acctInputOctets?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  inputOctets?: number;

  @ApiPropertyOptional({ default: 0, description: 'Acct-Output-Octets (upload bytes)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acctOutputOctets?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  outputOctets?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acctInputGigawords?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acctOutputGigawords?: number;

  @ApiPropertyOptional({ description: 'Acct-Terminate-Cause (RFC 2866)' })
  @IsOptional()
  @IsString()
  terminateCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acctTerminateCause?: string;

  @ApiPropertyOptional({ description: 'RADIUS shared secret for validation' })
  @IsOptional()
  @IsString()
  sharedSecret?: string;
}

export class RadiusDisconnectDto {
  @ApiPropertyOptional({ default: 'Admin-Reset', description: 'RFC 3576 Disconnect reason' })
  @IsOptional()
  @IsString()
  reason?: string = 'Admin-Reset';
}

export class SessionQueryDto {
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
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nasIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subscriberId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean = false;
}
