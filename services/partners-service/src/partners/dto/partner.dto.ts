import {
  IsEmail,
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsIn,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug must be lowercase alphanumeric with hyphens",
  })
  slug!: string;
}

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(["active", "inactive"])
  status?: string;
}

export class RegisterPartnerDto {
  @IsString()
  @IsNotEmpty()
  orgName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug must be lowercase alphanumeric with hyphens",
  })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  ownerPassword!: string;
}
