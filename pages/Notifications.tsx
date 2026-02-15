import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock, 
  Check, 
  Trash2, 
  Mail,
  FileText
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Nova Tarefa Atribuída',
    message: 'Você foi definido como responsável pela tarefa "Fechamento Fiscal - Tech Solutions".',
    type: 'info',
    time: 'Há 15 minutos',
    read: false,
  },
  {
    id: '2',
    title: 'Tarefa Concluída',
    message: 'João Silva concluiu a tarefa "DAS - 01/2026" que você estava seguindo.',
    type: 'success',
    time: 'Há 1 hora',
    read: false,
  },
  {
    id: '3',
    title: 'Prazo Próximo',
    message: 'A tarefa "Folha de Pagamento - Mercado Silva" vence amanhã.',
    type: 'warning',
    time: 'Há 3 horas',
    read: true,
  },
  {
    id: '4',
    title: 'Documento Recebido',
    message: 'Novo comprovante anexado na tarefa "Impostos Federais".',
    type: 'info',
    time: 'Ontem',
    read: true,
  },
   {
    id: '5',
    title: 'Alerta de Sistema',
    message: 'O sistema passará por manutenção programada neste sábado às 22h.',
    type: 'alert',
    time: 'Ontem',
    read: true,
  }
];

export const Notifications: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-emerald-500" />;
      case 'warning': return <Clock size={20} className="text-amber-500" />;
      case 'alert': return <AlertTriangle size={20} className="text-red-500" />;
      default: return <Info size={20} className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <Bell className="text-indigo-600 dark:text-indigo-400" /> Notificações
           </h1>
           <p className="text-slate-500 dark:text-slate-400">Acompanhe suas atualizações e alertas</p>
        </div>
        <div className="flex gap-2">
           <Button 
             variant="ghost" 
             onClick={markAllAsRead}
             disabled={notifications.every(n => n.read)}
             icon={<Check size={16} />}
             className="text-xs"
           >
             Marcar todas como lidas
           </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm min-h-[500px] flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              filter === 'all' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              filter === 'unread' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Não lidas
            {notifications.filter(n => !n.read).length > 0 && (
               <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 rounded-full">
                 {notifications.filter(n => !n.read).length}
               </span>
            )}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
           {filteredNotifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
               <Bell size={48} strokeWidth={1.5} className="mb-4 opacity-50" />
               <p>Nenhuma notificação encontrada.</p>
             </div>
           ) : (
             filteredNotifications.map((notification) => (
               <div 
                 key={notification.id} 
                 className={`p-6 flex gap-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!notification.read ? 'bg-indigo-50/40 dark:bg-indigo-500/5' : ''}`}
               >
                 <div className="mt-1 shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!notification.read ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}>
                       {getIcon(notification.type)}
                    </div>
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                       <h4 className={`text-sm font-semibold truncate pr-4 ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                         {notification.title}
                       </h4>
                       <span className="text-xs text-slate-400 whitespace-nowrap">{notification.time}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {notification.message}
                    </p>
                 </div>
                 <div className="flex flex-col gap-2 shrink-0 ml-2">
                    {!notification.read && (
                      <button 
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors" 
                        title="Marcar como lida"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" 
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
};