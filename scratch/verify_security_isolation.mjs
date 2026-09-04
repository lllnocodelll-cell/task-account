import pg from 'pg';

const client = new pg.Client({
  host: 'db.lpskaluntuupvnnpvtop.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'TempPasswordTask2026!',
  ssl: { rejectUnauthorized: false }
});

async function runTests() {
  await client.connect();
  console.log('=== INICIANDO BATERIA DE TESTES DE SEGURANÇA E COMPATIBILIDADE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSOU: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALHOU: ${message}`);
      failed++;
    }
  }

  // 1. Obter usuário cliente com empresa real existente
  const clientUserRes = await client.query(`
    SELECT p.id, p.email, p.role, p.org_id, p.client_ids, c.id as real_client_id, c.company_name
    FROM profiles p
    JOIN clients c ON c.id = ANY(p.client_ids)
    WHERE p.role = 'cliente'
    LIMIT 1;
  `);

  if (!clientUserRes.rows[0]) {
    console.error('Usuário cliente com empresa real não encontrado.');
    await client.end();
    return;
  }

  const clientUser = clientUserRes.rows[0];
  const ownClientId = clientUser.real_client_id;

  // Gestor da MESMA organização
  const gestorSameOrgRes = await client.query(`
    SELECT id, email, role, org_id 
    FROM profiles 
    WHERE role = 'gestor' AND (org_id = $1 OR id = $1)
    LIMIT 1;
  `, [clientUser.org_id]);

  // Gestor de OUTRA organização diferente
  const gestorDiffOrgRes = await client.query(`
    SELECT id, email, role, org_id 
    FROM profiles 
    WHERE role = 'gestor' AND org_id != $1 AND id != $1
    LIMIT 1;
  `, [clientUser.org_id]);

  const gestorSameOrg = gestorSameOrgRes.rows[0];
  const gestorDiffOrg = gestorDiffOrgRes.rows[0];

  // Buscar um clientId que pertença à MESMA organização mas NÃO seja do clientUser
  const otherClientRes = await client.query(`
    SELECT id, company_name FROM clients 
    WHERE org_id = $1 AND NOT (id = ANY($2::uuid[]))
    LIMIT 1;
  `, [clientUser.org_id, clientUser.client_ids]);

  const otherClientId = otherClientRes.rows[0]?.id;

  console.log(`Contexto do Teste:`);
  console.log(`- Usuário Cliente: ${clientUser.email} (ID: ${clientUser.id})`);
  console.log(`- Org do Cliente: ${clientUser.org_id}`);
  console.log(`- Empresa Própria: ${ownClientId} (${clientUser.company_name})`);
  console.log(`- Empresa de Outro Cliente: ${otherClientId || 'N/A'} (${otherClientRes.rows[0]?.company_name || 'N/A'})`);
  console.log(`- Gestor (Mesma Org): ${gestorSameOrg?.email || gestorSameOrg?.id} (ID: ${gestorSameOrg?.id})`);
  console.log(`- Gestor (Outra Org): ${gestorDiffOrg?.email || gestorDiffOrg?.id} (ID: ${gestorDiffOrg?.id})\n`);

  // --- TESTE 1: check_client_access como CLIENTE ---
  console.log('--- TESTE 1: Validação da função check_client_access ---');
  
  await client.query(`SET "request.jwt.claim.sub" = '${clientUser.id}'`);
  await client.query(`SET "role" = 'authenticated'`);

  const checkOwn = await client.query(`SELECT public.check_client_access($1) as allowed;`, [ownClientId]);
  assert(checkOwn.rows[0].allowed === true, 'Cliente tem acesso à SUA PRÓPRIA empresa');

  if (otherClientId) {
    const checkOther = await client.query(`SELECT public.check_client_access($1) as allowed;`, [otherClientId]);
    assert(checkOther.rows[0].allowed === false, 'Cliente é BLOQUEADO ao tentar acessar empresa de OUTRO cliente do mesmo escritório (Intra-Tenant bloqueado)');
  }

  const checkNull = await client.query(`SELECT public.check_client_access(NULL) as allowed;`);
  assert(checkNull.rows[0].allowed === false, 'check_client_access(NULL) retorna false com segurança');

  // --- TESTE 2: check_client_access como GESTOR (Mesma Org e Outra Org) ---
  if (gestorSameOrg) {
    await client.query(`SET "request.jwt.claim.sub" = '${gestorSameOrg.id}'`);
    await client.query(`SET "role" = 'authenticated'`);

    const checkGestorOwnOrg = await client.query(`SELECT public.check_client_access($1) as allowed;`, [ownClientId]);
    assert(checkGestorOwnOrg.rows[0].allowed === true, 'Gestor da MESMA org tem acesso aos clientes da sua organização');
  }

  if (gestorDiffOrg) {
    await client.query(`SET "request.jwt.claim.sub" = '${gestorDiffOrg.id}'`);
    await client.query(`SET "role" = 'authenticated'`);

    const checkGestorOtherOrg = await client.query(`SELECT public.check_client_access($1) as allowed;`, [ownClientId]);
    assert(checkGestorOtherOrg.rows[0].allowed === false, 'Gestor de OUTRA org é BLOQUEADO ao tentar acessar cliente de outro escritório (Cross-Tenant bloqueado)');
  }

  // --- TESTE 3: Proteção contra escalada de privilégios na tabela profiles ---
  console.log('\n--- TESTE 2: Proteção de profiles (Privilege Escalation & Self-Update) ---');
  
  // Como cliente, tentar se promover para 'gestor'
  await client.query(`SET "request.jwt.claim.sub" = '${clientUser.id}'`);
  await client.query(`SET "role" = 'authenticated'`);

  let roleEscalationBlocked = false;
  try {
    await client.query(`
      UPDATE public.profiles 
      SET role = 'gestor' 
      WHERE id = $1;
    `, [clientUser.id]);
  } catch (err) {
    if (err.message.includes('Não é permitido alterar seu próprio nível de acesso')) {
      roleEscalationBlocked = true;
    }
  }
  assert(roleEscalationBlocked, 'Tentativa de se promover a GESTOR é BLOQUEADA pela trigger');

  let orgSwitchBlocked = false;
  try {
    await client.query(`
      UPDATE public.profiles 
      SET org_id = '00000000-0000-0000-0000-000000000000' 
      WHERE id = $1;
    `, [clientUser.id]);
  } catch (err) {
    if (err.message.includes('Não é permitido alterar seu próprio nível de acesso ou organização')) {
      orgSwitchBlocked = true;
    }
  }
  assert(orgSwitchBlocked, 'Tentativa de alterar o próprio org_id é BLOQUEADA pela trigger');

  // Atualização legítima de campos permitidos (Heartbeat de presença e perfil)
  let normalUpdateSucceeded = false;
  try {
    const testTime = new Date().toISOString();
    await client.query(`
      UPDATE public.profiles 
      SET last_active_at = $1, chat_status = 'disponível'
      WHERE id = $2;
    `, [testTime, clientUser.id]);
    normalUpdateSucceeded = true;
  } catch (err) {
    console.error('Erro na atualização normal:', err);
  }
  assert(normalUpdateSucceeded, 'Atualização legítima de presença (last_active_at, chat_status) CONTINUA FUNCIONANDO 100%');

  // --- TESTE 4: Validação de Políticas RLS na tabela clients ---
  console.log('\n--- TESTE 3: Validação de visualização de clientes ---');
  await client.query(`SET "request.jwt.claim.sub" = '${clientUser.id}'`);
  await client.query(`SET "role" = 'authenticated'`);

  const clientVisibleClients = await client.query(`SELECT id, company_name FROM public.clients;`);
  const clientVisibleIds = clientVisibleClients.rows.map(r => r.id);
  
  const allBelongToClient = clientVisibleIds.every(id => clientUser.client_ids.includes(id));
  assert(allBelongToClient, `Cliente enxerga APENAS as empresas vinculadas a seu perfil (${clientVisibleIds.length} visíveis, Zero vazamento)`);

  if (gestorSameOrg) {
    await client.query(`SET "request.jwt.claim.sub" = '${gestorSameOrg.id}'`);
    await client.query(`SET "role" = 'authenticated'`);

    const gestorVisibleClients = await client.query(`SELECT id, company_name FROM public.clients;`);
    assert(gestorVisibleClients.rows.length > 0, `Gestor continua visualizando todos os clientes da organização (${gestorVisibleClients.rows.length} empresas listadas)`);

    // --- TESTE 5: Tarefas internas sem cliente (client_id IS NULL) ---
    console.log('\n--- TESTE 4: Tarefas internas do escritório sem cliente vinculado ---');

    let internalTaskInsertSucceeded = false;
    let testTaskId = null;
    try {
      const res = await client.query(`
        INSERT INTO public.tasks (
          client_name,
          task_name,
          competence,
          priority,
          status,
          org_id,
          created_at
        ) VALUES (
          'Escritório Contábil (Interno)',
          'Teste Interno Sem Cliente',
          '09/2026',
          'Média',
          'Pendente',
          $1,
          now()
        )
        RETURNING id;
      `, [gestorSameOrg.org_id]);
      testTaskId = res.rows[0].id;
      internalTaskInsertSucceeded = true;
    } catch (err) {
      console.error('Erro ao inserir tarefa interna:', err);
    }
    assert(internalTaskInsertSucceeded, 'Gestor/Operacional consegue criar e gerenciar tarefas internas com client_id NULL');

    if (testTaskId) {
      await client.query(`DELETE FROM public.tasks WHERE id = $1;`, [testTaskId]);
    }
  }

  // --- TESTE 6: client_accesses (senhas e logins) ---
  console.log('\n--- TESTE 5: Isolamento de credenciais e senhas em client_accesses ---');
  await client.query(`SET "request.jwt.claim.sub" = '${clientUser.id}'`);
  await client.query(`SET "role" = 'authenticated'`);

  const visibleAccesses = await client.query(`SELECT id, client_id, access_name FROM public.client_accesses;`);
  const allAccessesBelongToClient = visibleAccesses.rows.every(a => clientUser.client_ids.includes(a.client_id));
  assert(allAccessesBelongToClient, `Cliente NÃO visualiza senhas de outros clientes (Acessos visíveis: ${visibleAccesses.rows.length}, todos legítimos)`);

  console.log('\n=== RESULTADO FINAL ===');
  console.log(`Testes com sucesso: ${passed}`);
  console.log(`Testes com falha: ${failed}`);

  await client.end();
}

runTests().catch(console.error);
