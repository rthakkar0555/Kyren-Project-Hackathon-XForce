
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function promoteToAdmin(email) {
    console.log(`Promoting ${email} to admin...`);

    // 1. Get user ID from Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error("Auth Error:", authError.message);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.error(`User with email ${email} not found.`);
        console.log("Current users:", users.map(u => u.email).join(", "));
        return;
    }

    // 2. Update public.users table
    const { error: dbError } = await supabase
        .from('users')
        .update({ is_admin: true })
        .eq('id', user.id);

    if (dbError) {
        console.error("Database Error:", dbError.message);
    } else {
        console.log(`Success! ${email} is now an admin.`);
        console.log(`You can now access the admin panel at: http://localhost:3000/admin`);
    }
}

// Get email from command line arg
const email = process.argv[2];
if (!email) {
    console.log("Usage: node scripts/admin-user.js <email>");

    // List all users to help
    (async () => {
        console.log("\nListing available users:");
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (users) {
            users.forEach(u => console.log(`- ${u.email}`));
        }
    })();
} else {
    promoteToAdmin(email);
}
