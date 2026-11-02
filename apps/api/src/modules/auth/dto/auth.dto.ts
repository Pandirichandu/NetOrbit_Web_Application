import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@netorbit.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'NetOrbit@Admin2026' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'default-isp', description: 'Tenant slug (leave empty for Super Admin)' })
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token string' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

export class MfaVerifyDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @MinLength(6)
  code: string;

  @ApiPropertyOptional({ description: 'MFA temporary token from login response' })
  @IsOptional()
  @IsString()
  mfaToken?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@netorbit.local' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenantSlug?: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewSecret@2026' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
