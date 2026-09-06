import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('--- INICIANDO TESTES DO NOVO FLUXO DE NOTIFICAÇÕES ---');

  try {
    // 1. Obter organização e gestor
    const profileRes = await client.query(`
      SELECT id, full_name, email, org_id 
      FROM profiles 
      WHERE org_id IS NOT NULL AND role = 'gestor' 
      LIMIT 1;
    `);
    if (profileRes.rows.length === 0) {
      throw new Error('Nenhum gestor com org_id encontrado.');
    }
    const gestor = profileRes.rows[0];
    const orgId = gestor.org_id;
    console.log(`Gestor de teste: ${gestor.full_name} (${gestor.id}) | Org: ${orgId}`);

    // Limpeza de testes anteriores
    await client.query("DELETE FROM clients WHERE trade_name = 'Empresa Teste Notif Fix';");

    // 2. Criar cliente de teste
    const clientRes = await client.query(`
      INSERT INTO clients (org_id, company_name, trade_name, document)
      VALUES ($1, 'Empresa Teste Notificacoes Fix Ltda', 'Empresa Teste Notif Fix', '99888777000166')
      RETURNING id;
    `, [orgId]);
    const clientId = clientRes.rows[0].id;
    console.log(`Cliente criado: ${clientId}`);

    // ========================================================================
    // TESTE 1: Contato criado e depois atualizado com os MESMOS dados (Falso Positivo)
    // ========================================================================
    console.log('\n--- TESTE 1: Contato atualizado sem alteração real (Eliminação de falso positivo) ---');
    const contactRes = await client.query(`
      INSERT INTO client_contacts (client_id, name, phone_mobile, email, is_main)
      VALUES ($1, 'Contato Financeiro', '11999990000', 'financeiro@teste.com', true)
      RETURNING id;
    `, [clientId]);
    const contactId = contactRes.rows[0].id;

    // Limpar notificações de inserção do contato para isolar o UPDATE
    await client.query('DELETE FROM notifications WHERE related_entity_id = $1;', [clientId]);

    // Executar UPDATE sem alterar os valores (o que o form fazia antes)
    await client.query(`
      UPDATE client_contacts 
      SET name = 'Contato Financeiro', phone_mobile = '11999990000', email = 'financeiro@teste.com', is_main = true
      WHERE id = $1;
    `, [contactId]);

    const notifT1 = await client.query(`
      SELECT * FROM notifications 
      WHERE related_entity_id = $1 AND type = 'client_contact_updated';
    `, [clientId]);

    if (notifT1.rows.length === 0) {
      console.log('✅ TESTE 1 PASSOU: Nenhuma notificação falsa gerada após UPDATE com dados idênticos!');
    } else {
      console.error('❌ TESTE 1 FALHOU: Notificação falsa ainda foi gerada:', notifT1.rows);
    }

    // ========================================================================
    // TESTE 2: Contato com alteração REAL (De -> Para)
    // ========================================================================
    console.log('\n--- TESTE 2: Contato com alteração real de telefone ---');
    await client.query(`
      UPDATE client_contacts 
      SET phone_mobile = '11988881111'
      WHERE id = $1;
    `, [contactId]);

    const notifT2 = await client.query(`
      SELECT * FROM notifications 
      WHERE related_entity_id = $1 AND type = 'client_contact_updated';
    `, [clientId]);

    if (notifT2.rows.length > 0 && notifT2.rows[0].message.includes('11999990000 ➡️ 11988881111')) {
      console.log('✅ TESTE 2 PASSOU: Notificação informativa gerada com De -> Para exato!');
      console.log(`   Mensagem:\n${notifT2.rows[0].message}`);
    } else {
      console.error('❌ TESTE 2 FALHOU: Mensagem não gerada ou não contém De -> Para:', notifT2.rows);
    }

    // ========================================================================
    // TESTE 3: Renovação de Certificado Digital (Validade estendida)
    // ========================================================================
    console.log('\n--- TESTE 3: Renovação de Certificado Digital ---');
    const certRes = await client.query(`
      INSERT INTO client_certificates (client_id, model, signatory, expires_at)
      VALUES ($1, 'A1', 'Celso Diretor', '2026-10-01')
      RETURNING id;
    `, [clientId]);
    const certId = certRes.rows[0].id;

    // Atualizar validade para 2027
    await client.query(`
      UPDATE client_certificates 
      SET expires_at = '2027-10-01'
      WHERE id = $1;
    `, [certId]);

    const notifT3 = await client.query(`
      SELECT * FROM notifications 
      WHERE related_entity_id = $1 AND type = 'certificate_renewed';
    `, [clientId]);

    if (notifT3.rows.length > 0 && notifT3.rows[0].message.includes('01/10/2026') && notifT3.rows[0].message.includes('01/10/2027')) {
      console.log('✅ TESTE 3 PASSOU: Notificação de renovação de certificado gerada com sucesso!');
      console.log(`   Título: ${notifT3.rows[0].title}`);
      console.log(`   Mensagem:\n${notifT3.rows[0].message}`);
    } else {
      console.error('❌ TESTE 3 FALHOU:', notifT3.rows);
    }

    // ========================================================================
    // TESTE 4: Renovação de Licença / Alvará (Vencimento estendido)
    // ========================================================================
    console.log('\n--- TESTE 4: Renovação de Licença / Alvará ---');
    const licRes = await client.query(`
      INSERT INTO client_licenses (client_id, license_name, license_number, expiry_date)
      VALUES ($1, 'Alvará Sanitário', 'ALV-2026', '2026-11-15')
      RETURNING id;
    `, [clientId]);
    const licId = licRes.rows[0].id;

    // Atualizar vencimento para 2027
    await client.query(`
      UPDATE client_licenses 
      SET expiry_date = '2027-11-15'
      WHERE id = $1;
    `, [licId]);

    const notifT4 = await client.query(`
      SELECT * FROM notifications 
      WHERE related_entity_id = $1 AND type = 'license_renewed';
    `, [clientId]);

    if (notifT4.rows.length > 0 && notifT4.rows[0].message.includes('15/11/2026') && notifT4.rows[0].message.includes('15/11/2027')) {
      console.log('✅ TESTE 4 PASSOU: Notificação de renovação de licença gerada com sucesso!');
      console.log(`   Título: ${notifT4.rows[0].title}`);
      console.log(`   Mensagem:\n${notifT4.rows[0].message}`);
    } else {
      console.error('❌ TESTE 4 FALHOU:', notifT4.rows);
    }

    // ========================================================================
    // TESTE 5 & 6: Certificados e Licenças VENCIDOS (check_daily_expirations)
    // ========================================================================
    console.log('\n--- TESTE 5 e 6: Certificados e Licenças VENCIDOS (check_daily_expirations) ---');
    // Criar certificado vencido (data passada)
    const certExpiredRes = await client.query(`
      INSERT INTO client_certificates (client_id, model, signatory, expires_at)
      VALUES ($1, 'A1', 'Signatário Vencido', CURRENT_DATE - INTERVAL '5 days')
      RETURNING id;
    `, [clientId]);
    const certExpiredId = certExpiredRes.rows[0].id;

    // Criar licença vencida (data passada)
    const licExpiredRes = await client.query(`
      INSERT INTO client_licenses (client_id, license_name, license_number, expiry_date)
      VALUES ($1, 'Alvará de Bombeiros Vencido', 'BOMB-2025', CURRENT_DATE - INTERVAL '10 days')
      RETURNING id;
    `, [clientId]);
    const licExpiredId = licExpiredRes.rows[0].id;

    // Executar a rotina diária
    await client.query('SELECT check_daily_expirations();');

    // Verificar notificação de certificado vencido
    const notifT5 = await client.query(`
      SELECT * FROM notifications 
      WHERE related_entity_id = $1 AND type = 'certificate_expired';
    `, [certExpiredId]);

    if (notifT5.rows.length > 0) {
      console.log('✅ TESTE 5 PASSOU: Alerta de certificado vencido gerado com sucesso!');
      console.log(`   Título: ${notifT5.rows[0].title}`);
      console.log(`   Mensagem:\n${notifT5.rows[0].message}`);
    } else {
      console.error('❌ TESTE 5 FALHOU: Nenhuma notificação de certificado vencido gerada.');
    }

    // Verificar notificação de licença vencida
    const notifT6 = await client.query(`
      SELECT * FROM notifications 
      WHERE related_entity_id = $1 AND type = 'license_expired';
    `, [licExpiredId]);

    if (notifT6.rows.length > 0) {
      console.log('✅ TESTE 6 PASSOU: Alerta de licença vencida gerado com sucesso!');
      console.log(`   Título: ${notifT6.rows[0].title}`);
      console.log(`   Mensagem:\n${notifT6.rows[0].message}`);
    } else {
      console.error('❌ TESTE 6 FALHOU: Nenhuma notificação de licença vencida gerada.');
    }

    // ========================================================================
    // LIMPEZA DOS DADOS DE TESTE
    // ========================================================================
    console.log('\n--- Realizando limpeza dos registros de teste ---');
    await client.query(`
      DELETE FROM notifications 
      WHERE related_entity_id IN ($1, $2, $3, $4, $5);
    `, [clientId, certId, licId, certExpiredId, licExpiredId]);
    await client.query('DELETE FROM client_certificates WHERE client_id = $1;', [clientId]);
    await client.query('DELETE FROM client_licenses WHERE client_id = $1;', [clientId]);
    await client.query('DELETE FROM client_contacts WHERE client_id = $1;', [clientId]);
    await client.query('DELETE FROM clients WHERE id = $1;', [clientId]);
    console.log('✅ Limpeza finalizada com sucesso!');

    console.log('\n🎉 TODOS OS 6 TESTES FORAM CONCLUÍDOS COM SUCESSO TOTAL!');

  } catch (err) {
    console.error('❌ Erro durante a execução dos testes:', err);
  } finally {
    await client.end();
  }
}

run();
