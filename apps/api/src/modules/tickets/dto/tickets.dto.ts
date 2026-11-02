import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority, TicketCategory, TicketStatus } from '@netorbit/shared-types';

export class CreateTicketDto {
  @ApiProperty({ example: 'Slow internet connection during peak hours' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Experiencing high latency and packet loss between 7 PM and 10 PM daily.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: TicketCategory, default: TicketCategory.TECHNICAL })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory = TicketCategory.TECHNICAL;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority = TicketPriority.MEDIUM;

  @ApiPropertyOptional({ example: 'd3b07384-d113-4632-a160-c35ffc202020' })
  @IsOptional()
  @IsUUID()
  subscriberId?: string;

  @ApiPropertyOptional({ example: 'd3b07384-d113-4632-a160-c35ffc202021' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;
}

export class CreateCommentDto {
  @ApiProperty({ example: 'Field technician dispatched for line testing.' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;
}

export class TicketQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ enum: TicketCategory })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  subscriberId?: string;
}
