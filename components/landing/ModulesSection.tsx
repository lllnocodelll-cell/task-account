import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Maximize2
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { BlurFade, SpotlightCard } from './LandingPrimitives';

export interface ModuleStat {
  label: string;
  value: string;
}

export interface ShowcaseModule {
  id: string;
  shortLabel: string;
  code?: string;
  tag: string;
  title: string;
  desc: string;
  image: string;
  darkImage?: string;
  lightImage?: string;
  badge?: string;
  stats: ModuleStat[];
  bulletPoints: string[];
}

export interface ChatSlideItem {
  id: string;
  title: string;
  tabLabel: string;
  badge: string;
  code: string;
  darkImage: string;
  lightImage: string;
  caption: string;
}

export interface ZoomImagePayload {
  src: string;
  title: string;
  subtitle?: string;
}

export const LANDING_MODULES: ShowcaseModule[] = [
  {
    id: 'tasks',
    shortLabel: 'Tarefas & Kanban',
    tag: 'FLUXO & KANBAN',
    title: 'Gestão Inteligente de Tarefas e Prazos',
    desc: 'Controle de ponta a ponta de todas as rotinas fiscais, contábeis e trabalhistas.',
    image: '/showcase-tasks-table.png',
    darkImage: '/showcase-tasks-table.png',
    lightImage: '/showcase-tasks-table-light.png',
    badge: 'TABELA DE TAREFAS',
    stats: [
      { label: 'PONTUALIDADE', value: '98.4%' },
      { label: 'RECORRÊNCIA', value: 'Dinâmica' },
      { label: 'CHECKLISTS', value: '100% Auditáveis' }
    ],
    bulletPoints: [
      'Tabela e Kanban: entrega uma visão completa da tarefa em execução.',
      'Drawers: acesse com um clique as gavetas de dados do cliente, senhas fáceis, observações, legislação e muito mais, sem precisar sair do módulo de tarefas.',
      'Workflow: crie fluxos de execução e garanta que todos os pontos importantes da tarefa foram checados antes da conclusão final.',
      'Cards e métricas: visualize a quantidade de tarefas por status através dos cards e métricas disponíveis no módulo.',
      'Criação de tarefas: cadastre tarefas em lote e ganhe tempo operacional.',
      'Timer: controle o tempo de execução de cada tarefa e descubra quais obrigações mais tomam tempo da sua equipe.'
    ]
  },
  {
    id: 'chat',
    shortLabel: 'Chat & CRM',
    tag: 'CENTRAL DE ATENDIMENTO',
    title: 'Chat Interno e Atendimento ao Cliente',
    desc: 'Comunicação direta e facilitada entre setores internos e clientes',
    image: '/app-chat.png',
    badge: 'ATENDIMENTO MULTICANAL',
    stats: [
      { label: 'NOTIFICAÇÕES', value: 'Automáticas' },
      { label: 'CHAT', value: 'Unificado' },
      { label: 'HISTÓRICO', value: 'Preservado' },
      { label: 'SEGURANÇA', value: 'Isolada (RLS)' }
    ],
    bulletPoints: [
      'Chat centralizado: ferramenta completa de comunicação interna e de atendimento ao cliente, com opção de criação de grupos, interações, controle unificado do histórico de atendimento e muito mais.',
      'Mensagens modelos: crie mensagens padronizadas para envios automáticos aos clientes, como lembretes de vencimentos, avisos de férias coletivas, atualizações sobre legislações e muito mais.'
    ]
  },
  {
    id: 'dashboard',
    shortLabel: 'Cockpit (18 Widgets)',
    tag: 'CENTRAL DE DASHBOARDS',
    title: 'Cockpit Operacional em Tempo Real',
    desc: 'Dashboards robustos e modernos que auxiliam no monitoramento operacional do escritório.',
    image: '/showcase-dashboard-dark.png',
    darkImage: '/showcase-dashboard-dark.png',
    lightImage: '/showcase-dashboard-light.png',
    badge: 'TELEMETRIA AO VIVO • 18 WIDGETS',
    stats: [
      { label: 'WIDGETS', value: '18' },
      { label: 'ATUALIZAÇÃO', value: 'Tempo Real' },
      { label: 'VISÃO', value: 'Ampla' }
    ],
    bulletPoints: [
      '18 widgets analíticos: painel operacional, calendário de obrigações, próximos vencimentos, segmentos mais atendidos, exclusão do simples, índices econômicos e controle dos vencimentos de certificados digitais e licenças.',
      'Cenários: crie diversos cenários com os widgets que desejar para acessar de forma rápida.'
    ]
  },
  {
    id: 'clients',
    shortLabel: 'Dossiê de Clientes',
    tag: 'CADASTRO DE CLIENTE',
    title: 'Dossiê Completo de Clientes',
    desc: 'O cadastro de cliente mais detalhado do mercado! Centralize contatos, inscrições, acessos de sistemas e portais, históricos de regimes, sócio administrador, séries DF-es utilizadas e muitos mais.',
    image: '/showcase-clients-dark.png',
    darkImage: '/showcase-clients-dark.png',
    lightImage: '/showcase-clients-light.png',
    badge: 'DOSSIÊ CADASTRAL • 398 CLIENTES',
    stats: [
      { label: 'CADASTRO', value: 'Facilitado' },
      { label: 'ALVARÁS', value: 'Até 15' },
      { label: 'CERTIFICADOS', value: 'Até 15' }
    ],
    bulletPoints: [
      'Diferenciais: vincule ao cadastro do cliente as inscrições, contatos, legislações específicas, histórico de regimes tributários, controle dos modelos de DF-e utilizados e monitor de vencimento de certificados e licenças.',
      'Cadastro lote: registre os clientes em lote de forma prática através da planilha padrão Task Account.'
    ]
  },
  {
    id: 'portal',
    shortLabel: 'Portal do Cliente',
    tag: 'PORTAL DO CLIENTE',
    title: 'Portal do Cliente com Auditoria e Guias',
    desc: 'Ambiente exclusivo e seguro para seus clientes acessarem guias tributárias, folhas de pagamento, relatórios fiscais e notificações em tempo real.',
    image: '/showcase-portal-dark.png',
    darkImage: '/showcase-portal-dark.png',
    lightImage: '/showcase-portal-light.png',
    badge: 'PORTAL DO CLIENTE • GUIAS & DOCS',
    stats: [
      { label: 'STATUS', value: 'Leitura ao Vivo' },
      { label: 'PRAZOS', value: 'Alertas de Vencimento' },
      { label: 'HISTÓRICO', value: '100% Organizado' }
    ],
    bulletPoints: [
      'Disponibilização de guias e tributos: entregue balanços, folhas de pagamento, impostos e guias com aviso de vencimento direto no portal do cliente.',
      'Auditoria de leitura e urgência: saiba exatamente quando o cliente visualizou, baixou ou deixou de ler um documento com controle de urgência.',
      'Autoatendimento ágil: seu cliente consulta competências fiscais e documentos a qualquer momento com total praticidade e segurança.'
    ]
  }
];

