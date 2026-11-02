import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsIP,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DhcpLeaseStatus } from '@netorbit/shared-types';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateDhcpScopeDto {
  @ApiProperty({ example: 'LAN DHCP Scope - Office' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Associated IP Pool UUID from IPAM' })
  @IsOptional()
  @IsUUID()
  poolId?: string;

  @ApiPropertyOptional({ example: 'ether2-lan', default: 'ether2-lan' })
  @IsOptional()
  @IsString()
  interfaceName?: string;

  @ApiPropertyOptional({ example: 86400, default: 86400, description: 'Lease time in seconds (86400 = 24h)' })
  @IsOptional()
  @IsNumber()
  @Min(60)
  leaseTimeSeconds?: number;

  @ApiPropertyOptional({ example: 'lan.netorbit.local', default: 'lan.netorbit.local' })
  @IsOptional()
  @IsString()
  domainName?: string;

  @ApiPropertyOptional({ example: '8.8.8.8, 1.1.1.1', default: '8.8.8.8, 1.1.1.1' })
  @IsOptional()
  @IsString()
  dnsServers?: string;

  @ApiPropertyOptional({ example: '192.168.10.1' })
  @IsOptional()
  @IsIP(4)
  gateway?: string;

  @ApiPropertyOptional({ example: '255.255.255.0', default: '255.255.255.0' })
  @IsOptional()
  @IsIP(4)
  subnetMask?: string;
}

export class CreateStaticReservationDto {
  @ApiProperty({ description: 'DHCP Scope UUID' })
  @IsUUID()
  @IsNotEmpty()
  scopeId: string;

  @ApiProperty({ example: '192.168.10.50' })
  @IsIP(4)
  @IsNotEmpty()
  ipAddress: string;

  @ApiProperty({ example: 'b8:27:eb:11:22:33' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, {
    message: 'MAC address must be a valid format (e.g. 00:11:22:33:44:55)',
  })
  macAddress: string;

  @ApiPropertyOptional({ example: 'nas-storage.lan' })
  @IsOptional()
  @IsString()
  hostname?: string;
}

export class DhcpQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @ApiPropertyOptional({ enum: DhcpLeaseStatus })
  @IsOptional()
  @IsEnum(DhcpLeaseStatus)
  status?: DhcpLeaseStatus;
}
