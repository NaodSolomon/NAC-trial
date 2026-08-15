import { mailConfigured, postgresConfigured } from './service-availability.helper';

export const describeWithPostgres = postgresConfigured ? describe : describe.skip;
export const itWithPostgres = postgresConfigured ? it : it.skip;
export const describeWithServices = postgresConfigured && mailConfigured ? describe : describe.skip;