const CHAT_SLIDES: ChatSlideItem[] = [
  {
    id: 'client',
    title: 'Atendimento a Clientes (CRM)',
    tabLabel: 'Chat com Clientes',
    badge: 'CRM EXTERNO & NOTIFICAÇÕES',
    code: 'INTERFACE // CHAT_CLIENTE_LIVE',
    darkImage: '/showcase-chat-client-dark.png',
    lightImage: '/showcase-chat-client-light.png',
    caption: 'Comunicação direta com empresas e envio de comunicados fiscais (NFSe Nacional).'
  },
  {
    id: 'team',
    title: 'Chat Interno da Equipe',
    tabLabel: 'Chat da Equipe',
    badge: 'COMUNICAÇÃO INTERSETORIAL',
    code: 'INTERFACE // CHAT_EQUIPE_LIVE',
    darkImage: '/showcase-chat-team-dark.png',
    lightImage: '/showcase-chat-team-light.png',
    caption: 'Alinhamentos ágeis entre departamentos (Fiscal, Pessoal, Contábil) e cronogramas.'
  }
];

interface ModulesSectionProps {
  isDarkMode: boolean;
  activeModuleId: string;
  onSelectModule: (moduleId: string) => void;
  chatSlideIndex: number;
  onChangeChatSlide: (index: number) => void;
  onChatHoverChange: (hovered: boolean) => void;
  onZoomImage: (payload: ZoomImagePayload) => void;
  onGoToPlans: () => void;
}

