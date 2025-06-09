
import { login } from './auth.js';
import { fetchAllUsers, fetchCurrentUser } from './api.js';
import type { User } from './types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const { fetchWithAuth, cookieJar } = await login();

  console.log('📥 Fetching all users...');
  const users: User[] = await fetchAllUsers(fetchWithAuth);

  console.log(users);

  console.log('👤 Fetching current user...');
  const currentUser: User = await fetchCurrentUser(fetchWithAuth, cookieJar);

  console.log(currentUser);

  const output = {
    users,
    currentUser,
  };

  const outPath = path.join(__dirname, '..', 'users.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
 // console.log('✅ Saved users to users.json');
}

main().catch((err) => {
  console.error('❌ Error in main():', err);
  process.exit(1);
});
