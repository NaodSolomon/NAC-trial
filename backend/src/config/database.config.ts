import { registerAs } from '@nestjs/config';
import { resolveDatabaseConnection } from '../database/database-connection';

export default registerAs('database', () => ({
  connection: resolveDatabaseConnection(),
}));
