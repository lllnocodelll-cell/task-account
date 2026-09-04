import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  EyeOff, 
  Building2, 
  ShieldCheck, 
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../utils/supabaseClient';
import { parseInviteToken, InvitePayload } from '../utils/inviteLink';
import { BrandLogo } from '../components/ui/BrandLogo';

interface InviteActivationProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const InviteActivation: React.FC<InviteActivationProps> = ({
  onSuccess,
  onGoToLogin,
  isDarkMode,
  toggleTheme
}) => {
  const [inviteData, setInviteData] = useState<InvitePayload | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'already_exists'>('form');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');

    if (!inviteToken) {
      // Tenta recuperar via parâmetros legados se houver
      const email = params.get('email');
      const memberId = params.get('member_id');
      const orgId = params.get('org');
      const name = params.get('name') || '';
      const role = (params.get('role') as any) || 'operacional';

      if (email && memberId && orgId) {
        setInviteData({
          memberId,
          email,
          name,
          role,
          orgId,
          timestamp: Date.now()
        });
      } else {
        setTokenError('Link de convite inválido ou incompleto. Solicite um novo link ao administrador do escritório.');
      }
      return;
    }

    const parsed = parseInviteToken(inviteToken);
    if (!parsed) {
      setTokenError('O link de convite é inválido ou expirou. Solicite um novo link ao seu gestor.');
    } else {
      setInviteData(parsed);
    }
  }, []);

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

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cria a conta no Supabase Auth
      // A trigger handle_new_user() no banco já vinculará com a tabela members e profiles automaticamente!
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: password,
        options: {
          data: {
            full_name: inviteData.name,
            role: inviteData.role,
            org_id: inviteData.orgId
          }
        }
      });

      if (signUpError) {
        // Se o usuário já existir no auth.users
        if (signUpError.message.toLowerCase().includes('already registered') || 
            signUpError.message.toLowerCase().includes('user already exists') ||
            signUpError.message.toLowerCase().includes('ja cadastrado')) {
          setStatus('already_exists');
          setLoading(false);
          return;
        }
        throw signUpError;
      }

      // Se o signup foi bem-sucedido e já retornou sessão ativa
      if (data.session) {
        setStatus('success');
      } else {
        // Se requer confirmação ou foi criado com sucesso
        setStatus('success');
      }
    } catch (err: any) {
      console.error('Erro na ativação do convite:', err);
      setError(err.message || 'Ocorreu um erro ao ativar seu acesso. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'cliente':
        return 'Portal do Cliente';
      case 'gestor':
        return 'Gestão Executiva';
      default:
        return 'Colaborador Operacional';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 selection:bg-yellow-400 selection:text-black font-sans antialiased transition-colors duration-300 p-4 relative overflow-hidden">
      
      {/* ─── ILUMINAÇÃO ZENITAL & GRID TÉCNICO DE ENGENHARIA (ESTILO LANDING PAGE) ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow sutil central em tons âmbar/dourado */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] sm:w-[1000px] h-[450px] sm:h-[550px] bg-gradient-to-b from-amber-400/20 via-yellow-400/10 to-transparent dark:from-yellow-500/15 dark:via-amber-500/5 dark:to-transparent rounded-full blur-[140px]" />
        
        {/* Glow sutil inferior */}
        <div className="absolute -bottom-24 right-1/4 w-[450px] h-[450px] bg-yellow-400/5 dark:bg-amber-500/5 rounded-full blur-[120px]" />

        {/* Grid Blueprint */}
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

      {/* Botão de Tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-white/90 dark:bg-[#121722]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-yellow-400 shadow-lg shadow-slate-200/50 dark:shadow-black/40 transition-all z-20 cursor-pointer"
        title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-lg bg-white/95 dark:bg-[#121722]/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-300/40 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden border border-slate-200/80 dark:border-white/10 z-10 transition-colors">
        
        {/* Header Superior Responsivo */}
        <div className="p-5 sm:p-8 pb-5 sm:pb-6 text-center border-b border-slate-100 dark:border-white/5 bg-gradient-to-b from-amber-500/5 via-yellow-400/5 to-transparent dark:from-yellow-400/5 dark:to-transparent">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="sm:hidden">
              <BrandLogo size="md" />
            </div>
            <div className="hidden sm:block">
              <BrandLogo size="lg" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 border border-yellow-400/30">
              Primeiro Acesso
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Ativação de Credencial
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Defina sua senha de acesso para ingressar com segurança no Task Account.
          </p>
        </div>

        {/* Conteúdo Principal Responsivo */}
        <div className="p-5 sm:p-8">
          {tokenError ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Convite Inválido ou Expirado</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {tokenError}
                </p>
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <Button onClick={onGoToLogin} className="w-full" size="lg">
                  Ir para Tela de Login
                </Button>
              </div>
            </div>
          ) : status === 'already_exists' ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Conta Já Ativada!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  O e-mail <strong>{inviteData?.email}</strong> já possui cadastro ativo no sistema. Você pode entrar diretamente com sua senha cadastrada.
                </p>
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <Button onClick={onGoToLogin} className="w-full" size="lg" icon={<ArrowRight size={16} />}>
                  Acessar com Minhas Credenciais
                </Button>
              </div>
            </div>
          ) : status === 'success' ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Senha Definida com Sucesso!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sua conta foi ativada com sucesso. Você já pode acessar todas as funcionalidades autorizadas para seu perfil.
                </p>
              </div>
              <div className="pt-4">
                <Button onClick={onSuccess} className="w-full" size="lg" icon={<ArrowRight size={16} />}>
                  Entrar no Task Account
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-5">
              {/* Card com Detalhes do Convite */}
              {inviteData && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Escritório Contábil</span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {inviteData.orgName || 'Escritório Contábil Credenciado'}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                      {getRoleLabel(inviteData.role)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Convidado:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{inviteData.name || 'Usuário Convidado'}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2 border border-red-200 dark:border-red-900/40">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* E-mail Travado */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>E-mail vinculado</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Confirmado
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={inviteData?.email || ''}
                    disabled
                    className="w-full h-11 pl-10 pr-4 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Campos de Senha */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Crie sua senha de acesso
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-11 pl-10 pr-10 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                    />
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Barra de Força da Senha */}
                {password.length > 0 && (
                  <div className="space-y-1">
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

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirme sua senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita a senha criada"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full h-11 pl-10 pr-4 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white transition-all"
                    />
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-6 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-black text-xs tracking-wider uppercase shadow-[0_0_25px_-5px_rgba(250,204,21,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-slate-950" />
                    Ativando Credencial...
                  </span>
                ) : (
                  <>
                    <span>Ativar Minha Conta & Acessar</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Já definiu sua senha anteriormente? Fazer Login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 text-center border-t border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Ambiente seguro com criptografia de ponta a ponta • Task Account
          </p>
        </div>

      </div>
    </div>
  );
};
