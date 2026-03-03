require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function testQuery() {
    const userId = 'cf35d466-4c4f-4d4b-baac-35b8dd5ce5d4'; // Preciso pegar um userId valido, ou apenas testar a query genérica.

    // Vamos buscar qualquer member com count > 0 para ver o que ta rolando
    const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('channel_id, created_at, sender_id')
        .limit(5);

    console.log("Mensagens recentes:", messages);

    const { data: members, err } = await supabase
        .from('chat_channel_members')
        .select('user_id, channel_id, last_read_at')
        .limit(5);

    console.log("Membros recentes:", members);
}

testQuery();
