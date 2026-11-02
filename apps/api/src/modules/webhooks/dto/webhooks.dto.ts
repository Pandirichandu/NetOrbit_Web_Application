import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ example: 'Billing ERP Sync' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'https://erp.example.com/api/webhooks/netorbit' })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  endpointUrl: string;

  @ApiProperty({
    example: ['subscriber.created', 'payment.success', 'invoice.created'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  subscribedEvents: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  endpointUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subscribedEvents?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
