// ============================================================================
// Creates (or resets) the super-admin login and ensures a matching StaffUser
// profile exists for RBAC.  Run:  npm run db:create-admin
//
// Credentials can be overridden via env (ADMIN_EMAIL / ADMIN_PASSWORD /
// ADMIN_NAME); defaults match the requested owner account.
// ============================================================================
import 'dotenv/config';
import { hashPassword, upsertAuthUser } from './auth';
import { upsertItem } from './repo';
import { COLLECTION_BY_KEY } from './collections';
import { closePool } from './db';

const EMAIL = (process.env.ADMIN_EMAIL || 'admin@amanatgroup.com').toLowerCase();
const PASSWORD = process.env.ADMIN_PASSWORD || 'JJstmg3xpt9@!';
const NAME = process.env.ADMIN_NAME || 'Amanat Admin (Owner)';
const STAFF_ID = process.env.ADMIN_STAFF_ID || 'usr_amanat_owner';

async function run(): Promise<void> {
  // 1. Ensure the RBAC profile exists (full super-admin permissions).
  const staffUser = {
    id: STAFF_ID,
    name: NAME,
    email: EMAIL,
    role: 'super_admin',
    assignedBusiness: 'all',
    permissions: {
      canViewGlobalReports: true,
      canManageAuditConfig: true,
      canManageInventory: true,
      canManagePOS: true,
      canManageExpenses: true,
      canManageCRM: true,
      canManageRBAC: true,
    },
  };
  await upsertItem(COLLECTION_BY_KEY['staffUsers'], staffUser);
  console.log(`✓ StaffUser profile ready: ${STAFF_ID}`);

  // 2. Create/reset the login.
  const passwordHash = await hashPassword(PASSWORD);
  await upsertAuthUser({
    id: `auth_${STAFF_ID}`,
    email: EMAIL,
    passwordHash,
    staffUserId: STAFF_ID,
  });
  console.log(`✓ Login ready: ${EMAIL}`);
}

run()
  .then(async () => {
    await closePool();
    console.log('\nAdmin account is ready. You can now log in at /login.');
    process.exit(0);
  })
  .catch(async (err) => {
    await closePool();
    console.error('create-admin failed:', err);
    process.exit(1);
  });
