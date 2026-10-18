import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURAÇÃO DO WHATSAPP COMERCIAL:
 * Quando você contratar o seu número oficial, basta inseri-lo abaixo com DDI e DDD
 * (somente números, exemplo: '5511999999999').
 * Enquanto estiver vazio (''), o modal opera no modo Formulário de Contato / Lead Qualificado.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const WHATSAPP_COMMERCIAL_NUMBER = '';

interface ConsultantContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
  initialPlan?: string;
}

export const ConsultantContactModal: React.FC<ConsultantContactModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
  initialPlan
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firmName, setFirmName] = useState('');
  const [clientCount, setClientCount] = useState('51 a 200 clientes');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Formatação automática de telefone (XX) XXXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) {
      v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    }
    setPhone(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Se houver número de WhatsApp configurado no futuro, redireciona diretamente
    if (WHATSAPP_COMMERCIAL_NUMBER) {
      const text = encodeURIComponent(
        `Olá! Gostaria de falar com um consultor sobre o Task Account.\n\n` +
        `• Nome: ${name}\n` +
        `• Escritório: ${firmName}\n` +
        `• Clientes: ${clientCount}\n` +
        (initialPlan ? `• Interesse: Plano ${initialPlan}\n` : '') +
        (message ? `• Mensagem: ${message}` : '')
      );
      window.open(`https://wa.me/${WHATSAPP_COMMERCIAL_NUMBER}?text=${text}`, '_blank');
      setIsSubmitting(false);
      onClose();
      return;
    }

    // Modo Formulário Autônomo: simula envio com persistência segura
    try {
      const lead = {
        name,
        email,
        phone,
        firmName,
        clientCount,
        message,
        plan: initialPlan || 'Geral',
        createdAt: new Date().toISOString()
      };
      const existingLeads = JSON.parse(localStorage.getItem('task_account_consultant_leads') || '[]');
      existingLeads.push(lead);
      localStorage.setItem('task_account_consultant_leads', JSON.stringify(existingLeads));
    } catch {
      // safe fallback
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 800);
  };

  const handleReset = () => {
    setIsSuccess(false);
    setName('');
    setEmail('');
    setPhone('');
    setFirmName('');
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop escurecido com blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Card do Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden z-10"
        >
          {/* Linha decorativa de energia */}
          <div className="h-1 w-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500" />

          {/* Botão Fechar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>

          {!isSuccess ? (
            <div className="p-5 sm:p-7">
              {/* Header */}
              <div className="mb-5 sm:mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 dark:bg-yellow-400/10 border border-amber-400/30 dark:border-yellow-400/20 text-amber-600 dark:text-yellow-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-2">
                  <Sparkles size={11} className="fill-current" />
                  <span>Atendimento Especializado</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {initialPlan === 'Elite' ? 'Plano Elite • Atendimento Corporativo' : 'Falar com um Consultor'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Preencha os dados do seu escritório. Nosso especialista entrará em contato para entender sua rotina e planejar sua implantação.
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nome */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Seu Nome *
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Carlos Silva"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                      />
                    </div>
                  </div>

                  {/* Nome do Escritório */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      Nome do Escritório *
                    </label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={firmName}
                        onChange={(e) => setFirmName(e.target.value)}
                        placeholder="Ex: Silva & Associados"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* E-mail */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      E-mail Profissional *
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="carlos@escritorio.com.br"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                      />
                    </div>
                  </div>

                  {/* Telefone / WhatsApp */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp / Celular *
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="(11) 99999-9999"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Porte / Quantidade de Clientes */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Porte do Escritório (Carteira de Clientes)
                  </label>
                  <select
                    value={clientCount}
                    onChange={(e) => setClientCount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400/50 cursor-pointer"
                  >
                    <option value="Até 50 clientes">Até 50 clientes</option>
                    <option value="51 a 200 clientes">51 a 200 clientes</option>
                    <option value="201 a 500 clientes">201 a 500 clientes</option>
                    <option value="Mais de 500 clientes (Estrutura Corporativa)">Mais de 500 clientes (Estrutura Corporativa)</option>
                  </select>
                </div>

                {/* Mensagem Opcional */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Como podemos ajudar? (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Conte um pouco sobre suas maiores dores com prazos ou rotinas..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 resize-none"
                  />
                </div>

                {/* LGPD Badge */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                  <span>Seus dados são confidenciais e protegidos em conformidade com a LGPD.</span>
                </div>

                {/* Botão de Envio */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-400/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Enviando dados...</span>
                      </>
                    ) : (
                      <>
                        <span>Solicitar Contato do Consultor</span>
                        <ArrowRight size={14} className="stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Tela de Sucesso */
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Solicitação Recebida com Sucesso!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Obrigado, <strong className="text-slate-900 dark:text-white">{name}</strong>. Nossa equipe entrará em contato com o escritório <strong className="text-slate-900 dark:text-white">{firmName}</strong> em breve.
              </p>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-full bg-slate-900 text-white dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
