import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    FileSpreadsheet,
    Download,
    Upload,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    X,
    FileText,
    Users,
    KeyRound,
    Building2,
    Shield,
    FileCheck,
    Briefcase,
    Receipt,
    RefreshCw,
    Info,
    ArrowRight,
    BookOpen,
    HelpCircle,
    Check,
    Ban,
    ChevronUp
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
    downloadClientTemplate,
    parseAndValidateClientWorkbook,
    executeClientBatchImport,
    WorkbookParseResult,
    ImportedClientRow
} from '../../utils/clientImportExport';

interface ClientImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: any;
    existingClients: { id: string; document?: string; code?: string }[];
    onSuccess: () => void;
}

type TabKey = 'clientes' | 'regimes' | 'contatos' | 'inscricoes' | 'cnaes' | 'acessos' | 'licencas' | 'legislacoes' | 'dfe';

export const ClientImportModal: React.FC<ClientImportModalProps> = ({
    isOpen,
    onClose,
    userProfile,
    existingClients,
    onSuccess
}) => {
    const [mainTab, setMainTab] = useState<'import' | 'instructions'>('import');
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'finished'>('upload');
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [parseLoading, setParseLoading] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [parseResult, setParseResult] = useState<WorkbookParseResult | null>(null);

    // Filtro da tabela de clientes na prévia
    const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'duplicate' | 'error'>('all');
    const [activeTab, setActiveTab] = useState<TabKey>('clientes');

    // Estado do progresso de importação
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressMessage, setProgressMessage] = useState('');
    const [importSummary, setImportSummary] = useState<{
        importedClientsCount: number;
        skippedCount: number;
        secondaryCounts: { [key: string]: number };
        errors: string[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            const timer = setTimeout(() => setIsVisible(true), 20);
            document.body.style.overflow = 'hidden';
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleTransitionEnd = () => {
        if (!isVisible) {
            setShouldRender(false);
            document.body.style.overflow = 'unset';
        }
    };

    const handleClose = () => {
        if (step !== 'importing') {
            handleReset();
            onClose();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && step !== 'importing') {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, step]);

    const handleReset = () => {
        setStep('upload');
        setSelectedFile(null);
        setParseError(null);
        setParseResult(null);
        setStatusFilter('all');
        setActiveTab('clientes');
        setProgressPercent(0);
        setProgressMessage('');
        setImportSummary(null);
    };

    const handleFileSelected = async (file: File) => {
        if (!file) return;

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            setParseError('Por favor, selecione um arquivo no formato Excel (.xlsx).');
            return;
        }

        setSelectedFile(file);
        setParseLoading(true);
        setParseError(null);

        try {
            const result = await parseAndValidateClientWorkbook(file, existingClients);
            setParseResult(result);
            setStep('preview');
        } catch (err: any) {
            console.error('Erro ao ler planilha:', err);
            setParseError(err.message || 'Falha ao processar o arquivo Excel.');
        } finally {
            setParseLoading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelected(e.dataTransfer.files[0]);
        }
    };

    const handleStartImport = async () => {
        if (!parseResult || !userProfile?.org_id) return;

        const validToImport = parseResult.rows.filter(r => r.validationStatus === 'valid');
        if (validToImport.length === 0) return;

        setStep('importing');
        setProgressPercent(0);
        setProgressMessage('Iniciando importação...');

        try {
            const result = await executeClientBatchImport(
                validToImport,
                userProfile.org_id,
                (pct, msg) => {
                    setProgressPercent(pct);
                    setProgressMessage(msg);
                }
            );

            setImportSummary(result);
            setStep('finished');
            onSuccess();
        } catch (err: any) {
            console.error('Erro durante a execução da importação:', err);
            setParseError(err.message || 'Erro inesperado durante a gravação.');
            setStep('preview');
        }
    };

    if (!shouldRender) return null;

    // Linhas filtradas na aba de clientes
    const filteredClientRows = parseResult ? parseResult.rows.filter(row => {
        if (statusFilter === 'valid') return row.validationStatus === 'valid';
        if (statusFilter === 'duplicate') return row.validationStatus === 'duplicate';
        if (statusFilter === 'error') return row.validationStatus === 'error';
        return true;
    }) : [];

    // Extrair listas das abas secundárias
    const allRegimes = parseResult?.rows.flatMap(r => r.taxRegimes) || [];
    const allContacts = parseResult?.rows.flatMap(r => r.contacts) || [];
    const allInscriptions = parseResult?.rows.flatMap(r => r.inscriptions) || [];
    const allActivities = parseResult?.rows.flatMap(r => r.activities) || [];
    const allAccesses = parseResult?.rows.flatMap(r => r.accesses) || [];
    const allLicenses = parseResult?.rows.flatMap(r => r.licenses) || [];
    const allLegislations = parseResult?.rows.flatMap(r => r.legislations) || [];
    const allDfe = parseResult?.rows.flatMap(r => r.dfeSeries) || [];

    return createPortal(
        <div className="fixed inset-0 z-[10000] overflow-hidden">
            {/* Backdrop escurecido com desfoque */}
            <div
                className={`fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
                    isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={handleClose}
            />

            {/* Top Drawer: Desce suavemente do topo da tela */}
            <div
                onTransitionEnd={handleTransitionEnd}
                className={`fixed top-0 inset-x-0 flex justify-center pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
                }`}
            >
                <div className="w-full max-w-[1600px] max-h-[92vh] flex flex-col pointer-events-auto bg-white dark:bg-slate-900 border-b border-x border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-b-2xl md:rounded-b-3xl overflow-hidden">
                    {/* Header Fixo no Topo */}
                    <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0">
                        {/* Título e Ícone no padrão dos Drawers */}
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg flex-shrink-0 shadow-sm">
                                <FileSpreadsheet size={18} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex flex-col text-left">
                                <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                                    Importar Clientes via Planilha
                                </h1>
                                <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
                            </div>
                        </div>

                        {/* Abas Superiores (Importação / Instruções) e Botão Fechar */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                                <button
                                    onClick={() => setMainTab('import')}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        mainTab === 'import'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Upload size={14} />
                                    <span>Importação</span>
                                </button>
                                <button
                                    onClick={() => setMainTab('instructions')}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        mainTab === 'instructions'
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <BookOpen size={14} />
                                    <span className="hidden md:inline">Instruções & Regras</span>
                                    <span className="md:hidden">Instruções</span>
                                </button>
                            </div>

                            {/* Botão Fechar com Atalho ESC */}
                            <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800">
                                <button
                                    onClick={handleClose}
                                    disabled={step === 'importing'}
                                    className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group flex items-center gap-1.5"
                                    title="Recolher gaveta (Esc)"
                                >
                                    <span className="hidden md:inline text-[10px] font-mono text-slate-400 group-hover:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                        ESC
                                    </span>
                                    <ChevronUp size={20} className="hidden sm:inline" />
                                    <X size={20} className="sm:hidden" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Corpo Scrollável da Gaveta */}
                    <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">

            {/* ABA INFORMATIVA: INSTRUÇÕES & REGRAS */}
            {mainTab === 'instructions' && (
                <div className="space-y-5 animate-in fade-in duration-200 text-xs">
                    {/* Banner de Introdução */}
                    <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
                            <BookOpen size={16} />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                                Guia Oficial de Importação de Clientes
                            </h4>
                            <p className="text-indigo-700/90 dark:text-indigo-300/80 leading-relaxed">
                                Para garantir que a importação funcione perfeitamente sem falhas ou corrupção de dados, siga as instruções abaixo. A planilha modelo foi estruturada para refletir exatamente os módulos do sistema.
                            </p>
                        </div>
                    </div>

                    {/* Bloco 1: Abas Obrigatórias vs Opcionais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
                            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                                <CheckCircle2 size={16} />
                                <span>Aba Obrigatória</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                • <strong>Clientes</strong>: É a <strong>única aba obrigatória</strong>. Deve conter ao menos a Razão Social e o CNPJ/CPF de cada empresa ou pessoa física.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
                                <Info size={16} className="text-indigo-500" />
                                <span>8 Abas Opcionais</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                • <strong>Regime_Tributario, Contatos, Inscrições, Atividades_CNAE, Acessos_Portais, Licenças_Alvarás, Legislações, Séries_DFe</strong>: São totalmente opcionais. Se você não possuir esses dados agora, deixe as abas vazias ou não as preencha.
                            </p>
                        </div>
                    </div>

                    {/* Bloco 2: Regras Estruturais e Cuidados Impeditivos */}
                    <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-800/40 space-y-3">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-sm">
                            <Ban size={16} />
                            <span>Regras Estruturais & Impeditivos (O que NÃO fazer)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                            <div className="space-y-1">
                                <strong>🚫 Não altere o nome das abas</strong>
                                <p className="text-slate-500 dark:text-slate-400">
                                    O leitor procura exatamente pelos nomes padrão (ex: <code>Clientes</code>, <code>Contatos</code>, etc.).
                                </p>
                            </div>
                            <div className="space-y-1">
                                <strong>🚫 Não renomeie nem exclua colunas</strong>
                                <p className="text-slate-500 dark:text-slate-400">
                                    A linha 1 de cada aba deve conter os cabeçalhos originais (ex: <code>documento</code>, <code>razao_social</code>).
                                </p>
                            </div>
                            <div className="space-y-1">
                                <strong>🚫 Não adicione colunas extras</strong>
                                <p className="text-slate-500 dark:text-slate-400">
                                    Inserir colunas desconhecidas no meio da planilha pode corromper a leitura das informações.
                                </p>
                            </div>
                            <div className="space-y-1">
                                <strong>🚫 Não remova a coluna documento_cliente</strong>
                                <p className="text-slate-500 dark:text-slate-400">
                                    Nas abas secundárias, o <code>documento_cliente</code> é indispensável para vincular o registro ao cliente correto.
                                </p>
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <strong>🚫 Não mescle células no Excel</strong>
                                <p className="text-slate-500 dark:text-slate-400">
                                    Células mescladas desalinham os índices das linhas e resultam em dados vazios durante a leitura.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bloco 3: Formatação e Validações de Campos */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <FileCheck size={16} className="text-emerald-500" />
                            <span>Padrões de Preenchimento Recomendados</span>
                        </div>
                        <ul className="space-y-2 text-slate-600 dark:text-slate-300 list-disc pl-5">
                            <li>
                                <strong>Documento (CNPJ ou CPF)</strong>: Obrigatório. Deve possuir 14 dígitos (CNPJ) ou 11 dígitos (CPF). Pode ser informado com ou sem máscara (pontos, traços e barras).
                            </li>
                            <li>
                                <strong>Duplicidade</strong>: Clientes já cadastrados no escritório com o mesmo CNPJ/CPF serão marcados como <em>Duplicados</em> e ignorados na gravação para evitar perda de histórico fiscal.
                            </li>
                            <li>
                                <strong>Datas</strong>: Devem ser informadas no formato <code>DD/MM/AAAA</code> (ex: <code>15/03/2024</code>) ou como células normais de data do Excel. Aplica-se a <code>data_abertura</code>, <code>data_inicio_escritorio</code> e <code>socio_data_nascimento</code>.
                            </li>
                            <li>
                                <strong>Sócio Administrador</strong>: Opcional. É possível cadastrar <code>socio_nome</code>, <code>socio_cpf</code> e <code>socio_data_nascimento</code> na aba Clientes.
                            </li>
                            <li>
                                <strong>Tipo de Estabelecimento</strong>: Preencha com <code>Matriz</code> ou <code>Filial</code>.
                            </li>
                            <li>
                                <strong>Status</strong>: Preencha com <code>Ativo</code> ou <code>Inativo</code> (caso não informado, assume <em>Ativo</em>).
                            </li>
                            <li>
                                <strong>Regime Tributário & Anexos</strong>: Na aba <code>Regime_Tributario</code>, ao selecionar <em>Simples</em> ou <em>Simples IVA Dual</em>, preencha a coluna <code>ANEXOS</code> com os anexos correspondentes separados por vírgula (ex: <code>Anexo I, Anexo II</code>). Consulte a aba <code>Tabelas_Apoio</code> para ver todos os anexos vigentes.
                            </li>
                        </ul>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            variant="primary"
                            onClick={downloadClientTemplate}
                            icon={<Download size={16} />}
                        >
                            Baixar Planilha Modelo Oficial (.xlsx)
                        </Button>
                    </div>
                </div>
            )}

            {/* ABA PRINCIPAL: IMPORTAÇÃO */}
            {mainTab === 'import' && (
                <>
                    {/* ETAPA 1: UPLOAD E DOWNLOAD DO MODELO */}
                    {step === 'upload' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Banner de Download do Modelo */}
                            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/60 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 shrink-0">
                                        <FileSpreadsheet size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                                            Baixe a Planilha Modelo Oficial
                                        </h4>
                                        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 max-w-xl">
                                            Contém as <strong>9 abas configuradas</strong> com exemplos práticos: Clientes, Regime Tributário, Contatos, Inscrições, CNAEs, Acessos, Licenças, Legislações e Séries DF-e.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={downloadClientTemplate}
                                    icon={<Download size={16} />}
                                    className="shrink-0 w-full sm:w-auto"
                                >
                                    Baixar Modelo (.xlsx)
                                </Button>
                            </div>

                            {/* Dropzone de Upload */}
                            <div
                                onDragOver={e => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                                    isDragging
                                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]'
                                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/40'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    onChange={e => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            handleFileSelected(e.target.files[0]);
                                        }
                                    }}
                                />
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-900/10">
                                    {parseLoading ? (
                                        <RefreshCw size={28} className="animate-spin" />
                                    ) : (
                                        <Upload size={28} />
                                    )}
                                </div>
                                <h5 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                                    {parseLoading ? 'Lendo e validando planilha...' : 'Selecione ou arraste a planilha preenchida'}
                                </h5>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                                    Suporta arquivos no formato <strong>.xlsx</strong> com até 500 clientes por lote.
                                </p>
                            </div>

                            {/* Mensagem de Erro de Leitura ou Validação de Estrutura */}
                            {parseError && (
                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs flex items-start gap-2.5">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <div className="font-bold">Inconsistência identificada:</div>
                                        <div className="leading-relaxed">{parseError}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ETAPA 2: PRÉVIA E VALIDAÇÃO COM SCROLLING */}
                    {step === 'preview' && parseResult && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Cards de Métricas */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Lidos</div>
                                    <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{parseResult.totalRows}</div>
                                    <div className="text-[10px] text-slate-400">no arquivo</div>
                                </div>

                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                        <CheckCircle2 size={12} /> Prontos para Gravar
                                    </div>
                                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{parseResult.validCount}</div>
                                    <div className="text-[10px] text-emerald-600/70">válidos e novos</div>
                                </div>

                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                        <AlertTriangle size={12} /> Duplicados
                                    </div>
                                    <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{parseResult.duplicateCount}</div>
                                    <div className="text-[10px] text-amber-600/70">já cadastrados (ignorados)</div>
                                </div>

                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40">
                                    <div className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
                                        <AlertCircle size={12} /> Inconsistentes
                                    </div>
                                    <div className="text-xl font-black text-red-600 dark:text-red-400 mt-0.5">{parseResult.errorCount}</div>
                                    <div className="text-[10px] text-red-600/70">dados obrigatórios vazios</div>
                                </div>
                            </div>

                            {/* Resumo de Dados Complementares Detectados */}
                            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Vínculos detectados:</span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {parseResult.secondaryStats.taxRegimes} Regimes
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {parseResult.secondaryStats.contacts} Contatos
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {parseResult.secondaryStats.inscriptions} Inscrições
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {parseResult.secondaryStats.activities} CNAEs
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {parseResult.secondaryStats.accesses} Acessos
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {parseResult.secondaryStats.licenses} Licenças
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {parseResult.secondaryStats.legislations} Legislações
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {parseResult.secondaryStats.dfeSeries} Séries DF-e
                                </span>
                            </div>

                            {/* Navegação de Abas de Pré-visualização */}
                            <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
                                <button
                                    onClick={() => setActiveTab('clientes')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'clientes'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Clientes ({parseResult.rows.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('regimes')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'regimes'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Regime Tributário ({allRegimes.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('contatos')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'contatos'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Contatos ({allContacts.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('inscricoes')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'inscricoes'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Inscrições ({allInscriptions.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('cnaes')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'cnaes'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    CNAEs ({allActivities.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('acessos')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'acessos'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Acessos ({allAccesses.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('licencas')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'licencas'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Licenças ({allLicenses.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('legislacoes')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'legislacoes'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Legislações ({allLegislations.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('dfe')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                                        activeTab === 'dfe'
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    Séries DF-e ({allDfe.length})
                                </button>
                            </div>

                            {/* Filtros da Tabela de Clientes */}
                            {activeTab === 'clientes' && (
                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-500">Filtrar:</span>
                                        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                                            <button
                                                onClick={() => setStatusFilter('all')}
                                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                                    statusFilter === 'all'
                                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                Todos ({parseResult.rows.length})
                                            </button>
                                            <button
                                                onClick={() => setStatusFilter('valid')}
                                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                                    statusFilter === 'valid'
                                                        ? 'bg-emerald-600 text-white shadow-sm'
                                                        : 'text-emerald-700 dark:text-emerald-400'
                                                }`}
                                            >
                                                Prontos ({parseResult.validCount})
                                            </button>
                                            <button
                                                onClick={() => setStatusFilter('duplicate')}
                                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                                    statusFilter === 'duplicate'
                                                        ? 'bg-amber-600 text-white shadow-sm'
                                                        : 'text-amber-700 dark:text-amber-400'
                                                }`}
                                            >
                                                Duplicados ({parseResult.duplicateCount})
                                            </button>
                                            <button
                                                onClick={() => setStatusFilter('error')}
                                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                                    statusFilter === 'error'
                                                        ? 'bg-red-600 text-white shadow-sm'
                                                        : 'text-red-700 dark:text-red-400'
                                                }`}
                                            >
                                                Inconsistentes ({parseResult.errorCount})
                                            </button>
                                        </div>
                                    </div>

                                    <span className="text-xs text-slate-400">
                                        Mostrando {filteredClientRows.length} de {parseResult.rows.length}
                                    </span>
                                </div>
                            )}

                            {/* CONTAINER DE TABELA COM SCROLLING VERTICAL E HORIZONTAL + STICKY HEADER */}
                            <div className="max-h-[380px] overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-inner relative custom-scrollbar">
                                {activeTab === 'clientes' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">Status</th>
                                                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">Código</th>
                                                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">CNPJ / CPF</th>
                                                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200 min-w-[220px]">Razão Social</th>
                                                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">Tipo</th>
                                                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">Estabelecimento</th>
                                                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">Cidade/UF</th>
                                                <th className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-200">Vínculos Extras</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredClientRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="py-8 text-center text-slate-400">
                                                        Nenhum cliente encontrado para este filtro.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredClientRows.map(row => (
                                                    <tr
                                                        key={row.tempId}
                                                        className={`transition-colors ${
                                                            row.validationStatus === 'error'
                                                                ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/70'
                                                                : row.validationStatus === 'duplicate'
                                                                ? 'bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/60'
                                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                        }`}
                                                    >
                                                        <td className="py-2 px-3 whitespace-nowrap">
                                                            {row.validationStatus === 'valid' && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                    <CheckCircle2 size={12} /> Pronto
                                                                </span>
                                                            )}
                                                            {row.validationStatus === 'duplicate' && (
                                                                <span
                                                                    title={row.validationMessage}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-help"
                                                                >
                                                                    <AlertTriangle size={12} /> Duplicado (Ignorado)
                                                                </span>
                                                            )}
                                                            {row.validationStatus === 'error' && (
                                                                <span
                                                                    title={row.validationMessage}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 cursor-help"
                                                                >
                                                                    <AlertCircle size={12} /> {row.validationMessage || 'Inconsistente'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 font-mono text-slate-500">{row.code || '-'}</td>
                                                        <td className="py-2 px-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                                            {row.document || '-'}
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <div className="font-semibold text-slate-900 dark:text-slate-100">{row.company_name}</div>
                                                            {row.trade_name && (
                                                                <div className="text-[11px] text-slate-400">{row.trade_name}</div>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 capitalize text-slate-600 dark:text-slate-300">{row.person_type}</td>
                                                        <td className="py-2 px-3 capitalize text-slate-600 dark:text-slate-300">{row.establishment_type}</td>
                                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                                            {row.city ? `${row.city}${row.state ? `/${row.state}` : ''}` : '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                                                            {[
                                                                row.taxRegimes.length > 0 ? `${row.taxRegimes.length} reg` : null,
                                                                row.contacts.length > 0 ? `${row.contacts.length} cont` : null,
                                                                row.inscriptions.length > 0 ? `${row.inscriptions.length} insc` : null,
                                                                row.activities.length > 0 ? `${row.activities.length} cnae` : null,
                                                                row.accesses.length > 0 ? `${row.accesses.length} aces` : null,
                                                                row.licenses.length > 0 ? `${row.licenses.length} lic` : null,
                                                                row.legislations.length > 0 ? `${row.legislations.length} leg` : null,
                                                                row.dfeSeries.length > 0 ? `${row.dfeSeries.length} dfe` : null,
                                                            ].filter(Boolean).join(' • ') || 'Nenhum'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'regimes' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold">Documento Cliente</th>
                                                <th className="py-2.5 px-3 font-semibold">Regime</th>
                                                <th className="py-2.5 px-3 font-semibold">Anexos</th>
                                                <th className="py-2.5 px-3 font-semibold">Data Início</th>
                                                <th className="py-2.5 px-3 font-semibold">Data Fim</th>
                                                <th className="py-2.5 px-3 font-semibold">Observação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allRegimes.length === 0 ? (
                                                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Nenhum registro de regime tributário na planilha.</td></tr>
                                            ) : (
                                                allRegimes.map((r, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-2 px-3 font-mono font-medium">{r.documento_cliente}</td>
                                                        <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{r.regime}</td>
                                                        <td className="py-2 px-3">
                                                            {r.annexes && r.annexes.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {r.annexes.map((anx, aIdx) => (
                                                                        <span
                                                                            key={aIdx}
                                                                            className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/50 text-[10px] font-semibold"
                                                                        >
                                                                            {anx}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3">{r.start_date || '-'}</td>
                                                        <td className="py-2 px-3">{r.end_date || '-'}</td>
                                                        <td className="py-2 px-3 text-slate-500">{r.observation || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'contatos' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold">Documento Cliente</th>
                                                <th className="py-2.5 px-3 font-semibold">Nome</th>
                                                <th className="py-2.5 px-3 font-semibold">E-mail</th>
                                                <th className="py-2.5 px-3 font-semibold">Celular</th>
                                                <th className="py-2.5 px-3 font-semibold">Fixo</th>
                                                <th className="py-2.5 px-3 font-semibold">Principal?</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allContacts.length === 0 ? (
                                                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Nenhum contato secundário na planilha.</td></tr>
                                            ) : (
                                                allContacts.map((c, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-2 px-3 font-mono">{c.documento_cliente}</td>
                                                        <td className="py-2 px-3 font-semibold">{c.name}</td>
                                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{c.email || '-'}</td>
                                                        <td className="py-2 px-3">{c.phone_mobile || '-'}</td>
                                                        <td className="py-2 px-3">{c.phone_fixed || '-'}</td>
                                                        <td className="py-2 px-3">{c.is_main ? 'Sim' : 'Não'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'inscricoes' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold">Documento Cliente</th>
                                                <th className="py-2.5 px-3 font-semibold">Tipo</th>
                                                <th className="py-2.5 px-3 font-semibold">Nome da Inscrição</th>
                                                <th className="py-2.5 px-3 font-semibold">Número</th>
                                                <th className="py-2.5 px-3 font-semibold">Observação</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allInscriptions.length === 0 ? (
                                                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nenhuma inscrição na planilha.</td></tr>
                                            ) : (
                                                allInscriptions.map((insc, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-2 px-3 font-mono">{insc.documento_cliente}</td>
                                                        <td className="py-2 px-3 font-semibold">{insc.type}</td>
                                                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{insc.custom_name || '-'}</td>
                                                        <td className="py-2 px-3 font-mono">{insc.number}</td>
                                                        <td className="py-2 px-3 text-slate-500">{insc.observation || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'cnaes' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold">Documento Cliente</th>
                                                <th className="py-2.5 px-3 font-semibold">Código CNAE</th>
                                                <th className="py-2.5 px-3 font-semibold">Ordem</th>
                                                <th className="py-2.5 px-3 font-semibold">Descrição</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allActivities.length === 0 ? (
                                                <tr><td colSpan={4} className="py-8 text-center text-slate-400">Nenhuma atividade CNAE na planilha.</td></tr>
                                            ) : (
                                                allActivities.map((a, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-2 px-3 font-mono">{a.documento_cliente}</td>
                                                        <td className="py-2 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{a.cnae_code}</td>
                                                        <td className="py-2 px-3">{a.order_type}</td>
                                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{a.cnae_description || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'acessos' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold">Documento Cliente</th>
                                                <th className="py-2.5 px-3 font-semibold">Nome do Portal</th>
                                                <th className="py-2.5 px-3 font-semibold">Usuário</th>
                                                <th className="py-2.5 px-3 font-semibold">Setor</th>
                                                <th className="py-2.5 px-3 font-semibold">Link de Acesso</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allAccesses.length === 0 ? (
                                                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nenhum acesso/portal na planilha.</td></tr>
                                            ) : (
                                                allAccesses.map((acc, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-2 px-3 font-mono">{acc.documento_cliente}</td>
                                                        <td className="py-2 px-3 font-semibold">{acc.access_name}</td>
                                                        <td className="py-2 px-3 font-mono">{acc.username || '-'}</td>
                                                        <td className="py-2 px-3">{acc.sector || '-'}</td>
                                                        <td className="py-2 px-3 text-indigo-500 truncate max-w-[200px]">{acc.access_url || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'licencas' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold">Documento Cliente</th>
                                                <th className="py-2.5 px-3 font-semibold">Nome da Licença</th>
                                                <th className="py-2.5 px-3 font-semibold">Número</th>
                                                <th className="py-2.5 px-3 font-semibold">Vencimento</th>
                                                <th className="py-2.5 px-3 font-semibold">Link</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allLicenses.length === 0 ? (
                                                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nenhuma licença/alvará na planilha.</td></tr>
                                            ) : (
                                                allLicenses.map((lic, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-2 px-3 font-mono">{lic.documento_cliente}</td>
                                                        <td className="py-2 px-3 font-semibold">{lic.license_name}</td>
                                                        <td className="py-2 px-3">{lic.license_number || '-'}</td>
                                                        <td className="py-2 px-3">{lic.expiry_date || '-'}</td>
                                                        <td className="py-2 px-3 text-indigo-500 truncate max-w-[200px]">{lic.access_url || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'legislacoes' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold">Documento Cliente</th>
                                                <th className="py-2.5 px-3 font-semibold">Descrição da Norma</th>
                                                <th className="py-2.5 px-3 font-semibold">Status</th>
                                                <th className="py-2.5 px-3 font-semibold">Link</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allLegislations.length === 0 ? (
                                                <tr><td colSpan={4} className="py-8 text-center text-slate-400">Nenhuma legislação na planilha.</td></tr>
                                            ) : (
                                                allLegislations.map((leg, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-2 px-3 font-mono">{leg.documento_cliente}</td>
                                                        <td className="py-2 px-3 font-semibold">{leg.description}</td>
                                                        <td className="py-2 px-3">{leg.status || 'Vigente'}</td>
                                                        <td className="py-2 px-3 text-indigo-500 truncate max-w-[200px]">{leg.access_url || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'dfe' && (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-semibold">Documento Cliente</th>
                                                <th className="py-2.5 px-3 font-semibold">Tipo DF-e</th>
                                                <th className="py-2.5 px-3 font-semibold">Série</th>
                                                <th className="py-2.5 px-3 font-semibold">Emissor</th>
                                                <th className="py-2.5 px-3 font-semibold">Login / URL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {allDfe.length === 0 ? (
                                                <tr><td colSpan={5} className="py-8 text-center text-slate-400">Nenhuma série DF-e na planilha.</td></tr>
                                            ) : (
                                                allDfe.map((d, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="py-2 px-3 font-mono">{d.documento_cliente}</td>
                                                        <td className="py-2 px-3 font-bold text-indigo-600 dark:text-indigo-400">{d.dfe_type}</td>
                                                        <td className="py-2 px-3 font-mono">{d.series}</td>
                                                        <td className="py-2 px-3">{d.issuer || '-'}</td>
                                                        <td className="py-2 px-3 text-slate-500">{d.login_url || d.username || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ETAPA 3: PROCESSAMENTO EM LOTE */}
                    {step === 'importing' && (
                        <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-200">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-bounce">
                                <FileSpreadsheet size={32} />
                            </div>

                            <div className="w-full max-w-md space-y-2">
                                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <span>Processando clientes...</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {progressMessage}
                                </p>
                            </div>

                            <p className="text-[11px] text-slate-400 max-w-sm">
                                Por favor, não feche esta janela enquanto a importação estiver em andamento.
                            </p>
                        </div>
                    )}

                    {/* ETAPA 4: RELATÓRIO FINAL DE CONCLUSÃO */}
                    {step === 'finished' && importSummary && (
                        <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center ring-8 ring-emerald-50 dark:ring-emerald-900/20">
                                    <CheckCircle2 size={36} />
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                                    Importação Concluída com Sucesso!
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Os novos registros foram inseridos com isolamento total no banco de dados.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-center">
                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                        {importSummary.importedClientsCount}
                                    </div>
                                    <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                                        Clientes Cadastrados
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                                    <div className="text-2xl font-black text-slate-800 dark:text-slate-200">
                                        {Object.values(importSummary.secondaryCounts).reduce((a, b) => a + b, 0)}
                                    </div>
                                    <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                                        Vínculos Relacionais Criados
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center col-span-2 sm:col-span-1">
                                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                        {parseResult?.duplicateCount || 0}
                                    </div>
                                    <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-0.5">
                                        Duplicados Ignorados
                                    </div>
                                </div>
                            </div>

                            {/* Detalhamento dos vínculos criados */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <h6 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                    Resumo por Entidade Gravada
                                </h6>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 dark:text-slate-400">
                                    <div>• <strong>{importSummary.secondaryCounts.taxRegimes || 0}</strong> Regimes Tributários</div>
                                    <div>• <strong>{importSummary.secondaryCounts.contacts || 0}</strong> Contatos</div>
                                    <div>• <strong>{importSummary.secondaryCounts.inscriptions || 0}</strong> Inscrições</div>
                                    <div>• <strong>{importSummary.secondaryCounts.activities || 0}</strong> Atividades CNAE</div>
                                    <div>• <strong>{importSummary.secondaryCounts.accesses || 0}</strong> Acessos e Portais</div>
                                    <div>• <strong>{importSummary.secondaryCounts.licenses || 0}</strong> Licenças e Alvarás</div>
                                    <div>• <strong>{importSummary.secondaryCounts.legislations || 0}</strong> Legislações</div>
                                    <div>• <strong>{importSummary.secondaryCounts.dfeSeries || 0}</strong> Séries DF-e</div>
                                </div>
                            </div>

                            {/* Erros pontuais se houver */}
                            {importSummary.errors.length > 0 && (
                                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 space-y-1 text-xs text-red-700 dark:text-red-300">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <AlertCircle size={14} /> Houve inconsistências em alguns registros:
                                    </div>
                                    <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                                        {importSummary.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
                    </div>

                    {/* Rodapé Fixo */}
                    <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between shrink-0 gap-3">
                        {mainTab === 'import' && step === 'upload' && (
                            <>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={downloadClientTemplate}
                                    icon={<Download size={15} />}
                                >
                                    Baixar Modelo (.xlsx)
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClose}
                                >
                                    Cancelar
                                </Button>
                            </>
                        )}

                        {mainTab === 'import' && step === 'preview' && (
                            <>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleReset}
                                    icon={<RefreshCw size={15} />}
                                >
                                    Trocar Planilha
                                </Button>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClose}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleStartImport}
                                        disabled={!parseResult || parseResult.validCount === 0}
                                        icon={<ArrowRight size={15} />}
                                    >
                                        Importar {parseResult?.validCount || 0} {parseResult?.validCount === 1 ? 'Cliente Válido' : 'Clientes Válidos'}
                                    </Button>
                                </div>
                            </>
                        )}

                        {mainTab === 'import' && step === 'importing' && (
                            <div className="flex items-center justify-center w-full py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <RefreshCw size={14} className="animate-spin mr-2 text-indigo-600 dark:text-indigo-400" />
                                Gravando clientes no banco de dados com isolamento multi-tenant... Não feche a janela.
                            </div>
                        )}

                        {mainTab === 'import' && step === 'finished' && (
                            <div className="flex justify-end w-full">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleClose}
                                    icon={<CheckCircle2 size={16} />}
                                >
                                    Concluir e Ver Clientes
                                </Button>
                            </div>
                        )}

                        {mainTab === 'instructions' && (
                            <>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={downloadClientTemplate}
                                    icon={<Download size={15} />}
                                >
                                    Baixar Planilha Modelo (.xlsx)
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setMainTab('import')}
                                    icon={<Upload size={15} />}
                                >
                                    Ir para Importação
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Alça inferior decorativa para recolher */}
                    <div
                        onClick={step !== 'importing' ? handleClose : undefined}
                        className="w-full flex justify-center py-1 bg-slate-100 dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800/60 cursor-pointer group hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                        title={step !== 'importing' ? "Clique para recolher a gaveta" : undefined}
                    >
                        <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
