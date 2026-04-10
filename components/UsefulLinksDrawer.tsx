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
      
      // Auto expand all sectors by default
      const initialExpanded: Record<string, boolean> = { 'general': true };
      (sectorsRes.data || []).forEach(s => {
        initialExpanded[s.id] = true;
      });
      setExpandedSectors(initialExpanded);

    } catch (error) {
      console.error('Erro ao carregar links úteis:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSector = (id: string) => {
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

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white dark:bg-slate-900 shadow-2xl z-[101] flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Link2 className="text-indigo-500" size={20} />
            Links Úteis
          </h2>
          <div className="flex items-center gap-2">
            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="p-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-md transition-colors flex items-center gap-1 border border-indigo-100 dark:border-indigo-500/20"
              >
                <Plus size={14} /> Novo Link
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form Add */}
        {adding && (
          <div className="p-4 border-b border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-slate-800/40">
            <h3 className="font-bold text-sm mb-3">Cadastrar Novo Link</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: Receita Federal" />
              <Input label="URL *" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://..." />
              
              <div className="grid grid-cols-2 gap-2">
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
              <Input label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve uso" />
              
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1">Salvar</Button>
              </div>
            </form>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Link2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum link útil cadastrado.</p>
              <p className="text-xs text-slate-400 mt-1">Gestores podem adicionar novos links pelas Configurações.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-12">
              {/* General Links */}
              {generalLinks.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <button 
                    onClick={() => toggleSector('general')}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Geral</span>
                    {expandedSectors['general'] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {expandedSectors['general'] && (
                    <div className="p-2 grid gap-2">
                      {generalLinks.map(link => (
                        <div key={link.id} className="border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 rounded-lg transition-all overflow-hidden bg-white dark:bg-transparent">
                          {editingLinkId === link.id ? (
                            <div className="p-3 bg-indigo-50/50 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/50 rounded-lg shadow-sm space-y-3">
                              <Input label="Título" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                              <Input label="URL" value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                              <div className="grid grid-cols-2 gap-2">
                                <Select 
                                  label="Setor"
                                  value={editSectorId} 
                                  onChange={e => setEditSectorId(e.target.value)}
                                  options={[
                                    { value: '', label: 'Geral' },
                                    ...sectors.map(s => ({ value: s.id, label: s.name }))
                                  ]}
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
                              <Input label="Descrição" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                              <div className="flex gap-2">
                                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditingLinkId(null)}>Cancelar</Button>
                                <Button size="sm" className="flex-1" onClick={() => handleUpdate(link.id)}>Salvar</Button>
                              </div>
                            </div>
                          ) : (
                            <a 
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group relative"
                            >
                              <div className="mt-0.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-white dark:group-hover:bg-slate-700 shadow-sm flex-shrink-0">
                                {renderIcon(link.icon_name)}
                              </div>
                              <div className="flex-1 min-w-0 pr-12">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                  {link.title}
                                </h4>
                                {link.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{link.description}</p>
                                )}
                              </div>
                              <div className="absolute right-2 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => startEditing(link, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={(e) => handleDelete(link.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Links by Sector */}
              {linksBySector.map(sector => (
                <div key={sector.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <button 
                    onClick={() => toggleSector(sector.id)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{sector.name}</span>
                    {expandedSectors[sector.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {expandedSectors[sector.id] && (
                    <div className="p-2 grid gap-2">
                      {sector.links.map(link => (
                        <div key={link.id} className="border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 rounded-lg transition-all overflow-hidden bg-white dark:bg-transparent">
                          {editingLinkId === link.id ? (
                            <div className="p-3 bg-indigo-50/50 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/50 rounded-lg shadow-sm space-y-3">
                              <Input label="Título" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                              <Input label="URL" value={editUrl} onChange={e => setEditUrl(e.target.value)} />
                              <div className="grid grid-cols-2 gap-2">
                                <Select 
                                  label="Setor"
                                  value={editSectorId} 
                                  onChange={e => setEditSectorId(e.target.value)}
                                  options={[
                                    { value: '', label: 'Geral' },
                                    ...sectors.map(s => ({ value: s.id, label: s.name }))
                                  ]}
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
                              <Input label="Descrição" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
                              <div className="flex gap-2">
                                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditingLinkId(null)}>Cancelar</Button>
                                <Button size="sm" className="flex-1" onClick={() => handleUpdate(link.id)}>Salvar</Button>
                              </div>
                            </div>
                          ) : (
                            <a 
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group relative"
                            >
                              <div className="mt-0.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md group-hover:bg-white dark:group-hover:bg-slate-700 shadow-sm flex-shrink-0">
                                {renderIcon(link.icon_name)}
                              </div>
                              <div className="flex-1 min-w-0 pr-12">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                  {link.title}
                                </h4>
                                {link.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{link.description}</p>
                                )}
                              </div>
                              <div className="absolute right-2 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => startEditing(link, e)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded">
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={(e) => handleDelete(link.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
