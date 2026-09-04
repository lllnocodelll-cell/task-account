import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Sun, 
  Moon, 
  AlertTriangle, 
  Loader2, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../utils/supabaseClient';
import { BrandLogo } from '../components/ui/BrandLogo';

interface AuthProps {
  onLogin: () => void;
  onGoToLanding?: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Auth: React.FC<AuthProps> = ({ 
  onLogin, 
  onGoToLanding, 
  isDarkMode, 
  toggleTheme 
}) => {
  const [view, setView] = useState<'login' | 'forgot_password'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.');
        }
        throw error;
      }

      // Login bem-sucedido
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/?tab=settings`,
      });

      if (error) throw error;

      setSuccessMessage('Link de redefinição enviado! Verifique sua caixa de entrada e spam.');
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar redefinição de senha. Verifique o e-mail informado.');
    } finally {
      setLoading(false);
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

      {/* Botão de Alternância de Tema */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-white/90 dark:bg-[#121722]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-yellow-400 shadow-lg shadow-slate-200/50 dark:shadow-black/40 transition-all z-20 cursor-pointer"
        title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-md bg-white/95 dark:bg-[#121722]/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-slate-300/40 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden border border-slate-200/80 dark:border-white/10 z-10 transition-colors">

        {/* Topo / Logo Responsivo */}
        <div className="p-5 sm:p-8 pb-5 sm:pb-6 text-center border-b border-slate-100 dark:border-white/5 bg-gradient-to-b from-amber-500/5 via-yellow-400/5 to-transparent dark:from-yellow-400/5 dark:to-transparent">
          <div className="flex justify-center mb-2 sm:mb-3">
            <div className="sm:hidden">
              <BrandLogo size="md" />
            </div>
            <div className="hidden sm:block">
              <BrandLogo size="lg" />
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2">
            Cockpit de Gestão Contábil & Atendimento
          </p>
        </div>

        {/* Corpo de Formulário Responsivo */}
        <div className="p-5 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-4">
                <Input
                  label="E-mail profissional"
                  placeholder="seu@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={16} />}
                  required
                />

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot_password');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-11 pl-10 pr-10 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
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
              </div>

              <button 
                type="submit" 
                className="w-full mt-6 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-black text-xs tracking-wider uppercase shadow-[0_0_25px_-5px_rgba(250,204,21,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-slate-950" />
                    Autenticando...
                  </span>
                ) : (
                  <>
                    <span>Acessar o Cockpit</span>
                    <div className="w-4 h-4 rounded-full bg-slate-950 text-yellow-400 flex items-center justify-center">
                      <Zap size={10} className="fill-yellow-400" />
                    </div>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recuperação de Senha</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Informe o e-mail cadastrado da sua conta. Enviaremos um link de acesso para você cadastrar uma nova senha.
                </p>
              </div>

              <Input
                label="E-mail cadastrado"
                placeholder="seu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={16} />}
                required
              />

              <button 
                type="submit" 
                className="w-full mt-4 py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-black text-xs tracking-wider uppercase shadow-[0_0_25px_-5px_rgba(250,204,21,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed" 
                disabled={loading || !email}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-slate-950" />
                    Enviando link...
                  </span>
                ) : (
                  'Enviar Link de Redefinição'
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1.5"
                >
                  <ArrowLeft size={14} /> Voltar para o Login
                </button>
              </div>
            </form>
          )}

          {/* Links de Auxílio e Acesso */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-2.5">
              <Building2 size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold text-slate-800 dark:text-slate-200">Novo escritório contábil?</span>{' '}
                <button
                  type="button"
                  onClick={onGoToLanding}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  Conheça nossos planos e contrate <ArrowRight size={10} />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
              Primeiro acesso como colaborador ou cliente? Utilize o link de ativação enviado pelo gestor do escritório.
            </p>
          </div>
        </div>

        {/* Rodapé Seguro */}
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 text-center border-t border-slate-200 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            Conexão Criptografada TLS • &copy; {new Date().getFullYear()} Task Account
          </p>
        </div>

      </div>
    </div>
  );
};
