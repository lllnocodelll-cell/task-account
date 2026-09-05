import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function runTests() {
  await client.connect();
  console.log('Conectado ao PostgreSQL com sucesso.');

  try {
    // 1. Obter organização e usuários a partir de profiles
    const profilesRes = await client.query(
      'SELECT id, full_name, email, role, org_id FROM profiles WHERE org_id IS NOT NULL ORDER BY created_at ASC LIMIT 5;'
    );
    if (profilesRes.rows.length < 2) {
      throw new Error('Necessário pelo menos 2 perfis com org_id para testar.');
    }
    const orgId = profilesRes.rows[0].org_id;
    if (profilesRes.rows.length < 2) {
      throw new Error('Necessário pelo menos 2 perfis na organização para testar reatribuição.');
    }
    const user1 = profilesRes.rows[0];
    const user2 = profilesRes.rows[1];
    console.log(`Organização: ${orgId}`);
    console.log(`Usuário 1: ${user1.full_name || user1.email} (${user1.id})`);
    console.log(`Usuário 2: ${user2.full_name || user2.email} (${user2.id})`);

    const createdIds = {
      clientId: null,
      taskId: null,
      contactId: null,
      legislationId: null,
      taxRegimeId: null,
      notificationIds: []
    };

    // Limpeza preliminar de resíduos de testes anteriores
    await client.query("DELETE FROM clients WHERE trade_name = 'Teste Notif';");

    // --- CENÁRIO 6: Novo cliente cadastrado ---
    console.log('\n--- Testando Cenário 6: Novo cliente cadastrado (client_created) ---');
    const newClientRes = await client.query(`
      INSERT INTO clients (org_id, company_name, trade_name, document, street, street_number, neighborhood, city, state, zip_code)
      VALUES ($1, 'Empresa Teste Notificações Ltda', 'Teste Notif', '12345678000199', 'Rua das Flores', '100', 'Centro', 'São Paulo', 'SP', '01001-000')
      RETURNING id;
    `, [orgId]);
    createdIds.clientId = newClientRes.rows[0].id;
    console.log(`Cliente de teste criado com ID: ${createdIds.clientId}`);

    // Verificar se a notificação foi gerada
    const notif6Res = await client.query(`
      SELECT id, user_id, title, message, type, link, related_entity_id
      FROM notifications
      WHERE type = 'client_created' AND related_entity_id = $1;
    `, [createdIds.clientId]);

    console.log(`Notificações geradas para Cenário 6: ${notif6Res.rows.length}`);
    if (notif6Res.rows.length > 0) {
      console.log('✅ Cenário 6 PASSOU!');
      console.log(`   Título: ${notif6Res.rows[0].title}`);
      console.log(`   Mensagem:\n${notif6Res.rows[0].message}`);
      notif6Res.rows.forEach(r => createdIds.notificationIds.push(r.id));
    } else {
      console.log('❌ Cenário 6 FALHOU: nenhuma notificação gerada.');
    }

    // --- CENÁRIO 1: Reatribuição de tarefa ---
    console.log('\n--- Testando Cenário 1: Reatribuição de tarefa (task_reassigned) ---');
    const taskRes = await client.query(`
      INSERT INTO tasks (org_id, client_id, client_name, task_name, competence, priority, status, responsible, due_date, total_time_spent_seconds)
      VALUES ($1, $2, 'Empresa Teste Notificações Ltda', 'Apuração Fiscal Mensal', '09/2026', 'Média', 'Pendente', $3, CURRENT_DATE + 5, 0)
      RETURNING id;
    `, [orgId, createdIds.clientId, user1.full_name]);
    createdIds.taskId = taskRes.rows[0].id;

    // Atualizar responsible para user2
    await client.query(`
      UPDATE tasks
      SET responsible = $1
      WHERE id = $2;
    `, [user2.full_name, createdIds.taskId]);

    const notif1Res = await client.query(`
      SELECT id, user_id, title, message, type, link, related_entity_id
      FROM notifications
      WHERE type = 'task_reassigned' AND related_entity_id = $1;
    `, [createdIds.taskId]);

    console.log(`Notificações geradas para Cenário 1: ${notif1Res.rows.length}`);
    if (notif1Res.rows.length > 0) {
      console.log('✅ Cenário 1 PASSOU!');
      console.log(`   Título: ${notif1Res.rows[0].title}`);
      console.log(`   Mensagem:\n${notif1Res.rows[0].message}`);
      notif1Res.rows.forEach(r => createdIds.notificationIds.push(r.id));
    } else {
      console.log('❌ Cenário 1 FALHOU: nenhuma notificação gerada.');
    }

    // --- CENÁRIO 4: Adição e Alteração de Contato ---
    console.log('\n--- Testando Cenário 4: Adição e Alteração de Contato (client_contact_updated) ---');
    const contactRes = await client.query(`
      INSERT INTO client_contacts (client_id, name, email, phone_mobile, is_main)
      VALUES ($1, 'Contato de Teste', 'contato@teste.com', '11999998888', true)
      RETURNING id;
    `, [createdIds.clientId]);
    createdIds.contactId = contactRes.rows[0].id;

    const notif4InsertRes = await client.query(`
      SELECT id, user_id, title, message, type, link
      FROM notifications
      WHERE type = 'client_contact_updated' AND related_entity_id = $1;
    `, [createdIds.clientId]);

    console.log(`Notificações geradas para Cenário 4 (Inserção): ${notif4InsertRes.rows.length}`);
    if (notif4InsertRes.rows.length > 0) {
      console.log('✅ Cenário 4 (Inserção) PASSOU!');
      console.log(`   Título: ${notif4InsertRes.rows[0].title}`);
      console.log(`   Mensagem:\n${notif4InsertRes.rows[0].message}`);
      notif4InsertRes.rows.forEach(r => createdIds.notificationIds.push(r.id));
    } else {
      console.log('❌ Cenário 4 (Inserção) FALHOU.');
    }

    // Atualizar contato
    await client.query(`
      UPDATE client_contacts
      SET name = 'Contato Alterado', email = 'novoemail@teste.com'
      WHERE id = $1;
    `, [createdIds.contactId]);

    const notif4UpdateRes = await client.query(`
      SELECT id, user_id, title, message, type, link
      FROM notifications
      WHERE type = 'client_contact_updated' AND related_entity_id = $1 AND id NOT IN (${createdIds.notificationIds.map((_, i) => '$' + (i + 2)).join(', ') || 'NULL'});
    `, [createdIds.clientId, ...createdIds.notificationIds]);

    console.log(`Notificações geradas para Cenário 4 (Atualização): ${notif4UpdateRes.rows.length}`);
    if (notif4UpdateRes.rows.length > 0) {
      console.log('✅ Cenário 4 (Atualização) PASSOU!');
      console.log(`   Título: ${notif4UpdateRes.rows[0].title}`);
      console.log(`   Mensagem:\n${notif4UpdateRes.rows[0].message}`);
      notif4UpdateRes.rows.forEach(r => createdIds.notificationIds.push(r.id));
    } else {
      console.log('❌ Cenário 4 (Atualização) FALHOU.');
    }

    // --- CENÁRIO 3: Nova Legislação adicionada ---
    console.log('\n--- Testando Cenário 3: Nova Legislação adicionada (client_legislation_added) ---');
    const legRes = await client.query(`
      INSERT INTO client_legislations (client_id, description, status)
      VALUES ($1, 'Decreto Municipal nº 12.345 - Isenção Parcial de ISS', 'active')
      RETURNING id;
    `, [createdIds.clientId]);
    createdIds.legislationId = legRes.rows[0].id;

    const notif3Res = await client.query(`
      SELECT id, user_id, title, message, type, link
      FROM notifications
      WHERE type = 'client_legislation_added' AND related_entity_id = $1;
    `, [createdIds.clientId]);

    console.log(`Notificações geradas para Cenário 3: ${notif3Res.rows.length}`);
    if (notif3Res.rows.length > 0) {
      console.log('✅ Cenário 3 PASSOU!');
      console.log(`   Título: ${notif3Res.rows[0].title}`);
      console.log(`   Mensagem:\n${notif3Res.rows[0].message}`);
      notif3Res.rows.forEach(r => createdIds.notificationIds.push(r.id));
    } else {
      console.log('❌ Cenário 3 FALHOU.');
    }

    // --- CENÁRIO 2: Regime tributário encerrado e novo vigente ---
    console.log('\n--- Testando Cenário 2: Mudança de Regime Tributário (client_tax_regime_changed) ---');
    // Inserir regime encerrado anteriormente
    await client.query(`
      INSERT INTO client_tax_regime_history (client_id, regime, start_date, end_date, observation)
      VALUES ($1, 'simples_nacional', '2025-01-01', '2025-12-31', 'Encerrado por excesso de sublimite');
    `, [createdIds.clientId]);

    // Inserir novo regime vigente (end_date IS NULL)
    const regimeRes = await client.query(`
      INSERT INTO client_tax_regime_history (client_id, regime, start_date, observation)
      VALUES ($1, 'lucro_presumido', '2026-01-01', 'Novo enquadramento')
      RETURNING id;
    `, [createdIds.clientId]);
    createdIds.taxRegimeId = regimeRes.rows[0].id;

    const notif2Res = await client.query(`
      SELECT id, user_id, title, message, type, link
      FROM notifications
      WHERE type = 'client_tax_regime_changed' AND related_entity_id = $1;
    `, [createdIds.clientId]);

    console.log(`Notificações geradas para Cenário 2: ${notif2Res.rows.length}`);
    if (notif2Res.rows.length > 0) {
      console.log('✅ Cenário 2 PASSOU!');
      console.log(`   Título: ${notif2Res.rows[0].title}`);
      console.log(`   Mensagem:\n${notif2Res.rows[0].message}`);
      notif2Res.rows.forEach(r => createdIds.notificationIds.push(r.id));
    } else {
      console.log('❌ Cenário 2 FALHOU.');
    }

    // --- CENÁRIO 5: Alteração de Endereço com Mudança de Município/UF ---
    console.log('\n--- Testando Cenário 5: Alteração de Endereço (client_address_changed) ---');
    await client.query(`
      UPDATE clients
      SET city = 'Campinas', state = 'SP', street = 'Avenida Francisco Glicério', street_number = '500', zip_code = '13012-000'
      WHERE id = $1;
    `, [createdIds.clientId]);

    const notif5Res = await client.query(`
      SELECT id, user_id, title, message, type, link
      FROM notifications
      WHERE type = 'client_address_changed' AND related_entity_id = $1;
    `, [createdIds.clientId]);

    console.log(`Notificações geradas para Cenário 5: ${notif5Res.rows.length}`);
    if (notif5Res.rows.length > 0) {
      console.log('✅ Cenário 5 PASSOU!');
      console.log(`   Título: ${notif5Res.rows[0].title}`);
      console.log(`   Mensagem:\n${notif5Res.rows[0].message}`);
      notif5Res.rows.forEach(r => createdIds.notificationIds.push(r.id));
    } else {
      console.log('❌ Cenário 5 FALHOU.');
    }

    // --- CLEANUP ---
    console.log('\n--- Realizando Limpeza de Dados de Teste ---');
    await client.query(`DELETE FROM notifications WHERE related_entity_id = $1 OR related_entity_id = $2;`, [createdIds.clientId, createdIds.taskId]);
    if (createdIds.taskId) await client.query(`DELETE FROM tasks WHERE id = $1;`, [createdIds.taskId]);
    if (createdIds.contactId) await client.query(`DELETE FROM client_contacts WHERE client_id = $1;`, [createdIds.clientId]);
    if (createdIds.legislationId) await client.query(`DELETE FROM client_legislations WHERE client_id = $1;`, [createdIds.clientId]);
    if (createdIds.taxRegimeId) await client.query(`DELETE FROM client_tax_regime_history WHERE client_id = $1;`, [createdIds.clientId]);
    if (createdIds.clientId) await client.query(`DELETE FROM clients WHERE id = $1;`, [createdIds.clientId]);
    console.log('Limpeza concluída com sucesso!');

  } catch (err) {
    console.error('Erro durante o teste:', err);
  } finally {
    await client.end();
  }
}

runTests();
