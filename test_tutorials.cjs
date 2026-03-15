require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function testQuery() {
    const orgId = 'd267999c-b59b-493d-a378-c542e8353a8c'; 
    const { data, error } = await supabase
        .from('tutorials')
        .select(`
          *,
          clients (company_name, trade_name),
          profiles:created_by (first_name, last_name, avatar_url)
        `)
        .eq('org_id', orgId);

    console.log("Error:", error);
}

testQuery();
