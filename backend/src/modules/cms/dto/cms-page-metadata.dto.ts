import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
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
  @IsIn(['hero', 'services', 'callToAction'])
  type!: 'hero' | 'services' | 'callToAction';
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

export class FaqItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  question!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  answer!: string;
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
        { name: 'callToAction', value: HomepageCallToActionSectionDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  sections?: HomepageSectionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  items?: FaqItemDto[];

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  mapEmbedUrl?: string;
}
