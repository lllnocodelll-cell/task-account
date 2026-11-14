import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, Check, FileSpreadsheet, ShieldCheck, Users } from 'lucide-react';
import {
  AnimatedCurrency,
  BlurFade,
  BorderBeam,
  ShimmerCtaButton,
  SpotlightCard
} from './LandingPrimitives';

export interface PlanFeatureItem {
  text: string;
  detail?: string;
  badge?: string;
  highlight?: boolean;
}

export interface PlanItem {
  name: string;
  tier: string;
  price: string;
  numericPrice?: number;
  period: string;
  clientsLimit: string;
  storageLimit: string;
  costPerClient: string;
  description: string;
  features: PlanFeatureItem[];
  highlight: boolean;
  badge?: string;
  stripePriceId: string;
  stripePaymentLink: string;
}

export const LANDING_PLANS: PlanItem[] = [
  {
    name: 'Bronze',
    tier: '01',
    price: 'R$ 199,90',
    numericPrice: 199.9,
    period: '/mês',
    clientsLimit: 'Até 100 clientes',
    storageLimit: '50GB',
    costPerClient: 'R$ 1,99 por cliente',
    description: 'Ideal para contadores autônomos e escritórios em início de atividade.',
    features: [
      { text: 'Cockpit Analítico', detail: '18 widgets operacionais ao vivo' },
      { text: 'Tarefas & Obrigações', detail: 'Modos Lista, Kanban e Cronômetro' },
      { text: 'Workflows & Checklists', detail: 'Etapas de conferência auditáveis' },
      { text: 'Dossiê do Cliente', detail: 'Certificados, licenças e senhas' },
      { text: 'Chat Setorial & Grupos', detail: 'Canais com equipe e clientes' },
      { text: 'Portal do Cliente', detail: 'Acesso web exclusivo para guias e docs' },
      { text: 'Modelos de Mensagem', detail: 'Disparos padronizados e comunicados' },
      { text: 'Sem Limite de Usuários', detail: 'Toda a sua equipe conectada', badge: 'ILIMITADO' },
      { text: 'Suporte Técnico', detail: 'Atendimento direto com especialistas' }
    ],
    highlight: false,
    stripePriceId: 'price_1UGolXI20uneiCQ1YHvdJmqj',
    stripePaymentLink: 'https://buy.stripe.com/test_fZufZhcHt2sT8A4cJm2cg00'
  },
  {
    name: 'Prata',
    tier: '02',
    price: 'R$ 349,90',
    numericPrice: 349.9,
    period: '/mês',
    clientsLimit: 'Até 250 clientes',
    storageLimit: '100GB',
    costPerClient: 'R$ 1,40 por cliente',
    description: 'Para escritórios consolidados que buscam controle rígido de rotinas e padronização.',
    features: [
      { text: 'Tudo do plano Bronze', detail: 'com capacidade ampliada para 250 empresas', highlight: true },
      { text: 'Cockpit Analítico', detail: '18 widgets operacionais ao vivo' },
      { text: 'Tarefas & Obrigações', detail: 'Modos Lista, Kanban e Cronômetro' },
      { text: 'Workflows & Checklists', detail: 'Etapas de conferência auditáveis' },
      { text: 'Dossiê do Cliente', detail: 'Certificados, licenças e senhas' },
      { text: 'Chat Setorial & Grupos', detail: 'Canais com equipe e clientes' },
      { text: 'Portal do Cliente', detail: 'Acesso web exclusivo para guias e docs' },
      { text: 'Modelos de Mensagem', detail: 'Disparos padronizados e comunicados' },
      { text: 'Sem Limite de Usuários', detail: 'Toda a sua equipe conectada', badge: 'ILIMITADO' },
      { text: 'Suporte Técnico', detail: 'Atendimento prioritário ao escritório' }
    ],
    highlight: false,
    stripePriceId: 'price_1UGon5I20uneiCQ19kUdURZ1',
    stripePaymentLink: 'https://buy.stripe.com/test_8x2eVd8rdffFdUo38M2cg01'
  },
  {
    name: 'Ouro',
    tier: '03',
    price: 'R$ 499,90',
    numericPrice: 499.9,
    period: '/mês',
    clientsLimit: 'Até 350 clientes',
    storageLimit: '120GB',
    costPerClient: 'R$ 1,43 por cliente',
    description: 'Destaque no mercado: alta produtividade, fluxo integrado com a equipe e clientes.',
    features: [
      { text: 'Tudo do plano Prata', detail: 'com escala avançada para até 350 empresas', highlight: true },
      { text: 'Cockpit Analítico Completo', detail: '18 widgets com telemetria ao vivo', highlight: true },
      { text: 'Tarefas com Timer Ativo', detail: 'Métricas de produtividade por analista', highlight: true },
      { text: 'Workflows Obrigatórios', detail: 'Conformidade e zero risco de prazos', highlight: true },
      { text: 'Dossiê Cadastral Avançado', detail: 'Alertas de vencimento de certificados e alvarás', highlight: true },
      { text: 'Chat Setorial, Áudio & Anexos', detail: 'Atendimento multicanal integrado em tempo real', highlight: true },
      { text: 'Portal com Auditoria', detail: 'Confirmação de leitura e download de guias', highlight: true },
      { text: 'Templates Automatizados', detail: 'Envios programados de comunicados fiscais', highlight: true },
      { text: 'Sem Limite de Operadores', detail: 'Sem custo adicional por colaborador', badge: 'DESTAQUE' },
      { text: 'Suporte VIP Direto', detail: 'Fila prioritária com especialistas', highlight: true }
    ],
    highlight: true,
    badge: 'RECOMENDADO',
    stripePriceId: 'price_1UGooDI20uneiCQ1INRQdvOB',
    stripePaymentLink: 'https://buy.stripe.com/test_9B6eVd6j58Rh3fKdNq2cg02'
  },
  {
    name: 'Elite',
    tier: '04',
    price: 'Sob Consulta',
    period: '',
    clientsLimit: 'Volume sob demanda',
    storageLimit: 'Espaço customizado',
    costPerClient: 'Customizado conforme escala',
    description: 'Para escritórios corporativos com altíssimo volume e exigência de SLA rigoroso.',
    features: [
      { text: 'Todos os Recursos Inclusos', detail: 'Acesso irrestrito a todos os módulos e ferramentas', badge: 'ALL-IN' },
      { text: 'Capacidade Sob Demanda', detail: 'Adequado para grandes estruturas contábeis', highlight: true },
      { text: 'SLA de Atendimento Dedicado', detail: 'Tempo de resposta contratual prioritário', highlight: true },
      { text: 'Onboarding & Migração Assistida', detail: 'Importação assistida de toda a carteira e dados', highlight: true },
      { text: 'Gerente de Contas Dedicado', detail: 'Acompanhamento estratégico para a sua equipe', highlight: true },
      { text: 'Sem Limite de Operadores', detail: 'Sem restrição de acessos simultâneos', badge: 'ILIMITADO' }
    ],
    highlight: false,
    badge: 'ENTERPRISE',
    stripePriceId: 'price_1UGoqoI20uneiCQ109egwRza',
    stripePaymentLink: 'https://buy.stripe.com/test_eVq5kD6j52sT8A410E2cg03'
  }
];

