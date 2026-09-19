import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronLeft,
  Pause,
  Maximize2,
  X,
  Star,
  Quote,
  Menu
} from 'lucide-react';
import { TenantOnboardingModal, PlanDetails } from '../components/TenantOnboardingModal';
import { Tooltip } from '../components/ui/Tooltip';
import { LegalModal, LegalTabType } from '../components/lgpd/LegalModal';
import { CookieBanner } from '../components/lgpd/CookieBanner';

/* ──────────────────────────── DATA ──────────────────────────── */

interface ShowcaseModule {
  id: string;
  code?: string;
  tag: string;
  title: string;
  desc: string;
  image: string;
  darkImage?: string;
  lightImage?: string;
  badge?: string;
  stats: { label: string; value: string }[];
  bulletPoints: string[];
}

const modules: ShowcaseModule[] = [
  {
    id: 'tasks',
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
  }
];

interface Testimonial {
  id: string;
  name: string;
  role: string;
  firm: string;
  location: string;
  avatarInitials: string;
  avatarBg: string;
  tag: string;
  tagBg: string;
  metric: string;
  text: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: 't1',
    name: 'Rodrigo Silveira',
    role: 'Sócio-Gerente',
    firm: 'Silveira Contabilidade',
    location: 'São Paulo/SP',
    avatarInitials: 'RS',
    avatarBg: 'bg-amber-500 text-slate-950',
    tag: 'CUMPRIMENTO DE PRAZOS',
    tagBg: 'bg-amber-500/10 text-amber-700 dark:text-yellow-400 border-amber-500/30',
    metric: '🎯 100% das obrigações no prazo',
    text: 'Antes do Task Account, dependíamos de planilhas paralelas e mensagens soltas. Perder o prazo de uma obrigação como a DEFIS ou DCTFWeb era nosso maior pesadelo. Com os checklists de tarefas e os alertas de competência por regime, zeramos o índice de impostos em atraso em menos de 60 dias de uso.',
    rating: 5
  },
  {
    id: 't2',
    name: 'Camila Medeiros',
    role: 'Diretora Operacional',
    firm: 'Medeiros & Associados',
    location: 'Rio de Janeiro/RJ',
    avatarInitials: 'CM',
    avatarBg: 'bg-sky-500 text-slate-950',
    tag: 'CHAT CENTRALIZADO',
    tagBg: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
    metric: '⚡ -65% no tempo de atendimento',
    text: 'A centralização do atendimento ao cliente no chat próprio mudou a percepção de valor dos nossos clientes. Eles abrem solicitações, enviam comprovantes e acompanham o andamento direto pelo portal. Eliminamos centenas de áudios no WhatsApp pessoal dos analistas.',
    rating: 5
  },
  {
    id: 't3',
    name: 'Marcos Vinícius',
    role: 'Head de Operações',
    firm: 'MV Contábil',
    location: 'Belo Horizonte/MG',
    avatarInitials: 'MV',
    avatarBg: 'bg-indigo-500 text-white',
    tag: 'VISÃO ANALÍTICA',
    tagBg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    metric: '🚀 +40% de produtividade da equipe',
    text: 'O dashboard com métricas por setor nos deu uma clareza operacional que nunca tivemos. Consigo ver instantaneamente qual setor está sobrecarregado e redistribuir as tarefas antes que o prazo estoure. A produtividade da equipe aumentou significativamente.',
    rating: 5
  },
  {
    id: 't4',
    name: 'Fernanda Ramos',
    role: 'Coordenadora Fiscal',
    firm: 'Ramos & Prado Contadores',
    location: 'Curitiba/PR',
    avatarInitials: 'FR',
    avatarBg: 'bg-emerald-500 text-slate-950',
    tag: 'DOSSIÊ CADASTRAL',
    tagBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    metric: '🛡️ Zero licenças ou certidões vencidas',
    text: 'Centralizar todos os acessos governamentais, modelos de DF-e e datas de vencimento de certificados digitais em um só dossiê evitou surpresas com licenças vencidas. O cadastro de clientes é o mais detalhado e completo que já utilizamos.',
    rating: 5
  },
  {
    id: 't5',
    name: 'Luciano Castro',
    role: 'CEO & Founder',
    firm: 'Castro Consultoria Contábil',
    location: 'Florianópolis/SC',
    avatarInitials: 'LC',
    avatarBg: 'bg-purple-500 text-white',
    tag: 'AUTOMAÇÃO RECORRENTE',
    tagBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30',
    metric: '⏳ 3 dias/mês salvos na liderança',
    text: 'A geração automática das tarefas recorrentes no início de cada mês economizou cerca de 3 dias inteiros de trabalho administrativo da nossa liderança. Sobra muito mais tempo para dedicar ao atendimento consultivo de alto valor aos clientes.',
    rating: 5
  },
  {
    id: 't6',
    name: 'Juliana Albuquerque',
    role: 'Gerente de RH & Processos',
    firm: 'Albuquerque Contábil',
    location: 'Porto Alegre/RS',
    avatarInitials: 'JA',
    avatarBg: 'bg-rose-500 text-white',
    tag: 'PADRONIZAÇÃO & WORKFLOW',
    tagBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
    metric: '✨ Padronização 100% de carteiras',
    text: 'O cronômetro de tempo por tarefa e os checklists obrigatórios trouxeram padronização real. Hoje qualquer analista consegue assumir a carteira de outro sem ruído. Nossa equipe trabalha muito mais tranquila, organizada e alinhada.',
    rating: 5
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
      { text: 'Chat & Vídeochamada', detail: 'Atendimento multicanal integrado', highlight: true },
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
  const [chatSlideIndex, setChatSlideIndex] = useState<number>(0);
  const [isChatHovered, setIsChatHovered] = useState<boolean>(false);
  const [selectedPlanForOnboarding, setSelectedPlanForOnboarding] = useState<PlanDetails | null>(null);
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string; subtitle?: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [legalModalOpen, setLegalModalOpen] = useState<boolean>(false);
  const [legalInitialTab, setLegalInitialTab] = useState<LegalTabType>('privacy');
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>('');

  const handleOpenLegalModal = (tab: LegalTabType) => {
    setLegalInitialTab(tab);
    setLegalModalOpen(true);
  };

  // Monitorar rolagem da janela e detectar seção ativa
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);

      const sections = ['cockpit', 'modulos', 'sobre-nos', 'depoimentos', 'planos'];
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar menu mobile ao redimensionar para telas maiores
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Alternância automática entre as abas do Chat (Clientes vs Equipe) a cada 4.5 segundos
  useEffect(() => {
    if (zoomImage || isChatHovered) return;

    const interval = setInterval(() => {
      setChatSlideIndex((prev) => (prev === 0 ? 1 : 0));
    }, 4500);

    return () => clearInterval(interval);
  }, [zoomImage, isChatHovered]);

  // Auto-detectar retorno do Stripe Checkout (?checkout=success&plan=NomeDoPlano)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isSuccess = params.get('checkout') === 'success';
      const planParam = params.get('plan');

      if (isSuccess && planParam) {
        const foundPlan = plans.find(
          (p) => p.name.toLowerCase() === planParam.toLowerCase()
        );
        if (foundPlan) {
          setSelectedPlanForOnboarding({
            name: foundPlan.name,
            price: foundPlan.price,
            period: foundPlan.period,
            clientsLimit: foundPlan.clientsLimit,
            storageLimit: foundPlan.storageLimit,
            description: foundPlan.description,
            costPerClient: foundPlan.costPerClient
          });
        }
      }
    } catch (e) {
      console.error('Erro ao verificar retorno do Stripe Checkout:', e);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomImage(null);
      }
    };
    if (zoomImage) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [zoomImage]);

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

  const renderModuleMockup = (m: ShowcaseModule) => {
    if (m.id === 'chat') {
      const activeChatImg = isDarkMode ? currentChatSlide.darkImage : currentChatSlide.lightImage;
      return (
        <div 
          onMouseEnter={() => setIsChatHovered(true)}
          onMouseLeave={() => setIsChatHovered(false)}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1.5 sm:p-2.5 shadow-xl overflow-hidden group/chat transition-colors"
        >
          {/* Header do Mockup com Seletor do Carrossel */}
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

            {/* Seletor de Abas do Carrossel (Clientes vs Equipe) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0B0E14] p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800/80">
              {chatSlides.map((slide, idx) => {
                const isSlideActive = chatSlideIndex === idx;
                return (
                  <button
                    key={slide.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatSlideIndex(idx);
                    }}
                    className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                      isSlideActive
                        ? 'bg-yellow-400 text-slate-950 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isSlideActive ? 'bg-slate-950' : 'bg-slate-400'}`} />
                    <span>{slide.tabLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Tag do Slide e Botão de Expandir */}
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline-block text-[9px] font-mono font-bold text-amber-600 dark:text-yellow-400 uppercase bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-2 py-0.5 rounded">
                {currentChatSlide.badge}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomImage({
                    src: activeChatImg,
                    title: `Módulo 02 // ${currentChatSlide.title}`,
                    subtitle: currentChatSlide.caption
                  });
                }}
                className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Ampliar visualização (tela cheia)"
                aria-label="Ampliar visualização"
              >
                <Maximize2 size={13} />
              </button>
            </div>
          </div>

          {/* Palco da Imagem do Carrossel (Sem Cortes + Click para Zoom) */}
          <div 
            onClick={() => setZoomImage({
              src: activeChatImg,
              title: `Módulo 02 // ${currentChatSlide.title}`,
              subtitle: currentChatSlide.caption
            })}
            className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center cursor-zoom-in group/stage"
          >
            <img
              key={`${chatSlideIndex}-${isDarkMode}`}
              src={activeChatImg}
              alt={currentChatSlide.title}
              className="w-full h-auto block rounded-lg transition-transform duration-500 group-hover/stage:scale-[1.015] animate-in fade-in duration-300"
            />

            {/* Overlay sutil de dica de zoom no hover */}
            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover/stage:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 text-white text-[11px] font-semibold backdrop-blur-md border border-white/20 shadow-xl">
                <Maximize2 size={12} className="text-yellow-400" />
                Clique para ampliar
              </span>
            </div>

            {/* Botão Anterior */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setChatSlideIndex((prev) => (prev === 0 ? 1 : 0));
              }}
              className="absolute left-1.5 sm:left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/70 hover:bg-slate-950 text-white dark:bg-black/60 dark:hover:bg-black/90 flex items-center justify-center backdrop-blur-md border border-white/15 transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg z-10"
              title="Ver tela anterior"
              aria-label="Anterior"
            >
              <ChevronLeft size={14} className="sm:scale-110" />
            </button>

            {/* Botão Próximo */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setChatSlideIndex((prev) => (prev === 1 ? 0 : 1));
              }}
              className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/70 hover:bg-slate-950 text-white dark:bg-black/60 dark:hover:bg-black/90 flex items-center justify-center backdrop-blur-md border border-white/15 transition-all opacity-80 hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer shadow-lg z-10"
              title="Ver próxima tela"
              aria-label="Próximo"
            >
              <ChevronRight size={14} className="sm:scale-110" />
            </button>
          </div>

          {/* Rodapé Informativo e Dots do Carrossel */}
          <div className="mt-1.5 sm:mt-2.5 px-1.5 sm:px-2 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-medium truncate max-w-[75%] sm:max-w-[80%] text-[10px] sm:text-[11px]">
              {currentChatSlide.caption}
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {chatSlides.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatSlideIndex(dotIdx);
                  }}
                  className={`h-1 sm:h-1.5 rounded-full transition-all cursor-pointer ${
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

    const moduleImg = isDarkMode ? (m.darkImage || m.image) : (m.lightImage || m.image);
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomImage({
                  src: moduleImg,
                  title: m.title,
                  subtitle: m.tag
                });
              }}
              className="p-1 sm:p-1.5 rounded-md text-slate-400 hover:text-amber-600 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Ampliar visualização (tela cheia)"
              aria-label="Ampliar visualização"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
        <div 
          onClick={() => setZoomImage({
            src: moduleImg,
            title: m.title,
            subtitle: m.tag
          })}
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

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (plan.stripePaymentLink) {
      window.open(plan.stripePaymentLink, '_blank');
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 selection:bg-yellow-400 selection:text-black font-sans antialiased [overflow-x:clip] transition-colors duration-300">
      
      {/* ─── HEADER / NAVBAR FLUTUANTE DINÂMICA COM BLUR AVANÇADO ─── */}
      <header className={`fixed top-0 left-0 right-0 z-50 px-3 sm:px-8 transition-all duration-300 pointer-events-none ${
        isScrolled ? 'py-2.5 sm:py-3.5' : 'py-3.5 sm:py-6'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          
          {/* Brand Logo - Clique para rolar ao topo com feedback tátil e badge Live */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`flex items-center gap-2 sm:gap-3 backdrop-blur-2xl border px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-left group active:scale-95 ${
              isScrolled
                ? 'bg-white/95 dark:bg-[#0E131F]/90 border-slate-200/90 dark:border-white/15 shadow-xl shadow-slate-900/10 dark:shadow-black/60'
                : 'bg-white/90 dark:bg-[#121722]/80 border-slate-200/80 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-black/40'
            } hover:border-amber-400/60 dark:hover:border-yellow-400/50 hover:shadow-yellow-400/15`}
            title="Voltar ao início"
            aria-label="Voltar ao topo da página"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-[0_0_15px_rgba(250,204,21,0.4)] group-hover:scale-105 transition-transform shrink-0">
              <Zap size={14} className="fill-slate-950 stroke-slate-950 sm:hidden" />
              <Zap size={16} className="fill-slate-950 stroke-slate-950 hidden sm:block" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase group-hover:text-amber-600 dark:group-hover:text-yellow-300 transition-colors">
                Task<span className="text-amber-500 dark:text-yellow-400">Account</span>
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span className="text-[7px] sm:text-[8px] font-mono tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                  Core v2.6
                </span>
              </div>
            </div>
          </button>

          {/* Links de Navegação Desktop com Ícones Sutis e Indicador de Seção Ativa */}
          <nav className={`hidden md:flex items-center gap-1 backdrop-blur-2xl border px-3 py-1.5 rounded-2xl transition-all ${
            isScrolled
              ? 'bg-white/95 dark:bg-[#0E131F]/90 border-slate-200/90 dark:border-white/15 shadow-xl shadow-slate-900/10 dark:shadow-black/60'
              : 'bg-white/90 dark:bg-[#121722]/80 border-slate-200/80 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-black/40'
          }`}>
            <a
              href="#cockpit"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSection === 'cockpit'
                  ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-yellow-400 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Activity size={13} className="text-amber-500 dark:text-yellow-400 shrink-0" />
              <span>HubTask</span>
            </a>

            <a
              href="#modulos"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSection === 'modulos'
                  ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-yellow-400 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Layers size={13} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span>Módulos</span>
            </a>

            <a
              href="#depoimentos"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSection === 'depoimentos'
                  ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-yellow-400 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Star size={13} className="text-amber-500 dark:text-yellow-400 shrink-0" />
              <span>Depoimentos</span>
            </a>

            <a
              href="#sobre-nos"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSection === 'sobre-nos'
                  ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-yellow-400 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Building2 size={13} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span>Sobre Nós</span>
            </a>

            <a
              href="#planos"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSection === 'planos'
                  ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-yellow-400 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Award size={13} className="text-yellow-500 dark:text-yellow-400 shrink-0" />
              <span>Planos</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-yellow-400 font-black uppercase">
                Pro
              </span>
            </a>
          </nav>

          {/* Ações: Toggle Theme + Botão Acessar Sistema Premium + Menu Mobile Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {toggleTheme && (
              <Tooltip
                content={
                  <div className="flex items-center gap-1.5 font-sans font-medium text-[11px] whitespace-nowrap">
                    {isDarkMode ? (
                      <Sun size={12} className="text-yellow-400 shrink-0" />
                    ) : (
                      <Moon size={12} className="text-indigo-400 shrink-0" />
                    )}
                    <span>{isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}</span>
                  </div>
                }
                position="bottom"
              >
                <button
                  onClick={toggleTheme}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl backdrop-blur-2xl border flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-yellow-400 transition-all cursor-pointer shrink-0 active:scale-95 ${
                    isScrolled
                      ? 'bg-white/95 dark:bg-[#0E131F]/90 border-slate-200/90 dark:border-white/15 shadow-xl shadow-slate-900/10 dark:shadow-black/60'
                      : 'bg-white/90 dark:bg-[#121722]/80 border-slate-200/80 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-black/40'
                  }`}
                  aria-label={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
                >
                  {isDarkMode ? <Sun size={15} className="rotate-0 hover:rotate-45 transition-transform duration-300" /> : <Moon size={15} className="-rotate-12 hover:rotate-0 transition-transform duration-300" />}
                </button>
              </Tooltip>
            )}

            {/* Botão Acessar Sistema com Efeito Shimmer e Gradiente Rico */}
            <button
              onClick={onLoginClick}
              className="relative overflow-hidden group/btn flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 hover:from-yellow-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-[11px] sm:text-xs tracking-wider uppercase px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-[0_0_25px_-5px_rgba(250,204,21,0.6)] hover:shadow-[0_0_35px_-5px_rgba(250,204,21,0.85)] border border-yellow-300/60 transition-all cursor-pointer shrink-0"
            >
              <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform pointer-events-none" />
              
              <span>Acessar</span>
              <span className="hidden sm:inline">Sistema</span>
              <div className="w-4 h-4 rounded-full bg-slate-950 text-yellow-400 flex items-center justify-center shrink-0 shadow-sm group-hover/btn:scale-110 transition-transform">
                <Zap size={10} className="fill-yellow-400" />
              </div>
            </button>

            {/* Botão Menu Hambúrguer (Mobile only) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden w-9 h-9 rounded-xl backdrop-blur-2xl border flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-yellow-400 transition-all cursor-pointer shrink-0 active:scale-95 ${
                isScrolled
                  ? 'bg-white/95 dark:bg-[#0E131F]/90 border-slate-200/90 dark:border-white/15 shadow-xl'
                  : 'bg-white/90 dark:bg-[#121722]/80 border-slate-200/80 dark:border-white/10 shadow-lg'
              } ${isMobileMenuOpen ? 'border-amber-400 text-amber-500 dark:border-yellow-400 dark:text-yellow-400' : ''}`}
              title={isMobileMenuOpen ? "Fechar Menu" : "Abrir Menu"}
              aria-label={isMobileMenuOpen ? "Fechar Menu" : "Abrir Menu"}
            >
              {isMobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>

        </div>

        {/* ─── MENU MOBILE EXPANSÍVEL (GLASSMORPHISM FLUTUANTE PREMIUM) ─── */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed top-16 sm:top-20 left-3 right-3 z-50 pointer-events-auto bg-white/95 dark:bg-[#0E131F]/95 backdrop-blur-3xl border border-slate-200 dark:border-white/15 rounded-3xl p-4 shadow-2xl shadow-slate-900/30 dark:shadow-black/90 overflow-hidden"
            >
              {/* Header do Menu Mobile */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-yellow-400/30 shrink-0">
                    <Zap size={14} className="fill-slate-950 stroke-slate-950" />
                  </div>
                  <div>
                    <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white uppercase block">
                      Task<span className="text-amber-500 dark:text-yellow-400">Account</span>
                    </span>
                    <span className="text-[8px] font-mono tracking-widest text-slate-400 uppercase">
                      Navegação Rápida
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Theme Switcher no topo do menu mobile */}
                  {toggleTheme && (
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={isDarkMode ? "Alternar para Modo Claro" : "Alternar para Modo Escuro"}
                    >
                      {isDarkMode ? (
                        <>
                          <Sun size={12} className="text-yellow-400" />
                          <span>Claro</span>
                        </>
                      ) : (
                        <>
                          <Moon size={12} className="text-indigo-500" />
                          <span>Escuro</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                    aria-label="Fechar menu"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Lista de Navegação Mobile com Cards Táteis */}
              <div className="flex flex-col gap-1.5">

                <a
                  href="#modulos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                      <Layers size={17} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-colors">
                        Módulos do Sistema
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Tarefas fiscais, CRM e Cockpit</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-all" />
                </a>

                <a
                  href="#depoimentos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-400/20 text-amber-600 dark:text-yellow-400 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                      <Star size={17} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-colors">
                        Depoimentos & Casos
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Resultados reais de escritórios</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-all" />
                </a>

                <a
                  href="#sobre-nos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <Building2 size={17} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-colors">
                        Sobre a Celsoftware
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Quem somos e missão tecnológica</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-all" />
                </a>

                <a
                  href="#planos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0 border border-yellow-500/20 group-hover:scale-105 transition-transform">
                      <Award size={17} />
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-colors">
                          Planos de Assinatura
                        </span>
                        <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-600 dark:text-yellow-400">
                          PRO
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Valores, capacidade e recursos</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-1 group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-all" />
                </a>

                {/* Atalho para Central de Privacidade (LGPD) */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleOpenLegalModal('privacy');
                  }}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 transition-all group text-left cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                      <ShieldCheck size={17} />
                    </div>
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                          Privacidade & LGPD
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Segurança de dados e termos legais</span>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 group-hover:translate-x-1 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-all" />
                </button>

                {/* Rodapé do Menu Mobile com Botão Acessar Sistema Destacado */}
                <div className="pt-3 mt-1 border-t border-slate-100 dark:border-white/10 space-y-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onLoginClick();
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 hover:from-yellow-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-yellow-400/25 transition-all cursor-pointer border border-yellow-300/60"
                  >
                    <Zap size={14} className="fill-slate-950 stroke-slate-950" />
                    <span>Acessar o Sistema</span>
                    <ArrowRight size={14} />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 pt-1">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span>Plataforma homologada e segura</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Backdrop do Menu Mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm pointer-events-auto transition-opacity"
        />
      )}

      {/* ─── HERO SECTION: ARQUITETURA TÉCNICA + DISPLAY GIGANTE ─── */}
      <section className="relative pt-20 sm:pt-28 md:pt-32 pb-8 sm:pb-12 px-3 sm:px-8 overflow-hidden">
        
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
          <div className="flex justify-center mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-amber-50 dark:bg-[#161D2B] border border-amber-300/70 dark:border-yellow-500/30 text-amber-900 dark:text-yellow-400 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-widest shadow-sm dark:shadow-lg dark:shadow-black/50">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 dark:bg-yellow-400 animate-pulse" />
              <span>SISTEMA DE GESTÃO OPERACIONAL CONTÁBIL</span>
            </div>
          </div>

          {/* TÍTULO HERO DISPLAY: Gestão ⚡ Contábil */}
          <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.05] sm:leading-[0.95] flex items-center justify-center flex-wrap gap-x-2.5 sm:gap-x-8">
              <span>Gestão</span>
              <span className="inline-flex items-center justify-center align-middle my-0.5 sm:my-1">
                <div className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 rounded-xl sm:rounded-3xl flex items-center justify-center shadow-[0_0_25px_rgba(250,204,21,0.5)] transform -rotate-6 hover:rotate-0 transition-transform">
                  <Zap size={22} className="fill-slate-950 stroke-slate-950 sm:hidden" />
                  <Zap size={36} className="fill-slate-950 stroke-slate-950 hidden sm:block sm:scale-125" />
                </div>
              </span>
              <span>Contábil</span>
            </h1>
          </div>

          {/* Subtítulo de Alto Impacto Aprimorado */}
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-lg md:text-xl max-w-3xl mx-auto text-center font-normal leading-relaxed mb-6 sm:mb-8 px-4">
            A plataforma unificada que transforma a gestão de tarefas contábeis em{' '}
            <span className="font-semibold text-slate-900 dark:text-white underline decoration-amber-400/60 decoration-2 underline-offset-4">
              máxima eficiência
            </span>
            . Controle de ponta a ponta prazos, equipe, compliance fiscal e relacionamento com clientes em um único ambiente.
          </p>

          {/* Badges de Destaque da Proposta de Valor */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-4xl mx-auto mb-6 sm:mb-10 px-2">
            
            {/* Badge 1: É o fim das Planilhas */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/90 dark:bg-[#121722]/80 backdrop-blur-md border border-slate-200/90 dark:border-white/10 hover:border-amber-400/60 dark:hover:border-yellow-400/40 shadow-sm hover:shadow-md transition-all group">
              <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-yellow-400/10 flex items-center justify-center text-amber-600 dark:text-yellow-400 shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles size={12} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                É o fim das Planilhas
              </span>
            </div>

            {/* Badge 2: Atendimento Centralizado */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/90 dark:bg-[#121722]/80 backdrop-blur-md border border-slate-200/90 dark:border-white/10 hover:border-indigo-400/60 dark:hover:border-indigo-400/40 shadow-sm hover:shadow-md transition-all group">
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                <MessageSquare size={12} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                Atendimento Centralizado
              </span>
            </div>

            {/* Badge 3: Cadastro Robusto */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/90 dark:bg-[#121722]/80 backdrop-blur-md border border-slate-200/90 dark:border-white/10 hover:border-emerald-400/60 dark:hover:border-emerald-400/40 shadow-sm hover:shadow-md transition-all group">
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <Building2 size={12} />
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                Cadastro Robusto
              </span>
            </div>

            {/* Badge 4: TaskAccount */}
            <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-yellow-400/15 via-amber-400/10 to-yellow-400/15 dark:from-yellow-400/10 dark:via-yellow-400/5 dark:to-yellow-400/10 backdrop-blur-md border border-amber-300 dark:border-yellow-400/30 hover:border-amber-400 dark:hover:border-yellow-400/60 shadow-sm hover:shadow-md transition-all group">
              <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-slate-950 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <Zap size={11} className="fill-slate-950 stroke-slate-950" />
              </div>
              <span className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Task<span className="text-amber-500 dark:text-yellow-400">Account</span>
              </span>
            </div>

          </div>



          {/* Botão de Navegação Direta no Celular (quando o cockpit estiver oculto) */}
          <div className="sm:hidden flex items-center justify-center pt-1 pb-2">
            <a
              href="#modulos"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.5)] active:scale-95 transition-all cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
              <span>Conhecer Módulos</span>
              <ArrowDown size={12} className="stroke-[3]" />
            </a>
          </div>

          {/* ─── HUD PRINCIPAL DO PRODUTO COM COMPOSIÇÃO EM CAMADAS (TABELA + KANBAN - OCULTO NO CELULAR) ─── */}
          <div id="cockpit" className="hidden sm:block relative mt-4 sm:mt-8 max-w-6xl mx-auto">
            
            {/* Moldura Central com Imagem Real da Aplicação em Camadas */}
            <div className="relative rounded-2xl sm:rounded-3xl p-1.5 sm:p-3 bg-gradient-to-b from-slate-200/60 via-slate-100/30 to-transparent dark:from-white/15 dark:via-white/5 dark:to-white/0 border border-slate-200/90 dark:border-white/10 shadow-xl sm:shadow-2xl shadow-slate-300/50 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden group transition-colors">
              
              {/* Barra de Título Técnica estilo Janela/Terminal */}
              <div className="bg-slate-100 dark:bg-[#121722] border border-slate-200 dark:border-slate-800/80 px-3 sm:px-4 py-2 sm:py-2.5 rounded-t-xl sm:rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-1 sm:ml-2 tracking-wider truncate max-w-[140px] sm:max-w-none">
                    APP://TASK-ACCOUNT/TAREFAS_FISCAIS_LIVE
                  </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="hidden sm:inline-block text-[9px] font-mono text-amber-600 dark:text-yellow-400 uppercase bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-2 py-0.5 rounded font-bold">
                    REGIME: SIMPLES NACIONAL (ANEXO III)
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono text-slate-600 dark:text-slate-400 uppercase bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-transparent px-1.5 sm:px-2 py-0.5 rounded font-bold">
                    TLS ATIVO
                  </span>
                </div>
              </div>

              {/* Palco Visual em Camadas (Tabela com Card Kanban Sobreposto) */}
              <div className="relative overflow-hidden rounded-b-xl sm:rounded-b-2xl bg-slate-100 dark:bg-[#080B11] p-2 sm:p-5 sm:min-h-[520px] lg:min-h-[580px] flex flex-col justify-start transition-colors">
                
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
                <div className="mt-3 md:mt-0 md:absolute md:bottom-4 md:right-6 lg:right-8 z-20 w-full max-w-[280px] sm:max-w-[340px] md:w-[290px] lg:w-[330px] rounded-2xl p-1 bg-gradient-to-b from-amber-400/40 via-yellow-400/20 to-slate-200 dark:from-amber-400/50 dark:via-yellow-400/20 dark:to-slate-900 border border-amber-400/60 dark:border-yellow-400/70 shadow-lg md:shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:md:shadow-[0_25px_60px_rgba(0,0,0,0.95)] transform md:hover:-translate-y-1.5 transition-all duration-300 mx-auto md:mx-0">
                  <div className="relative rounded-xl overflow-hidden bg-white dark:bg-[#0F1420] transition-colors">
                    {/* Header do Card Kanban Flutuante */}
                    <div className="px-2.5 sm:px-3 py-1.5 bg-slate-50 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                        <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          MODO KANBAN • TIMER ATIVO
                        </span>
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-mono text-amber-700 dark:text-yellow-400 bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 px-1.5 py-0.5 rounded font-bold">
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
                <div className="mt-3 md:mt-0 md:absolute md:bottom-5 md:left-6 lg:left-8 z-30 flex items-center justify-center md:justify-start">
                  <a
                    href="#modulos"
                    className="group inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 sm:py-3 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.5)] hover:shadow-[0_0_35px_rgba(250,204,21,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-yellow-200/60"
                  >
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-950 animate-ping" />
                    <span>Saiba mais</span>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-950/20 flex items-center justify-center group-hover:translate-y-0.5 transition-transform">
                      <ArrowDown size={11} className="stroke-[3]" />
                    </div>
                  </a>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── SEÇÃO DE MÓDULOS (STACKING CARDS - COBERTURA TOTAL RESPONSIVA) ─── */}
      <section id="modulos" className="py-10 sm:py-14 md:py-16 px-3 sm:px-8 border-t border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-[#0D1017] transition-colors">
        <div className="max-w-7xl mx-auto">
          
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
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
          </div>

          {/* Trilha de Cards Empilhados (Stacking Track - Ampliado para max-w-7xl) */}
          <div className="relative max-w-7xl mx-auto pb-6 sm:pb-8 space-y-6 sm:space-y-8 md:space-y-10">
            {modules.map((m, i) => {
              const stepNumber = String(i + 1).padStart(2, '0');
              const totalSteps = String(modules.length).padStart(2, '0');
              
              return (
                <div
                  key={m.id}
                  id={`modulo-${m.id}`}
                  style={{ zIndex: 10 + i * 5 }}
                  className="sticky top-16 sm:top-20 md:top-24 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 lg:p-8 bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-white/10 dark:border-t-yellow-400/30 shadow-[0_-8px_25px_rgba(0,0,0,0.06),0_15px_35px_rgba(0,0,0,0.04)] dark:shadow-[0_-14px_40px_rgba(0,0,0,0.95),0_20px_45px_rgba(0,0,0,0.8)] transition-all duration-300 group"
                >
                  {/* Header interno do Card */}
                  <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-5 border-b border-slate-100 dark:border-white/5">
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
                      <span className="text-xl sm:text-3xl md:text-4xl font-black font-mono text-slate-300 dark:text-white/10 group-hover:text-amber-500/30 dark:group-hover:text-yellow-400/25 transition-colors select-none">
                        {stepNumber} / {totalSteps}
                      </span>
                    </div>
                  </div>

                  {/* Grid Otimizado: 4 Colunas para Textos vs 8 Colunas para a Imagem (67% de largura no Desktop) */}
                  <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-7 lg:gap-8 items-stretch lg:items-start">
                    
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
                      <div className="block lg:hidden my-1">
                        {renderModuleMockup(m)}
                      </div>

                      {/* Métricas do Módulo (Compactas e dinâmicas) */}
                      <div className={`grid gap-1.5 sm:gap-2 py-2 sm:py-3.5 border-y border-slate-200 dark:border-slate-800 ${m.stats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                        {m.stats.map((stat, sIdx) => (
                          <div key={sIdx} className="flex flex-col">
                            <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase truncate">{stat.label}</span>
                            <span className="text-xs sm:text-sm lg:text-base font-black text-slate-900 dark:text-white mt-0.5">{stat.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bullets de Funcionalidades */}
                      <ul className="space-y-2 sm:space-y-3 hidden sm:block">
                        {m.bulletPoints.map((bp, bIdx) => {
                          const colonIndex = bp.indexOf(':');
                          if (colonIndex !== -1) {
                            const title = bp.substring(0, colonIndex + 1);
                            const rest = bp.substring(colonIndex + 1);
                            return (
                              <li key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-snug">
                                <Check size={14} className="text-amber-500 dark:text-yellow-400 shrink-0 mt-0.5" />
                                <span>
                                  <strong className="font-bold text-slate-900 dark:text-white">{title}</strong>
                                  {rest}
                                </span>
                              </li>
                            );
                          }
                          return (
                            <li key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-snug">
                              <Check size={14} className="text-amber-500 dark:text-yellow-400 shrink-0 mt-0.5" />
                              <span>{bp}</span>
                            </li>
                          );
                        })}
                      </ul>

                      <div className="pt-0.5 sm:pt-1">
                        <button
                          onClick={onLoginClick}
                          className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-600 dark:text-yellow-400 hover:text-amber-500 dark:hover:text-yellow-300 transition-colors cursor-pointer"
                        >
                          <span>Experimentar este módulo</span>
                          <ArrowRight size={13} className="sm:scale-110" />
                        </button>
                      </div>
                    </div>

                    {/* Imagem Real do Módulo no Desktop (8 colunas à direita = 67% da largura) */}
                    <div className="hidden lg:block lg:col-span-8">
                      {renderModuleMockup(m)}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ─── SEÇÃO DE DEPOIMENTOS (ESTEIRA ANIMADA / PROVA SOCIAL) ─── */}
      <section id="depoimentos" className="py-10 sm:py-14 md:py-16 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0A0D14] transition-colors relative overflow-hidden">
        
        {/* CSS Keyframes para Esteira Contínua com Pause on Hover */}
        <style>{`
          @keyframes marquee-left {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          @keyframes marquee-right {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0%); }
          }
          .animate-marquee-left {
            animation: marquee-left 40s linear infinite;
          }
          .animate-marquee-right {
            animation: marquee-right 40s linear infinite;
          }
          .animate-marquee-left:hover,
          .animate-marquee-right:hover {
            animation-play-state: paused;
          }
        `}</style>

        {/* Glow de Fundo Sutil */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-amber-500/5 dark:bg-yellow-500/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10">
          
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 text-amber-900 dark:text-yellow-400 text-[10px] font-mono font-bold uppercase tracking-widest shadow-sm mb-3.5 sm:mb-4">
              <Star size={13} className="shrink-0 fill-amber-500 dark:fill-yellow-400 text-amber-500 dark:text-yellow-400" />
              <span>DEPOIMENTOS & IMPACTO REAL</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Quem usa o Task Account transforma a gestão contábil.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm md:text-base mt-2 sm:mt-3 max-w-2xl mx-auto">
              Histórias reais de contadores e gestores que eliminaram atrasos, padronizaram rotinas e elevaram o nível de atendimento ao cliente.
            </p>
          </div>

          {/* Esteira de Depoimentos (Marquee Tracks com Fade Lateral) */}
          <div className="relative w-full overflow-hidden">
            
            {/* Sombreamento / Fades Laterais em Gradiente */}
            <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-36 bg-gradient-to-r from-slate-50 via-slate-50/80 dark:from-[#0A0D14] dark:via-[#0A0D14]/80 to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-36 bg-gradient-to-l from-slate-50 via-slate-50/80 dark:from-[#0A0D14] dark:via-[#0A0D14]/80 to-transparent z-20 pointer-events-none" />

            {/* Esteira Única de Depoimentos */}
            <div className="flex gap-4 sm:gap-6 py-2 w-max animate-marquee-left">
              {[...testimonials, ...testimonials].map((t, idx) => (
                <div
                  key={`row1-${t.id}-${idx}`}
                  className="w-[320px] sm:w-[380px] p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#111622] border border-slate-200/90 dark:border-white/10 shadow-sm dark:shadow-xl hover:border-amber-400/60 dark:hover:border-yellow-400/40 transition-all duration-300 flex flex-col justify-between shrink-0 group relative overflow-hidden"
                >
                  <Quote size={48} className="absolute -top-2 -right-2 text-slate-100 dark:text-white/[0.03] stroke-[1] pointer-events-none" />
                  
                  <div>
                    {/* Header do Card (Tag + Stars) */}
                    <div className="flex items-center justify-between gap-2 mb-3.5">
                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${t.tagBg}`}>
                        {t.tag}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(t.rating)].map((_, i) => (
                          <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    {/* Texto do Depoimento */}
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal mb-4">
                      "{t.text}"
                    </p>
                  </div>

                  {/* Footer (Métrica + Autor) */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-mono font-bold text-slate-900 dark:text-slate-200">
                      <span>{t.metric}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shadow-md shrink-0 ${t.avatarBg}`}>
                        {t.avatarInitials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate flex items-center gap-1">
                          <span>{t.name}</span>
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">
                          {t.role} • <span className="font-semibold text-slate-700 dark:text-slate-300">{t.firm}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono leading-tight">
                          {t.location}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* ─── SEÇÃO SOBRE NÓS: CELSOFTWARE LTDA, PROPÓSITO & VISÃO DE FUTURO ─── */}
      <section id="sobre-nos" className="py-10 sm:py-14 md:py-16 px-4 sm:px-8 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-[#0A0D14] transition-colors relative overflow-hidden">
        
        {/* Glow de Fundo Sutil */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-amber-500/5 dark:bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Cabeçalho da Seção */}
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-yellow-400/10 border border-amber-300 dark:border-yellow-400/20 text-amber-900 dark:text-yellow-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-4">
              <Building2 size={12} className="shrink-0" />
              <span>CELSOFTWARE LTDA • DESDE AGOSTO DE 2021</span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Nascemos da união entre a vivência contábil e a inovação tecnológica.
            </h2>
          </div>

          {/* Grid Principal: História do Fundador vs Pilares do Propósito */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch mb-8 sm:mb-10">
            
            {/* Card História & Fundador (7 colunas) */}
            <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 md:p-10 rounded-3xl bg-slate-50 dark:bg-[#111622] border border-slate-200/90 dark:border-white/10 shadow-sm dark:shadow-2xl relative overflow-hidden">
              <div className="space-y-4 sm:space-y-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-yellow-400/20 shrink-0">
                    CA
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Celso Andrade</h3>
                    <p className="text-xs font-mono text-amber-600 dark:text-yellow-400">Contador & Fundador da Celsoftware Ltda</p>
                  </div>
                </div>

                <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                  A <strong className="text-slate-900 dark:text-white font-bold">Celsoftware Ltda</strong> é uma software house fundada em agosto de 2021 por Celso Andrade, contador formado em Ciências Contábeis e empresário com forte atuação no setor. Nossa história começou a partir de uma percepção clara das trincheiras do mercado: a rotina contábil é complexa, e as ferramentas disponíveis muitas vezes não acompanham a necessidade de agilidade que a área exige.
                </p>

                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  Vivenciando diariamente os desafios, gargalos e as demandas de um escritório de contabilidade, Celso decidiu criar uma empresa de tecnologia focada exclusivamente em resolver as dores reais do contador.
                </p>
              </div>

              {/* Estatísticas Rápidas da Empresa */}
              <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 text-center">
                <div>
                  <span className="block text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">2021</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Fundação</span>
                </div>
                <div>
                  <span className="block text-xl sm:text-2xl font-black text-amber-600 dark:text-yellow-400 font-mono">100%</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Foco Contábil</span>
                </div>
                <div>
                  <span className="block text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">3 Pilares</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Soluções</span>
                </div>
              </div>
            </div>

            {/* Card Pilares & Propósito (5 colunas) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-[#111622] border border-slate-200/90 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2.5 text-amber-600 dark:text-yellow-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Award size={16} />
                  <span>NOSSO PROPÓSITO</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Desenvolvemos soluções inteligentes com três pilares fundamentais. Sabemos que o tempo do contador é valioso, por isso criamos sistemas que simplificam processos e automatizam a rotina.
                </p>
              </div>

              {/* 3 Pilares em Cards */}
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#161D2B] border border-slate-200 dark:border-white/5 flex items-start gap-3.5 shadow-sm">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-yellow-400/10 text-amber-700 dark:text-yellow-400 shrink-0">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">1. Organização</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Centralização inteligente de tarefas, prazos, dossiê do cliente e arquivos sem bagunça.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#161D2B] border border-slate-200 dark:border-white/5 flex items-start gap-3.5 shadow-sm">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-yellow-400/10 text-amber-700 dark:text-yellow-400 shrink-0">
                    <Zap size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">2. Produtividade</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Eliminação de tarefas manuais repetitivas através de automação e cronometragem de rotinas.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#161D2B] border border-slate-200 dark:border-white/5 flex items-start gap-3.5 shadow-sm">
                  <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-yellow-400/10 text-amber-700 dark:text-yellow-400 shrink-0">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">3. Escalabilidade</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Estrutura preparada para o seu escritório crescer em carteira de clientes mantendo a alta performance.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Banner Visão de Futuro */}
          <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent dark:from-yellow-400/10 dark:via-amber-500/5 dark:to-transparent border border-amber-300/60 dark:border-yellow-400/20 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-3xl">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-700 dark:text-yellow-400 uppercase tracking-widest">
                  <Sparkles size={15} />
                  <span>NOSSA VISÃO DE FUTURO</span>
                </div>
                <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  O mercado contábil está em constante evolução, e nós também. Acompanhamos as principais tendências de tecnologia e design para entregar plataformas modernas, com interfaces limpas, rápidas e de operacionalização extremamente simples e intuitiva.
                </p>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  "Acreditamos que um bom software não deve gerar dúvidas, mas sim resultados. Na Celsoftware, construímos exatamente o que o setor contábil precisa, com a fluidez e a inovação que o futuro exige."
                </p>
              </div>

              <div className="shrink-0 pt-2 md:pt-0">
                <button
                  onClick={onLoginClick}
                  className="px-6 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg shadow-yellow-400/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Conhecer o Task Account</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── TABELA DE PLANOS & INVESTIMENTO ─── */}
      <section id="planos" className="py-10 sm:py-14 md:py-16 px-4 sm:px-8 border-t border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-[#0D1017] transition-colors">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => {
              const isGold = plan.highlight;
              return (
                <div
                  key={i}
                  className={`p-6 rounded-3xl border border-t-4 flex flex-col justify-between transition-all duration-300 ${
                    isGold
                      ? 'bg-white dark:bg-[#161D2B] border-amber-500 border-t-amber-500 dark:border-yellow-400 dark:border-t-yellow-400 shadow-xl shadow-amber-500/10 dark:shadow-[0_0_50px_-10px_rgba(250,204,21,0.25)] lg:-translate-y-2'
                      : 'bg-white dark:bg-[#121722]/70 border-slate-200/80 border-t-amber-500 dark:border-white/10 dark:border-t-yellow-400 hover:border-slate-300 dark:hover:border-white/20 shadow-sm dark:shadow-none'
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

                    {/* Lista de Recursos (Upgraded com visual enriquecido) */}
                    <div className="space-y-2 mb-8">
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 pb-1.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span>RECURSOS INCLUSOS</span>
                        <span className="text-[9px] font-bold text-amber-600 dark:text-yellow-400 bg-amber-50 dark:bg-yellow-400/10 border border-amber-200 dark:border-yellow-400/20 px-1.5 py-0.5 rounded">
                          {plan.features.length} ITENS
                        </span>
                      </div>

                      <ul className="space-y-2 pt-1">
                        {plan.features.map((feat, idx) => {
                          const isFeatureHighlighted = (feat as any).highlight;
                          const featureBadge = (feat as any).badge;
                          const featureDetail = (feat as any).detail;
                          const featureText = (feat as any).text;

                          return (
                            <li
                              key={idx}
                              className={`flex items-start gap-2.5 p-1.5 -mx-1.5 rounded-xl transition-all ${
                                isFeatureHighlighted && isGold
                                  ? 'bg-amber-500/10 dark:bg-yellow-400/[0.06] border border-amber-500/20 dark:border-yellow-400/15 shadow-2xs'
                                  : 'hover:bg-slate-100/60 dark:hover:bg-white/[0.03]'
                              }`}
                            >
                              {/* Ícone Check Estilizado */}
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  isGold
                                    ? 'bg-amber-500/20 text-amber-700 dark:bg-yellow-400/20 dark:text-yellow-400 ring-1 ring-amber-500/40 dark:ring-yellow-400/40 shadow-xs'
                                    : 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400'
                                }`}
                              >
                                <Check size={10} className="stroke-[3]" />
                              </div>

                              {/* Conteúdo com Título, Subtítulo e Tag */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`text-xs leading-tight ${
                                      isFeatureHighlighted && isGold
                                        ? 'font-black text-amber-950 dark:text-yellow-300'
                                        : 'font-bold text-slate-900 dark:text-white'
                                    }`}
                                  >
                                    {featureText}
                                  </span>

                                  {featureBadge && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black tracking-wider uppercase ${
                                        featureBadge === 'DESTAQUE'
                                          ? 'bg-yellow-400 text-slate-950 shadow-xs'
                                          : 'bg-amber-100 dark:bg-yellow-400/15 text-amber-800 dark:text-yellow-400 border border-amber-300/60 dark:border-yellow-400/30'
                                      }`}
                                    >
                                      {featureBadge}
                                    </span>
                                  )}
                                </div>

                                {featureDetail && (
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                    {featureDetail}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
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
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 cursor-pointer group text-left"
              title="Voltar ao início"
              aria-label="Voltar ao topo da página"
            >
              <div className="w-6 h-6 rounded bg-yellow-400 flex items-center justify-center text-slate-950 font-black group-hover:scale-105 transition-transform">
                <Zap size={13} className="fill-slate-950 stroke-slate-950" />
              </div>
              <span className="font-bold text-white tracking-tight uppercase group-hover:text-yellow-400 transition-colors">Task Account</span>
            </button>
            <span className="text-slate-600">|</span>
            <span>Desenvolvido por <a href="#sobre-nos" className="text-slate-300 hover:text-yellow-400 transition-colors font-semibold">Celsoftware Ltda</a></span>
          </div>

          {/* Links Legais e Conformidade LGPD */}
          <div className="flex items-center gap-3.5 sm:gap-4 flex-wrap justify-center text-xs">
            <button
              type="button"
              onClick={() => handleOpenLegalModal('privacy')}
              className="text-slate-400 hover:text-yellow-400 transition-colors cursor-pointer"
            >
              Privacidade (LGPD)
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => handleOpenLegalModal('terms')}
              className="text-slate-400 hover:text-yellow-400 transition-colors cursor-pointer"
            >
              Termos de Uso
            </button>
            <span className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => handleOpenLegalModal('cookies')}
              className="text-slate-400 hover:text-yellow-400 transition-colors cursor-pointer"
            >
              Cookies
            </button>
            <span className="text-slate-700">·</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
              <ShieldCheck size={12} className="text-emerald-400" />
              LGPD Ativa
            </span>
          </div>

          <p className="text-center md:text-right text-slate-500">
            © {new Date().getFullYear()} Task Account / Celsoftware Ltda. Todos os direitos reservados.
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

      {/* ─── MODAL / LIGHTBOX DE VISUALIZAÇÃO AMPLIADA DOS MÓDULOS ─── */}
      {zoomImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setZoomImage(null)}
        >
          {/* Barra de controle superior */}
          <div 
            className="w-full max-w-6xl flex items-center justify-between py-2.5 px-3.5 sm:px-5 mb-2 sm:mb-3 bg-slate-900/90 border border-white/15 rounded-xl backdrop-blur-md text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-400 shrink-0 animate-pulse" />
              <h4 className="text-xs sm:text-sm font-bold truncate text-slate-100">{zoomImage.title}</h4>
              {zoomImage.subtitle && (
                <span className="text-[10px] sm:text-xs text-slate-400 hidden md:inline truncate border-l border-white/15 pl-3">
                  {zoomImage.subtitle}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] sm:text-xs text-slate-400 font-mono hidden sm:inline">
                ESC para fechar
              </span>
              <button
                onClick={() => setZoomImage(null)}
                className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Fechar visualização"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Palco da Imagem Ampliada com alta resolução */}
          <div 
            className="relative max-w-6xl max-h-[85vh] flex items-center justify-center overflow-auto rounded-2xl border border-white/15 shadow-2xl bg-slate-950/70 p-1 sm:p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomImage.src}
              alt={zoomImage.title}
              className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-xl select-none"
            />
          </div>
        </div>
      )}

      {/* ─── BANNER DE PRIVACIDADE & COOKIES (LGPD) ─── */}
      <CookieBanner onOpenLegalModal={handleOpenLegalModal} />

      {/* ─── MODAL CENTRAL DE POLÍTICA DE PRIVACIDADE & TERMOS ─── */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalInitialTab}
      />

    </div>
  );
};
