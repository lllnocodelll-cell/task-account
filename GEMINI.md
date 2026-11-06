# Diretrizes e Regras do Projeto — Task Account

Este documento define o contexto arquitetural, os padrões obrigatórios de UI/UX (Design System) e as diretrizes de engenharia de software da aplicação **Task Account**. Estas regras devem ser aplicadas automaticamente em todas as sessões de desenvolvimento, sem necessidade de solicitação prévia de análise da aplicação.

---

## 1. Idioma e Comunicação
- **Idioma obrigatório**: Responda sempre em **Português do Brasil (`pt-br`)**.
- Mantenha respostas objetivas, estruturadas e com links diretos para os arquivos e símbolos modificados.

---

## 2. Contexto Geral da Aplicação (Resumo Arquitetural)
O **Task Account** é uma plataforma SaaS B2B Multi-tenant voltada para escritórios contábeis e equipes corporativas, focada no gerenciamento de obrigações fiscais/contábeis, tarefas recorrentes, documentação de clientes, comunicação integrada e Portal do Cliente.

### Stack Tecnológica
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide React + `react-hot-toast`.
- **Backend / BaaS**: Supabase (Auth, PostgreSQL com RLS estrito por `organization_id`, Realtime, Storage e Edge Functions).

### Estrutura Principal de Diretórios
- `App.tsx`: Gerenciamento central de rotas, autenticação, contexto multi-tenant e separação entre a área operacional do escritório e a área exclusiva do cliente (`ClientPortal`).
- `pages/`: Módulos de página (`Dashboard.tsx`, `TaskMonitoring.tsx`, `TaskRegistration.tsx`, `Clients.tsx`, `Agenda.tsx`, `Reports.tsx`, `Chat.tsx`, `Tutorials.tsx`, `Settings.tsx`, `ClientPortal.tsx`).
- `components/ui/`: Componentes base do Design System (`Input.tsx`, `Tooltip.tsx`, `Button.tsx`, `Card.tsx`, `Badge.tsx`, `ConfirmModal.tsx`).
- `components/`: Componentes de domínio (`TaskForm.tsx`, `ClientForm.tsx`, `TaskDetailsDrawer.tsx`, `ClientDetailsDrawer.tsx`, `Header.tsx`, `Sidebar.tsx`, além de subpastas `dashboard/`, `chat/`, `clients/`, `tasks/`).
- `contexts/` e `hooks/`: Estado global de tema (`ThemeContext`), notificações (`NotificationContext`), presença online (`PresenceContext`) e limites/planos (`useOrganizationPlan`).
- `utils/`: Cliente Supabase (`supabaseClient.ts`), cálculos de datas/feriados/vencimentos (`dateUtils.ts`), certificados digitais (`certificateUtils.ts`) e importação/exportação (`clientImportExport.ts`, `exportUtils.ts`).

### Regras de Negócio Essenciais
1. **Isolamento Multi-Tenant**: Todos os registros pertencem a uma organização (`organization_id`). Qualquer query, inserção ou atualização no Supabase deve respeitar o tenant ativo.
2. **Dependência Setores → Tipos de Tarefa**: Todo Tipo de Tarefa exige obrigatoriamente um Setor vinculado (`sector_id`). No módulo de Configurações (`pages/Settings.tsx`), a aba *Tipos de Tarefa* fica bloqueada com cadeado enquanto não houver ao menos um setor cadastrado.
3. **Motor de Tarefas e Recorrência**: O cadastro de tarefas (`components/TaskForm.tsx`) opera de forma individual ou em lote, com suporte a cálculo automático de vencimento (*Fixo*, *Antecipar*, *Prorrogar* em finais de semana/feriados) e ciclos de recorrência (*Personalizado*, *Mensal*, *Bimestral*, *Trimestral*, *Semestral*, *Anual*).

---

## 3. Padrões Obrigatórios de UI/UX e Design System

Toda nova funcionalidade, tela ou ajuste visual **deve** respeitar rigorosamente os padrões abaixo desde a primeira implementação:

