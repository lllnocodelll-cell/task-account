# Planejamento — Módulo de Emissão de NFS-e (Padrão Nacional)

> **Status:** Levantamento de ideias e arquitetura (nenhuma alteração de código realizada).  
> **Registrado em:** 14/11/2026  
> **Escopo inicial definido:** Emissão exclusiva de **NFS-e no Padrão Nacional (DPS / Sefin Nacional)**, aproveitando a unificação nacional e eliminando layouts específicos por prefeitura.

---

## Documentos desta pasta

1. [01-visao-geral-arquitetura.md](./01-visao-geral-arquitetura.md)  
   Análise de viabilidade e performance, comparação entre Focus NFe vs. API direta Sefin Nacional, uso de **Procuração Eletrônica da Contabilidade**, travas de segurança anti-troca de CNPJ e reaproveitamento do que já existe no Task Account.
2. [02-escopo-funcional-e-tabelas.md](./02-escopo-funcional-e-tabelas.md)  
   Estrutura dos módulos planejados (**Padrões de NFS-e em Configurações**, **Participantes/Tomadores separados de Clientes**, **Tabelas Fiscais Anexo VIII versionadas**, **Emissão Programada**, **Clonagem**, **Pré-visualização**, **Lote XML/PDF**, **Log de Erros**, **Métricas**) + checklist para levantamento detalhado de campos e variáveis fiscais.

---

## Como retomar no futuro

Quando estiver pronto para evoluir este módulo, basta referenciar esta pasta (`docs/nfse-nacional/`) no chat com os campos, regras tributárias e exceções que você levantar a partir da sua experiência prática.
