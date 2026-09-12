import { initializeDatabaseSchema } from './schema';
import { getDatabase } from './index';

declare global {
  // eslint-disable-next-line no-var
  var __auo_db_ready: boolean | undefined;
}

export function ensureDatabaseReady(): void {
  global.__auo_db_ready = true;
}
