import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsIP,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IpPoolType, IpVersion, IpAllocationStatus } from '@netorbit/shared-types';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateIpPoolDto {
  @ApiProperty({ example: 'Main PPPoE Pool' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '192.168.100.0/24' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/, {
    message: 'Subnet must be a valid IPv4 CIDR notation (e.g. 192.168.10.0/24)',
  })
  subnet: string;

  @ApiProperty({ example: '192.168.100.10' })
  @IsIP(4)
  @IsNotEmpty()
  startIp: string;

  @ApiProperty({ example: '192.168.100.250' })
  @IsIP(4)
  @IsNotEmpty()
  endIp: string;

  @ApiPropertyOptional({ example: '192.168.100.1' })
  @IsOptional()
  @IsIP(4)
  gateway?: string;

  @ApiPropertyOptional({ example: '8.8.8.8, 1.1.1.1' })
  @IsOptional()
  @IsString()
  dnsServers?: string;

  @ApiPropertyOptional({ enum: IpPoolType, default: IpPoolType.DYNAMIC })
  @IsOptional()
  @IsEnum(IpPoolType)
  type?: IpPoolType;

  @ApiPropertyOptional({ enum: IpVersion, default: IpVersion.IPV4 })
  @IsOptional()
  @IsEnum(IpVersion)
  ipVersion?: IpVersion;
}

export class AllocateIpDto {
  @ApiPropertyOptional({ example: '192.168.100.15', description: 'Specific IP to allocate/reserve. If omitted, allocates next available.' })
  @IsOptional()
  @IsIP(4)
  ipAddress?: string;

  @ApiPropertyOptional({ example: '00:1A:2B:3C:4D:5E' })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ example: 'subscriber', default: 'subscriber' })
  @IsOptional()
  @IsString()
  allocatedToType?: string;

  @ApiPropertyOptional({ description: 'Subscriber UUID or device ID' })
  @IsOptional()
  @IsString()
  allocatedToId?: string;

  @ApiPropertyOptional({ enum: IpAllocationStatus, default: IpAllocationStatus.ALLOCATED })
  @IsOptional()
  @IsEnum(IpAllocationStatus)
  status?: IpAllocationStatus;

  @ApiPropertyOptional({ example: 'Reserved for VIP customer router' })
  @IsOptional()
  @IsString()
  reservedReason?: string;
}

export class IpPoolQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: IpPoolType })
  @IsOptional()
  @IsEnum(IpPoolType)
  type?: IpPoolType;
}