type PortfolioFilterId = 'all' | 'Bronze' | 'Prata' | 'Ouro' | 'Elite';

interface PortfolioFilterOption {
  id: PortfolioFilterId;
  label: string;
}

const PORTFOLIO_FILTERS: PortfolioFilterOption[] = [
  { id: 'all', label: 'Todos os Planos' },
  { id: 'Bronze', label: 'Até 100 clientes' },
  { id: 'Prata', label: 'Até 250 clientes' },
  { id: 'Ouro', label: 'Até 350 clientes' },
  { id: 'Elite', label: 'Acima de 350' }
];

interface PlansSectionProps {
  isDarkMode: boolean;
  onSelectPlan: (plan: PlanItem) => void;
}

export const PlansSection: React.FC<PlansSectionProps> = ({ isDarkMode, onSelectPlan }) => {
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioFilterId>('all');
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="planos"
      className="py-10 sm:py-14 md:py-16 px-4 sm:px-8 border-t border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-[#0D1017] transition-colors relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Cabeçalho da Seção (Motion Primitives BlurFade) */}
        <BlurFade className="text-center max-w-2xl mx-auto mb-7 sm:mb-9">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 text-amber-900 dark:text-yellow-400 text-[10px] font-mono font-bold uppercase tracking-widest shadow-sm mb-3.5 sm:mb-4">
            <Award size={13} className="shrink-0 text-amber-700 dark:text-yellow-400" />
            <span>PLANOS DE ASSINATURA</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Investimento claro e sem surpresas.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">
            Escolha a capacidade ideal para o volume de clientes do seu escritório.
          </p>
        </BlurFade>

        {/* Seletor Rápido por Carteira (Motion Primitives Sliding Pill) */}
        <BlurFade delay={0.08} className="flex flex-col items-center mb-8 sm:mb-10">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2.5">
            Qual o tamanho da sua carteira?
          </span>
          <div
            role="tablist"
            aria-label="Filtrar plano por tamanho da carteira de clientes"
            className="inline-flex flex-wrap items-center justify-center gap-1 p-1 rounded-2xl bg-white/90 dark:bg-[#121722] border border-slate-200 dark:border-white/10 shadow-sm"
          >
            {PORTFOLIO_FILTERS.map((filter) => {
              const isSelected = selectedPortfolio === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedPortfolio(filter.id)}
                  className={`relative px-3 sm:px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                    isSelected
                      ? 'text-slate-950 dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="plans-portfolio-pill"
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 420, damping: 32 }
                      }
                      className="absolute inset-0 rounded-xl bg-amber-400 dark:bg-yellow-400 shadow-sm"
                    />
                  )}
                  <span className="relative z-10">{filter.label}</span>
                </button>
              );
            })}
          </div>
        </BlurFade>

        {/* Grade de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {LANDING_PLANS.map((plan, i) => {
            const isGold = plan.highlight;
            const isFilterActive = selectedPortfolio !== 'all';
            const isMatchedByFilter = selectedPortfolio === plan.name;
            const isFocusedCard = isFilterActive ? isMatchedByFilter : isGold;
            const isDimmed = isFilterActive && !isMatchedByFilter;

            return (
              <motion.div
                key={plan.name}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.45,
                  delay: shouldReduceMotion ? 0 : i * 0.07,
                  ease: [0.16, 1, 0.3, 1]
                }}
                whileHover={
                  shouldReduceMotion || isDimmed
                    ? undefined
                    : { y: isFocusedCard ? -6 : -4 }
                }
                className={`relative flex transition-all duration-300 ${
                  isGold && !isFilterActive ? 'lg:-translate-y-2' : ''
                } ${isDimmed ? 'opacity-55 scale-[0.98]' : 'opacity-100 scale-100'}`}
              >
                <SpotlightCard
                  isDarkMode={isDarkMode}
                  isHighlighted={isFocusedCard}
                  className={`w-full p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 overflow-hidden ${
                    isFocusedCard
                      ? 'bg-white dark:bg-[#161D2B] border-amber-500/80 dark:border-yellow-400/60 shadow-xl shadow-amber-500/15 dark:shadow-[0_0_50px_-12px_rgba(250,204,21,0.28)]'
                      : 'bg-white dark:bg-[#121722]/85 border-slate-200/90 border-t-4 border-t-amber-500 dark:border-white/10 dark:border-t-yellow-400 hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none'
                  }`}
                >
                  {/* Magic UI: Border Beam estritamente na borda externa do plano em foco */}
                  {isFocusedCard && <BorderBeam isDarkMode={isDarkMode} duration={6.5} borderWidth={2} />}

                  <div className="relative z-10">
                    {/* Topo do Card */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-yellow-400">
                        TIER • {plan.tier}
                      </span>
                      {plan.badge && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono ${
                            isGold
                              ? 'bg-yellow-400 text-slate-950 shadow-xs'
                              : 'bg-slate-900 text-white dark:bg-white/10 dark:text-yellow-400 border border-slate-800 dark:border-yellow-400/25'
                          }`}
                        >
                          {isGold && (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                          )}
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[40px] mb-6">
                      {plan.description}
                    </p>

                    {/* Preço & Capacidade */}
                    <div className="pb-6 border-b border-slate-200 dark:border-slate-800 mb-6">
                      <div className="flex items-baseline flex-wrap">
                        {typeof plan.numericPrice === 'number' ? (
                          <AnimatedCurrency
                            value={plan.numericPrice}
                            className="text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums"
                          />
                        ) : (
                          <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {plan.price}
                          </span>
                        )}
                        {plan.period && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">
                            {plan.period}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500">CAPACIDADE:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {plan.clientsLimit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500">ESPAÇO:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {plan.storageLimit}
                          </span>
                        </div>
                        <div className="mt-2 bg-amber-50 dark:bg-[#0B0E14] border border-amber-200 dark:border-slate-800 p-2 rounded-lg text-center font-mono text-[10px] text-amber-800 dark:text-yellow-400 font-bold">
                          {plan.costPerClient}
                        </div>
                      </div>
                    </div>

                    {/* Lista de Recursos (Tipagem forte + Micro-interações Animate UI) */}
                    <div className="space-y-2 mb-8">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-1.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span>RECURSOS INCLUSOS</span>
                        <span className="text-[9px] font-bold text-amber-600 dark:text-yellow-400 bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-1.5 py-0.5 rounded">
                          {plan.features.length} ITENS
                        </span>
                      </div>

                      <ul className="space-y-2 pt-1">
                        {plan.features.map((feat, idx) => {
                          const isFeatureHighlighted = Boolean(feat.highlight);

                          return (
                            <li
                              key={idx}
                              className={`group/feat flex items-start gap-2.5 p-1.5 -mx-1.5 rounded-xl transition-all duration-200 ${
                                isFeatureHighlighted && isGold
                                  ? 'bg-amber-500/10 dark:bg-yellow-400/[0.06] border border-amber-500/20 dark:border-yellow-400/15 shadow-2xs hover:bg-amber-500/15 dark:hover:bg-yellow-400/10'
                                  : 'hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-200 group-hover/feat:scale-110 ${
                                  isGold
                                    ? 'bg-amber-500/20 text-amber-700 dark:bg-yellow-400/20 dark:text-yellow-400 ring-1 ring-amber-500/40 dark:ring-yellow-400/40 shadow-xs'
                                    : 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400'
                                }`}
                              >
                                <Check size={10} className="stroke-[3]" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-xs leading-tight ${
                                      isFeatureHighlighted && isGold
                                        ? 'font-black text-amber-950 dark:text-yellow-300'
                                        : 'font-bold text-slate-900 dark:text-white'
                                    }`}
                                  >
                                    {feat.text}
                                  </span>

                                  {feat.badge && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black tracking-wider uppercase ${
                                        feat.badge === 'DESTAQUE'
                                          ? 'bg-yellow-400 text-slate-950 shadow-xs'
                                          : 'bg-amber-100 dark:bg-yellow-400/15 text-amber-800 dark:text-yellow-400 border border-amber-300/60 dark:border-yellow-400/30'
                                      }`}
                                    >
                                      {feat.badge}
                                    </span>
                                  )}
                                </div>

                                {feat.detail && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                    {feat.detail}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  {/* Botão de Ação (Magic UI Shimmer no destaque + Spring Motion) */}
                  <div className="relative z-10">
                    <ShimmerCtaButton
                      onClick={() => onSelectPlan(plan)}
                      variant={isFocusedCard ? 'gold' : 'neutral'}
                    >
                      <span>{plan.name === 'Elite' ? 'Falar com Consultor' : 'Selecionar Plano'}</span>
                      <ArrowRight
                        size={14}
                        className="group-hover/cta:translate-x-0.5 transition-transform"
                      />
                    </ShimmerCtaButton>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>

        {/* Selos de Transparência & Segurança abaixo dos Planos */}
        <BlurFade
          delay={0.18}
          className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
            <Users size={13} className="text-amber-600 dark:text-yellow-400 shrink-0" />
            <span>Usuários ilimitados em todos os planos</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
            <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Sem fidelidade ou multa de cancelamento</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#121722] border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
            <FileSpreadsheet size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Importação em lote via Excel (.xlsx)</span>
          </div>
        </BlurFade>
      </div>
    </section>
  );
};
