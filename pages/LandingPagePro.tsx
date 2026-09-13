import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  MessageSquare,
  Layout,
  Users,
  Lock,
  CheckCircle2,
  Zap,
  Clock,
  FileCheck,
  FileText,
  Layers,
  ChevronRight,
  ShieldCheck,
  Activity,
  Sliders,
  Cpu,
  ArrowUpRight,
  Sparkles,
  Award,
  TrendingUp,
  FolderLock,
  Check,
  Sun,
  Moon,
  Building2,
  ArrowDown,
  ChevronLeft
} from 'lucide-react';
import { TenantOnboardingModal, PlanDetails } from '../components/TenantOnboardingModal';

/* ──────────────────────────── DATA ──────────────────────────── */

interface ShowcaseModule {
  id: string;
  code: string;
  tag: string;
  title: string;
  desc: string;
  image: string;
  stats: { label: string; value: string }[];
  bulletPoints: string[];
}

const modules: ShowcaseModule[] = [
  {
    id: 'dashboard',
    code: 'MOD-01',
    tag: 'PAINEL DE CONTROLE',
    title: 'Cockpit Operacional em Tempo Real',
    desc: 'Visão executiva e telemetria completa da operação contábil. Monitore obrigações, prazos e métricas da equipe com dados vivos em vez de suposições.',
    image: '/app-dashboard.png',
    stats: [
      { label: 'DISPONIBILIDADE', value: '99.9%' },
      { label: 'TEMPO MÉDIO', value: '1.8h' },
      { label: 'ATUALIZAÇÃO', value: 'Tempo Real' }
    ],
    bulletPoints: [
      '18 widgets analíticos configuráveis com múltiplos cenários salvos',
      'Calendário operacional com cálculo automático de dias úteis no Brasil',
      'Monitoramento de regimes tributários, Simples Nacional e Fator R'
    ]
  },
  {
    id: 'tasks',
    code: 'MOD-02',
    tag: 'FLUXO & KANBAN',
    title: 'Gestão Inteligente de Tarefas e Prazos',
    desc: 'Controle de ponta a ponta de todas as rotinas fiscais, contábeis e trabalhistas. Motor autônomo de recorrência que projeta e ajusta prazos por até 12 meses.',
    image: '/app-tasks.png',
    stats: [
      { label: 'PONTUALIDADE', value: '98.4%' },
      { label: 'RECORRÊNCIA', value: '12 Meses' },
      { label: 'CHECKLISTS', value: '100% Auditáveis' }
    ],
    bulletPoints: [
      'Visão dupla: Tabela avançada com filtros em cascata e Quadro Kanban',
      'Checklists com etapas obrigatórias e rastreamento de responsáveis',
      'Regras flexíveis de vencimento: antecipação ou postergação por feriados'
    ]
  },
  {
    id: 'clients',
    code: 'MOD-03',
    tag: 'CRM & AUDITORIA',
    title: 'CRM e Dossiê Completo de Clientes',
    desc: 'O cadastro contábil mais detalhado do mercado. Centralize credenciais DF-e, acessos governamentais, histórico de regimes e alertas de vencimento de certificados.',
    image: '/showcase-clients-dark.png',
    stats: [
      { label: 'CERTIFICADOS', value: 'A1 / A3' },
      { label: 'DF-E SUPORTADOS', value: '12+ Tipos' },
      { label: 'ALVARÁS', value: 'Monitorados' }
    ],
    bulletPoints: [
      'Cofre seguro de credenciais, sistemas e senhas de órgãos públicos',
      'Acompanhamento de alvarás, licenças sanitárias e corpo de bombeiros',
      'Histórico evolutivo de enquadramento e regimes de tributação'
    ]
  },
  {
    id: 'chat',
    code: 'MOD-04',
    tag: 'CENTRAL DE ATENDIMENTO',
    title: 'Chat Setorial & Portal do Cliente',
    desc: 'Comunicação direta entre setores internos e clientes. Envie guias, relatórios e notificações automáticas com chamadas de áudio e vídeo integradas.',
    image: '/app-chat.png',
    stats: [
      { label: 'VÍDEO / VOZ', value: 'Nativo' },
      { label: 'NOTIFICAÇÕES', value: 'Automáticas' },
      { label: 'PORTAL', value: 'Exclusivo' }
    ],
    bulletPoints: [
      'Canais segregados por departamento (Fiscal, Pessoal, Contábil, Societário)',
      'Modelos de mensagens automáticas com tags dinâmicas por vencimento',
      'Portal do cliente exclusivo para consulta e download de guias por competência'
    ]
  }
];

