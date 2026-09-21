import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { soundEffects } from '../../utils/soundEffects';
import { MessageSquare, X, ArrowRight, User } from 'lucide-react';

interface GlobalChatNotifierProps {
  userProfile: any;
  activeTab: string;
  onNavigateToChat: (channelId?: string) => void;
}

interface IncomingMessageAlert {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  text: string;
  createdAt: string;
}

export const GlobalChatNotifier: React.FC<GlobalChatNotifierProps> = ({
  userProfile,
  activeTab,
  onNavigateToChat
}) => {
  const [activeAlert, setActiveAlert] = useState<IncomingMessageAlert | null>(null);
  const userChannelIdsRef = useRef<Set<string>>(new Set());
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar lista de canais que o usuário participa
  useEffect(() => {
    if (!userProfile?.id) return;

    const loadUserChannels = async () => {
      try {
        const channelIds = new Set<string>();

        // 1. Canais via chat_channel_members
        const { data: memberships } = await (supabase as any)
          .from('chat_channel_members')
          .select('channel_id')
          .eq('user_id', userProfile.id);

        if (memberships) {
          memberships.forEach((m: any) => {
            if (m.channel_id) channelIds.add(m.channel_id);
          });
        }

        // 2. Se for cliente, incluir canais vinculados ao seu client_id
        if (userProfile.client_id) {
          const { data: clientChannels } = await (supabase as any)
            .from('chat_channels')
            .select('id')
            .eq('client_id', userProfile.client_id);

          if (clientChannels) {
            clientChannels.forEach((c: any) => {
              if (c.id) channelIds.add(c.id);
            });
          }
        }

        // 3. Canais criados pelo usuário
        const { data: createdChannels } = await (supabase as any)
          .from('chat_channels')
          .select('id')
          .eq('created_by', userProfile.id);

        if (createdChannels) {
          createdChannels.forEach((c: any) => {
            if (c.id) channelIds.add(c.id);
          });
        }

        userChannelIdsRef.current = channelIds;
      } catch (err) {
        console.warn('Erro ao carregar canais do usuário para notificações:', err);
      }
    };

    loadUserChannels();

    // Atualizar periodicamente a lista de canais (a cada 60s)
    const interval = setInterval(loadUserChannels, 60000);
    return () => clearInterval(interval);
  }, [userProfile?.id, userProfile?.client_id]);

  // Ouvir mensagens via Service Worker postMessage (quando o usuário clica numa notificação Push)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_CLICKED') {
        const channelId = event.data.data?.channelId;
        onNavigateToChat(channelId);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [onNavigateToChat]);

  // Ouvinte global em tempo real para novas mensagens de chat
  useEffect(() => {
    if (!userProfile?.id) return;

    const channel = supabase
      .channel(`global-chat-alerts-${userProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (!newMsg || !newMsg.channel_id) return;

          // Ignorar mensagens enviadas pelo próprio usuário
          if (newMsg.sender_id === userProfile.id) return;

          // Verificar se o usuário tem relação com esse canal
          const hasAccess = userChannelIdsRef.current.has(newMsg.channel_id);
          
          // Se não estiver na lista em cache, fazemos uma checagem rápida no banco para não perder
          let isRecipient = hasAccess;
          if (!isRecipient) {
            const { data: checkMember } = await (supabase as any)
              .from('chat_channel_members')
              .select('id')
              .eq('channel_id', newMsg.channel_id)
              .eq('user_id', userProfile.id)
              .maybeSingle();

            if (checkMember) {
              isRecipient = true;
              userChannelIdsRef.current.add(newMsg.channel_id);
            }
          }

          if (!isRecipient && userProfile.role === 'cliente' && userProfile.client_id) {
            const { data: checkCh } = await (supabase as any)
              .from('chat_channels')
              .select('id')
              .eq('id', newMsg.channel_id)
              .eq('client_id', userProfile.client_id)
              .maybeSingle();

            if (checkCh) {
              isRecipient = true;
              userChannelIdsRef.current.add(newMsg.channel_id);
            }
          }

          if (!isRecipient) return;

          // Tocar som de notificação padrão
          soundEffects.playNotificationSound();

          // Buscar nome e avatar do remetente
          let senderName = 'Usuário';
          let senderAvatar: string | null = null;

          const { data: senderProfile } = await (supabase as any)
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .maybeSingle();

          if (senderProfile) {
            senderName = senderProfile.full_name || 'Usuário';
            senderAvatar = senderProfile.avatar_url || null;
          }

          const alertData: IncomingMessageAlert = {
            id: newMsg.id,
            channelId: newMsg.channel_id,
            senderId: newMsg.sender_id,
            senderName,
            senderAvatar,
            text: newMsg.text || (
              newMsg.file_type?.startsWith('audio/') || 
              newMsg.attachment_url?.match(/\.(webm|ogg|mp3|wav|m4a|aac|mp4)($|\?)/i) ||
              (newMsg.attachments && Array.isArray(newMsg.attachments) && newMsg.attachments.some((att: any) => att.type === 'audio' || att.url?.match(/\.(webm|ogg|mp3|wav|m4a|aac|mp4)($|\?)/i)))
                ? '🎤 Mensagem de áudio'
                : '📎 Arquivo recebido'
            ),
            createdAt: newMsg.created_at
          };

          // Se a página estiver minimizada ou em segundo plano, disparar notificação do Service Worker
          const isDocHidden = typeof document !== 'undefined' && document.hidden;
          if (isDocHidden && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(`${senderName} (Task Account)`, {
                  body: alertData.text,
                  icon: senderAvatar || '/pwa-192x192.png',
                  badge: '/favicon.png',
                  tag: `chat-channel-${newMsg.channel_id}`,
                  renotify: true,
                  data: {
                    url: `/?tab=chat&channelId=${newMsg.channel_id}`,
                    channelId: newMsg.channel_id
                  }
                } as any);
              });
            } catch (err) {
              console.warn('Erro ao disparar banner nativo:', err);
            }
          }

          // Se o usuário NÃO estiver visualizando ativamente a aba de chat, exibe o Toast visual flutuante
          if (activeTab !== 'chat') {
            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            setActiveAlert(alertData);

            alertTimerRef.current = setTimeout(() => {
              setActiveAlert(null);
            }, 7000); // 7 segundos visível
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, [userProfile?.id, userProfile?.role, userProfile?.client_id, activeTab]);

  if (!activeAlert) return null;

  return (
    <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[99999] max-w-md w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-top-4 duration-300">
      <div 
        onClick={() => {
          const chId = activeAlert.channelId;
          setActiveAlert(null);
          onNavigateToChat(chId);
        }}
        className="cursor-pointer group flex items-start gap-3 p-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-all duration-200"
      >
        <div className="relative shrink-0 mt-0.5">
          {activeAlert.senderAvatar ? (
            <img 
              src={activeAlert.senderAvatar} 
              alt={activeAlert.senderName} 
              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
              <User size={20} />
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {activeAlert.senderName}
            </h4>
            <span className="text-[10px] text-slate-400 shrink-0">
              Agora
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {activeAlert.text}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
            <span>Abrir conversa</span>
            <ArrowRight size={12} />
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveAlert(null);
          }}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
