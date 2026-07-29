import { Controller, Get, Query } from '@nestjs/common';
import { NavigationItem } from '../../../database/schema';
import { PublicNavigationQueryDto } from '../dto/public-navigation-query.dto';
import { NavigationService } from '../services/navigation.service';

@Controller('navigation')
export class PublicNavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  list(@Query() query: PublicNavigationQueryDto): Promise<NavigationItem[]> {
    return this.navigationService.publicList(query.languageCode);
  }
}
