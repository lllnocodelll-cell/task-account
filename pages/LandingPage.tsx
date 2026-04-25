import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  MessageSquare,
  Layout,
  Users,
  Lock,
  CheckCircle2,
  Star,
  Quote,
  Sparkles,
  ShieldCheck,
  Zap,
  Clock,
  FileCheck,
  FileText,
  Layers,
  ChevronRight
} from 'lucide-react';

/* ──────────────────────────── data ──────────────────────────── */

const tools = [
  {
    title: 'Visão geral da sua operação',
    badge: 'Dashboard',
    desc: 'Com todos os indicadores que você precisa para ter uma visão clara e controle total da sua operação. Tome decisões baseadas em dados em tempo real.',
    image: '/app-dashboard.png',
    reverse: false,
    icon: <BarChart3 className="text-indigo-400" size={24} />
  },
  {
    title: 'Controle Operacional Integrado',
    badge: 'Tarefas & Kanban',
    desc: 'Controle todos os prazos em um painel interativo. Alterne entre a visão detalhada de tabela ou a gestão visual do Kanban para arrastar e soltar tarefas na sua esteira de produção.',
    image: '/app-tasks.png',
    reverse: true,
    icon: <Layout className="text-indigo-400" size={24} />
  },
  {
    title: 'O cadastro mais completo do mercado',
    badge: 'Gestão de Clientes',
    desc: 'Mantenha todas as informações vitais da sua carteira em um só lugar. Tenha um controle unificado de documentos, licenças, certificados e dados cadastrais de forma inteligente.',
    image: '/app-clients.png',
    reverse: false,
    icon: <Users className="text-indigo-400" size={24} />
  },
  {
    title: 'Comunicação Centralizada',
    badge: 'CHAT EQUIPE E ATENDIMENTO',
    desc: 'Centralize a comunicação com o time e o atendimento. Envie documentos ao concluir cada tarefa, ganhe tempo e aumente a sua produtividade absurdamente.',
    image: '/app-chat.png',
    reverse: true,
    icon: <MessageSquare className="text-indigo-400" size={24} />
  }
];

const differentials = [
  { icon: <Layers />, title: 'Painéis Interativos', desc: 'Gestão visual e dinâmica das suas obrigações.' },
  { icon: <Clock />, title: 'Controle de Prazos', desc: 'Nunca mais perca um vencimento com alertas automáticos.' },
  { icon: <Zap />, title: 'Produtividade em Tempo Real', desc: 'Acompanhe a performance da equipe instantaneamente.' },
  { icon: <FileText />, title: 'Portal do Cliente', desc: 'Ambiente exclusivo para enviar documentos de forma elegante.' },
  { icon: <ShieldCheck />, title: 'Segurança Nível Bancário', desc: 'Seus dados e de seus clientes totalmente criptografados.' },
  { icon: <Lock />, title: 'Controle de Acessos', desc: 'Permissões inteligentes que facilitam e protegem a rotina.' },
  { icon: <FileCheck />, title: 'Gestão de Certificados', desc: 'Controle de vencimento de certificados, licenças e alvarás.' },
  { icon: <Users />, title: 'Cadastro Mais Completo', desc: 'O CRM contábil mais detalhado e integrado do mercado.' }
];

const testimonials = [
  {
    name: 'Dr. Ricardo Santos',
    role: 'Sócio Diretor na Santos Contabilidade',
    content:
      'A Task Account mudou completamente a nossa produtividade. O calendário operacional é disruptivo e a interface é a melhor que já vi no setor.',
    avatar: 'RS',
  },
  {
    name: 'Mariana Costa',
    role: 'Gestora de Operações',
    content:
      'Finalmente um sistema que não parece ter sido feito em 1990. Fluidez, segurança e comunicação em tempo real. O fim das planilhas é real.',
    avatar: 'MC',
  },
];

