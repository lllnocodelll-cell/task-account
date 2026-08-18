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
  Moon
} from 'lucide-react';

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
    image: '/app-clients.png',
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

  const currentMod = modules.find(m => m.id === activeModule) || modules[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 selection:bg-yellow-400 selection:text-black font-sans antialiased overflow-x-hidden transition-colors duration-300">
      
      {/* ─── HEADER / NAVBAR FLUTUANTE ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-4 sm:py-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 bg-white/90 dark:bg-[#121722]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 px-4 py-2.5 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/40 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.4)]">
              <Zap size={16} className="fill-slate-950 stroke-slate-950" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">
                Task<span className="text-amber-500 dark:text-yellow-400">Account</span>
              </span>
              <span className="text-[8px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase mt-0.5">
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
          <div className="flex items-center gap-2">
            {toggleTheme && (
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-[#121722]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-yellow-400 shadow-lg shadow-slate-200/50 dark:shadow-black/40 transition-all cursor-pointer"
                title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
                aria-label="Alternar Tema"
              >
                {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            )}

            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-black text-xs tracking-wider uppercase px-5 py-3 rounded-2xl shadow-[0_0_25px_-5px_rgba(250,204,21,0.5)] transition-all cursor-pointer"
            >
              <span>Acessar Sistema</span>
              <div className="w-4 h-4 rounded-full bg-slate-950 text-yellow-400 flex items-center justify-center">
                <Zap size={10} className="fill-yellow-400" />
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

          {/* Subtítulo Sóbrio e Direto */}
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg md:text-xl max-w-2xl mx-auto text-center font-normal leading-relaxed mb-12">
            A central de comando definitiva para escritórios de contabilidade. 
            Controle de prazos, equipe, clientes e rotinas fiscais com rigor arquitetônico e zero planilhas.
          </p>

          {/* ─── HUD PRINCIPAL DO PRODUTO COM CALLOUTS E PINS FLUTUANTES ─── */}
          <div id="cockpit" className="relative mt-8 max-w-6xl mx-auto">
            
            {/* Callout Esquerda Superior (NX-456 style) */}
            <div className="hidden lg:block absolute -top-8 -left-6 z-20 w-64 bg-white/95 dark:bg-[#121722]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-slate-300/40 dark:shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-yellow-400">MOD • 01</span>
                <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded font-bold">
                  ATIVO
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">Calendário Operacional</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Prazos ajustados automaticamente por feriados nacionais e regras de dias úteis.
              </p>
            </div>

            {/* Callout Direita Superior (Status / Prazos) */}
            <div className="hidden lg:block absolute -top-8 -right-6 z-20 w-64 bg-white/95 dark:bg-[#121722]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-4 rounded-2xl shadow-xl shadow-slate-300/40 dark:shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-yellow-400">KPI • TELEMETRIA</span>
                <span className="text-[9px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300/60 dark:border-indigo-800/40 px-1.5 py-0.5 rounded font-bold">
                  100% REGULAR
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">Simples & Lucro Real</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Monitoramento de Fator R, sublimites e histórico de regimes tributários.
              </p>
            </div>

            {/* Moldura Central com Imagem Real da Aplicação */}
            <div className="relative rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-200/60 via-slate-100/30 to-transparent dark:from-white/15 dark:via-white/5 dark:to-white/0 border border-slate-200/90 dark:border-white/10 shadow-2xl shadow-slate-300/50 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden group transition-colors">
              
              {/* Barra de Título Técnica estilo Janela/Terminal */}
              <div className="bg-slate-100 dark:bg-[#121722] border border-slate-200 dark:border-slate-800/80 px-4 py-2.5 rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-2 tracking-wider">
                    APP://TASK-ACCOUNT/DASHBOARD_LIVE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400 uppercase bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent px-2 py-0.5 rounded font-bold">
                    CONEXÃO SEGURA TLS
                  </span>
                </div>
              </div>

              {/* Imagem Real do Dashboard */}
              <div className="relative overflow-hidden rounded-b-2xl bg-slate-900">
                <img 
                  src="/app-dashboard.png" 
                  alt="Dashboard Task Account" 
                  className="w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-700"
                />

                {/* Pins Interativos Sobre a Imagem */}
                <div className="absolute top-[22%] left-[18%] hidden sm:flex items-center gap-2 bg-slate-950/95 backdrop-blur-md border border-yellow-400/50 px-3 py-1.5 rounded-xl shadow-xl animate-bounce">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase">
                    18 WIDGETS CONFIGURÁVEIS
                  </span>
                </div>

                <div className="absolute bottom-[20%] right-[15%] hidden sm:flex items-center gap-2 bg-slate-950/95 backdrop-blur-md border border-emerald-400/50 px-3 py-1.5 rounded-xl shadow-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase">
                    MÉTRICAS POR COLABORADOR
                  </span>
                </div>
              </div>
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

              {/* Imagem Real do Módulo (7 colunas) */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-2 shadow-xl overflow-hidden group">
                  <div className="px-3 py-2 bg-slate-900 dark:bg-[#121722] border-b border-slate-800 flex items-center justify-between mb-2 rounded-t-lg">
                    <span className="text-[9px] font-mono text-slate-400">INTERFACE // {currentMod.id.toUpperCase()}</span>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                    </div>
                  </div>
                  <img
                    src={currentMod.image}
                    alt={currentMod.title}
                    className="w-full h-auto rounded-lg object-cover transform group-hover:scale-[1.01] transition-transform duration-500"
                  />
                </div>
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
                    onClick={onLoginClick}
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

    </div>
  );
};
