# 01 — Visão Geral, Viabilidade e Arquitetura de Segurança

## 1. Viabilidade e Desempenho da Aplicação

- **Viável sem deixar a aplicação pesada:**  
  Todo o processamento fiscal pesado (assinatura XMLDSig, comunicação mTLS/HTTPS, fila assíncrona na Sefin Nacional, geração de DANFSe PDF, guarda legal de XML) fica fora do navegador, executando em **Supabase Edge Functions** + API Fiscal intermediária.
- **Carregamento sob demanda no Frontend:**  
  Atualmente o [`App.tsx`](../../App.tsx) importa as páginas de forma estática. O módulo de NFS-e deve ser carregado via `React.lazy` + `Suspense`, garantindo que usuários que acessam apenas Dashboard, Tarefas ou Portal do Cliente não baixem código do módulo fiscal até abri-lo.

---

## 2. Estratégia de Integração: Focus NFe vs. API Direta (Sefin Nacional)

| Critério | Focus NFe (rota NFS-e Nacional) *(Recomendado para iniciar)* | API Direta Sefin Nacional / ADN |
| :--- | :--- | :--- |
| **Payload enviado pelo sistema** | JSON simplificado via Edge Function | XML da DPS seguindo schemas XSD oficiais |
| **Assinatura e Rede** | Focus gerencia XMLDSig e mTLS | Exige XMLDSig (RSA-SHA256 / C14N), GZip+Base64 e mTLS direto em cada requisição |
| **Geração do DANFSe (PDF)** | Gerado e armazenado pela Focus | Responsabilidade do software emissor gerar o PDF a partir dos dados retornados |
| **Manutenção** | Baixa (abstrai mudanças técnicas e notas técnicas) | Alta (gestão direta de schemas, KeyStore/certificados e `rate limit` / HTTP 429) |
| **Custo de API** | Mensalidade/consumo por CNPJ e volume na Focus | Sem custo de intermediário (API governamental) |

---

## 3. Certificado Digital e Procuração Eletrônica da Contabilidade

- **Suporte oficial na NFS-e Nacional (novembro/2026):**  
  Tanto o Emissor Web quanto as APIs da **Sefin Nacional** e do **ADN** passaram a suportar oficialmente atuação por **representação / Procuração Eletrônica**.
- **Como funciona na prática:**  
  O cliente (outorgante) concede procuração eletrônica específica para os serviços de NFS-e ao CNPJ/CPF da contabilidade no ecossistema da Receita Federal / Portal NFS-e. O sistema passa a autenticar a conexão mTLS e assinar a DPS com o **certificado A1 do próprio escritório contábil**, sem exigir coleta/renovação do `.pfx` de todos os clientes.
- **Configuração sugerida na ficha fiscal do cliente:**
  - `Modo de Transmissão`: **Procuração da Contabilidade** *(padrão)* ou **Certificado Próprio do Cliente**.
  - Controle de validade/status da procuração (ou do `.pfx` próprio quando utilizado).
- **Situação atual no código do Task Account:**  
  Hoje o [`utils/certificateUtils.ts`](../../utils/certificateUtils.ts) (`readA1Certificate`) lê metadados do `.pfx` no navegador (incluindo o CNPJ via OID `2.16.76.1.3.3`) e o [`components/ClientForm.tsx`](../../components/ClientForm.tsx) armazena apenas a validade para alertas, descartando o arquivo binário e a senha. Para emissão com certificado próprio, o `.pfx` + senha deverão ser enviados via Edge Function ao cofre da API fiscal (sem persistir senha em texto puro no banco).

---

## 4. Travas de Segurança: Impedir Emissão no CNPJ de Outro Cliente

Mesmo utilizando procuração única da contabilidade ou API centralizada, a garantia contra troca acidental de CNPJ deve atuar em **4 camadas**:

1. **Bloqueio visual e fluxo guiado na UI:**
   - O operador escolhe primeiro o **Cliente Emitente (Prestador)**.
   - Ao abrir a emissão, Razão Social e CNPJ ficam **travados** no cabeçalho (sem dropdown solto para alterar emitente no meio do formulário).
   - Modal final de confirmação explícito: *"Prestador (Emitente) vs. Tomador (Destinatário)"*.
2. **Resolução exclusiva no Backend (Edge Function):**
   - O frontend **nunca** envia token fiscal nem decide livremente o CNPJ emitente na chamada à API externa.
   - O frontend envia apenas `client_id` + dados da nota. A Edge Function valida usuário + `organization_id`, consulta `client_fiscal_configs` por `client_id` e utiliza o CNPJ oficial e o **token específico daquela empresa** na Focus NFe.
3. **Banco de Dados e RLS Multi-Tenant:**
   - Constraints `UNIQUE (organization_id, client_id)` e `UNIQUE (organization_id, cnpj)` na configuração fiscal do emitente.
   - Políticas de RLS estritas por `organization_id` e registro imutável de auditoria (`user_id`, `client_id`, `emitter_cnpj`, timestamp, `ref` única de idempotência).
4. **Validação cruzada do Certificado A1 (quando próprio):**
   - Antes de habilitar emissão com certificado do cliente, validar que o CNPJ extraído de dentro do `.pfx` (`2.16.76.1.3.3`) é idêntico ao CNPJ cadastrado do cliente.

---

## 5. Recursos do Task Account que já podem ser reaproveitados

- **`supabase/functions/fetch-cnpj`:** consulta automática de CNPJ para cadastrar Participantes (Tomadores) em segundos.
- **Infraestrutura `pg_cron` (referenciada em [`utils/cronHealthCheck.ts`](../../utils/cronHealthCheck.ts)):** base pronta para suportar **Emissão Programada** no servidor.
- **Regimes tributários ([`types.ts`](../../types.ts)):** catálogo de regimes já existente (`simples`, `simples_iva`, `presumido`, `real_*`, `mei`, etc.).
- **Portal do Cliente ([`pages/ClientPortal.tsx`](../../pages/ClientPortal.tsx)):** canal pronto para disponibilizar automaticamente XMLs e PDFs das notas autorizadas ao cliente.
- **Design System (`pages/Settings.tsx` / Modais / Drawers):** padrão de abas em Configurações, `<ConfirmModal>`, `<Tooltip>` e `Select/SearchableSelect`.
