# 02 — Escopo Funcional, Modelagem e Pontos para Refinamento

## 1. Módulos e Funcionalidades Planejadas

### 1.1. Configurações → Padrões de NFS-e ([`pages/Settings.tsx`](../../pages/Settings.tsx))
Cadastro de padrões tributários/de serviço reutilizáveis pelo escritório para vincular a um ou vários clientes (**relação N:N** com opção de sobrescrita pontual por cliente):
- **Dados do Padrão (`nfse_patterns`):**
  - Nome identificador (ex.: *"Serviços Administrativos — Simples Nacional"*);
  - Código de Tributação Nacional (`cTribNac` — 6 dígitos);
  - Código `NBS` (Nomenclatura Brasileira de Serviços);
  - Código `indOp` / `cIndOp` (Indicador da Operação / local de incidência);
  - Código `cClassTrib` (Classificação Tributária IBS/CBS — Reforma Tributária);
  - Descrição padrão do serviço com suporte a variáveis (ex.: `{competencia}`, `{mes_ano}`);
  - Regras de ISS (exigibilidade, município de incidência, alíquota padrão, retenção de ISS) e retenções federais padrão (IRRF, PIS, COFINS, CSLL, INSS quando aplicável).
- **Vínculo Padrão ↔ Cliente (`client_nfse_patterns`):**
  - Permite vincular 1 padrão a dezenas de clientes (atualizou o padrão em Configurações, reflete em todos);
  - Um cliente pode ter 1 padrão marcado como **Principal** (pré-preenchido na emissão) e padrões secundários;
  - Permite **sobrescrita opcional** no vínculo (ex.: alíquota de ISS diferenciada do município do cliente) sem duplicar o padrão inteiro.

### 1.2. Módulo de Participantes (Tomadores de Serviço)
- **Separado 100% da tabela `clients`:** não mistura tomadores (clientes do cliente do escritório) com os clientes do escritório contábil, preservando métricas do Dashboard, planos/limites e Portal do Cliente.
- **Isolamento por `client_id` + `organization_id`:** ao emitir para o *Cliente A*, aparecem apenas os Participantes/Tomadores vinculados ao *Cliente A* (evita exposição cruzada de carteiras e reduz erros).
- **Preenchimento rápido:** busca automática de dados cadastrais por CNPJ via `supabase/functions/fetch-cnpj` + opção futura de copiar dados cadastrais de outro participante do escritório sem misturar os vínculos.

### 1.3. Tabelas Fiscais Oficiais Versionadas (Anexo VIII — Receita Federal)
Para acompanhar facilmente atualizações da Receita Federal / CG-NFS-e (`cTribNac`, `NBS`, `indOp`, `cClassTrib`):
- Tabelas globais de catálogo no PostgreSQL (`fiscal_catalog_versions`, `fiscal_ctribnac_catalog`, `fiscal_nbs_catalog`, `fiscal_indop_catalog`, `fiscal_cclasstrib_catalog` e tabela de correlação `fiscal_anexo8_rules`).
- Controle por **`is_active` + vigência (`valid_from` / `valid_to`)** — códigos antigos nunca quebram histórico de notas já emitidas.
- Atualização via **importador de planilha/CSV (upsert)** sem necessidade de alterar código ou fazer novo deploy.
- **Validação inteligente na UI:** ao selecionar `cTribNac` ou `NBS`, filtrar apenas as combinações válidas de `indOp` e `cClassTrib` previstas no Anexo VIII, reduzindo rejeições.

### 1.4. Fluxo de Emissão, Clonagem e Conferência
- **Clonar última NFS-e:** duplica dados de uma nota anterior (Emitente, Tomador, Padrão, Valores, Discriminação), atualizando competência e gerando nova chave de idempotência (`ref`).
- **Pré-visualização (Espelho da NFS-e):** tela/modal fiel com todos os campos calculados (Prestador travado, Tomador, códigos fiscais, retenções, base de cálculo, valor líquido, discriminação final e indicador explícito de **Homologação** vs. **Produção**) antes do envio.

