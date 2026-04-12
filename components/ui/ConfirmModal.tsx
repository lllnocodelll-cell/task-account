import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle, Trash2, Info, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  loading = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-rose-500" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-indigo-500" />
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className="flex gap-3 w-full">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button 
            variant={type === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm}
            loading={loading}
            className="flex-1 shadow-lg shadow-rose-500/20 dark:shadow-rose-900/20"
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center py-2">
        {getIcon()}
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-4">
          {message}
        </p>
      </div>
    </Modal>
  );
};
