const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment from .env.local
const env = dotenv.parse(fs.readFileSync('.env.local'));

async function main() {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // 1. Fetch public profiles with role patient or clinic
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, role')
    .in('role', ['patient', 'clinic']);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    process.exit(1);
  }

  // 2. Fetch all Auth users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error fetching auth users:', authError);
    process.exit(1);
  }

  let profilesChecked = profiles.length;
  let usersUpdated = 0;
  let skipped = 0;

  // Create lookup map of profile ID to role
  const profileRoleMap = new Map();
  for (const profile of profiles) {
    profileRoleMap.set(profile.id, profile.role);
  }

  for (const user of users) {
    if (profileRoleMap.has(user.id)) {
      const expectedRole = profileRoleMap.get(user.id);
      const currentMetadata = user.user_metadata || {};
      const currentRole = currentMetadata.role;

      if (!currentRole || currentRole !== expectedRole) {
        // Needs update
        const updatedMetadata = {
          ...currentMetadata,
          role: expectedRole
        };

        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { user_metadata: updatedMetadata }
        );

        if (updateError) {
          console.error(Error updating user \:, updateError);
          process.exit(1);
        }
        usersUpdated++;
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  const jsonSummary = {
    profilesChecked,
    usersUpdated,
    skipped
  };

  console.log(JSON.stringify(jsonSummary, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