const technicalSpecs = [
  {
    code: 'SPEC-01',
    title: 'Cálculo de Dias Úteis BR',
    desc: 'Ajuste automático de vencimentos considerando feriados nacionais e regras de antecipação/postergação.'
  },
  {
    code: 'SPEC-02',
    title: 'Motor de Recorrência',
    desc: 'Geração autônoma de obrigações com horizonte de até 12 meses e auto-recomposição resiliente.'
  },
  {
    code: 'SPEC-03',
    title: 'Telemetria por Colaborador',
    desc: 'Monitoramento de taxa de entregas, velocidade média de conclusão e índice de pontualidade.'
  },
  {
    code: 'SPEC-04',
    title: 'Gestão de Certificados & Licenças',
    desc: 'Alertas preventivos de expiração de certificados digitais (A1/A3) e alvarás sanitários/bombeiros.'
  },
  {
    code: 'SPEC-05',
    title: 'Segurança & Criptografia',
    desc: 'Proteção de credenciais de acesso e controle rigoroso de permissões com Row Level Security.'
  },
  {
    code: 'SPEC-06',
    title: 'Videoconferência Integrada',
    desc: 'Reuniões de áudio e vídeo em tempo real diretamente dentro dos canais de atendimento do cliente.'
  }
];

const plans = [
  {
    name: 'Bronze',
    tier: '01',
    price: 'R$ 199,90',
    period: '/mês',
    clientsLimit: 'Até 100 clientes',
    storageLimit: '50GB',
    costPerClient: 'R$ 1,99 por cliente',
    description: 'Ideal para contadores autônomos e escritórios em início de atividade.',
    features: [
      'Cockpit de Dashboards customizável',
      'Gestão de Tarefas em Lista & Kanban',
      'CRM Contábil & Dossiê de Clientes',
      'Chat interno e suporte a clientes',
      'Portal do Cliente exclusivo',
      'Mensagens em massa & templates',
      'Módulo de Anotações e links úteis',
      'Suporte técnico prioritário',
      'Sem limite de operadores'
    ],
    highlight: false
  },
  {
    name: 'Prata',
    tier: '02',
    price: 'R$ 349,90',
    period: '/mês',
    clientsLimit: 'Até 250 clientes',
    storageLimit: '100GB',
    costPerClient: 'R$ 1,40 por cliente',
    description: 'Para escritórios consolidados que buscam controle rígido de rotinas e padronização.',
    features: [
      'Cockpit de Dashboards customizável',
      'Gestão de Tarefas em Lista & Kanban',
      'CRM Contábil & Dossiê de Clientes',
      'Chat interno e suporte a clientes',
      'Portal do Cliente exclusivo',
      'Mensagens em massa & templates',
      'Módulo de Anotações e links úteis',
      'Suporte técnico prioritário',
      'Sem limite de operadores'
    ],
    highlight: false
  },
  {
    name: 'Ouro',
    tier: '03',
    price: 'R$ 499,90',
    period: '/mês',
    clientsLimit: 'Até 350 clientes',
    storageLimit: '120GB',
    costPerClient: 'R$ 1,43 por cliente',
    description: 'Destaque no mercado: alta produtividade, fluxo integrado com a equipe e clientes.',
    features: [
      'Cockpit de Dashboards customizável',
      'Gestão de Tarefas em Lista & Kanban',
      'CRM Contábil & Dossiê de Clientes',
      'Chat interno e suporte a clientes',
      'Portal do Cliente exclusivo',
      'Mensagens em massa & templates',
      'Módulo de Anotações e links úteis',
      'Suporte técnico prioritário',
      'Sem limite de operadores'
    ],
    highlight: true,
    badge: 'RECOMENDADO'
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
      'Todos os recursos inclusos',
      'Armazenamento e limites customizados',
      'SLA de atendimento dedicado',
      'Onboarding e migração assistida',
      'Sem limite de operadores'
    ],
    highlight: false,
    badge: 'ENTERPRISE'
  }
];

