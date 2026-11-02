import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsIP,
  Min,
  Max,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RadiusMeshNodeRole,
  RadiusMeshNodeStatus,
  RadiusFailoverStrategy,
} from '@netorbit/shared-types';

export { RadiusMeshNodeRole, RadiusMeshNodeStatus, RadiusFailoverStrategy };

export class RegisterMeshNodeDto {
  @ApiProperty({ example: 'us-east-proxy-01' })
  @IsString()
  nodeId: string;

  @ApiProperty({ example: 'US East Regional RADIUS Gateway' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'us-east' })
  @IsString()
  region: string;

  @ApiProperty({ example: '198.51.100.25' })
  @IsIP()
  ipAddress: string;

  @ApiPropertyOptional({ example: 1812 })
  @IsOptional()
  @IsNumber()
  authPort?: number;

  @ApiPropertyOptional({ example: 1813 })
  @IsOptional()
  @IsNumber()
  acctPort?: number;

  @ApiPropertyOptional({ example: 3799 })
  @IsOptional()
  @IsNumber()
  coaPort?: number;

  @ApiProperty({ example: 'SecureMeshNodeSecret2026' })
  @IsString()
  sharedSecret: string;

  @ApiPropertyOptional({ enum: RadiusMeshNodeRole, example: RadiusMeshNodeRole.PRIMARY })
  @IsOptional()
  @IsEnum(RadiusMeshNodeRole)
  role?: RadiusMeshNodeRole;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}

export class UpdateMeshNodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sharedSecret?: string;

  @ApiPropertyOptional({ enum: RadiusMeshNodeStatus })
  @IsOptional()
  @IsEnum(RadiusMeshNodeStatus)
  status?: RadiusMeshNodeStatus;

  @ApiPropertyOptional({ enum: RadiusMeshNodeRole })
  @IsOptional()
  @IsEnum(RadiusMeshNodeRole)
  role?: RadiusMeshNodeRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class MeshHeartbeatDto {
  @ApiProperty({ example: 14 })
  @IsNumber()
  latencyMs: number;

  @ApiProperty({ example: 0.22 })
  @IsNumber()
  loadFactor: number;

  @ApiProperty({ example: 1450 })
  @IsNumber()
  activeSessionsCount: number;

  @ApiPropertyOptional({ enum: RadiusMeshNodeStatus, example: RadiusMeshNodeStatus.ONLINE })
  @IsOptional()
  @IsEnum(RadiusMeshNodeStatus)
  status?: RadiusMeshNodeStatus;
}

export class ForwardAuthRequestDto {
  @ApiProperty({ example: 'sub_demo_01' })
  @IsString()
  username: string;

  @ApiPropertyOptional({ example: 'password123' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ example: '10.200.0.1' })
  @IsIP()
  nasIp: string;

  @ApiPropertyOptional({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsOptional()
  @IsString()
  callingStationId?: string;

  @ApiPropertyOptional({ example: 'us-east' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ enum: RadiusFailoverStrategy, example: RadiusFailoverStrategy.LOWEST_LATENCY })
  @IsOptional()
  @IsEnum(RadiusFailoverStrategy)
  routingPolicy?: RadiusFailoverStrategy;
}

export class ForwardAcctRequestDto {
  @ApiProperty({ example: 'Start', enum: ['Start', 'Interim-Update', 'Stop'] })
  @IsString()
  acctStatusType: string;

  @ApiProperty({ example: 'SESS-2026-98124' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'sub_demo_01' })
  @IsString()
  username: string;

  @ApiProperty({ example: '10.200.0.1' })
  @IsIP()
  nasIp: string;

  @ApiPropertyOptional({ example: 104857600 })
  @IsOptional()
  @IsNumber()
  inputOctets?: number;

  @ApiPropertyOptional({ example: 524288000 })
  @IsOptional()
  @IsNumber()
  outputOctets?: number;

  @ApiPropertyOptional({ example: 3600 })
  @IsOptional()
  @IsNumber()
  sessionTime?: number;

  @ApiPropertyOptional({ example: 'us-east' })
  @IsOptional()
  @IsString()
  region?: string;
}

export class DispatchMeshCoaDto {
  @ApiProperty({ example: 'SESS-2026-98124' })
  @IsString()
  sessionId: string;

  @ApiProperty({ example: 'sub_demo_01' })
  @IsString()
  username: string;

  @ApiPropertyOptional({ example: 'us-east' })
  @IsOptional()
  @IsString()
  targetRegion?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  disconnect?: boolean;
}
