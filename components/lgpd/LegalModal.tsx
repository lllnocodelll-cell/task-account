import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Cookie, 
  Lock, 
  CheckCircle2, 
  ExternalLink,
  Scale,
  Building,
  Mail,
  HelpCircle
} from 'lucide-react';

export type LegalTabType = 'privacy' | 'terms' | 'cookies';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTabType;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<LegalTabType>(initialTab);

  // Sincroniza a aba inicial sempre que o modal abre
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fecha com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/50 overflow-hidden text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#121826]/70 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-yellow-400/20 shrink-0">
              <ShieldCheck size={20} className="fill-slate-950/10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="legal-modal-title" className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase">
                  Central de Conformidade & Legal
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LGPD Ativa
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Task Account • Celsoftware Ltda • Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar janela"
            title="Fechar (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Abas de Navegação */}
        <div className="flex items-center gap-1 px-4 sm:px-8 pt-3 border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-[#0B0F19] shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-yellow-400 text-slate-950 dark:text-yellow-400 bg-white/70 dark:bg-white/5 rounded-t-lg'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Política de Privacidade (LGPD)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-yellow-400 text-slate-950 dark:text-yellow-400 bg-white/70 dark:bg-white/5 rounded-t-lg'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={16} />
            <span>Termos de Uso do Software</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cookies'
                ? 'border-yellow-400 text-slate-950 dark:text-yellow-400 bg-white/70 dark:bg-white/5 rounded-t-lg'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cookie size={16} />
            <span>Preferências de Cookies</span>
          </button>
        </div>

        {/* Corpo do Conteúdo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          
          {/* ════════════ ABA 1: POLÍTICA DE PRIVACIDADE ════════════ */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <p className="font-semibold">
                  Esta política detalha como a <strong>Celsoftware Ltda</strong>, proprietária do sistema <strong>Task Account</strong>, trata os dados pessoais em conformidade integral com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
                </p>
                <p className="text-xs mt-1 text-amber-700 dark:text-amber-300/80">
                  Última atualização: Setembro de 2026. Versão 2.6.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Building size={16} className="text-amber-500 dark:text-yellow-400" />
                  1. Definições de Papéis (Controlador vs. Operador)
                </h3>
                <p>
                  No ecossistema do <strong>Task Account</strong>, os papéis previstos pela LGPD são divididos com precisão técnica e contábil:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Operador de Dados:</strong> O Task Account (Celsoftware Ltda) atua primordialmente como <strong>Operador</strong> em relação aos dados dos clientes finais dos escritórios contábeis (sócios, funcionários, notas fiscais e obrigações acessórias). Esses dados são processados estritamente em nome e sob ordens do escritório assinante.
                  </li>
                  <li>
                    <strong>Controlador de Dados:</strong> O escritório contábil ou empresa contratante atua como <strong>Controlador</strong>, sendo responsável pela definição das finalidades de coleta dos dados de seus clientes e colaboradores.
                  </li>
                  <li>
                    <strong>Controlador dos Assinantes:</strong> A Celsoftware Ltda é Controladora unicamente dos dados cadastrais dos próprios usuários do sistema (nome, e-mail corporativo, telefone e dados de cobrança da assinatura).
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Scale size={16} className="text-amber-500 dark:text-yellow-400" />
                  2. Bases Legais para o Tratamento (Art. 7º da LGPD)
                </h3>
                <p>
                  O tratamento de dados realizado pela plataforma apoia-se nas seguintes bases legais:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Cumprimento de Obrigação Legal ou Regulatória (Art. 7º, II):</strong> Emissão e guarda de Documentos Fiscais Eletrônicos (DF-e, NF-e, NFS-e), eSocial, DCTFWeb, SPED Fiscal e Contábil, bem como guarda de livros e registros durante o prazo decadencial e prescricional de 5 (cinco) anos previsto pelo Código Tributário Nacional (CTN).
                  </li>
                  <li>
                    <strong>Execução de Contrato (Art. 7º, V):</strong> Disponibilização das ferramentas de gestão de tarefas, atendimento ao cliente, relatórios contábeis e controle de rotinas do escritório.
                  </li>
                  <li>
                    <strong>Legítimo Interesse e Segurança (Art. 7º, IX):</strong> Prevenção a fraudes, monitoramento de logs de segurança, auditoria de acessos e aperfeiçoamento contínuo da plataforma.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Lock size={16} className="text-amber-500 dark:text-yellow-400" />
                  3. Segurança da Informação e Certificados Digitais A1
                </h3>
                <p>
                  Adotamos padrões rigorosos de segurança (*Privacy by Design* e *Privacy by Default*):
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Isolamento Multi-tenant:</strong> Arquitetura de banco de dados com <em>Row Level Security (RLS)</em> no Supabase/PostgreSQL, assegurando que nenhuma informação de um escritório seja acessada por outro inquilino.
                  </li>
                  <li>
                    <strong>Criptografia:</strong> Comunicação 100% criptografada via HTTPS/TLS 1.3 em trânsito e criptografia AES-256 em repouso.
                  </li>
                  <li>
                    <strong>Certificados Digitais (A1):</strong> Os arquivos de certificados `.pfx`/`.p12` e respectivas senhas são armazenados com camada adicional de criptografia assimétrica e utilizados exclusivamente para as consultas autorizadas junto à SEFAZ e prefeituras.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-amber-500 dark:text-yellow-400" />
                  4. Direitos dos Titulares de Dados (Art. 18 da LGPD)
                </h3>
                <p>
                  Garantimos o pleno exercício dos direitos previstos na lei:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Confirmação da existência de tratamento e acesso aos dados.</li>
                  <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                  <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
                  <li>Portabilidade dos dados a outro fornecedor de serviços mediante requisição expressa.</li>
                  <li>Informação sobre entidades públicas e privadas com as quais os dados foram compartilhados (ex.: Receita Federal, SEFAZ, Municípios).</li>
                </ul>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  *Nota: O direito de eliminação não se sobrepõe ao dever de retenção para cumprimento de obrigações tributárias, previdenciárias e fiscais durante o prazo legal de guarda.
                </p>
              </section>

              <section className="space-y-2 p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Mail size={16} className="text-amber-500 dark:text-yellow-400" />
                  5. Canal do Encarregado de Dados (DPO)
                </h3>
                <p>
                  Para exercer seus direitos ou esclarecer qualquer dúvida sobre como tratamos seus dados pessoais, entre em contato diretamente com o nosso Encarregado de Proteção de Dados:
                </p>
                <div className="mt-2 text-xs space-y-1">
                  <p><strong>Encarregado (DPO):</strong> Setor de Privacidade e Segurança da Informação</p>
                  <p>
                    <strong>E-mail de Contato:</strong>{' '}
                    <a href="mailto:privacidade@taskaccount.com.br" className="text-amber-600 dark:text-yellow-400 hover:underline font-mono">
                      privacidade@taskaccount.com.br
                    </a>
                  </p>
                  <p><strong>Empresa Responsável:</strong> Celsoftware Ltda</p>
                </div>
              </section>
            </div>
          )}

          {/* ════════════ ABA 2: TERMOS DE USO ════════════ */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-950 dark:text-indigo-200">
                <p className="font-semibold">
                  Termos e Condições Gerais de Uso da Plataforma <strong>Task Account</strong> (Celsoftware Ltda).
                </p>
                <p className="text-xs mt-1 text-indigo-700 dark:text-indigo-300/80">
                  Regula o licenciamento do software como serviço (SaaS), responsabilidades operacionais e garantias.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                  1. Objeto do Contrato
                </h3>
                <p>
                  O <strong>Task Account</strong> é uma plataforma SaaS desenvolvida para gestão de tarefas contábeis, atendimento a clientes, monitoramento de prazos fiscais, custódia de documentos e controle operacional para escritórios e profissionais de contabilidade.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                  2. Responsabilidades do Assinante
                </h3>
                <p>
                  O assinante é integralmente responsável por:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>Garantir a veracidade e exatidão dos dados contábeis, fiscais e cadastrais inseridos no sistema.</li>
                  <li>Manter sob sigilo suas credenciais de acesso (usuários e senhas), não as compartilhando com terceiros não autorizados.</li>
                  <li>Obter o devido consentimento ou base legal válida de seus clientes finais antes de cadastrá-los na plataforma.</li>
                  <li>Utilizar o sistema em estrita observância à legislação brasileira e às normas do Conselho Federal de Contabilidade (CFC).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                  3. Nível de Serviço (SLA) & Disponibilidade
                </h3>
                <p>
                  A <strong>Celsoftware Ltda</strong> emprega os melhores esforços técnicos para assegurar uma disponibilidade média de 99,5% da plataforma, ressalvadas manutenções programadas (notificadas com antecedência) e instabilidades em órgãos governamentais externos (como portais da SEFAZ e Receita Federal).
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                  4. Confidencialidade e Sigilo Profissional
                </h3>
                <p>
                  A Celsoftware Ltda reconhece o caráter confidencial das informações financeiras, contábeis e estratégicas transacionadas no Task Account e compromete-se formalmente a não comercializar, divulgar ou ceder qualquer informação de clientes a terceiros.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase">
                  5. Cancelamento e Exportação de Dados
                </h3>
                <p>
                  O assinante tem total autonomia para cancelar sua assinatura a qualquer momento, tendo garantido o direito de exportar todos os seus dados cadastrais e histórico de tarefas antes do término do período contratado.
                </p>
              </section>
            </div>
          )}

          {/* ════════════ ABA 3: GERENCIAR COOKIES ════════════ */}
          {activeTab === 'cookies' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-200">
                <p className="font-semibold">
                  Controle de Cookies e Preferências de Navegação
                </p>
                <p className="text-xs mt-1 text-emerald-700 dark:text-emerald-300/80">
                  Respeitamos sua privacidade. Você pode escolher quais categorias de cookies deseja autorizar.
                </p>
              </div>

              <div className="space-y-4">
                {/* Categoria 1: Necessários */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">Cookies Estritamente Necessários</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        Obrigatórios
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Indispensáveis para autenticação segura, preservação do tema (Claro/Escuro), funcionamento de formulários e integridade de sessões no sistema.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Sempre Ativos</span>
                  </div>
                </div>

                {/* Categoria 2: Analíticos e Desempenho */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">Cookies de Análise e Desempenho</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        Opcional
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nos ajudam a entender de forma anônima e agregada como a landing page é navegada, permitindo aprimorar a velocidade e usabilidade do produto.
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Ativado para melhoria</span>
                  </div>
                </div>

                {/* Categoria 3: Segurança */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121826] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">Cookies de Segurança e Prevenção a Fraudes</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Segurança
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Protegem o ambiente contra ataques automatizados (bot protection, rate limiting e tokens anti-CSRF).
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Ativos</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé do Modal com Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101522] shrink-0 text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Dúvidas legais? Fale com <a href="mailto:privacidade@taskaccount.com.br" className="text-amber-600 dark:text-yellow-400 underline font-semibold">privacidade@taskaccount.com.br</a>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold transition-all cursor-pointer text-center"
          >
            Entendido e Ciente
          </button>
        </div>

      </div>
    </div>
  );
};
