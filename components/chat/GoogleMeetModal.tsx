import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Video, ExternalLink, Send, Sparkles } from 'lucide-react';

interface GoogleMeetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMeeting: (meetUrl: string, title: string) => void;
  channelName?: string;
  defaultTitle?: string;
}

export const GoogleMeetModal: React.FC<GoogleMeetModalProps> = ({
  isOpen,
  onClose,
  onSendMeeting,
  channelName = '',
  defaultTitle = 'Reunião Online'
}) => {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingTitle, setMeetingTitle] = useState(defaultTitle);
  const [saveAsDefault, setSaveAsDefault] = useState(true);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem('task_account_google_meet_url');
        if (stored) {
          setMeetingUrl(stored);
        } else {
          setMeetingUrl('');
        }
      } catch {
        // Ignora caso storage esteja indisponível
      }
      setMeetingTitle(defaultTitle || 'Reunião Online');
    }
  }, [isOpen, defaultTitle]);

  const normalizeMeetUrl = (input: string): string => {
    let clean = input.trim();
    if (!clean) return '';
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    // Se digitou apenas o código do Meet (ex: abc-defg-hij)
    if (/^[a-z0-9]{3,4}-[a-z0-9]{4}-[a-z0-9]{3,4}$/i.test(clean)) {
      return `https://meet.google.com/${clean}`;
    }
    if (clean.includes('meet.google.com/')) {
      return `https://${clean}`;
    }
    return `https://${clean}`;
  };

  const handleOpenGoogleMeetNew = () => {
    window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
  };

  const handleConfirm = () => {
    const finalUrl = normalizeMeetUrl(meetingUrl);
    if (!finalUrl) {
      alert('Por favor, informe ou gere o link da reunião do Google Meet.');
      return;
    }

    if (saveAsDefault) {
      try {
        localStorage.setItem('task_account_google_meet_url', finalUrl);
      } catch {
        // Ignora
      }
    }

    onSendMeeting(finalUrl, meetingTitle.trim() || 'Reunião Online');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            <Video size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
              Google Meet
            </h1>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
          </div>
        </div>
      }
      size="md"
      className="!max-w-[520px]"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!meetingUrl.trim()}
            icon={<Send size={16} />}
          >
            Enviar Convite
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Banner com atalho de geração de link do Meet */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
              <span>Gerar Link do Google Meeting</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
              Crie uma reunião instantânea diretamente na sua conta Google.
            </p>
          </div>
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={handleOpenGoogleMeetNew}
            icon={<ExternalLink size={13} />}
          >
            Abrir Meet
          </Button>
        </div>

        {/* Formulário de Link e Assunto */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Link da Reunião
            </label>
            <Input
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
              placeholder="Ex: https://meet.google.com/abc-defg-hij"
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">
              Cole o link gerado pelo Google Meet ou digite o código da sala.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Assunto ou Descrição da Reunião
            </label>
            <Input
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
              placeholder="Ex: Alinhamento Fiscal"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={e => setSaveAsDefault(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 select-none">
              Salvar este link como meu padrão para próximas reuniões
            </span>
          </label>
        </div>
      </div>
    </Modal>
  );
};
