import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationTrigger, AutomationAction } from '@netorbit/shared-types';

export class CreateAutomationRuleDto {
  @ApiProperty({ example: 'Auto-Suspend Expired Accounts' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Sweeps expired accounts daily and sends CoA Disconnect to NAS.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AutomationTrigger, default: AutomationTrigger.EXPIRY_REACHED })
  @IsEnum(AutomationTrigger)
  triggerEvent: AutomationTrigger;

  @ApiProperty({ enum: AutomationAction, default: AutomationAction.SUSPEND_SUBSCRIBER })
  @IsEnum(AutomationAction)
  actionType: AutomationAction;

  @ApiPropertyOptional()
  @IsOptional()
  actionPayload?: Record<string, any>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
