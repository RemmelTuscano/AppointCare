const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load env variables directly from .env.local
const envConfig = dotenv.parse(require('fs').readFileSync('.env.local'));

async function main() {
  const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || 'https://kcksnoplxtavfarnyfnm.supabase.co';
  const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('No service role key found');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const email = 'clinic@appointcare.test';

  // 1. Get the list of users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('List error:', listError);
    process.exit(1);
  }

  // 2. Find the clinic@appointcare.test user
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  // 3. Prepare updated metadata (preserve existing and modify/add role)
  const existingMetadata = user.user_metadata || {};
  const updatedMetadata = {
    ...existingMetadata,
    role: 'clinic'
  };

  // 4. Update the user
  const { data: { user: updatedUser }, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { user_metadata: updatedMetadata }
  );

  if (updateError) {
    console.error('Update error:', updateError);
    process.exit(1);
  }

  // 5. Fetch user to verify
  const { data: { user: verifiedUser }, error: getError } = await supabase.auth.admin.getUserById(user.id);
  if (getError) {
    console.error('Get error:', getError);
    process.exit(1);
  }

  // Output ONLY the JSON with "updated" and "roleMetadata"
  const result = {
    updated: true,
    roleMetadata: {
      role: verifiedUser.user_metadata.role
    }
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
