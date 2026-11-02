import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsIP,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SnmpVersion,
  SnmpSecurityLevel,
  SnmpAuthProtocol,
  SnmpPrivProtocol,
  TopologyLinkType,
} from '@netorbit/shared-types';

export class RegisterSnmpDeviceDto {
  @ApiProperty({ example: 'Edge-Router-POP1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '10.200.1.1' })
  @IsIP()
  @IsNotEmpty()
  ipAddress: string;

  @ApiPropertyOptional({ example: 161 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ enum: SnmpVersion, default: SnmpVersion.V2C })
  @IsOptional()
  @IsEnum(SnmpVersion)
  version?: SnmpVersion;

  @ApiPropertyOptional({ example: 'public-isp-secure' })
  @IsOptional()
  @IsString()
  communityString?: string;

  @ApiPropertyOptional({ example: 'netorbit_snmp_user' })
  @IsOptional()
  @IsString()
  v3User?: string;

  @ApiPropertyOptional({ enum: SnmpSecurityLevel })
  @IsOptional()
  @IsEnum(SnmpSecurityLevel)
  v3SecurityLevel?: SnmpSecurityLevel;

  @ApiPropertyOptional({ enum: SnmpAuthProtocol })
  @IsOptional()
  @IsEnum(SnmpAuthProtocol)
  v3AuthProtocol?: SnmpAuthProtocol;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  v3AuthKey?: string;

  @ApiPropertyOptional({ enum: SnmpPrivProtocol })
  @IsOptional()
  @IsEnum(SnmpPrivProtocol)
  v3PrivProtocol?: SnmpPrivProtocol;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  v3PrivKey?: string;

  @ApiPropertyOptional({ example: 'MikroTik' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ example: 'CCR2004-16G-2S+' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(3600)
  pollingIntervalSeconds?: number;
}

export class UpdateSnmpDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  port?: number;

  @ApiPropertyOptional({ enum: SnmpVersion })
  @IsOptional()
  @IsEnum(SnmpVersion)
  version?: SnmpVersion;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communityString?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(10)
  pollingIntervalSeconds?: number;
}

export class DiscoverNetworkDto {
  @ApiProperty({ example: '10.200.1.0/24' })
  @IsString()
  @IsNotEmpty()
  subnetCidr: string;

  @ApiPropertyOptional({ example: 'public-isp-secure' })
  @IsOptional()
  @IsString()
  communityString?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(5000)
  timeoutMs?: number;
}

export class CreateTopologyLinkDto {
  @ApiProperty()
  @IsUUID()
  sourceDeviceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceInterfaceId?: string;

  @ApiProperty()
  @IsUUID()
  targetDeviceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  targetInterfaceId?: string;

  @ApiPropertyOptional({ enum: TopologyLinkType, default: TopologyLinkType.LLDP })
  @IsOptional()
  @IsEnum(TopologyLinkType)
  linkType?: TopologyLinkType;

  @ApiPropertyOptional({ example: 10000000000 })
  @IsOptional()
  @IsInt()
  speedBps?: number;
}
