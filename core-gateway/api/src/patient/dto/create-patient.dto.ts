import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';

export class RegisterPatientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  age: string;

  @IsEnum(['Male', 'Female', 'Other'])
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phone: string;

  @IsString()
  @IsOptional()
  abhaNumber?: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}
