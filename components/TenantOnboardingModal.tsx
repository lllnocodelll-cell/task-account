import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  User, 
  CreditCard, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  QrCode,
  Copy,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabase } from '../utils/supabaseClient';
import { formatCnpjCpf } from '../utils/stringUtils';
import { BrandLogo } from './ui/BrandLogo';

export interface PlanDetails {
  name: string;
  price: string;
  period: string;
  clientsLimit: string;
  storageLimit: string;
  description: string;
  costPerClient?: string;
}

interface TenantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PlanDetails;
  onSuccess: () => void;
}

export const TenantOnboardingModal: React.FC<TenantOnboardingModalProps> = ({
  isOpen,
  onClose,
  plan,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passo 1: Dados do Escritório
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [cityState, setCityState] = useState('');

  // Passo 2: Gestor Master
  const [gestorName, setGestorName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Força de senha simples (0 a 4)
  const calculateStrength = (pwd: string) => {
    let s = 0;
    if (pwd.length >= 6) s++;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    return s;
  };

  const strength = calculateStrength(password);

  // Passo 3: Pagamento Mock Stripe
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  // Máscara CNPJ Alfanumérico / CPF
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCnpjCpf(e.target.value));
  };

  // Máscara Telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 6) {
      v = v.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d+)/, '($1) $2');
    }
    setPhone(v);
  };

  // Máscara Cartão
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 16) v = v.substring(0, 16);
    v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(v);
  };

  // Máscara Validade
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 4) v = v.substring(0, 4);
    if (v.length >= 3) {
      v = v.replace(/^(\d{2})(\d+)/, '$1/$2');
    }
    setCardExpiry(v);
  };

  if (!isOpen) return null;

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Informe a Razão Social ou Nome do Escritório.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gestorName.trim()) {
      setError('Informe o nome completo do gestor.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Informe um e-mail profissional válido.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas digitadas não conferem.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleCompleteSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Cria a conta no Supabase Auth com metadata de Gestor e Organização
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            full_name: gestorName.trim(),
            role: 'gestor',
            org_name: companyName.trim(),
            phone: phone.trim()
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('Este e-mail já está cadastrado. Acesse a tela de login ou utilize outro endereço.');
        }
        throw signUpError;
      }

      // Se o usuário foi criado, atualizar os campos adicionais no profile
      if (data.user) {
        try {
          await supabase
            .from('profiles')
            .update({
              org_name: companyName.trim(),
              phone: phone.trim(),
              location: cityState.trim(),
              job_title: 'Sócio Gestor'
            })
            .eq('id', data.user.id);
        } catch {
          // Inserção automática pela trigger já garantiu o básico
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Erro ao contratar plano:', err);
      setError(err.message || 'Erro ao processar assinatura. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-hidden">
      {/* ─── ILUMINAÇÃO ZENITAL & GRID TÉCNICO DE ENGENHARIA (ESTILO LANDING PAGE) ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow sutil central em tons âmbar/dourado */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-amber-400/15 via-yellow-400/5 to-transparent dark:from-yellow-500/10 dark:via-amber-500/5 dark:to-transparent rounded-full blur-[140px]" />
        
        {/* Grid Blueprint no Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-[#121722]/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh] z-10 transition-colors">
        
        {/* Glow interno superior */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[180px] bg-gradient-to-b from-amber-400/10 via-yellow-400/5 to-transparent dark:from-yellow-500/10 dark:via-amber-500/5 dark:to-transparent rounded-full blur-[80px] pointer-events-none" />

        {/* Topo / Header Responsivo */}
        <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/50 relative z-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            
            {/* Topo no Mobile (Logo + Botão Fechar) / Lado Esquerdo no Desktop */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-3">
                <div className="sm:hidden">
                  <BrandLogo size="sm" />
                </div>
                <div className="hidden sm:block">
                  <BrandLogo size="md" />
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block" />
              </div>

              {/* Botão de Fechar no mobile */}
              <button
                onClick={onClose}
                className="sm:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Título & Badge do Plano */}
            <div className="flex-1 sm:px-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950 font-mono">
                  {plan.name} • {plan.price}
                </span>
                <span className="text-xs text-slate-500 font-mono">{plan.period}</span>
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white mt-1 leading-snug">
                <span className="sm:hidden">Ativação do Escritório</span>
                <span className="hidden sm:inline">Contratação & Ativação do Escritório</span>
              </h2>
            </div>

            {/* Botão de Fechar no desktop */}
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Indicador de Passos Responsivo */}
        <div className="grid grid-cols-3 border-b border-slate-200 dark:border-white/5 text-[11px] sm:text-xs font-bold bg-slate-100/50 dark:bg-slate-900/20">
          <div className={`py-2.5 px-2 sm:py-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 transition-colors ${
            step === 1 
              ? 'border-indigo-600 dark:border-yellow-400 text-indigo-600 dark:text-yellow-400' 
              : step > 1 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-400'
          }`}>
            <Building2 size={13} className="shrink-0" />
            <span>1. Escritório</span>
          </div>

          <div className={`py-2.5 px-2 sm:py-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 transition-colors ${
            step === 2 
              ? 'border-indigo-600 dark:border-yellow-400 text-indigo-600 dark:text-yellow-400' 
              : step > 2 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-400'
          }`}>
            <User size={13} className="shrink-0" />
            <span><span className="sm:hidden">2. Gestor</span><span className="hidden sm:inline">2. Gestor Master</span></span>
          </div>

          <div className={`py-2.5 px-2 sm:py-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 border-b-2 transition-colors ${
            step === 3 
              ? 'border-indigo-600 dark:border-yellow-400 text-indigo-600 dark:text-yellow-400' 
              : 'border-transparent text-slate-400'
          }`}>
            <CreditCard size={13} className="shrink-0" />
            <span><span className="sm:hidden">3. Checkout</span><span className="hidden sm:inline">3. Checkout Stripe</span></span>
          </div>
        </div>

        {/* Mensagem de Erro Geral */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Corpo do Formulário */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* PASSO 1: DADOS DA EMPRESA */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1">
                  <span className="sm:hidden">Dados do Escritório Contábil</span>
                  <span className="hidden sm:inline">Identificação da Organização Contábil</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Estes dados serão utilizados no cabeçalho dos seus relatórios e no portal dos seus clientes.
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  label="Razão Social ou Nome Fantasia *"
                  placeholder="Ex: Prime Contabilidade & Associados"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="CNPJ / CPF (opcional)"
                    placeholder="00.000.000/0000-00 ou CPF"
                    value={cnpj}
                    onChange={handleCnpjChange}
                  />

                  <Input
                    label="Telefone / WhatsApp Comercial"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                  />
                </div>

                <Input
                  label="Cidade e Estado (UF)"
                  placeholder="Ex: São Paulo, SP"
                  value={cityState}
                  onChange={(e) => setCityState(e.target.value)}
                />
              </div>

              {/* Resumo do Plano Selecionado */}
              <div className="mt-4 sm:mt-6 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Plano Selecionado: <strong className="text-indigo-600 dark:text-yellow-400">{plan.name}</strong>
                  </span>
                  <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-yellow-400">
                    {plan.price} <span className="text-[10px] text-slate-500 font-mono">{plan.period}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1 pt-1 border-t border-slate-200/50 dark:border-white/5">
                  <span>Capacidade: {plan.clientsLimit}</span>
                  <span>Armazenamento: {plan.storageLimit}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" size="lg" className="w-full sm:w-auto" icon={<ArrowRight size={16} />}>
                  <span className="sm:hidden">Avançar: Gestor Master</span>
                  <span className="hidden sm:inline">Avançar para Gestor Master</span>
                </Button>
              </div>
            </form>
          )}

          {/* PASSO 2: GESTOR MASTER */}
          {step === 2 && (
            <form onSubmit={handleNextStep2} className="space-y-4">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1">
                  <span className="sm:hidden">Gestor Master do Escritório</span>
                  <span className="hidden sm:inline">Credenciais do Gestor Responsável</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Você terá acesso irrestrito para configurar setores, cadastrar sua equipe e clientes.
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  label="Nome Completo do Gestor *"
                  placeholder="Ex: João da Silva"
                  value={gestorName}
                  onChange={(e) => setGestorName(e.target.value)}
                  required
                />

                <Input
                  label="E-mail Corporativo (será seu login) *"
                  placeholder="seu@escritorio.com.br"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Senha de Acesso *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full h-11 pl-3 pr-10 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Confirmar Senha *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Repita a senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full h-11 pl-3 pr-4 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Barra de Força da Senha */}
                {password.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1 h-1.5 w-full">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            strength >= step
                              ? strength === 1
                                ? 'bg-red-500'
                                : strength === 2
                                ? 'bg-amber-500'
                                : strength === 3
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                              : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {strength <= 1 && 'Senha fraca'}
                      {strength === 2 && 'Senha moderada'}
                      {strength === 3 && 'Senha boa'}
                      {strength === 4 && 'Senha excelente e segura'}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between gap-2.5">
                <Button type="button" variant="secondary" onClick={() => setStep(1)} icon={<ArrowLeft size={16} />}>
                  Voltar
                </Button>
                <Button type="submit" size="lg" icon={<ArrowRight size={16} />}>
                  <span className="sm:hidden">Avançar: Pagamento</span>
                  <span className="hidden sm:inline">Avançar para Pagamento</span>
                </Button>
              </div>
            </form>
          )}

          {/* PASSO 3: CHECKOUT & STRIPE MOCK */}
          {step === 3 && (
            <form onSubmit={handleCompleteSubscription} className="space-y-4 sm:space-y-5">
              {/* Aviso de Modo Homologação */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-yellow-400 text-xs flex items-start gap-2.5">
                <ShieldCheck size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-[11px] sm:text-xs">
                    <span className="sm:hidden">Ambiente de Testes (Stripe Mock)</span>
                    <span className="hidden sm:inline">Ambiente de Simulação Preparado para Stripe</span>
                  </span>
                  <p className="text-[10px] sm:text-[11px] opacity-90 leading-relaxed">
                    A estrutura de cobrança está pronta para o gateway de pagamento. Nesta versão de testes, a ativação é imediata.
                  </p>
                </div>
              </div>

              {/* Seletor de Meio de Pagamento */}
              <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <CreditCard size={14} /> Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                    paymentMethod === 'pix'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <QrCode size={14} /> PIX Instantâneo
                </button>
              </div>

              {paymentMethod === 'card' ? (
                <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Dados do Cartão (Stripe Mock)
                    </span>
                    <div className="flex items-center gap-1 opacity-70">
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">VISA</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">MASTERCARD</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">ELO</span>
                    </div>
                  </div>

                  <Input
                    label="Número do Cartão"
                    placeholder="4242 •••• •••• 4242"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    required
                  />

                  <Input
                    label="Nome Impresso no Cartão"
                    placeholder="NOME COMO NO CARTAO"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    required
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Validade"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={handleCardExpiryChange}
                      required
                    />

                    <Input
                      label="CVC / CVV"
                      placeholder="123"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D1017] border border-slate-200 dark:border-white/10 text-center space-y-3">
                  <div className="w-28 sm:w-32 h-28 sm:h-32 mx-auto bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
                    <QrCode size={90} className="text-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      PIX Copia e Cola (Simulação)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      A compensação será simulada e aprovada automaticamente ao clicar no botão abaixo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('00020126580014br.gov.bcb.pix0136taskaccount-mock-subscription-pix');
                      setPixCopied(true);
                      setTimeout(() => setPixCopied(false), 3000);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-yellow-400 hover:underline font-bold cursor-pointer"
                  >
                    <Copy size={13} />
                    {pixCopied ? 'Código PIX Copiado!' : 'Copiar Código PIX'}
                  </button>
                </div>
              )}

              {/* Resumo Final do Contrato */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{companyName || 'Seu Escritório'}</span>
                  <p className="text-[10px] text-slate-500 truncate">{email || 'email@exemplo.com'}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-indigo-600 dark:text-yellow-400 text-xs sm:text-sm block">
                    {plan.price}
                  </span>
                  <p className="text-[10px] text-slate-500">{plan.period}</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between gap-2.5">
                <Button type="button" variant="secondary" onClick={() => setStep(2)} icon={<ArrowLeft size={16} />} disabled={loading}>
                  Voltar
                </Button>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black shadow-lg shadow-yellow-400/20"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="sm:hidden">Ativando...</span>
                      <span className="hidden sm:inline">Ativando Escritório...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <Sparkles size={16} className="shrink-0" />
                      <span className="sm:hidden">Concluir Assinatura</span>
                      <span className="hidden sm:inline">Concluir Assinatura & Acessar</span>
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
