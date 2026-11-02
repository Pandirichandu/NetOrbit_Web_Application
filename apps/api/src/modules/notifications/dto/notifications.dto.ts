import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@netorbit/shared-types';

export class SendNotificationDto {
  @ApiProperty({ example: 'sarah.connor@example.com' })
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @ApiPropertyOptional({ enum: NotificationChannel, default: NotificationChannel.EMAIL })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel = NotificationChannel.EMAIL;

  @ApiPropertyOptional({ example: 'Welcome to NetOrbit Broadband!' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Phase 5 Automated Delivery Test' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ example: 'Your broadband connection has been successfully provisioned.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'NetOrbit Account Notice: {{event}}' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: 'Dear {{customerName}},\n\nYour invoice is now available.' })
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
