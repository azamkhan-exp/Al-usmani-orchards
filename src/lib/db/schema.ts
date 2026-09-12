import { getDatabase } from './index';

export async function initializeDatabaseSchema() {
  // Schema is permanently provisioned in Neon PostgreSQL.
  // This function is kept for backward compatibility.
  return Promise.resolve();
}