### 3.1. Tooltips (`<Tooltip>`)
- **PROIBIDO** utilizar o atributo nativo HTML `title="..."` em botões, ícones, cabeçalhos ou elementos interativos.
- **PROIBIDO** criar tooltips improvisados com CSS puro (`group-hover:opacity-100`) que possam ser cortados por containers com `overflow-hidden`.
- **OBRIGATÓRIO** utilizar sempre o componente oficial [`components/ui/Tooltip.tsx`](./components/ui/Tooltip.tsx):
  ```tsx
  <Tooltip content="Texto explicativo" position="top">
    <button type="button">...</button>
  </Tooltip>
  ```

### 3.2. Selects, Listas e Inputs (`components/ui/Input.tsx`)
- **PROIBIDO** utilizar a tag nativa `<select>` e `<option>` do HTML (pois renderiza o menu nativo do sistema operacional com fundo azul sem estilização).
- **OBRIGATÓRIO** utilizar os componentes estilizados com Portal de [`components/ui/Input.tsx`](./components/ui/Input.tsx):
  - `Select` (para listas diretas de opções)
  - `SearchableSelect` (para listas com busca)
  - `GroupedSelect` (para listas categorizadas)
  - `MultiSelect` (para seleção múltipla)
- **Inputs de Data, Mês e Hora (`type="date"`, `type="month"`, `type="time"`)**:
  - Utilizar sempre o componente `<Input>` de `components/ui/Input.tsx`, que já oculta o indicador/tooltip nativo do navegador (`::-webkit-calendar-picker-indicator`) e exibe o botão customizado com `<Tooltip>` padrão da aplicação.

### 3.3. Modo Escuro (Dark Mode) e Paleta de Cores
- **Compatibilidade Total**: Todo componente criado ou editado deve ser verificado tanto no **Modo Claro (Light)** quanto no **Modo Escuro (Dark)**.
- **Classes Proibidas**: **Nunca** utilizar classes de cores inexistentes na paleta padrão do Tailwind (como `bg-slate-850` ou `dark:hover:bg-slate-850`), pois elas não compilam e fazem o hover herdar a cor clara do modo Light.
- **Paleta Padrão Recomendada**:
  - **Superfícies principais (Cards, Modais, Dropdowns, Inputs)**: `bg-white dark:bg-slate-900`
  - **Superfícies secundárias / fundos sutis**: `bg-slate-50 dark:bg-slate-950/50` ou `bg-slate-50 dark:bg-slate-800/50`
  - **Bordas**: `border-slate-200 dark:border-slate-800` (ou `dark:border-slate-700` em inputs/popovers)
  - **Hover em itens de lista, opções de menu e botões neutros**: `hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white`
  - **Hover / Estado ativo de destaque (Indigo)**: `bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400`

### 3.4. Modais, Confirmações e Popovers
- Para confirmações de exclusão ou ações críticas, utilizar o componente [`components/ui/ConfirmModal.tsx`](./components/ui/ConfirmModal.tsx) em vez de `window.confirm()` nativo.
- Para menus flutuantes ou popovers dentro de cards/tabelas, garantir o uso de `createPortal(..., document.body)` ou `z-index` adequado para evitar corte por `overflow-hidden`.

---

## 4. Engenharia de Código e Prevenção Proativa de Erros

1. **Código Limpo e Manutenível (Clean Code)**:
   - Escrever código modular, legível, sem duplicação desnecessária e seguindo a arquitetura existente do projeto.
   - Antes de criar novos componentes visuais, hooks ou funções utilitárias, verificar e reutilizar o que já existe em `components/ui/`, `hooks/` e `utils/`.
2. **Tipagem Forte (TypeScript)**:
   - Respeitar as interfaces definidas em `types.ts` e `types/database.ts`. Evitar o uso de `any` quando o tipo puder ser inferido ou declarado explicitamente.
3. **Verificação e Correção Proativa**:
   - Sempre revisar o código gerado/modificado em busca de possíveis bugs de estado, problemas de contraste no Dark Mode, falta de tratamento de erro (`try/catch` com feedback via `toast.error`) ou quebras de layout responsivo.
   - Preservar comentários relevantes e funcionalidades existentes ao editar arquivos compartilhados.