const plans = [
  {
    name: 'Starter',
    price: 'R$ 299',
    description: 'Para pequenos escritórios que buscam organização.',
    features: [
      'Até 50 clientes',
      'Calendário Operacional',
      'Gestão de Tarefas Básica',
      'Suporte via Email',
    ],
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 599',
    description: 'A escolha ideal para escritórios em escala.',
    features: [
      'Clientes Ilimitados',
      'Chat e Vídeo em Tempo Real',
      'Kanban Avançado',
      'Monitor de Regimes Fiscais',
      'Suporte Prioritário',
    ],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob Consulta',
    description: 'Customizações exclusivas para grandes redes.',
    features: [
      'White-label',
      'API para Integrações',
      'Gerente de Conta Dedicado',
      'Treinamento Presencial',
    ],
    highlight: false,
  },
];

/* ──────────────────────────── helpers ──────────────────────────── */

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const stagger = (i: number) => ({
  ...fadeIn,
  transition: { ...fadeIn.transition, delay: i * 0.1 },
});

/* ──────────────────────────── Component ──────────────────────────── */

export const LandingPage: React.FC<{ onLoginClick: () => void }> = ({
  onLoginClick,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30 overflow-x-hidden font-sans">
      {/* ─── Navbar ─── */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <BarChart3 size={18} className="text-white" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight text-white">
              Task Account
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#ferramentas" className="hover:text-white transition-colors">Ferramentas</a>
            <a href="#diferenciais" className="hover:text-white transition-colors">Diferenciais</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
          </div>

          <button
            onClick={onLoginClick}
            className="px-5 py-2.5 bg-white text-slate-950 rounded-full text-sm font-bold hover:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-white/10"
          >
            Acessar Sistema
          </button>
        </div>
      </nav>

      {/* ─── Hero com Spotlight Interativo ─── */}
      <section 
        className="relative pt-40 pb-20 px-6 overflow-hidden group"
        onMouseMove={handleMouseMove}
      >
        {/* Spotlight que segue o mouse */}
        <motion.div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                800px circle at ${mouseX}px ${mouseY}px,
                rgba(99, 102, 241, 0.12),
                transparent 80%
              )
            `,
          }}
        />

        {/* Mesh gradient e Grid sutil para passar seriedade profissional */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Sparkles size={14} />
            <span>Ferramenta Completa</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-5xl sm:text-6xl md:text-8xl font-display font-bold tracking-tight leading-[0.95] mb-8 text-white"
          >
            O fim das planilhas no seu escritório contábil.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed"
          >
            Uma ferramenta completa para a rotina do seu escritório. Gestão de produtividade, controle de prazos rigoroso e comunicação centralizada em uma única plataforma.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={onLoginClick}
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 rounded-full font-bold text-lg text-white flex items-center justify-center gap-2 transition-all group active:scale-95 shadow-xl shadow-indigo-500/25"
            >
              Começar agora
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── Strip Diferenciais Rápidos ─── */}
      <section className="border-y border-slate-800/50 bg-slate-900/30 py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-8 md:gap-4 text-slate-400 text-sm md:text-base font-medium">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-indigo-400" size={20} />
              <span>Segurança Nível Bancário</span>
            </div>
            <div className="hidden md:block w-1 h-1 rounded-full bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <Clock className="text-sky-400" size={20} />
              <span>Controle Rigoroso de Prazos</span>
            </div>
            <div className="hidden md:block w-1 h-1 rounded-full bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <Zap className="text-emerald-400" size={20} />
              <span>Produtividade em Tempo Real</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── A Solução: Módulos (Textos + Prints Reais) ─── */}
      <section id="ferramentas" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto space-y-32">
          {tools.map((tool, idx) => (
            <div key={idx} className={`flex flex-col ${tool.reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-16`}>
              
              {/* Texto */}
              <div className="w-full lg:w-5/12">
                <motion.div {...fadeIn}>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest mb-6">
                    {tool.icon}
                    <span>{tool.badge}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-6 text-white leading-tight">
                    {tool.title}
                  </h2>
                  <p className="text-lg text-slate-400 leading-relaxed mb-8">
                    {tool.desc}
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 size={18} className="text-indigo-400" /> Integração perfeita com a sua rotina.
                    </li>
                    <li className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 size={18} className="text-indigo-400" /> Adeus ao retrabalho manual.
                    </li>
                  </ul>
                </motion.div>
              </div>

              {/* Imagem (Print Real) */}
              <div className="w-full lg:w-7/12">
                <motion.div 
                  initial={{ opacity: 0, x: tool.reverse ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="relative group"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 to-sky-500/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                  <div className="relative animate-float rounded-2xl border border-slate-800 shadow-2xl overflow-hidden bg-slate-900">
                    <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-slate-600/50"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-600/50"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-600/50"></div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono ml-1 uppercase">{tool.badge}</span>
                    </div>
                    <img src={tool.image} alt={tool.title} className="w-full h-auto" />
                  </div>
                </motion.div>
              </div>

            </div>
          ))}
        </div>
      </section>

      {/* ─── Grid de Diferenciais (Fim das Planilhas) ─── */}
      <section id="diferenciais" className="py-24 px-6 relative bg-slate-900/20 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div {...fadeIn} className="text-center mb-20">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400 mb-4 block">
              Diferenciais Inegociáveis
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-6 text-white">
              É o fim das planilhas.
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Substitua dezenas de controles improvisados por uma ferramenta completa, desenhada especificamente para a rotina complexa do seu escritório.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {differentials.map((diff, i) => (
              <motion.div
                key={i}
                {...stagger(i)}
                className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-transform">
                  {diff.icon}
                </div>
                <h3 className="text-lg font-display font-bold mb-3 text-white">{diff.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{diff.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div {...fadeIn} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight mb-4 text-white">
              Investimento no seu crescimento.
            </h2>
            <p className="text-slate-400">
              Escolha o plano que melhor se adapta à escala da sua operação contábil.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={i}
                {...stagger(i)}
                className={`relative p-8 rounded-3xl border flex flex-col justify-between transition-all duration-500 ${
                  plan.highlight
                    ? 'bg-slate-900 border-indigo-500 shadow-[0_0_60px_-15px_rgba(99,102,241,0.2)] md:scale-105 z-10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.highlight && (
                   <div className="absolute -inset-[1px] bg-gradient-to-b from-indigo-500 to-sky-500 rounded-3xl z-[-1] opacity-50 blur-sm"></div>
                )}
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-display font-bold mb-1 text-white">
                        {plan.name}
                      </h3>
                      <p className="text-xs text-slate-400">{plan.description}</p>
                    </div>
                    {plan.highlight && (
                      <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase border border-indigo-500/30">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <div className="mb-8">
                    <span className="text-4xl font-display font-bold text-white">
                      {plan.price}
                    </span>
                    {plan.price !== 'Sob Consulta' && (
                      <span className="text-slate-500 text-sm ml-2">/mês</span>
                    )}
                  </div>
                  <div className="space-y-4 mb-8">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-3 text-sm text-slate-300">
                        <CheckCircle2 size={16} className={plan.highlight ? 'text-indigo-400' : 'text-slate-600'} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={onLoginClick}
                  className={`w-full py-4 rounded-full font-bold transition-all active:scale-95 cursor-pointer ${
                    plan.highlight
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  Selecionar Plano
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-32 px-6 relative overflow-hidden bg-slate-900/30 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div {...fadeIn}>
            <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-8 text-white leading-tight">
              É o fim das planilhas.
            </h2>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
              Comece agora com a ferramenta completa para a rotina do seu escritório e lidere o mercado.
            </p>
            <button
              onClick={onLoginClick}
              className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white rounded-full font-bold text-xl transition-all active:scale-95 shadow-2xl shadow-indigo-500/20 cursor-pointer"
            >
              Criar Conta Gratuitamente
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-16 px-6 border-t border-slate-800/50 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-sky-400 rounded-lg flex items-center justify-center">
              <BarChart3 size={14} className="text-white" />
            </div>
            <span className="text-lg font-display font-bold tracking-tight text-slate-200">
              Task Account
            </span>
          </div>

          <p className="text-slate-500 text-sm text-center">
            © 2026 Task Account. Todos os direitos reservados. Fim das Planilhas.
          </p>

          <div className="flex gap-6">
            <a href="#" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">Privacidade</a>
            <a href="#" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
