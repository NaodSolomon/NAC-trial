import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsIn,
  IsOptional,
  Matches,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class HomepageActionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  href!: string;
}

export class HomepageServiceItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body!: string;
}

export abstract class HomepageSectionDto {
  @IsIn(['hero', 'services', 'location', 'callToAction'])
  type!: 'hero' | 'services' | 'location' | 'callToAction';
}

export class HomepageHeroSectionDto extends HomepageSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  heading!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  body?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => HomepageActionDto)
  primaryAction?: HomepageActionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => HomepageActionDto)
  secondaryAction?: HomepageActionDto;
}

export class HomepageServicesSectionDto extends HomepageSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  heading!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => HomepageServiceItemDto)
  items!: HomepageServiceItemDto[];
}

export class HomepageCallToActionSectionDto extends HomepageSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  heading!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  body?: string;

  @ValidateNested()
  @Type(() => HomepageActionDto)
  action!: HomepageActionDto;
}

export class HomepageLocationSectionDto extends HomepageSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  heading!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  body?: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Matches(/^https:\/\/(?:[a-z0-9-]+\.)*google\.com\//i, {
    message: 'mapEmbedUrl must use an approved Google HTTPS origin',
  })
  @MaxLength(2048)
  mapEmbedUrl!: string;
}

export class ContentSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  heading!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5_000)
  body!: string;
}

export class AboutMetadataDto {
  @ValidateNested()
  @Type(() => ContentSectionDto)
  mission!: ContentSectionDto;

  @ValidateNested()
  @Type(() => ContentSectionDto)
  history!: ContentSectionDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => HomepageServiceItemDto)
  services!: HomepageServiceItemDto[];
}

export class VolunteerRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1_000)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  commitment?: string;
}

export class TeamMemberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  role!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  biography!: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string;
}

export class CmsPageMetadataDto {
  [key: string]: unknown;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => HomepageSectionDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { name: 'hero', value: HomepageHeroSectionDto },
        { name: 'services', value: HomepageServicesSectionDto },
        { name: 'location', value: HomepageLocationSectionDto },
        { name: 'callToAction', value: HomepageCallToActionSectionDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  sections?: HomepageSectionDto[];


  @IsOptional()
  @ValidateNested()
  @Type(() => AboutMetadataDto)
  about?: AboutMetadataDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => VolunteerRoleDto)
  volunteerRoles?: VolunteerRoleDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  teamMembers?: TeamMemberDto[];

  @IsOptional()
  @IsBoolean()
  contentApproved?: boolean;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  mapEmbedUrl?: string;
}
