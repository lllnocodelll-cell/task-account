import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Building2,
  Check,
  CheckCheck,
  RotateCcw,
  AlertCircle,
  Lock
} from 'lucide-react';
import { Client, TAX_REGIME_LABELS } from '../../types';

interface BatchClientSelectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  selectedCompanyNames: string[];
  onConfirm: (selectedCompanyNames: string[]) => void;
  maxLimit?: number;
}

// Formatação amigável de CNPJ/CPF
const formatDocument = (doc?: string): string => {
  if (!doc) return '';
  const clean = doc.replace(/[.\-/]/g, '').trim();
  if (clean.length === 14) {
    return clean.replace(/^(\w{2})(\w{3})(\w{3})(\w{4})(\w{2})$/, '$1.$2.$3/$4-$5');
  }
  if (clean.length === 11) {
    return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return doc;
};

// Normaliza o regime tributário em grupos consistentes
export const getNormalizedRegimeCategory = (regimeKey?: string): { id: string; label: string } => {
  if (!regimeKey) return { id: 'nao_informado', label: 'Não informado' };
  const key = regimeKey.toLowerCase().trim();

  if (key.includes('simples')) {
    return { id: 'simples', label: 'Simples Nacional' };
  }
  if (key.includes('presumido') || key === 'lp') {
    return { id: 'presumido', label: 'Lucro Presumido' };
  }
  if (key.includes('real') || key === 'lr') {
    return { id: 'real', label: 'Lucro Real' };
  }
  if (key.includes('arbitrado')) {
    return { id: 'arbitrado', label: 'Lucro Arbitrado' };
  }
  if (key.includes('mei') || key.includes('microempreendedor')) {
    return { id: 'mei', label: 'MEI' };
  }
  if (key.includes('nanoempreendedor')) {
    return { id: 'nano', label: 'Nanoempreendedor' };
  }
  if (key.includes('irpf')) {
    return { id: 'irpf', label: 'IRPF' };
  }

  return { id: key, label: TAX_REGIME_LABELS[regimeKey] || regimeKey };
};

// Determina cor e label do regime tributário para badges
const getRegimeBadge = (regimeKey?: string) => {
  if (!regimeKey) return { label: 'Não informado', color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700' };
  
  const key = regimeKey.toLowerCase();
  const label = TAX_REGIME_LABELS[regimeKey] || regimeKey;

  if (key.includes('simples')) {
    return { label, color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' };
  }
  if (key.includes('presumido') || key === 'lp') {
    return { label, color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' };
  }
  if (key.includes('real') || key === 'lr') {
    return { label, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/20' };
  }
  if (key.includes('mei') || key.includes('microempreendedor')) {
    return { label, color: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' };
  }

  return { label, color: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20' };
};

export const BatchClientSelectionDrawer: React.FC<BatchClientSelectionDrawerProps> = ({
  isOpen,
  onClose,
  clients,
  selectedCompanyNames,
  onConfirm,
  maxLimit = 100
}) => {
  // Controle de montagem e animação fluida do drawer
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // Seleções temporárias do drawer
  const [tempSelected, setTempSelected] = useState<string[]>(selectedCompanyNames);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegimeFilter, setSelectedRegimeFilter] = useState<string>('all');
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Sincroniza sempre que o Drawer é aberto
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTempSelected(selectedCompanyNames);
      setSearchTerm('');
      setSelectedRegimeFilter('all');
      setWarningMessage(null);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, selectedCompanyNames]);

  const handleTransitionEnd = () => {
    if (!isVisible) {
      setShouldRender(false);
    }
  };

  // Fecha com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Apenas clientes ativos
  const activeClients = useMemo(() => {
    return clients.filter(c => c.status === 'Ativo');
  }, [clients]);

  // Regime travado pela primeira empresa selecionada no lote
  const lockedRegime = useMemo(() => {
    if (tempSelected.length === 0) return null;
    const firstClient = activeClients.find(c => c.companyName === tempSelected[0]);
    if (!firstClient) return null;
    return getNormalizedRegimeCategory(firstClient.tax_regime);
  }, [tempSelected, activeClients]);

  // Verifica se uma empresa é compatível com o regime atualmente travado
  const isClientCompatible = (client: Client): boolean => {
    if (!lockedRegime) return true;
    const clientRegime = getNormalizedRegimeCategory(client.tax_regime);
    return clientRegime.id === lockedRegime.id;
  };

  // Contagem por categoria de regime tributário para as abas de filtro rápido
  const regimeCounts = useMemo(() => {
    const counts = {
      all: activeClients.length,
      simples: 0,
      presumido: 0,
      real: 0,
      mei: 0,
      outros: 0
    };

    activeClients.forEach(c => {
      const reg = (c.tax_regime || '').toLowerCase();
      if (reg.includes('simples')) counts.simples++;
      else if (reg.includes('presumido') || reg === 'lp') counts.presumido++;
      else if (reg.includes('real') || reg === 'lr') counts.real++;
      else if (reg.includes('mei') || reg.includes('microempreendedor')) counts.mei++;
      else counts.outros++;
    });

    return counts;
  }, [activeClients]);

  // Filtragem de clientes por busca e regime
  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const cleanDocTerm = term.replace(/[.\-/]/g, '');

    return activeClients.filter(c => {
      // Filtro de Regime
      if (selectedRegimeFilter !== 'all') {
        const reg = (c.tax_regime || '').toLowerCase();
        if (selectedRegimeFilter === 'simples' && !reg.includes('simples')) return false;
        if (selectedRegimeFilter === 'presumido' && !reg.includes('presumido') && reg !== 'lp') return false;
        if (selectedRegimeFilter === 'real' && !reg.includes('real') && reg !== 'lr') return false;
        if (selectedRegimeFilter === 'mei' && !reg.includes('mei') && !reg.includes('microempreendedor')) return false;
        if (selectedRegimeFilter === 'outros') {
          if (reg.includes('simples') || reg.includes('presumido') || reg === 'lp' || reg.includes('real') || reg === 'lr' || reg.includes('mei') || reg.includes('microempreendedor')) {
            return false;
          }
        }
      }

      // Filtro de Busca
      if (!term) return true;

      const matchName = c.companyName?.toLowerCase().includes(term);
      const matchTrade = c.tradeName ? c.tradeName.toLowerCase().includes(term) : false;
      const matchDoc = c.document ? c.document.toLowerCase().includes(term) : false;
      const matchCleanDoc = (cleanDocTerm.length > 2 && c.document) 
        ? c.document.replace(/[.\-/]/g, '').toLowerCase().includes(cleanDocTerm) 
        : false;

      return matchName || matchTrade || matchDoc || matchCleanDoc;
    });
  }, [activeClients, searchTerm, selectedRegimeFilter]);

  // Alterna seleção individual com validação estrita de regime tributário
  const toggleClient = (client: Client) => {
    setWarningMessage(null);
    const companyName = client.companyName;

    if (tempSelected.includes(companyName)) {
      setTempSelected(prev => prev.filter(name => name !== companyName));
      return;
    }

    // Regra: Bloquear seleção de regimes tributários divergentes
    if (lockedRegime && !isClientCompatible(client)) {
      const clientRegime = getNormalizedRegimeCategory(client.tax_regime);
      setWarningMessage(
        `Não é permitido misturar regimes diferentes no mesmo lote. O lote está restrito a "${lockedRegime.label}" (a empresa "${client.companyName}" pertence a "${clientRegime.label}").`
      );
      return;
    }

    if (tempSelected.length >= maxLimit) {
      setWarningMessage(`Limite máximo de ${maxLimit} empresas atingido.`);
      return;
    }

    setTempSelected(prev => [...prev, companyName]);
  };

  // Selecionar todas as empresas filtradas respeitando a regra de regime único
  const selectAllFiltered = () => {
    setWarningMessage(null);

    // Determina o regime alvo: o já travado ou o primeiro cliente compatível filtrado
    let targetRegimeId: string | null = lockedRegime?.id || null;
    let targetRegimeLabel: string = lockedRegime?.label || '';

    if (!targetRegimeId) {
      const firstAvailable = filteredClients.find(c => !tempSelected.includes(c.companyName));
      if (firstAvailable) {
        const norm = getNormalizedRegimeCategory(firstAvailable.tax_regime);
        targetRegimeId = norm.id;
        targetRegimeLabel = norm.label;
      }
    }

    if (!targetRegimeId) return;

    // Filtra apenas empresas do regime alvo que ainda não foram marcadas
    const compatibleCandidates = filteredClients.filter(c => {
      const cRegime = getNormalizedRegimeCategory(c.tax_regime);
      return cRegime.id === targetRegimeId && !tempSelected.includes(c.companyName);
    });

    if (compatibleCandidates.length === 0) {
      setWarningMessage(`Nenhuma empresa compatível com o regime "${targetRegimeLabel}" encontrada nesta filtragem.`);
      return;
    }

    const availableSlots = maxLimit - tempSelected.length;
    if (availableSlots <= 0) {
      setWarningMessage(`Limite máximo de ${maxLimit} empresas já foi atingido.`);
      return;
    }

    const actuallyAdded = compatibleCandidates.slice(0, availableSlots).map(c => c.companyName);
    const unselectedFromOtherRegimes = filteredClients.filter(c => !tempSelected.includes(c.companyName)).length - actuallyAdded.length;

    if (unselectedFromOtherRegimes > 0) {
      setWarningMessage(
        `Foram marcadas ${actuallyAdded.length} empresa(s) do regime "${targetRegimeLabel}". Outras empresas de regimes divergentes foram ignoradas para manter a exclusividade do lote.`
      );
    } else if (compatibleCandidates.length > availableSlots) {
      setWarningMessage(`Foram adicionadas ${availableSlots} empresas para respeitar o limite máximo de ${maxLimit}.`);
    }

    setTempSelected(prev => [...prev, ...actuallyAdded]);
  };

  // Desmarcar todas as empresas filtradas
  const unselectAllFiltered = () => {
    setWarningMessage(null);
    const filteredNames = new Set(filteredClients.map(c => c.companyName));
    setTempSelected(prev => prev.filter(name => !filteredNames.has(name)));
  };

  // Limpar todas as seleções (libera a trava do regime)
  const clearAll = () => {
    setWarningMessage(null);
    setTempSelected([]);
  };

  // Confirmação
  const handleConfirm = () => {
    onConfirm(tempSelected);
    onClose();
  };

  if (!shouldRender && !isOpen) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <>
      {/* Backdrop com transição suave */}
      <div
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer Container Lateral Direito */}
      <div
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[540px] md:w-[620px] bg-white dark:bg-slate-900 shadow-2xl z-[9999] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] border-l border-slate-200/80 dark:border-slate-800 ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho Padronizado no estilo do sistema */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
              <Building2 size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                  Selecionar Empresas
                </h1>
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full border shadow-sm transition-colors ${
                  tempSelected.length >= maxLimit
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-400/30'
                    : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-400/20'
                }`}>
                  {tempSelected.length}/{maxLimit}
                </span>
              </div>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Área Superior de Filtros e Busca */}
        <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 space-y-3 flex-shrink-0">
          {/* Campo de Busca */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por razão social, nome fantasia ou CPF/CNPJ..."
              className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Abas Rápidas por Regime Tributário */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'all', label: 'Todas', count: regimeCounts.all },
              { id: 'simples', label: 'Simples', count: regimeCounts.simples },
              { id: 'presumido', label: 'Presumido', count: regimeCounts.presumido },
              { id: 'real', label: 'Real', count: regimeCounts.real },
              { id: 'mei', label: 'MEI', count: regimeCounts.mei },
              { id: 'outros', label: 'Outros', count: regimeCounts.outros },
            ].map(tab => {
              const isSelected = selectedRegimeFilter === tab.id;
              const isTabLockedOut = lockedRegime && tab.id !== 'all' && tab.id !== lockedRegime.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedRegimeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 flex items-center gap-1.5 text-xs ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isTabLockedOut
                        ? 'bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40 text-slate-400 dark:text-slate-500 hover:border-slate-300'
                        : 'bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {isTabLockedOut && <Lock size={10} className="text-slate-400 shrink-0" />}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Banner Informativo de Regime Restrito */}
        {lockedRegime && (
          <div className="mx-4 sm:mx-5 mt-3 p-2.5 sm:p-3 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-xs animate-fadeIn flex-shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200 min-w-0">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs shrink-0">
                <Lock size={13} />
              </div>
              <div className="truncate text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Lote exclusivo para:
                  </span>
                  <span className="font-black text-xs text-indigo-700 dark:text-indigo-300 uppercase tracking-tight">
                    {lockedRegime.label}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Empresas de outros regimes estão bloqueadas neste lote.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={clearAll}
              className="px-2.5 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors shrink-0 shadow-2xs"
            >
              Trocar regime
            </button>
          </div>
        )}

        {/* Barra de Ações em Massa */}
        <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              disabled={filteredClients.length === 0 || tempSelected.length >= maxLimit}
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
            >
              <CheckCheck size={14} />
              <span>Marcar compatíveis ({
                lockedRegime
                  ? filteredClients.filter(c => isClientCompatible(c)).length
                  : filteredClients.length
              })</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={unselectAllFiltered}
              disabled={filteredClients.length === 0}
              className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer"
            >
              <span>Desmarcar filtradas</span>
            </button>
          </div>

          {tempSelected.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-rose-500 font-bold hover:underline cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Limpar tudo</span>
            </button>
          )}
        </div>

        {/* Alerta de aviso ou feedback */}
        {warningMessage && (
          <div className="mx-4 sm:mx-5 mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 animate-fadeIn">
            <AlertCircle size={15} className="shrink-0 text-amber-500 mt-0.5" />
            <span className="flex-1 leading-snug">{warningMessage}</span>
            <button
              type="button"
              onClick={() => setWarningMessage(null)}
              className="text-amber-500 hover:text-amber-700 p-0.5 ml-1"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Lista de Empresas com Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {filteredClients.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Building2 size={36} className="text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                Nenhuma empresa encontrada
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {searchTerm
                  ? `Não encontramos resultados para "${searchTerm}". Tente outros termos.`
                  : 'Nenhuma empresa ativa disponível neste filtro.'}
              </p>
            </div>
          ) : (
            filteredClients.map(client => {
              const isSelected = tempSelected.includes(client.companyName);
              const regimeBadge = getRegimeBadge(client.tax_regime);
              const formattedDoc = formatDocument(client.document);
              const isCompatible = isClientCompatible(client);
              const isDisabled = !isSelected && !isCompatible;

              return (
                <div
                  key={client.id || client.companyName}
                  onClick={() => toggleClient(client)}
                  className={`group relative flex items-start gap-3 p-3 sm:p-3.5 rounded-xl border transition-all select-none ${
                    isDisabled
                      ? 'opacity-40 bg-slate-50/60 dark:bg-slate-800/30 border-dashed border-slate-200 dark:border-slate-800 cursor-not-allowed'
                      : isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-500/70 dark:border-indigo-500/50 shadow-xs cursor-pointer'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  {/* Checkbox customizado com ícone de cadeado se bloqueado */}
                  <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                    isDisabled
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400'
                      : isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 group-hover:border-indigo-400'
                  }`}>
                    {isDisabled ? (
                      <Lock size={10} className="text-slate-400" />
                    ) : isSelected ? (
                      <Check size={13} strokeWidth={3} />
                    ) : null}
                  </div>

                  {/* Detalhes da Empresa */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                        isDisabled
                          ? 'text-slate-400 dark:text-slate-500'
                          : isSelected
                            ? 'text-indigo-950 dark:text-indigo-200'
                            : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {client.companyName}
                      </span>
                      {isDisabled && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 shrink-0">
                          Regime divergente
                        </span>
                      )}
                    </div>

                    {client.tradeName && client.tradeName !== client.companyName && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {client.tradeName}
                      </div>
                    )}

                    {/* Tags e Dados Complementares */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {formattedDoc && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 rounded border border-slate-200/60 dark:border-slate-700">
                          {formattedDoc}
                        </span>
                      )}

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${regimeBadge.color}`}>
                        {regimeBadge.label}
                      </span>

                      {client.segment && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 rounded">
                          {client.segment}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé Fixo */}
        <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {tempSelected.length} de {activeClients.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {lockedRegime ? `selecionadas (${lockedRegime.label})` : 'empresas selecionadas'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>Confirmar Seleção ({tempSelected.length})</span>
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
