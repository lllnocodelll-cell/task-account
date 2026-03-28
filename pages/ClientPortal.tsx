import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  FileText, 
  Download, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  Search,
  ChevronRight,
  Upload,
  Calendar
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { Loader2, Send } from 'lucide-react';

interface ClientPortalProps {
  userProfile: any;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ userProfile }) => {
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'read'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetence, setSelectedCompetence] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sectors, setSectors] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Upload Form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSector, setUploadSector] = useState('');
  const [uploadCompetence, setUploadCompetence] = useState(() => {
    const d = new Date();
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  });

  useEffect(() => {
    fetchDocuments();
    fetchSectors();
  }, [userProfile?.client_id]);

  const fetchDocuments = async () => {
    if (!userProfile?.client_id) return;

    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('client_documents')
        .select(`
          *,
          sectors(name)
        `)
        .eq('client_id', userProfile.client_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      addToast('error', 'Erro', 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchSectors = async () => {
    try {
      const { data } = await supabase.from('sectors').select('*');
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      // Registrar Protocolo de Leitura
      await (supabase as any).from('client_document_logs').insert({
        document_id: doc.id,
        user_id: userProfile.id,
        user_agent: navigator.userAgent
      });

      // Abrir o arquivo
      if (doc.storage_path) {
        const { data } = supabase.storage
          .from('client-documents')
          .getPublicUrl(doc.storage_path);
        
        window.open(data.publicUrl, '_blank');
      }

      // Atualizar status local se necessário
      if (doc.status === 'Pendente') {
        await (supabase as any)
          .from('client_documents')
          .update({ status: 'Lido' })
          .eq('id', doc.id);
        
        fetchDocuments();
      }

      addToast('success', 'Protocolo Registrado', 'Acesso registrado no protocolo de leitura');
    } catch (error) {
      console.error('Error in download protocol:', error);
      addToast('error', 'Erro', 'Erro ao registrar leitura');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return addToast('warning', 'Atenção', 'Selecione um arquivo para envio');
    if (!uploadSector) return addToast('warning', 'Atenção', 'Selecione um setor');

    try {
      setIsUploading(true);
      const filePath = `client-uploads/${userProfile.client_id}/${Date.now()}-${uploadFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase as any).from('client_documents').insert({
        org_id: userProfile.org_id,
        client_id: userProfile.client_id,
        name: uploadFile.name,
        storage_path: filePath,
        sector_id: uploadSector,
        competence_month: uploadCompetence,
        type: 'Enviado pelo Cliente',
        status: 'Lido',
        uploaded_by_role: 'cliente'
      });

      if (dbError) throw dbError;

      addToast('success', 'Sucesso', 'Arquivo enviado com sucesso!');
      setUploadModalOpen(false);
      setUploadFile(null);
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading:', error);
      addToast('error', 'Erro', 'Erro ao enviar arquivo: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const getQuickMonths = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
      const value = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      months.push({ label, value });
    }
    return months;
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || (activeTab === 'pending' ? doc.status === 'Pendente' : doc.status === 'Lido');
    const matchesCompetence = !selectedCompetence || doc.competence_month === selectedCompetence;
    return matchesSearch && matchesTab && matchesCompetence;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Olá, {userProfile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-slate-500 dark:text-slate-400">Aqui estão os documentos da sua empresa.</p>
        </div>
        <div className="flex gap-2">
           <Button 
            onClick={() => setUploadModalOpen(true)}
            variant="primary" 
            icon={<Upload size={18} />} 
            className="text-xs group shadow-xl shadow-indigo-500/20"
           >
            Enviar Documento
           </Button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1 -mx-4 md:mx-0">
        <button 
          onClick={() => setSelectedCompetence('')}
          className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-black tracking-widest transition-all duration-300 ${
            !selectedCompetence 
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-105' 
              : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-500'
          }`}
        >
          TODOS
        </button>
        {getQuickMonths().map(m => (
          <button 
            key={m.label}
            onClick={() => setSelectedCompetence(m.value)}
            className={`flex-shrink-0 px-5 py-2.5 rounded-full text-xs font-black tracking-widest transition-all duration-300 ${
              selectedCompetence === m.value
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-105' 
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-500'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg"><FileText size={20} /></div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">Total de Guias</p>
              <h3 className="text-xl font-bold">{documents.length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg"><Clock size={20} /></div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">Aguardando Leitura</p>
              <h3 className="text-xl font-bold">{documents.filter(d => d.status === 'Pendente').length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle2 size={20} /></div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">Lidos / Protocolados</p>
              <h3 className="text-xl font-bold">{documents.filter(d => d.status === 'Lido').length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-white dark:bg-slate-900 border-l-4 border-l-slate-400 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-lg"><Calendar size={20} /></div>
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">Período Ativo</p>
              <h3 className="text-sm font-bold truncate">{selectedCompetence || 'Exibir Tudo'}</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
           FILTROS E OPERAÇÕES
        </div>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2 text-xs font-black tracking-tight rounded-lg transition-all ${activeTab === 'all' ? 'bg-white dark:bg-slate-800 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-2 text-xs font-black tracking-tight rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-800 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
              Pendentes
            </button>
            <button 
              onClick={() => setActiveTab('read')}
              className={`px-6 py-2 text-xs font-black tracking-tight rounded-lg transition-all ${activeTab === 'read' ? 'bg-white dark:bg-slate-800 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
            >
              Lidos
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar documento..."
              className="pl-10 pr-4 py-2.5 w-full md:w-64 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredDocs.length > 0 ? (
            filteredDocs.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`p-4 rounded-2xl shrink-0 transition-all group-hover:scale-110 ${doc.status === 'Pendente' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-inner' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <FileText size={28} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 pt-1">
                        <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{doc.name}</h4>
                        {doc.status === 'Pendente' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white uppercase tracking-tighter">NOVO</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-black uppercase text-[9px] tracking-wider border border-slate-200 dark:border-slate-700">{doc.sectors?.name || 'Geral'}</span>
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="shrink-0" />
                          <span>Comp: <span className="text-slate-700 dark:text-slate-200 font-bold">{doc.competence_month}</span></span>
                        </div>
                        {doc.due_date && (
                          <div className="flex items-center gap-1">
                            <AlertCircle size={12} className={`shrink-0 ${new Date(doc.due_date) < new Date() ? 'text-red-500' : 'text-slate-400'}`} />
                            <span>Vencimento: <span className={`font-bold ${new Date(doc.due_date) < new Date() ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>{new Date(doc.due_date).toLocaleDateString()}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end md:self-center">
                    <button 
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 uppercase"
                    >
                      <Download size={16} /> Acessar Documento
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 text-center">
              <div className="inline-flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-800 rounded-3xl text-slate-300 dark:text-slate-700 mb-6 scale-125">
                <FileText size={48} />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">Nenhum documento</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Não encontramos arquivos para os critérios selecionados.</p>
            </div>
          )}
        </div>
      </div>
      
      <button 
        className="fixed bottom-6 right-6 md:hidden p-4 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 z-50 animate-bounce active:scale-90 transition-transform"
      >
        <MessageSquare size={24} />
      </button>

      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Enviar Novo Documento"
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            <Button variant="secondary" onClick={() => setUploadModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button 
                variant="primary" 
                onClick={handleUpload} 
                disabled={isUploading} 
                className="flex-1"
                icon={isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            >
              {isUploading ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 transition-colors hover:border-indigo-500">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full">
              <Upload size={32} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {uploadFile ? uploadFile.name : 'Clique para selecionar ou arraste o arquivo'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PDF, JPG, PNG ou DOCX (Max. 10MB)</p>
            </div>
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Setor</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  value={uploadSector}
                  onChange={(e) => setUploadSector(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Competência</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  placeholder="MM/AAAA"
                  value={uploadCompetence}
                  onChange={(e) => setUploadCompetence(e.target.value)}
                />
             </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
