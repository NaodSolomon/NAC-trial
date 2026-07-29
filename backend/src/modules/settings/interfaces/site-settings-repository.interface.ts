import { NewSiteSetting, SiteSetting } from '../../../database/schema';

export const SITE_SETTINGS_REPOSITORY = Symbol('SITE_SETTINGS_REPOSITORY');

export interface SiteSettingsRepository {
  get(): Promise<SiteSetting | null>;
  update(data: Partial<NewSiteSetting>, actorId: string): Promise<SiteSetting | null>;
}
