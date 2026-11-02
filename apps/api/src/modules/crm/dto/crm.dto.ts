import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LeadStatus,
  InstallationStatus,
  TechnicianStatus,
  ComplaintCategory,
} from '@netorbit/shared-types';

export class CreateLeadDto {
  @ApiProperty({ example: 'David Miller' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+1-555-0199' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'david.miller@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '742 Evergreen Terrace, Sector 4' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Fiber Pro 100M' })
  @IsOptional()
  @IsString()
  interestedPackage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interestedPackage?: string;
}

export class ConvertLeadDto {
  @ApiProperty({ example: 'd3b07384-d113-4632-a160-c35ffc202020' })
  @IsUUID()
  @IsNotEmpty()
  packageId: string;

  @ApiPropertyOptional({ example: '742 Evergreen Terrace, Sector 4' })
  @IsOptional()
  @IsString()
  installationAddress?: string;

  @ApiPropertyOptional({ example: 'Broadband@2026' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ example: 'cyberdyne_user' })
  @IsOptional()
  @IsString()
  username?: string;
}

export class CreateInstallationDto {
  @ApiProperty({ example: 'David Miller' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '+1-555-0199' })
  @IsString()
  @IsNotEmpty()
  contactPhone: string;

  @ApiProperty({ example: '742 Evergreen Terrace, Sector 4' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '2026-10-15T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subscriberId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInstallationDto {
  @ApiPropertyOptional({ enum: InstallationStatus })
  @IsOptional()
  @IsEnum(InstallationStatus)
  status?: InstallationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  technicianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTechnicianDto {
  @ApiProperty({ example: 'Carlos Ramos' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+1-555-0811' })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiPropertyOptional({ example: 'carlos.tech@isp.local' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'North Sector' })
  @IsOptional()
  @IsString()
  serviceZone?: string;

  @ApiPropertyOptional({ enum: TechnicianStatus, default: TechnicianStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TechnicianStatus)
  status?: TechnicianStatus = TechnicianStatus.ACTIVE;
}

export class CreateComplaintDto {
  @ApiProperty({ example: 'Sarah Connor' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '+1-555-0144' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: ComplaintCategory, default: ComplaintCategory.NO_INTERNET })
  @IsEnum(ComplaintCategory)
  category: ComplaintCategory;

  @ApiProperty({ example: 'ONT Red optical alarm light flashing' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
