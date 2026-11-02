import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SubscriberStatus, IpAssignmentType } from '../entities/subscriber.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateSubscriberDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1-555-0199' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: '+1-555-0198' })
  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: 'ID-99281726' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiProperty({ example: '742 Evergreen Terrace' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: 'Springfield' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Oregon' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '97477' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiPropertyOptional({ example: 'US', default: 'US' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '44.0462,-123.0220' })
  @IsOptional()
  @IsString()
  gpsCoordinates?: string;

  @ApiPropertyOptional({ description: 'Assigned package ID' })
  @IsOptional()
  @IsUUID('4')
  packageId?: string;

  @ApiPropertyOptional({ enum: IpAssignmentType, default: IpAssignmentType.DYNAMIC })
  @IsOptional()
  @IsEnum(IpAssignmentType)
  ipAssignmentType?: IpAssignmentType;

  @ApiPropertyOptional({ example: '192.168.10.50' })
  @IsOptional()
  @IsString()
  staticIp?: string;

  @ApiPropertyOptional({ example: '00:1A:2B:3C:4D:5E' })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiProperty({ example: 'johndoe_broadband' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ example: 'Broadband@2026' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({ example: 'Installation scheduled for weekend.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: false, description: 'Automatically create customer portal user login' })
  @IsOptional()
  @IsBoolean()
  createPortalUser?: boolean;

  @ApiPropertyOptional({ description: 'Tenant ID (used only by Super Admin)' })
  @IsOptional()
  @IsUUID('4')
  tenantId?: string;
}

export class UpdateSubscriberDto extends PartialType(CreateSubscriberDto) {}

export class UpdateSubscriberStatusDto {
  @ApiProperty({ enum: SubscriberStatus, example: SubscriberStatus.ACTIVE })
  @IsEnum(SubscriberStatus)
  status: SubscriberStatus;

  @ApiPropertyOptional({ example: 'Account activated upon payment verification.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ChangeSubscriberPackageDto {
  @ApiProperty({ description: 'New package ID to assign' })
  @IsUUID('4')
  packageId: string;
}

export class SubscriberFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SubscriberStatus })
  @IsOptional()
  @IsEnum(SubscriberStatus)
  status?: SubscriberStatus;

  @ApiPropertyOptional({ description: 'Filter by assigned package ID' })
  @IsOptional()
  @IsUUID('4')
  packageId?: string;
}
