import React, { useEffect, useState } from 'react';
import { X, Link2, Globe, Landmark, Calculator, FileText, BookOpen, Briefcase, ChevronDown, ChevronUp, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { useToast } from '../contexts/ToastContext';

interface UsefulLinksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsefulLinksDrawer: React.FC<UsefulLinksDrawerProps> = ({ isOpen, onClose }) => {
  const [links, setLinks] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
  const { addToast } = useToast();

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [iconName, setIconName] = useState('');

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSectorId, setEditSectorId] = useState('');
  const [editIconName, setEditIconName] = useState('');

  // Gerenciamento de estado de montagem para animação de saída
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (!isOpen && e.propertyName === 'transform') {
      setShouldRender(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linksRes, sectorsRes] = await Promise.all([
        supabase.from('useful_links').select('*').order('created_at', { ascending: false }),
        supabase.from('sectors').select('id, name').order('name')
      ]);

      if (linksRes.error) throw linksRes.error;
      if (sectorsRes.error) throw sectorsRes.error;

      setLinks(linksRes.data || []);
      setSectors(sectorsRes.data || []);
      
      // Auto expand all sectors by default if not already set
      setExpandedSectors(prev => {
        const next = { ...prev };
        if (Object.keys(next).length === 0) {
          next['general'] = true;
          (sectorsRes.data || []).forEach(s => {
            next[s.id] = true;
          });
        }
        return next;
      });

    } catch (error) {
      console.error('Erro ao carregar links úteis:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSector = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedSectors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;
    
    let formattedUrl = url;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('useful_links').insert([{
        title,
        url: formattedUrl,
        description,
        sector_id: sectorId || null,
        icon_name: iconName || null
      }]);

      if (error) throw error;

      addToast('success', 'Link criado com sucesso');
      setAdding(false);
      setTitle('');
      setUrl('');
      setDescription('');
      setSectorId('');
      setIconName('');
      loadData();
    } catch (error: any) {
      addToast('error', 'Erro ao criar link');
      console.error(error);
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle || !editUrl) return;
    
    let formattedUrl = editUrl;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('useful_links')
        .update({
          title: editTitle,
          url: formattedUrl,
          description: editDescription,
          sector_id: editSectorId || null,
          icon_name: editIconName || null
        })
        .eq('id', id);

      if (error) throw error;

      addToast('success', 'Link atualizado com sucesso');
      setEditingLinkId(null);
      loadData();
    } catch (error: any) {
      addToast('error', 'Erro ao atualizar link');
      console.error(error);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este link?')) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('useful_links').delete().eq('id', id);
      if (error) throw error;
      addToast('success', 'Link excluído com sucesso');
      loadData();
    } catch (error: any) {
      addToast('error', 'Erro ao excluir link');
      console.error(error);
      setLoading(false);
    }
  };

  const startEditing = (link: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingLinkId(link.id);
    setEditTitle(link.title);
    setEditUrl(link.url);
    setEditDescription(link.description || '');
    setEditSectorId(link.sector_id || '');
    setEditIconName(link.icon_name || '');
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Globe': return <Globe size={18} className="text-blue-500" />;
      case 'Landmark': return <Landmark size={18} className="text-amber-600" />;
      case 'Calculator': return <Calculator size={18} className="text-green-600" />;
      case 'FileText': return <FileText size={18} className="text-slate-500" />;
      case 'BookOpen': return <BookOpen size={18} className="text-indigo-500" />;
      case 'Briefcase': return <Briefcase size={18} className="text-amber-800" />;
      default: return <Link2 size={18} className="text-indigo-400" />;
    }
  };

  // Group links by sector
  const generalLinks = links.filter(l => !l.sector_id);
  const linksBySector = sectors.map(sector => ({
    ...sector,
    links: links.filter(l => l.sector_id === sector.id)
  })).filter(s => s.links.length > 0);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop com transição de opacidade real */}
      <div 
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div 
        onTransitionEnd={handleTransitionEnd}
        className={`fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[101] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        
        {/* Header com Design Premium */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
              <Link2 size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Links Úteis
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="group relative flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-full transition-all duration-300 shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                Novo
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Add Link - Modernizado */}
        {adding && (
          <div className="p-6 border-b border-indigo-100/50 dark:border-indigo-900/20 bg-indigo-50/30 dark:bg-indigo-500/5 animate-in slide-in-from-top duration-300">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Plus size={16} className="text-indigo-500" />
              Configurar Novo Link
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-4">
                <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Receita Federal" />
                <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://..." />
                
                <div className="grid grid-cols-2 gap-3">
                  <Select 
                    label="Setor"
                    value={sectorId} 
                    onChange={(e) => setSectorId(e.target.value)}
                    options={[
                      { value: '', label: 'Geral' },
                      ...sectors.map(s => ({ value: s.id, label: s.name }))
                    ]}
                  />
                  <Select 
                    label="Ícone"
                    value={iconName} 
                    onChange={(e) => setIconName(e.target.value)}
                    options={[
                      { value: '', label: 'Padrão' },
                      { value: 'Globe', label: '🌍 Globo' },
                      { value: 'Landmark', label: '🏛️ Governo' },
                      { value: 'Calculator', label: '🧮 Calculadora' },
                      { value: 'FileText', label: '📄 Documento' },
                      { value: 'BookOpen', label: '📖 Legislação' },
                      { value: 'Briefcase', label: '💼 Maleta' }
                    ]}
                  />
                </div>
                <Input label="Descrição Curta" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  className="flex-1 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  onClick={() => setAdding(false)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-all active:scale-[0.98]"
                >
                  Salvar Link
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Links - Design de Cards Staggered */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500 animate-pulse">Carregando seus links...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-20 px-8 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                <Link2 className="text-slate-300 dark:text-slate-600" size={32} />
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-bold">Sua biblioteca está vazia</p>
              <p className="text-xs text-slate-500 mt-2 max-w-[200px] mx-auto">Adicione links importantes para acesso rápido da sua equipe.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-10">
              {/* Seção Geral */}
              {generalLinks.length > 0 && (
                <div className="space-y-3">
                  <button 
                    onClick={() => toggleSector('general')}
                    className="w-full flex items-center gap-4 group"
                  >
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400 whitespace-nowrap">Links Gerais</h3>
                    <div className="h-px w-full bg-gradient-to-r from-indigo-500/20 to-transparent" />
                    <div className={`transition-transform duration-300 text-indigo-400 ${expandedSectors['general'] ? 'rotate-180' : ''}`}>
                      <ChevronDown size={14} />
                    </div>
                  </button>
                  
                  <div className={`grid gap-3 transition-all duration-500 ease-in-out ${expandedSectors['general'] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                    <div className="overflow-hidden space-y-3">
                      {generalLinks.map((link, idx) => (
                        <div 
                          key={link.id} 
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={`transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
                        >
                          {renderLinkCard(link)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Seções por Setor */}
              {linksBySector.map((sector, sectorIdx) => (
                <div key={sector.id} className="space-y-3 pt-2">
                  <button 
                    onClick={() => toggleSector(sector.id)}
                    className="w-full flex items-center gap-4 group"
                  >
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">{sector.name}</h3>
                    <div className="h-px w-full bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent" />
                    <div className={`transition-transform duration-300 text-slate-400 ${expandedSectors[sector.id] ? 'rotate-180' : ''}`}>
                      <ChevronDown size={14} />
                    </div>
                  </button>
                  
                  <div className={`grid gap-3 transition-all duration-500 ease-in-out ${expandedSectors[sector.id] ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                    <div className="overflow-hidden space-y-3">
                      {sector.links.map((link, idx) => (
                        <div 
                          key={link.id}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={`transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
                        >
                          {renderLinkCard(link)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  function renderLinkCard(link: any) {
    const isEditing = editingLinkId === link.id;

    if (isEditing) {
      return (
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/10 space-y-4 animate-in zoom-in-95 duration-200">
          <Input label="Título" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
          <Input label="URL" value={editUrl} onChange={e => setEditUrl(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select 
              label="Setor"
              value={editSectorId} 
              onChange={e => setEditSectorId(e.target.value)}
              options={[{ value: '', label: 'Geral' }, ...sectors.map(s => ({ value: s.id, label: s.name }))]}
            />
            <Select 
              label="Ícone"
              value={editIconName} 
              onChange={e => setEditIconName(e.target.value)}
              options={[
                { value: '', label: 'Padrão' },
                { value: 'Globe', label: '🌍 Globo' },
                { value: 'Landmark', label: '🏛️ Governo' },
                { value: 'Calculator', label: '🧮 Calculadora' },
                { value: 'FileText', label: '📄 Documento' },
                { value: 'BookOpen', label: '📖 Legislação' },
                { value: 'Briefcase', label: '💼 Maleta' }
              ]}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" onClick={() => setEditingLinkId(null)}>Cancelar</button>
            <button className="flex-1 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md" onClick={() => handleUpdate(link.id)}>Salvar</button>
          </div>
        </div>
      );
    }

    return (
      <a 
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-4 p-3 bg-white/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 relative overflow-hidden"
      >
        {/* Glow de hover lateral */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
        
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300 ring-1 ring-slate-200 dark:ring-slate-700">
          {renderIcon(link.icon_name)}
        </div>
        
        <div className="flex-1 min-w-0 pr-10">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
            {link.title}
          </h4>
          {link.description && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">{link.description}</p>
          )}
        </div>

        {/* Action Buttons - Aparecem no Hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 absolute right-3 translate-x-2 group-hover:translate-x-0">
          <button 
            onClick={(e) => startEditing(link, e)}
            className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={(e) => handleDelete(link.id, e)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </a>
    );
  }
};
