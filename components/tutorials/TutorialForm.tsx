import React, { useState } from 'react';
import { Tutorial, Client } from '../../types';
import { Button } from '../ui/Button';
import { Input, Select, SearchableSelect } from '../ui/Input';
import { supabase } from '../../utils/supabaseClient';
import { Save, X, Upload, Link as LinkIcon, FileText } from 'lucide-react';

interface TutorialFormProps {
  tutorial?: Tutorial | null;
  clients: Client[];
  orgId: string;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TutorialForm: React.FC<TutorialFormProps> = ({
  tutorial,
  clients,
  orgId,
  userId,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: tutorial?.subject || '',
    client_id: tutorial?.client_id || '',
    url: tutorial?.url || '',
    description: tutorial?.description || '',
  });
  const [file, setFile] = useState<File | null>(null);

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: `${c.companyName} ${c.tradeName ? `(${c.tradeName})` : ''}`
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) {
      alert('O assunto é obrigatório');
      return;
    }

    setLoading(true);
    try {
      let filePath = tutorial?.file_path || null;
      let fileName = tutorial?.file_name || null;

      // Se houver um novo arquivo, fazemos o upload
      if (file) {
        // Remove o arquivo antigo se existir e estiver sendo substituído
        if (tutorial?.file_path) {
          await supabase.storage.from('tutorials').remove([tutorial.file_path]);
        }

        const fileExt = file.name.split('.').pop();
        const uniqueName = `${userId}_${Date.now()}.${fileExt}`;
        const newFilePath = `${orgId}/${uniqueName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('tutorials')
          .upload(newFilePath, file);

        if (uploadError) throw uploadError;

        filePath = data.path;
        fileName = file.name;
      }

      const payload = {
        org_id: orgId,
        subject: formData.subject,
        client_id: formData.client_id || null,
        url: formData.url || null,
        description: formData.description || null,
        file_path: filePath,
        file_name: fileName,
        created_by: userId,
        updated_at: new Date().toISOString()
      };

      if (tutorial?.id) {
        // Atualização
        const { error } = await supabase
          .from('tutorials')
          .update(payload)
          .eq('id', tutorial.id);
        if (error) throw error;
      } else {
        // Criação
        const { error } = await supabase
          .from('tutorials')
          .insert([payload]);
        if (error) throw error;
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar tutorial:', error);
      alert('Erro ao salvar tutorial: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Assunto *"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Ex: Como emitir nota fiscal"
          required
        />
        
        <SearchableSelect
          label="Vincular Cliente (Opcional)"
          value={formData.client_id}
          onChange={(val) => setFormData({ ...formData, client_id: val })}
          options={clientOptions}
          placeholder="Selecione um cliente..."
        />

        <Input
          label="Link / URL de Vídeo (Opcional)"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="Ex: https://youtube.com/..."
          icon={<LinkIcon size={16} />}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Descrição</label>
        <textarea
          className="w-full h-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detalhes ou passo a passo sobre este tutorial..."
        />
      </div>

      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 bg-slate-50 dark:bg-slate-800/50 text-center">
        <input
          type="file"
          id="tutorial-file-upload"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const selectedFile = e.target.files[0];
              
              if (selectedFile.type.startsWith('video/')) {
                alert('Envio de vídeos não é permitido. Por favor, utilize o campo "Link / URL de Vídeo" acima.');
                e.target.value = '';
                return;
              }

              if (selectedFile.size > 10 * 1024 * 1024) {
                alert('O tamanho máximo permitido para o arquivo é de 10MB.');
                e.target.value = '';
                return;
              }

              setFile(selectedFile);
            }
          }}
        />
        <label
          htmlFor="tutorial-file-upload"
          className="cursor-pointer flex flex-col items-center justify-center gap-2"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2">
            <Upload size={20} />
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 transform transition-transform hover:scale-105 active:scale-95">
            Clique para Anexar Arquivo
          </p>
          <p className="text-xs text-slate-500">PDF, Word, Excel, Imagens ou TXT (Máx 10MB)</p>
          
          {(file || tutorial?.file_name) && (
            <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full">
              <FileText size={16} />
              <span className="truncate max-w-[200px]">
                {file ? file.name : tutorial?.file_name}
              </span>
            </div>
          )}
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" icon={<Save size={18} />} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Manual'}
        </Button>
      </div>
    </form>
  );
};
