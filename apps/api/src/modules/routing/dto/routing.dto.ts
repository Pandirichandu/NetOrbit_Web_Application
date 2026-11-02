import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsIP,
  Min,
  Max,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RoutingProtocol,
  RoutingVendor,
} from '@netorbit/shared-types';

export { RoutingProtocol, RoutingVendor };

export class CreateBgpPeerDto {
  @ApiProperty({ example: 'Transit-Upstream-AS174' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Cogent Primary 10G Transit' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 64512 })
  @IsNumber()
  @Min(1)
  @Max(4294967295)
  localAsn: number;

  @ApiProperty({ example: 174 })
  @IsNumber()
  @Min(1)
  @Max(4294967295)
  remoteAsn: number;

  @ApiProperty({ example: '198.51.100.1' })
  @IsIP()
  peerIp: string;

  @ApiPropertyOptional({ example: 'SecretBgpKey2026' })
  @IsOptional()
  @IsString()
  md5Secret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class UpdateBgpPeerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  remoteAsn?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  peerIp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  md5Secret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateOspfProcessDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(65535)
  processId: number;

  @ApiProperty({ example: '10.0.0.1' })
  @IsIP(4)
  routerId: string;

  @ApiProperty({ example: '0.0.0.0' })
  @IsString()
  @Matches(/^(\d{1,3}\.){3}\d{1,3}$|^[0-9]+$/)
  areaId: string;

  @ApiPropertyOptional({ example: 'NONE' })
  @IsOptional()
  @IsString()
  authType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class UpdateOspfProcessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsIP(4)
  routerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class AddOspfNeighborDto {
  @ApiProperty({ example: '10.0.0.2' })
  @IsIP(4)
  neighborId: string;

  @ApiProperty({ example: '10.255.0.2' })
  @IsIP(4)
  ipAddress: string;

  @ApiProperty({ example: 'sfp-sfpplus1' })
  @IsString()
  interfaceName: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsNumber()
  deadTimeSeconds?: number;
}

export class ValidateConfigRequestDto {
  @ApiProperty({ enum: RoutingVendor, example: RoutingVendor.MIKROTIK_ROUTEROS })
  @IsEnum(RoutingVendor)
  vendor: RoutingVendor;

  @ApiProperty({ enum: RoutingProtocol, example: RoutingProtocol.BGP })
  @IsEnum(RoutingProtocol)
  protocol: RoutingProtocol;

  @ApiProperty({ example: '/routing bgp connection add name=peer1 remote.address=198.51.100.1 as=174' })
  @IsString()
  commands: string;
}

export class DeployConfigRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @ApiProperty({ enum: RoutingProtocol, example: RoutingProtocol.BGP })
  @IsEnum(RoutingProtocol)
  protocol: RoutingProtocol;

  @ApiProperty({ enum: RoutingVendor, example: RoutingVendor.MIKROTIK_ROUTEROS })
  @IsEnum(RoutingVendor)
  vendor: RoutingVendor;

  @ApiProperty({ example: '/routing bgp connection add name=peer1 remote.address=198.51.100.1 as=174' })
  @IsString()
  commands: string;

  @ApiProperty({ description: 'Explicit confirmation required for high-impact routing mutations', example: true })
  @IsBoolean()
  confirmHighImpact: boolean;
}

export class RollbackConfigRequestDto {
  @ApiProperty({ description: 'The revision ID to roll back to' })
  @IsUUID()
  revisionId: string;

  @ApiProperty({ description: 'Explicit confirmation required for rollback', example: true })
  @IsBoolean()
  confirmHighImpact: boolean;
}