interface LandingPageProProps {
  onLoginClick: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export const LandingPagePro: React.FC<LandingPageProProps> = ({ 
  onLoginClick,
  isDarkMode = true,
  toggleTheme
}) => {
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  const [chatSlideIndex, setChatSlideIndex] = useState<number>(0);
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState<PlanDetails | null>(null);

  const currentMod = modules.find(m => m.id === activeModule) || modules[0];

  const chatSlides = [
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

  const currentChatSlide = chatSlides[chatSlideIndex] || chatSlides[0];

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (plan.name === 'Elite') {
      window.open('https://wa.me/5511999999999?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20o%20plano%20Elite%20do%20Task%20Account', '_blank');
      return;
    }
    setSelectedPlanForOnboarding({
      name: plan.name,
      price: plan.price,
      period: plan.period,
      clientsLimit: plan.clientsLimit,
      storageLimit: plan.storageLimit,
      description: plan.description,
      costPerClient: plan.costPerClient
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 selection:bg-yellow-400 selection:text-black font-sans antialiased overflow-x-hidden transition-colors duration-300">
      
      {/* ─── HEADER / NAVBAR FLUTUANTE ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-8 py-3 sm:py-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 bg-white/90 dark:bg-[#121722]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/40 transition-colors">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.4)] shrink-0">
              <Zap size={14} className="fill-slate-950 stroke-slate-950 sm:hidden" />
              <Zap size={16} className="fill-slate-950 stroke-slate-950 hidden sm:block" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Task<span className="text-amber-500 dark:text-yellow-400">Account</span>
              </span>
              <span className="text-[7px] sm:text-[8px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                Core v2.6
              </span>
            </div>
          </div>

          {/* Links de Navegação */}
          <nav className="hidden md:flex items-center gap-1 bg-white/90 dark:bg-[#121722]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 px-5 py-2 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/40 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors">
            <a href="#cockpit" className="px-3.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              Cockpit & HUD
            </a>
            <a href="#modulos" className="px-3.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              Módulos
            </a>
            <a href="#engenharia" className="px-3.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              Diferenciais
            </a>
            <a href="#planos" className="px-3.5 py-1.5 rounded-lg hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
              Planos
            </a>
          </nav>

          {/* Ações: Toggle Theme + Botão Acessar Sistema */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {toggleTheme && (
              <button
                onClick={toggleTheme}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/90 dark:bg-[#121722]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-yellow-400 shadow-lg shadow-slate-200/50 dark:shadow-black/40 transition-all cursor-pointer shrink-0"
                title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
                aria-label="Alternar Tema"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}

            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 sm:gap-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-black text-[11px] sm:text-xs tracking-wider uppercase px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-[0_0_20px_-5px_rgba(250,204,21,0.5)] transition-all cursor-pointer shrink-0"
            >
              <span>Acessar</span>
              <span className="hidden sm:inline">Sistema</span>
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-950 text-yellow-400 flex items-center justify-center shrink-0">
                <Zap size={9} className="fill-yellow-400 sm:hidden" />
                <Zap size={10} className="fill-yellow-400 hidden sm:block" />
              </div>
            </button>
          </div>

        </div>
      </header>

      {/* ─── HERO SECTION: ARQUITETURA TÉCNICA + DISPLAY GIGANTE ─── */}
      <section className="relative pt-36 sm:pt-44 pb-20 px-4 sm:px-8 overflow-hidden">
        
        {/* Iluminação Zenital & Grid de Engenharia de Fundo */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Glow sutil central */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-amber-400/15 via-yellow-400/5 to-transparent dark:from-yellow-500/10 dark:via-amber-500/5 dark:to-transparent rounded-full blur-[140px]" />
          
          {/* Grid de linhas técnicas sutis */}
          <div 
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.035]"
            style={{
              backgroundImage: isDarkMode 
                ? 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)'
                : 'linear-gradient(#000000 1px, transparent 1px), linear-gradient(90deg, #000000 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Tag de Status Técnica Superior */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-[#161D2B] border border-amber-300/70 dark:border-yellow-500/30 text-amber-900 dark:text-yellow-400 text-[10px] font-mono font-bold uppercase tracking-widest shadow-sm dark:shadow-lg dark:shadow-black/50">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-yellow-400 animate-pulse" />
              <span>SISTEMA DE GESTÃO OPERACIONAL CONTÁBIL</span>
            </div>
          </div>

          {/* TÍTULO HERO DISPLAY: Gestão ⚡ Contábil */}
          <div className="text-center mb-6">
            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight text-slate-900 dark:text-white leading-[0.95] flex items-center justify-center flex-wrap gap-x-4 sm:gap-x-8">
              <span>Gestão</span>
              <span className="inline-flex items-center justify-center align-middle my-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.5)] transform -rotate-6 hover:rotate-0 transition-transform">
                  <Zap size={36} className="fill-slate-950 stroke-slate-950 sm:scale-125" />
                </div>
              </span>
              <span>Contábil</span>
            </h1>
          </div>

          {/* Subtítulo de Alto Impacto */}
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto text-center font-normal leading-relaxed mb-8">
            A plataforma unificada que transforma a rotina contábil em máxima eficiência. 
            Controle de ponta a ponta prazos, equipe, compliance fiscal e relacionamento com clientes em um único ambiente.
          </p>

          {/* Pílulas Visuais dos 4 Grandes Pilares */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto mb-12 px-2">
            {/* Pilar 1: Cadastro Ultra */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/90 dark:bg-[#121722]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 hover:border-amber-400/60 dark:hover:border-yellow-400/40 shadow-sm dark:shadow-none transition-all group">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-yellow-400/10 border border-amber-300/60 dark:border-yellow-400/20 flex items-center justify-center text-amber-600 dark:text-yellow-400 shrink-0 group-hover:scale-105 transition-transform">
                <Building2 size={16} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Cadastro Ultra</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">Certificados, licenças, senhas e modelos DF-e</p>
              </div>
            </div>

            {/* Pilar 2: Cockpit Analítico */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/90 dark:bg-[#121722]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 hover:border-indigo-400/60 dark:hover:border-indigo-400/40 shadow-sm dark:shadow-none transition-all group">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-400/10 border border-indigo-300/60 dark:border-indigo-400/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                <BarChart3 size={16} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Cockpit Analítico</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">Calendário operacional, tempo de execução e KPIs</p>
              </div>
            </div>

            {/* Pilar 3: Motor de Tarefas */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/90 dark:bg-[#121722]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 hover:border-emerald-400/60 dark:hover:border-emerald-400/40 shadow-sm dark:shadow-none transition-all group">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-400/10 border border-emerald-300/60 dark:border-emerald-400/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <Zap size={16} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Controle de Tarefas</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">Conformidade entre setores e zero perda de prazos</p>
              </div>
            </div>

            {/* Pilar 4: CRM & Chat Integrado */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/90 dark:bg-[#121722]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/10 hover:border-sky-400/60 dark:hover:border-sky-400/40 shadow-sm dark:shadow-none transition-all group">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-400/10 border border-sky-300/60 dark:border-sky-400/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare size={16} />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">CRM & Atendimento</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">Chat interno/externo, comunicados e histórico</p>
              </div>
            </div>
          </div>

          {/* ─── HUD PRINCIPAL DO PRODUTO COM COMPOSIÇÃO EM CAMADAS (TABELA + KANBAN) ─── */}
          <div id="cockpit" className="relative mt-8 max-w-6xl mx-auto">
            
            {/* Moldura Central com Imagem Real da Aplicação em Camadas */}
            <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-200/60 via-slate-100/30 to-transparent dark:from-white/15 dark:via-white/5 dark:to-white/0 border border-slate-200/90 dark:border-white/10 shadow-2xl shadow-slate-300/50 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden group transition-colors">
              
              {/* Barra de Título Técnica estilo Janela/Terminal */}
              <div className="bg-slate-100 dark:bg-[#121722] border border-slate-200 dark:border-slate-800/80 px-4 py-2.5 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-2 tracking-wider">
                    APP://TASK-ACCOUNT/TAREFAS_FISCAIS_LIVE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block text-[9px] font-mono text-amber-600 dark:text-yellow-400 uppercase bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-2 py-0.5 rounded font-bold">
                    REGIME: SIMPLES NACIONAL (ANEXO III)
                  </span>
                  <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400 uppercase bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent px-2 py-0.5 rounded font-bold">
                    CONEXÃO SEGURA TLS
                  </span>
                </div>
              </div>

              {/* Palco Visual em Camadas (Tabela com Card Kanban Sobreposto) */}
              <div className="relative overflow-hidden rounded-b-2xl bg-slate-100 dark:bg-[#080B11] p-3 sm:p-5 min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] flex flex-col justify-start transition-colors">
                
                {/* Camada 1: Tabela de Tarefas e Obrigações */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/90 shadow-lg dark:shadow-2xl transition-colors">
                  <img 
                    src={isDarkMode ? "/showcase-tasks-table.png" : "/showcase-tasks-table-light.png"} 
                    alt="Tabela de Tarefas e Obrigações Fiscais" 
                    className="w-full h-auto block"
                  />

                  {/* Pin Flutuante na Tabela */}
                  <div className="absolute top-2.5 left-2.5 hidden md:flex items-center gap-2 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-amber-400/60 px-3 py-1.5 rounded-xl shadow-md dark:shadow-xl">
                    <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white uppercase">
                      FILTROS FISCAIS • COMPETÊNCIAS CONSECUTIVAS
                    </span>
                  </div>
                </div>

                {/* Camada 2: Card Flutuante do Modo Kanban com Efeito 3D e Elevação */}
                <div className="mt-4 md:mt-0 md:absolute md:bottom-4 md:right-6 lg:right-8 z-20 w-full max-w-[340px] md:w-[290px] lg:w-[330px] rounded-2xl p-1 bg-gradient-to-b from-amber-400/40 via-yellow-400/20 to-slate-200 dark:from-amber-400/50 dark:via-yellow-400/20 dark:to-slate-900 border border-amber-400/60 dark:border-yellow-400/70 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.95)] transform md:hover:-translate-y-1.5 transition-all duration-300 mx-auto md:mx-0">
                  <div className="relative rounded-xl overflow-hidden bg-white dark:bg-[#0F1420] transition-colors">
                    {/* Header do Card Kanban Flutuante */}
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          MODO KANBAN • TIMER ATIVO
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-amber-700 dark:text-yellow-400 bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 px-1.5 py-0.5 rounded font-bold">
                        AO VIVO
                      </span>
                    </div>

                    {/* Imagem do Card Kanban Completa sem Cortes */}
                    <img 
                      src={isDarkMode ? "/showcase-tasks-kanban.png" : "/showcase-tasks-kanban-light.png"} 
                      alt="Card de Tarefa no Modo Kanban com Temporizador" 
                      className="w-full h-auto block"
                    />
                  </div>
                </div>

                {/* Botão Chamativo "Saiba mais" sobre a Imagem do Hero */}
                <div className="mt-4 md:mt-0 md:absolute md:bottom-5 md:left-6 lg:left-8 z-30 flex items-center justify-center md:justify-start">
                  <a
                    href="#modulos"
                    className="group inline-flex items-center gap-2.5 px-5 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(250,204,21,0.6)] hover:shadow-[0_0_35px_rgba(250,204,21,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-yellow-200/60"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                    <span>Saiba mais</span>
                    <div className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center group-hover:translate-y-0.5 transition-transform">
                      <ArrowDown size={12} className="stroke-[3]" />
                    </div>
                  </a>
                </div>

              </div>
            </div>

            {/* Barra de Módulos Rápidos (Dock de Navegação por Valor Operacional) */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#F59E0B]" />
                <div>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">1. Tarefas & Obrigações</p>
                  <p className="text-[10px] text-amber-700 dark:text-yellow-400 font-mono">Tabela + Kanban Ativa</p>
                </div>
              </div>
              <a href="#modulos" onClick={() => setActiveModule('dashboard')} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-[#121722]/60 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 text-left transition-colors group">
                <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-indigo-400 transition-colors" />
                <div>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-tight">2. Cockpit Analítico</p>
                  <p className="text-[10px] text-slate-400 font-mono">18 widgets operacionais</p>
                </div>
              </a>
              <a href="#modulos" onClick={() => setActiveModule('clients')} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-[#121722]/60 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 text-left transition-colors group">
                <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-emerald-400 transition-colors" />
                <div>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-tight">3. Dossiê de Clientes</p>
                  <p className="text-[10px] text-slate-400 font-mono">Certificados & licenças</p>
                </div>
              </a>
              <a href="#modulos" onClick={() => setActiveModule('chat')} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/70 dark:bg-[#121722]/60 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 text-left transition-colors group">
                <div className="w-2 h-2 rounded-full bg-slate-400 group-hover:bg-sky-400 transition-colors" />
                <div>
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white leading-tight">4. Chat & Atendimento</p>
                  <p className="text-[10px] text-slate-400 font-mono">Canais com vídeo nativo</p>
                </div>
              </a>
            </div>

            {/* Barra Inferior com Call to Action Direto */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 dark:bg-[#121722]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 flex items-center justify-center text-amber-600 dark:text-yellow-400 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Pronto para elevar o padrão do seu escritório?</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Acesso instantâneo a todos os módulos operacionais.</p>
                </div>
              </div>

              <button
                onClick={onLoginClick}
                className="w-full sm:w-auto px-6 py-3 bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ─── SEÇÃO DE MÓDULOS INTERATIVOS (DEMONSTRAÇÃO DE TELAS REAIS) ─── */}
      <section id="modulos" className="py-24 px-4 sm:px-8 border-t border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-[#0D1017] transition-colors">
        <div className="max-w-7xl mx-auto">
          
          {/* Cabeçalho da Seção */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-yellow-400 block mb-2">
                ARQUITETURA DE MÓDULOS
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                Engenharia para o seu dia a dia.
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md">
              Cada módulo foi desenvolvido para eliminar redundâncias e garantir que nenhuma obrigação fiscal ou prazo seja perdido.
            </p>
          </div>

          {/* Seletor de Módulos (Tabs Técnicas) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {modules.map((m) => {
              const isActive = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                    isActive
                      ? 'bg-white dark:bg-[#161D2B] border-amber-500 dark:border-yellow-400/80 shadow-md dark:shadow-lg dark:shadow-yellow-500/10'
                      : 'bg-white/60 dark:bg-[#121722]/50 border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15 hover:bg-white dark:hover:bg-[#121722]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-amber-600 dark:text-yellow-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {m.code}
                    </span>
                    {isActive && <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-yellow-400 shadow-[0_0_8px_#FACC15]" />}
                  </div>
                  <span className={`text-xs font-bold ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {m.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Painel do Módulo Ativo */}
          <div className="bg-white dark:bg-[#121722] border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-xl dark:shadow-2xl transition-colors">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* Informações do Módulo (5 colunas) */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-yellow-400 uppercase tracking-widest bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 px-2.5 py-1 rounded-md">
                    {currentMod.code} • {currentMod.tag}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-4 leading-tight">
                    {currentMod.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mt-3">
                    {currentMod.desc}
                  </p>
                </div>

                {/* Métricas do Módulo */}
                <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-200 dark:border-slate-800">
                  {currentMod.stats.map((stat, i) => (
                    <div key={i} className="flex flex-col">
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase">{stat.label}</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* Bullets de Funcionalidades */}
                <ul className="space-y-3">
                  {currentMod.bulletPoints.map((bp, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-snug">
                      <Check size={14} className="text-amber-500 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onLoginClick}
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-yellow-400 hover:text-amber-500 dark:hover:text-yellow-300 transition-colors pt-2 cursor-pointer"
                >
                  <span>Experimentar este módulo</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Imagem Real do Módulo (7 colunas) com Carrossel Especial para Chat */}
              <div className="lg:col-span-7">
                {currentMod.id === 'chat' ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-2 sm:p-2.5 shadow-xl overflow-hidden group transition-colors">
                    {/* Header do Mockup com Seletor do Carrossel */}
                    <div className="px-3 py-2 bg-white dark:bg-[#121722] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 mb-2 rounded-t-xl transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-1.5 hidden sm:inline">
                          {currentChatSlide.code}
                        </span>
                      </div>

                      {/* Seletor de Abas do Carrossel (Clientes vs Equipe) */}
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0E14] p-1 rounded-xl border border-slate-200 dark:border-slate-800/80">
                        {chatSlides.map((slide, idx) => {
                          const isSlideActive = chatSlideIndex === idx;
                          return (
                            <button
                              key={slide.id}
                              onClick={() => setChatSlideIndex(idx)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSlideActive
                                  ? 'bg-yellow-400 text-slate-950 shadow-sm'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isSlideActive ? 'bg-slate-950' : 'bg-slate-400'}`} />
                              <span>{slide.tabLabel}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Tag do Slide */}
                      <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-yellow-400 uppercase bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-2 py-0.5 rounded">
                        {currentChatSlide.badge}
                      </span>
                    </div>

                    {/* Palco da Imagem do Carrossel (Sem Cortes) */}
                    <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                      <img
                        key={`${chatSlideIndex}-${isDarkMode}`}
                        src={isDarkMode ? currentChatSlide.darkImage : currentChatSlide.lightImage}
                        alt={currentChatSlide.title}
                        className="w-full h-auto block rounded-lg transition-all duration-300"
                      />

                      {/* Botão Anterior */}
                      <button
                        onClick={() => setChatSlideIndex((prev) => (prev === 0 ? 1 : 0))}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-950 text-white dark:bg-black/60 dark:hover:bg-black/90 flex items-center justify-center backdrop-blur-md border border-white/15 transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg z-10"
                        title="Ver tela anterior"
                        aria-label="Anterior"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {/* Botão Próximo */}
                      <button
                        onClick={() => setChatSlideIndex((prev) => (prev === 1 ? 0 : 1))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-950 text-white dark:bg-black/60 dark:hover:bg-black/90 flex items-center justify-center backdrop-blur-md border border-white/15 transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg z-10"
                        title="Ver próxima tela"
                        aria-label="Próximo"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Rodapé Informativo e Dots do Carrossel */}
                    <div className="mt-2.5 px-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium truncate max-w-[80%]">
                        {currentChatSlide.caption}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {chatSlides.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setChatSlideIndex(i)}
                            className={`h-1.5 rounded-full transition-all cursor-pointer ${
                              chatSlideIndex === i
                                ? 'w-5 bg-amber-500 dark:bg-yellow-400'
                                : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                            }`}
                            aria-label={`Ir para slide ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-2 shadow-xl overflow-hidden group transition-colors">
                    <div className="px-3 py-2 bg-white dark:bg-[#121722] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between mb-2 rounded-t-lg transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-1.5">
                          INTERFACE // {currentMod.id.toUpperCase()}
                        </span>
                      </div>
                      {currentMod.id === 'clients' ? (
                        <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-yellow-400 uppercase bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-2 py-0.5 rounded">
                          DOSSIÊ CADASTRAL • 398 CLIENTES
                        </span>
                      ) : (
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-700" />
                          <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-700" />
                        </div>
                      )}
                    </div>
                    <img
                      key={`${currentMod.id}-${isDarkMode}`}
                      src={
                        currentMod.id === 'clients'
                          ? (isDarkMode ? '/showcase-clients-dark.png' : '/showcase-clients-light.png')
                          : currentMod.image
                      }
                      alt={currentMod.title}
                      className="w-full h-auto rounded-lg block transform group-hover:scale-[1.01] transition-transform duration-500"
                    />
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ─── GRID DE ESPECIFICAÇÕES TÉCNICAS (ESTILO BLUEPRINT) ─── */}
      <section id="engenharia" className="py-24 px-4 sm:px-8 bg-slate-50 dark:bg-[#0B0E14] border-t border-slate-200 dark:border-white/5 transition-colors">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-yellow-400 block mb-2">
              DIFERENCIAIS TÉCNICOS
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Construído para a complexidade brasileira.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">
              Não adaptamos ferramentas genéricas. O Task Account foi projetado de raiz para resolver os gargalos reais do setor contábil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {technicalSpecs.map((spec, i) => (
              <div 
                key={i}
                className="p-6 rounded-2xl bg-white dark:bg-[#121722]/60 border border-slate-200/80 dark:border-white/5 hover:border-amber-400/60 dark:hover:border-yellow-400/40 hover:bg-amber-50/20 dark:hover:bg-[#121722] shadow-sm dark:shadow-none transition-all duration-300 flex flex-col justify-between min-h-[160px] group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-yellow-400/80 group-hover:text-amber-500 dark:group-hover:text-yellow-400">
                      {spec.code}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-amber-500 dark:group-hover:bg-yellow-400 transition-colors" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                    {spec.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {spec.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── TABELA DE PLANOS & INVESTIMENTO ─── */}
      <section id="planos" className="py-24 px-4 sm:px-8 border-t border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-[#0D1017] transition-colors">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-600 dark:text-yellow-400 block mb-2">
              PLANOS DE ASSINATURA
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Investimento claro e sem surpresas.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">
              Escolha a capacidade ideal para o volume de clientes do seu escritório.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => {
              const isGold = plan.highlight;
              return (
                <div
                  key={i}
                  className={`p-6 rounded-3xl border flex flex-col justify-between transition-all duration-300 ${
                    isGold
                      ? 'bg-white dark:bg-[#161D2B] border-amber-500 dark:border-yellow-400 shadow-xl shadow-amber-500/10 dark:shadow-[0_0_50px_-10px_rgba(250,204,21,0.25)] lg:-translate-y-2'
                      : 'bg-white dark:bg-[#121722]/70 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none'
                  }`}
                >
                  <div>
                    {/* Topo do Card */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-yellow-400">
                        TIER • {plan.tier}
                      </span>
                      {plan.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950 font-mono">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[40px] mb-6">
                      {plan.description}
                    </p>

                    {/* Preço */}
                    <div className="pb-6 border-b border-slate-200 dark:border-slate-800 mb-6">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{plan.price}</span>
                        {plan.period && <span className="text-xs text-slate-500 ml-1.5">{plan.period}</span>}
                      </div>

                      <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500">CAPACIDADE:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{plan.clientsLimit}</span>
                        </div>
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500">ESPAÇO:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{plan.storageLimit}</span>
                        </div>
                        <div className="mt-2 bg-amber-50 dark:bg-[#0B0E14] border border-amber-200 dark:border-slate-800 p-2 rounded-lg text-center font-mono text-[10px] text-amber-800 dark:text-yellow-400 font-bold">
                          {plan.costPerClient}
                        </div>
                      </div>
                    </div>

                    {/* Lista de Recursos */}
                    <ul className="space-y-2.5 mb-8">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 leading-snug">
                          <Check size={14} className={isGold ? 'text-amber-600 dark:text-yellow-400 shrink-0' : 'text-slate-400 dark:text-slate-500 shrink-0'} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Botão de Ação */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                      isGold
                        ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                    }`}
                  >
                    {plan.name === 'Elite' ? 'Falar com Consultor' : 'Selecionar Plano'}
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─── FOOTER MINIMALISTA E SÓBRIO ─── */}
      <footer className="py-12 px-4 sm:px-8 bg-slate-900 dark:bg-[#080B10] border-t border-slate-800 dark:border-white/5 text-xs text-slate-400 dark:text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-yellow-400 flex items-center justify-center text-slate-950 font-black">
              <Zap size={13} className="fill-slate-950 stroke-slate-950" />
            </div>
            <span className="font-bold text-white tracking-tight uppercase">Task Account</span>
            <span className="text-slate-600">|</span>
            <span>A central de comando contábil</span>
          </div>

          <p className="text-center md:text-right">
            © {new Date().getFullYear()} Task Account. Todos os direitos reservados. Fim das Planilhas.
          </p>
        </div>
      </footer>

      {selectedPlanForOnboarding && (
        <TenantOnboardingModal
          isOpen={!!selectedPlanForOnboarding}
          onClose={() => setSelectedPlanForOnboarding(null)}
          plan={selectedPlanForOnboarding}
          onSuccess={() => {
            setSelectedPlanForOnboarding(null);
          }}
        />
      )}

    </div>
  );
};