export const ModulesSection: React.FC<ModulesSectionProps> = ({
  isDarkMode,
  activeModuleId,
  onSelectModule,
  chatSlideIndex,
  onChangeChatSlide,
  onChatHoverChange,
  onZoomImage,
  onGoToPlans
}) => {
  const shouldReduceMotion = useReducedMotion();
  const currentChatSlide = CHAT_SLIDES[chatSlideIndex] || CHAT_SLIDES[0];

  const renderModuleMockup = (m: ShowcaseModule) => {
    if (m.id === 'chat') {
      const activeChatImg = isDarkMode ? currentChatSlide.darkImage : currentChatSlide.lightImage;
      return (
        <div
          onMouseEnter={() => onChatHoverChange(true)}
          onMouseLeave={() => onChatHoverChange(false)}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1.5 sm:p-2.5 shadow-xl overflow-hidden group/chat transition-colors"
        >
          {/* Header do Mockup com Sliding Pills do Carrossel (Clientes vs Equipe) */}
          <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-[#121722] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 rounded-t-xl transition-colors">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex gap-1 sm:gap-1.5">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-1 hidden xs:inline sm:inline">
                {currentChatSlide.code}
              </span>
            </div>

            {/* Seletor Sliding Pill (Clientes vs Equipe) */}
            <div
              role="tablist"
              aria-label="Alternar tela do módulo de chat"
              className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0E14] p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800/80"
            >
              {CHAT_SLIDES.map((slide, idx) => {
                const isSlideActive = chatSlideIndex === idx;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isSlideActive}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeChatSlide(idx);
                    }}
                    className={`relative px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                      isSlideActive
                        ? 'text-slate-950'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {isSlideActive && (
                      <motion.span
                        layoutId="chat-slide-pill"
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 460, damping: 34 }
                        }
                        className="absolute inset-0 rounded-md sm:rounded-lg bg-amber-400 dark:bg-yellow-400 shadow-sm"
                      />
                    )}
                    <span
                      className={`relative z-10 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                        isSlideActive ? 'bg-slate-950' : 'bg-slate-400'
                      }`}
                    />
                    <span className="relative z-10">{slide.tabLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Tag do Slide e Botão de Expandir */}
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-block text-[9px] font-mono font-bold text-amber-600 dark:text-yellow-400 uppercase bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-2 py-0.5 rounded">
                {currentChatSlide.badge}
              </span>
              <Tooltip content="Ampliar visualização (tela cheia)" position="top">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoomImage({
                      src: activeChatImg,
                      title: `Módulo 02 // ${currentChatSlide.title}`,
                      subtitle: currentChatSlide.caption
                    });
                  }}
                  className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  aria-label="Ampliar visualização"
                >
                  <Maximize2 size={13} />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Palco da Imagem do Carrossel com transição suave */}
          <div
            onClick={() =>
              onZoomImage({
                src: activeChatImg,
                title: `Módulo 02 // ${currentChatSlide.title}`,
                subtitle: currentChatSlide.caption
              })
            }
            className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center cursor-zoom-in group/stage aspect-[16/9.2] w-full"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={`${chatSlideIndex}-${isDarkMode}`}
                src={activeChatImg}
                alt={currentChatSlide.title}
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.995 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
                className="w-full h-full object-cover object-top block rounded-lg transition-transform duration-500 group-hover/stage:scale-[1.015]"
              />
            </AnimatePresence>

            {/* Overlay sutil de dica de zoom no hover */}
            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/stage:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 text-white text-[11px] font-semibold backdrop-blur-md border border-white/20 shadow-xl">
                <Maximize2 size={12} className="text-yellow-400" />
                Clique para ampliar
              </span>
            </div>

            {/* Botão Anterior */}
            <div className="absolute left-1.5 sm:left-2.5 top-1/2 -translate-y-1/2 z-10">
              <Tooltip content="Ver tela anterior" position="right">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeChatSlide(chatSlideIndex === 0 ? 1 : 0);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/70 hover:bg-slate-950 text-white dark:bg-black/60 dark:hover:bg-black/90 flex items-center justify-center backdrop-blur-md border border-white/15 transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={14} className="sm:scale-110" />
                </button>
              </Tooltip>
            </div>

            {/* Botão Próximo */}
            <div className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 z-10">
              <Tooltip content="Ver próxima tela" position="left">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeChatSlide(chatSlideIndex === 1 ? 0 : 1);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/70 hover:bg-slate-950 text-white dark:bg-black/60 dark:hover:bg-black/90 flex items-center justify-center backdrop-blur-md border border-white/15 transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
                  aria-label="Próximo"
                >
                  <ChevronRight size={14} className="sm:scale-110" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Rodapé Informativo e Dots do Carrossel */}
          <div className="mt-1.5 sm:mt-2.5 px-1.5 sm:px-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-medium truncate max-w-[75%] sm:max-w-[80%] text-[10px] sm:text-[11px]">
              {currentChatSlide.caption}
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {CHAT_SLIDES.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeChatSlide(dotIdx);
                  }}
                  className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    chatSlideIndex === dotIdx
                      ? 'w-4 sm:w-5 bg-amber-500 dark:bg-yellow-400'
                      : 'w-1 sm:w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                  aria-label={`Ir para slide ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    const moduleImg = isDarkMode ? m.darkImage || m.image : m.lightImage || m.image;
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1.5 sm:p-2.5 shadow-xl overflow-hidden group/img transition-colors">
        <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white dark:bg-[#121722] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between mb-1.5 sm:mb-2 rounded-t-lg transition-colors">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex gap-1 sm:gap-1.5">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-1 truncate max-w-[170px] sm:max-w-none">
              INTERFACE // {m.id.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {m.badge && (
              <span className="text-[8px] sm:text-[9px] font-mono font-bold text-amber-600 dark:text-yellow-400 uppercase bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-1.5 sm:px-2 py-0.5 rounded truncate max-w-[120px] sm:max-w-none">
                {m.badge}
              </span>
            )}
            <Tooltip content="Ampliar visualização (tela cheia)" position="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoomImage({
                    src: moduleImg,
                    title: m.title,
                    subtitle: m.tag
                  });
                }}
                className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                aria-label="Ampliar visualização"
              >
                <Maximize2 size={13} />
              </button>
            </Tooltip>
          </div>
        </div>
        <div
          onClick={() =>
            onZoomImage({
              src: moduleImg,
              title: m.title,
              subtitle: m.tag
            })
          }
          className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-[#070A12] flex items-center justify-center cursor-zoom-in group/stage"
        >
          <img
            key={`${m.id}-${isDarkMode}`}
            src={moduleImg}
            alt={m.title}
            className="w-full h-auto rounded-lg block transform group-hover/stage:scale-[1.015] transition-transform duration-500"
          />
          {/* Overlay sutil de dica de zoom no hover */}
          <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/stage:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 text-white text-[11px] font-semibold backdrop-blur-md border border-white/20 shadow-xl">
              <Maximize2 size={12} className="text-yellow-400" />
              Clique para ampliar
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      id="modulos"
      className="py-10 sm:py-14 md:py-16 px-3 sm:px-8 border-t border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-[#0D1017] transition-colors"
    >
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho da Seção (Motion Primitives BlurFade) */}
        <BlurFade className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 text-amber-900 dark:text-yellow-400 text-[10px] font-mono font-bold uppercase tracking-widest shadow-sm mb-3.5 sm:mb-4">
            <Layers size={13} className="shrink-0 text-amber-700 dark:text-yellow-400" />
            <span>ARQUITETURA DE MÓDULOS</span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Engenharia para o seu dia a dia.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm md:text-base mt-2 sm:mt-3 max-w-2xl mx-auto">
            Cada módulo foi projetado de raiz para resolver os gargalos reais da rotina contábil, eliminando redundâncias e garantindo máxima conformidade.
          </p>

          {/* Barra de Atalhos com Sliding Pills (Motion Primitives layoutId) */}
          <div
            role="tablist"
            aria-label="Navegação rápida entre os módulos do sistema"
            className="mt-5 sm:mt-6 inline-flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap p-1.5 rounded-2xl sm:rounded-full bg-white/90 dark:bg-[#111622]/90 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md"
          >
            {LANDING_MODULES.map((m, idx) => {
              const isModActive = activeModuleId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={isModActive}
                  onClick={() => {
                    onSelectModule(m.id);
                    const el = document.getElementById(`modulo-${m.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className={`relative px-3 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isModActive
                      ? 'text-white dark:text-slate-950'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isModActive && (
                    <motion.span
                      layoutId="modules-quick-jump-pill"
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: 'spring', stiffness: 420, damping: 32 }
                      }
                      className="absolute inset-0 rounded-full bg-slate-900 dark:bg-yellow-400 shadow-md"
                    />
                  )}
                  <span
                    className={`relative z-10 font-mono text-[9px] sm:text-[10px] ${
                      isModActive
                        ? 'text-yellow-400 dark:text-slate-950 font-black'
                        : 'text-amber-600 dark:text-yellow-400'
                    }`}
                  >
                    0{idx + 1}.
                  </span>
                  <span className="relative z-10">{m.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </BlurFade>

        {/* Trilha de Cards Empilhados com SpotlightCard (Aceternity UI) */}
        <div className="relative max-w-7xl mx-auto pb-6 sm:pb-8 space-y-6 sm:space-y-8 md:space-y-10">
          {LANDING_MODULES.map((m, i) => {
            const stepNumber = String(i + 1).padStart(2, '0');
            const totalSteps = String(LANDING_MODULES.length).padStart(2, '0');
            const isActive = activeModuleId === m.id;

            return (
              <div
                key={m.id}
                id={`modulo-${m.id}`}
                style={{ zIndex: 10 + i * 5 }}
                className="sticky top-16 sm:top-20 md:top-24 scroll-mt-20 sm:scroll-mt-24"
              >
                <SpotlightCard
                  isDarkMode={isDarkMode}
                  isHighlighted={isActive}
                  className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 lg:p-8 bg-white dark:bg-[#111622] border transition-all duration-300 group overflow-hidden ${
                    isActive
                      ? 'border-amber-400/70 dark:border-yellow-400/35 shadow-[0_-8px_25px_rgba(0,0,0,0.06),0_15px_35px_rgba(0,0,0,0.04)] dark:shadow-[0_-14px_40px_rgba(0,0,0,0.95),0_20px_45px_rgba(0,0,0,0.8)]'
                      : 'border-slate-200/90 dark:border-white/10 dark:border-t-yellow-400/30 shadow-[0_-8px_25px_rgba(0,0,0,0.06),0_15px_35px_rgba(0,0,0,0.04)] dark:shadow-[0_-14px_40px_rgba(0,0,0,0.95),0_20px_45px_rgba(0,0,0,0.8)]'
                  }`}
                >
                  {/* Header interno do Card */}
                  <div className="relative z-10 flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-5 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-800 dark:text-yellow-400 uppercase tracking-widest bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg">
                        {m.tag}
                      </span>
                      {m.badge && (
                        <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-3xl md:text-4xl font-black font-mono text-slate-300 dark:text-white/10 group-hover:text-amber-500/30 dark:group-hover:text-yellow-400/25 transition-colors select-none tabular-nums">
                        {stepNumber} / {totalSteps}
                      </span>
                    </div>
                  </div>

                  {/* Grid Otimizado: 4 Colunas para Textos vs 8 Colunas para a Imagem */}
                  <div className="relative z-10 flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-7 lg:gap-8 items-stretch lg:items-start">
                    {/* Informações do Módulo (4 colunas no Desktop) */}
                    <div className="lg:col-span-4 flex flex-col space-y-3 sm:space-y-4">
                      <div>
                        <h3 className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                          {m.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed mt-1 sm:mt-2.5 line-clamp-2 sm:line-clamp-none">
                          {m.desc}
                        </p>
                      </div>

                      {/* Mockup da Interface no Mobile */}
                      <div className="block lg:hidden my-1">{renderModuleMockup(m)}</div>

                      {/* Métricas do Módulo */}
                      <div
                        className={`grid gap-1.5 sm:gap-2 py-2 sm:py-3.5 border-y border-slate-200 dark:border-slate-800 ${
                          m.stats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
                        }`}
                      >
                        {m.stats.map((stat, sIdx) => (
                          <div
                            key={sIdx}
                            className="flex flex-col rounded-lg px-1.5 py-1 -mx-1.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/[0.04]"
                          >
                            <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase truncate">
                              {stat.label}
                            </span>
                            <span className="text-xs sm:text-sm lg:text-base font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                              {stat.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Bullets de Funcionalidades com micro-hover (Animate UI) */}
                      <ul className="space-y-1.5 sm:space-y-2 hidden sm:block">
                        {m.bulletPoints.map((bp, bIdx) => {
                          const colonIndex = bp.indexOf(':');
                          const title = colonIndex !== -1 ? bp.substring(0, colonIndex + 1) : '';
                          const rest = colonIndex !== -1 ? bp.substring(colonIndex + 1) : bp;

                          return (
                            <li
                              key={bIdx}
                              className="group/bp flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-snug p-1.5 -mx-1.5 rounded-xl transition-colors hover:bg-slate-100/80 dark:hover:bg-white/[0.03]"
                            >
                              <Check
                                size={14}
                                className="text-amber-500 dark:text-yellow-400 shrink-0 mt-0.5 transition-transform duration-200 group-hover/bp:scale-110"
                              />
                              <span>
                                {title ? (
                                  <>
                                    <strong className="font-bold text-slate-900 dark:text-white">
                                      {title}
                                    </strong>
                                    {rest}
                                  </>
                                ) : (
                                  bp
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>

                      <div className="pt-0.5 sm:pt-1">
                        <a
                          href="#planos"
                          onClick={(e) => {
                            e.preventDefault();
                            onGoToPlans();
                          }}
                          className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-600 dark:text-yellow-400 hover:text-amber-500 dark:hover:text-yellow-300 transition-colors cursor-pointer group/link"
                        >
                          <span>Experimente este módulo</span>
                          <ArrowRight
                            size={13}
                            className="sm:scale-110 group-hover/link:translate-x-1 transition-transform"
                          />
                        </a>
                      </div>
                    </div>

                    {/* Imagem Real do Módulo no Desktop (8 colunas à direita) */}
                    <div className="hidden lg:block lg:col-span-8">{renderModuleMockup(m)}</div>
                  </div>
                </SpotlightCard>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