### 1.5. Emissão Programada (Agendamento no Servidor)
- Executada **no backend via `pg_cron` + Edge Function** (`process-scheduled-nfse`), nunca dependendo de navegador aberto.
- Tabela `nfse_schedules` com lock atômico (`agendada` → `processando` → `concluida`/`erro`), suporte a data específica ou recorrência mensal e notificação automática em caso de sucesso ou rejeição.

### 1.6. Pós-Emissão, Ações em Lote, Logs e Métricas
- **Ações:** enviar por e-mail ao tomador, cancelar (com motivo obrigatório via `<ConfirmModal>` e guarda do XML do evento de cancelamento), baixar XML/PDF individual ou **em lote (.zip por cliente/período)** para fechamento fiscal.
- **Log de Erros de Transmissão (`nfse_transmission_logs`):** armazena cada tentativa, código de erro/rejeição da Sefin/Prefeitura, retorno técnico bruto e orientação amigável de correção.
- **Cards de Métricas:** agregação no PostgreSQL via RPC (`get_nfse_dashboard_metrics`) exibindo totais (quantidade, valor bruto, valor líquido, canceladas, com erro, agendadas) com filtro **geral do escritório** ou **por cliente** e **por período**.

---

## 2. Checklist de Levantamento (Campos e Variáveis para Definir Antes de Codar)

Use este espaço como roteiro para levantar todas as variáveis e exceções antes da etapa de modelagem definitiva:

- [ ] **Dados obrigatórios do Prestador (Emitente):** Inscrição Municipal (IM), Regime Especial de Tributação (`regEspTrib`), Optante Simples Nacional (`opSimpNac`: Não optante / MEI / ME-EPP), Regime de Apuração de Tributos no SN (`regApTribSN`), incentivo fiscal, série e numeração inicial da DPS.
- [ ] **Campos variáveis do Serviço:** Local de prestação (código IBGE do município), `cTribNac`, `cTribMun` (quando aplicável), `NBS`, `indOp`, `cClassTrib`, código de atividade no Simples (`COD_ATIV_SN` quando aplicável), descrição do serviço, número do pedido/contrato/obra (CNO/CEI se construção civil).
- [ ] **Valores, Deduções e Descontos:** Valor do serviço, desconto incondicionado, desconto condicionado, deduções/reduções permitidas, outras retenções.
- [ ] **ISS e Retenções:** Alíquota ISS (`pAliq`), tipo de retentor do ISS (não retido / retido pelo tomador / retido por intermediário), exigibilidade/suspensão/imunidade/isenção/exportação.
- [ ] **Tributos Federais / Retenções (Lucro Presumido / Real / exceções):** CST PIS/COFINS, base e alíquota PIS, COFINS, IRRF, CSLL, CP/INSS, e se somam/deduzem do valor líquido.
- [ ] **Reforma Tributária (IBS/CBS):** Campos transitórios exigidos conforme regime (`cClassTrib`, `indOp`, CST IBS/CBS, alíquotas informativas/efetivas).
- [ ] **Tomador (Participante):** CPF/CNPJ/NIF (exterior/não identificado quando permitido), Inscrição Municipal/Estadual (se houver), endereço completo com código IBGE do município, e-mail(s) para envio automático.
- [ ] **Fluxo de Eventos:** Regras de cancelamento (códigos de motivo do Emissor Nacional: erro na emissão, serviço não prestado, duplicidade) e Carta de Correção / Substituição de NFS-e.
- [ ] **Permissões e Cobrança:** Quais perfis (`gestor`, `operacional`, `cliente` no Portal) podem preparar rascunho, emitir, cancelar ou agendar; e se a chave da API Focus será por escritório (BYO Key) ou centralizada.
