import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Star,
  Reply,
  Image as ImageIcon,
  Plus,
  Users,
  X,
  PhoneCall,
  PhoneOff,
  EyeOff,
  ArrowLeft,
  PanelLeft,
  Shuffle,
  Loader2,
  MessageSquare,
  PhoneOutgoing,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { supabase } from '../utils/supabaseClient';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import { GroupSettingsModal } from '../components/chat/GroupSettingsModal';
import { VideoCallModal } from '../components/chat/VideoCallModal';
import { getOrCreateDailyRoom } from '../utils/dailyApi';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface Channel {
  id: string;
  name: string;
  rawName: string;
  type: string;
  status?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  avatar_url?: string;
  fallbackAvatar?: string;
  sector_id?: string;
  assigned_to?: string | null;
  support_status?: string | null;
  created_by?: string | null;
  created_at?: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  role: string;
  status?: string;
  chat_status?: string;
  current_session_start?: string | null;
  last_active_at?: string | null;
  sector?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'disponível': 'bg-emerald-500',
  'ocupado': 'bg-red-500',
  'ausente': 'bg-amber-500',
  'almoço': 'bg-blue-500',
  'férias': 'bg-slate-400',
  'offline': 'bg-slate-300 dark:bg-slate-600'
};

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  isMe: boolean;
  status: 'sent' | 'delivered' | 'read';
  attachment_url?: string;
  file_name?: string;
  file_type?: string;
  reply_to_id?: string;
  reactions?: Reaction[];
  is_system?: boolean;
}
const getSectorScope = (sectorName: string): string[] => {
  if (!sectorName) return [];
  const name = sectorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos

  // Fiscal: "Fiscal", "tax", "tributário" e "Tributos"
  if (name.includes('fiscal') || name.includes('tax') || name.includes('tributario') || name.includes('tributos')) {
    return [
      'Emissão de nota fiscal',
      'Impostos sobre as vendas',
      'Certidão negativa de débitos',
      'Análise tributária',
      'Declaração de faturamento',
      'Outros assuntos tributários'
    ];
  }

  // Folha: "folha", "folha de pagamento", "DP", "departamento pessoal", "pessoal" e "RH"
  if (name.includes('folha') || name.includes('dp') || name.includes('departamento pessoal') || name.includes('pessoal') || name.includes('rh')) {
    return [
      'Admissão ou rescisão de funcionários',
      'Férias e 13º salários',
      'Convenção coletiva de trabalho',
      'FGTS e INSS',
      'Holerites',
      'Outros assuntos trabalhistas'
    ];
  }

  // Contábil: "contábil", "contabil", "contabilidade" e "account"
  if (name.includes('contabil') || name.includes('contabilidade') || name.includes('account')) {
    return [
      'Balanço patrimonial',
      'Demonstração de Resultado do Exercício',
      'EFD e ECF',
      'Indicadores econômicos contábeis',
      'Outros assuntos contábeis'
    ];
  }

  // Societário: "societário", "legalização", "paralegal" e "regulatório"
  if (name.includes('societario') || name.includes('legalizacao') || name.includes('paralegal') || name.includes('regulatorio')) {
    return [
      'Abertura e alteração de empresa',
      'Licença de funcionamento',
      'Certificado digital',
      'Contrato social',
      'Inscrição municipal e estadual',
      'Outros assuntos societários'
    ];
  }

  // Financeiro: "financeiro", "finanças", "cobrança" e "finance"
  if (name.includes('financeiro') || name.includes('financas') || name.includes('cobranca') || name.includes('finance')) {
    return [
      'Boleto mensalidade',
      'Negociar mensalidade',
      'Baixa de protestos',
      'Contrato de prestação',
      'Cancelamento de contrato',
      'Outros assuntos financeiros'
    ];
  }

  return [];
};

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;
    
    // Primeiro bip (Ré5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.2);
    
    // Segundo bip (Lá5)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch (error) {
    console.warn('Erro ao reproduzir som de notificação:', error);
  }
};

const showBrowserNotification = (title: string, options?: NotificationOptions) => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, options);
      } catch (e) {
        console.warn('Erro ao disparar notificação:', e);
      }
    }
  }
};

export const Chat: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [messageInput, setMessageInput] = useState('');
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'support' | 'closed'>('chats');
  const [creatingDirect, setCreatingDirect] = useState(false);
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  
  // Atendimentos (Support)
  const [isSupportCreateModalOpen, setIsSupportCreateModalOpen] = useState(false);
  const [supportSectorId, setSupportSectorId] = useState('');
  const [isCreatingSupport, setIsCreatingSupport] = useState(false);
  const [sectors, setSectors] = useState<any[]>([]);
  const [supportSubTab, setSupportSubTab] = useState<'queue' | 'mine' | 'all'>('queue');

  // Atendimento iniciado pelo escritório
  const [isStaffSupportModalOpen, setIsStaffSupportModalOpen] = useState(false);
  const [staffSupportClientId, setStaffSupportClientId] = useState('');
  const [staffSupportSectorId, setStaffSupportSectorId] = useState('');
  const [isCreatingStaffSupport, setIsCreatingStaffSupport] = useState(false);
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);

  // Favoritos
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoritedMessages, setFavoritedMessages] = useState<string[]>([]);

  // Resposta a
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Status Menu
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFinishingSupport, setIsFinishingSupport] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    sectorName: string;
    clientName?: string;
    existingChannelId: string;
    type: 'client' | 'staff';
  }>({
    isOpen: false,
    sectorName: '',
    clientName: '',
    existingChannelId: '',
    type: 'client'
  });

  const handleGoToExistingChannel = (channelId: string, type: 'client' | 'staff') => {
    setSelectedChannelId(channelId);
    setActiveTab(type === 'client' ? 'chats' : 'support');
    setDuplicateModal(prev => ({ ...prev, isOpen: false }));
  };
  const [showSupportActionsMenu, setShowSupportActionsMenu] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Chamadas
  const [callState, setCallState] = useState<{
    isOpen: boolean;
    isVideoEnabled: boolean;
    roomUrl: string;
  }>({
    isOpen: false,
    isVideoEnabled: true,
    roomUrl: ''
  });

  // Transferência de Atendimento
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSectorId, setTransferSectorId] = useState('');
  const [transferUserId, setTransferUserId] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [selectedSectorFilterId, setSelectedSectorFilterId] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const callMenuRef = useRef<HTMLDivElement>(null);
  const supportActionsMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const channelsRef = useRef<Channel[]>([]);
  const profilesRef = useRef<Profile[]>([]);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showCallMenu && callMenuRef.current && !callMenuRef.current.contains(target)) {
        setShowCallMenu(false);
      }
      if (showSupportActionsMenu && supportActionsMenuRef.current && !supportActionsMenuRef.current.contains(target)) {
        setShowSupportActionsMenu(false);
      }
      if (showStatusMenu && statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setShowStatusMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCallMenu, showSupportActionsMenu, showStatusMenu]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [messageInput]);

  const enrichedChannels = channels.map(channel => {
    if (channel.type === 'direct' && userId) {
      // Usar rawName (que contém "uuid1-uuid2") para extrair o ID do contato
      const parts = channel.rawName.split('-');
      // UUIDs têm formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (5 partes com hifen)
      // O rawName é "uuid1-uuid2", então vamos reconstruir os UUIDs
      const rawName = channel.rawName;
      let theirId = '';
      if (rawName.startsWith(userId)) {
        theirId = rawName.substring(userId.length + 1); // +1 for the separator '-'
      } else if (rawName.endsWith(userId)) {
        theirId = rawName.substring(0, rawName.length - userId.length - 1);
      }
      const theirProfile = profiles.find(p => p.id === theirId);

      let isOffline = true;
      if (theirProfile?.current_session_start) {
        const sessionStart = new Date(theirProfile.current_session_start).getTime();
        const lastActive = theirProfile.last_active_at ? new Date(theirProfile.last_active_at).getTime() : sessionStart;
        const now = Date.now();
        // Se esteve ativo nos últimos 30 minutos (ou se a sessão iniciou a < 30 min sem last_active), consideramos online.
        if (now - lastActive < 30 * 60 * 1000) {
          isOffline = false;
        }
      }

      return {
        ...channel,
        name: theirProfile?.full_name || 'Usuário Desconhecido',
        avatar_url: theirProfile?.avatar_url,
        fallbackAvatar: theirProfile?.full_name?.substring(0, 2).toUpperCase() || 'DM',
        contactStatus: isOffline ? 'offline' : (theirProfile?.chat_status || 'disponível')
      };
    }

    if (channel.type === 'support') {
      let simplifiedName = channel.name;
      let avatarUrl = undefined;

      let clientProfile;
      if (currentUser?.role === 'cliente') {
        const match = channel.name.match(/\(([^)]+)\)$/);
        simplifiedName = match ? match[1] : 'Suporte';
      } else {
        const match = channel.name.match(/^Atendimento - (.+?)(?:\s*\(|$)/);
        simplifiedName = match ? match[1] : channel.name;

        // Tentar encontrar o perfil do cliente para a foto
        clientProfile = profiles.find(p => p.full_name === simplifiedName);
        if (clientProfile) {
          avatarUrl = clientProfile.avatar_url;
        }
      }

        let contactStatus = undefined;
        if (clientProfile) {
          let isOffline = true;
          if (clientProfile.current_session_start) {
            const sessionStart = new Date(clientProfile.current_session_start).getTime();
            const lastActive = clientProfile.last_active_at ? new Date(clientProfile.last_active_at).getTime() : sessionStart;
            if (Date.now() - lastActive < 30 * 60 * 1000) {
              isOffline = false;
            }
          }
          contactStatus = isOffline ? 'offline' : (clientProfile.chat_status || 'disponível');
        }

        return {
          ...channel,
          name: simplifiedName,
          avatar_url: avatarUrl,
          fallbackAvatar: simplifiedName.substring(0, 2).toUpperCase(),
          contactStatus: contactStatus
        };
    }

    return {
      ...channel,
      fallbackAvatar: channel.name.substring(0, 2).toUpperCase()
    };
  });

  const selectedChannel = enrichedChannels.find(c => c.id === selectedChannelId);
  const currentMessages = selectedChannelId ? (messages[selectedChannelId] || []) : [];

  const displayedMessages = currentMessages.filter(msg => {
    const matchesSearch = msg.text ? msg.text.toLowerCase().includes(messageSearchTerm.toLowerCase()) : true;
    const matchesFavorites = showFavoritesOnly ? favoritedMessages.includes(msg.id) : true;
    return matchesSearch && matchesFavorites;
  });

  const fetchFavorites = async (channelId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('chat_favorites')
        .select('message_id')
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      if (error) throw error;
      setFavoritedMessages(data.map(f => f.message_id));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (messageId: string) => {
    if (!userId || !selectedChannelId) return;
    try {
      const isFavorited = favoritedMessages.includes(messageId);
      if (isFavorited) {
        // Remove favorite
        await supabase
          .from('chat_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('message_id', messageId);
        setFavoritedMessages(prev => prev.filter(id => id !== messageId));
      } else {
        // Add favorite
        await supabase
          .from('chat_favorites')
          .insert({
            user_id: userId,
            message_id: messageId,
            channel_id: selectedChannelId
          });
        setFavoritedMessages(prev => [...prev, messageId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const prevMessageCountRef = useRef<number>(0);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchSectors = async () => {
    try {
      const { data } = await supabase.from('sectors').select('*').order('name');
      if (data) setSectors(data);
    } catch (e) {
      console.error('Error fetching sectors:', e);
    }
  };

  const fetchClients = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'cliente')
        .order('full_name');
      if (data) setClientProfiles(data);
    } catch (e) {
      console.error('Error fetching clients:', e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchSectors();
    fetchClients();
  }, []);

  useEffect(() => {
    const isNewChannel = selectedChannelIdRef.current !== selectedChannelId;
    const prevCount = prevMessageCountRef.current;
    const currentCount = currentMessages.length;

    let behavior: ScrollBehavior = 'auto';
    if (!isNewChannel && currentCount > 0 && currentCount === prevCount + 1) {
      behavior = 'smooth';
    }

    scrollToBottom(behavior);
    prevMessageCountRef.current = currentCount;
  }, [currentMessages, selectedChannelId]);

  // Controlar o canal selecionado atual via Ref para não destruir/recriar o listener do websocket ao navegar
  const selectedChannelIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  // Listener global protegido: incrementar badge de não lidas com filtros "in.()"
  const channelIdsStr = channels.map(c => c.id).sort().join(',');

  useEffect(() => {
    if (!userId || !channelIdsStr) return;

    const channelIds = channelIdsStr.split(',');
    if (channelIds.length === 0) return;

    // Supabase limita a 100 IDs por filtro "in.()". Fatiar em blocos de 100 se necessário
    const chunks = [];
    for (let i = 0; i < channelIds.length; i += 100) {
      chunks.push(channelIds.slice(i, i + 100));
    }

    const globalSubs = chunks.map((chunk, index) => {
      const filterStr = `channel_id=in.(${chunk.join(',')})`;
      const sub = supabase
        .channel(`global-unread-${userId}-${index}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: filterStr
          },
          (payload) => {
            const newMsg = payload.new as any;
            const currentUserId = userIdRef.current;
            const currentSelectedChannelId = selectedChannelIdRef.current;
            
            // Só incrementar se NÃO for minha mensagem e NÃO estiver com o canal aberto no momento
            if (newMsg.sender_id !== currentUserId && newMsg.channel_id !== currentSelectedChannelId) {
              setChannels(prev =>
                prev.map(ch =>
                  ch.id === newMsg.channel_id
                    ? { ...ch, unreadCount: (ch.unreadCount || 0) + 1 }
                    : ch
                )
              );
              
              // Tocar som de notificação
              playNotificationSound();
              
              // Buscar canal e remetente para exibir na notificação do sistema
              const currentChannels = channelsRef.current;
              const currentProfiles = profilesRef.current;
              const ch = currentChannels.find(c => c.id === newMsg.channel_id);
              const sender = currentProfiles.find(p => p.id === newMsg.sender_id);
              
              let title = 'Nova mensagem';
              if (ch) {
                if (ch.type === 'direct') {
                  title = `Mensagem de ${sender?.full_name || 'Usuário'}`;
                } else if (ch.type === 'support') {
                  title = `${ch.name}`;
                } else {
                  title = `Mensagem em #${ch.name}`;
                }
              }
              
              showBrowserNotification(title, {
                body: newMsg.text || 'Arquivo enviado',
                icon: sender?.avatar_url || undefined
              });
            }
          }
        )
        .subscribe();

      const reactionSub = supabase
        .channel(`global-unread-reactions-${userId}-${index}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_reactions',
            // O ideal seria filtrar por message_id.channel_id, mas o realtime do supabase não permite joins no filtro.
            // Para resolver isso de forma simples pelo frontend sem comprometer muito: vamos permitir o evento passar
            // e vamos verificar se temos a mensagem armazenada ou vamos ignorar se não tivermos. Mas como as reactions
            // não trazem o channel_id e o realtime global não é por canal da reaction (a reaction nao tem channel_id),
            // temos que escutar * e verificar.
          },
          async (payload) => {
            const newRec = payload.new as any;
            if (newRec.user_id !== userId) {
              // Precisamos saber o channel_id dessa reação para incrementar a badge correcta.
              // Buscar message_id
              const { data } = await supabase.from('chat_messages').select('channel_id').eq('id', newRec.message_id).single();
              if (data && data.channel_id && data.channel_id !== selectedChannelIdRef.current) {
                // O canal dessa mensagem gerou uma notificacao, mas so se for um canal q pertencemos
                if (channelIds.includes(data.channel_id)) {
                  setChannels(prev =>
                    prev.map(ch =>
                      ch.id === data.channel_id
                        ? { ...ch, unreadCount: (ch.unreadCount || 0) + 1 }
                        : ch
                    )
                  );
                }
              }
            }
          }
        )
        .subscribe();

      return [sub, reactionSub];
    });

    return () => {
      globalSubs.flat().forEach(sub => supabase.removeChannel(sub));
    };
  }, [userId, channelIdsStr]);

  // Listener para novos canais (quando o usuário é adicionado, removido ou grupo deletado)
  useEffect(() => {
    if (!userId) return;

    const memberSub = supabase
      .channel('my-memberships')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channel_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchChannels(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(memberSub);
    };
  }, [userId]);

  // Listener para atualizações em tempo real na tabela de canais (chat_channels)
  useEffect(() => {
    if (!userId) return;

    const channelSub = supabase
      .channel('chat-channels-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels',
        },
        () => {
          fetchChannels(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
    };
  }, [userId]);

  // Listener global: atualizações em tempo real no Status da tabela "profiles"
  useEffect(() => {
    if (!userId) return;

    const profileStatusSub = supabase
      .channel('profiles-status-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          const updatedProfile = payload.new as any;
          // Se soubermos que o chat_status mudou, atualize localmente:

          // 1. Atualizar state profiles (se estiver na aba Contatos)
          setProfiles(prevProfiles =>
            prevProfiles.map(p =>
              p.id === updatedProfile.id
                ? {
                  ...p,
                  chat_status: updatedProfile.chat_status,
                  current_session_start: updatedProfile.current_session_start,
                  last_active_at: updatedProfile.last_active_at
                }
                : p
            )
          );

          // 2. Não há update "direto" do estado de Channels no frontend sem fetch,
          // porém, como usamos a derivação cruzada na variável "enrichedChannels", atualizando "profiles", 
          // a "enrichedChannels" vai auto-calcular o novo "contactStatus" renderizando perfeitamente 
          // a badge na lista de "Conversas".
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileStatusSub);
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedChannelId || !userId) return;

    setShowSupportActionsMenu(false);
    setShowCallMenu(false);
    fetchMessages(selectedChannelId);
    fetchFavorites(selectedChannelId);
    markChannelAsRead(selectedChannelId);

    const subscription = supabase
      .channel(`messages:${selectedChannelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${selectedChannelId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => {
            const current = prev[selectedChannelId] || [];
            // Se já existe com o mesmo ID real, ignorar
            if (current.some(m => m.id === newMsg.id)) return prev;

            const formattedMsg: Message = {
              id: newMsg.id,
              sender_id: newMsg.sender_id,
              text: newMsg.text,
              created_at: new Date(newMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              isMe: newMsg.sender_id === userId,
              status: newMsg.status || 'sent',
              attachment_url: newMsg.attachment_url,
              file_name: newMsg.file_name,
              file_type: newMsg.file_type,
              reply_to_id: newMsg.reply_to_id,
              is_system: newMsg.is_system
            };

            // Se sou EU que enviei, substituir a msg otimista (temp-xxx) pela versão real
            if (newMsg.sender_id === userId) {
              const withoutOptimistic = current.filter(m => !m.id.startsWith('temp-'));
              return {
                ...prev,
                [selectedChannelId]: [...withoutOptimistic, formattedMsg]
              };
            }

            return {
              ...prev,
              [selectedChannelId]: [...current, formattedMsg]
            };
          });
          // Marcar como lido quando a mensagem chega no canal que está aberto
          if (newMsg.sender_id !== userId) {
            markChannelAsRead(selectedChannelId);
            
            // Se o documento estiver em background, tocar som e notificar
            if (document.hidden) {
              playNotificationSound();
              
              const currentProfiles = profilesRef.current;
              const sender = currentProfiles.find(p => p.id === newMsg.sender_id);
              const currentChannels = channelsRef.current;
              const ch = currentChannels.find(c => c.id === selectedChannelId);
              
              let title = 'Nova mensagem';
              if (ch) {
                if (ch.type === 'direct') {
                  title = `Mensagem de ${sender?.full_name || 'Usuário'}`;
                } else if (ch.type === 'support') {
                  title = `${ch.name}`;
                } else {
                  title = `Mensagem em #${ch.name}`;
                }
              }
              
              showBrowserNotification(title, {
                body: newMsg.text || 'Arquivo enviado',
                icon: sender?.avatar_url || undefined
              });
            }
          }
        }
      );

    const reactionSubscription = supabase
      .channel(`reactions:${selectedChannelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_reactions'
        },
        (payload) => {
          setMessages(prev => {
            const current = prev[selectedChannelId] || [];
            const { eventType, new: newRec, old: oldRec } = payload as any;

            const msgId = eventType === 'DELETE' ? oldRec.message_id : newRec.message_id;

            // If the message is not in our current state, ignore
            if (!current.some(m => m.id === msgId)) return prev;

            return {
              ...prev,
              [selectedChannelId]: current.map(m => {
                if (m.id !== msgId) return m;
                const reactions = m.reactions || [];
                if (eventType === 'INSERT') {
                  const exists = reactions.some(r => r.id === newRec.id);
                  if (exists) return m;

                  // Remove optimistic reaction for same user and emoji
                  const withoutTemp = reactions.filter(r => !(r.user_id === newRec.user_id && r.emoji === newRec.emoji));
                  return { ...m, reactions: [...withoutTemp, newRec] };
                } else if (eventType === 'DELETE') {
                  return { ...m, reactions: reactions.filter(r => r.id !== oldRec.id) };
                }
                return m;
              })
            };
          });
        }
      );

    subscription.subscribe();
    reactionSubscription.subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(reactionSubscription);
    };
  }, [selectedChannelId, userId]);

  const fetchMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, chat_reactions(*)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formatted: Message[] = data.map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        text: msg.text,
        created_at: new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isMe: msg.sender_id === userId,
        status: msg.status || 'sent',
        attachment_url: msg.attachment_url,
        file_name: msg.file_name,
        file_type: msg.file_type,
        reply_to_id: msg.reply_to_id,
        reactions: msg.chat_reactions || [],
        is_system: msg.is_system
      }));

      setMessages(prev => ({
        ...prev,
        [channelId]: formatted
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const ensureClientSupportChannel = async (clientId: string, clientName: string) => {
    try {
      const { data: memberships } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', clientId);

      let hasSupportChannel = false;
      let existingSupportChannelId = null;

      if (memberships && memberships.length > 0) {
        const channelIds = memberships.map(m => m.channel_id);
        const { data: channelsData } = await supabase
          .from('chat_channels')
          .select('id, type, status')
          .in('id', channelIds)
          .eq('type', 'support');

        if (channelsData && channelsData.length > 0) {
          hasSupportChannel = true;
          existingSupportChannelId = channelsData[0].id;
        }
      }

      if (!hasSupportChannel) {
        const channelName = `Atendimento - ${clientName}`;

        const { data: newChannel, error: createError } = await supabase
          .from('chat_channels')
          .insert([{
            name: channelName,
            type: 'support',
            created_by: clientId
          }])
          .select()
          .single();

        if (createError) throw createError;
        const channelId = newChannel.id;

        await supabase
          .from('chat_channels')
          .update({ status: 'open', support_status: 'pending' } as any)
          .eq('id', channelId);

        const { data: staffMembers } = await supabase
          .from('profiles')
          .select('id')
          .neq('role', 'cliente');

        const membersToInsert = [
          { channel_id: channelId, user_id: clientId, role: 'member' }
        ];

        if (staffMembers) {
          staffMembers.forEach(staff => {
            membersToInsert.push({ channel_id: channelId, user_id: staff.id, role: 'member' });
          });
        }

        const { error: membersError } = await supabase
          .from('chat_channel_members')
          .insert(membersToInsert);

        if (membersError) throw membersError;

        await fetchChannels(clientId);
        setSelectedChannelId(channelId);
      } else if (existingSupportChannelId) {
        await supabase
          .from('chat_channels')
          .update({ status: 'open' } as any)
          .eq('id', existingSupportChannelId);
          
        setSelectedChannelId(existingSupportChannelId);
      }
    } catch (e) {
      console.error('Error ensuring client support channel:', e);
    }
  };

  const fetchSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      fetchChannels(user.id);
      fetchProfiles(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) {
        setCurrentUser(profile);
        if (profile.role === 'cliente') {
          ensureClientSupportChannel(user.id, profile.full_name);
        }
      }
    }
  };

  const updateChatStatus = async (newStatus: 'disponível' | 'ocupado' | 'ausente' | 'almoço' | 'férias') => {
    if (!userId || !currentUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ chat_status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      setCurrentUser({ ...currentUser, chat_status: newStatus });
      setShowStatusMenu(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Falha ao atualizar status.');
    }
  };

  const fetchProfiles = async (uid: string) => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*, last_active_at')
        .neq('id', uid)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Buscar membros e setores para mapear o setor pelo nome (padrão da app)
      const { data: membersData } = await supabase
        .from('members')
        .select(`
          first_name, 
          last_name, 
          sectors (
            name
          )
        `);

      const enrichedProfiles = (profilesData || []).map(profile => {
        const profileName = (profile.full_name || '').trim().toLowerCase();
        
        const member = (membersData as any[] || []).find(m => {
          const mName = `${m.first_name || ''} ${m.last_name || ''}`.trim().toLowerCase();
          return mName === profileName || mName.startsWith(profileName) || profileName.startsWith(mName);
        });

        // Lidar com o fato de que Supabase pode retornar sectors como objeto ou array
        let sectorName = 'Sem Setor';
        if (member?.sectors) {
          if (Array.isArray(member.sectors)) {
            sectorName = member.sectors[0]?.name || 'Sem Setor';
          } else {
            sectorName = (member.sectors as any).name || 'Sem Setor';
          }
        }

        return {
          ...profile,
          sector: sectorName
        };
      });

      setProfiles(enrichedProfiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchChannels = async (uid?: string) => {
    const targetUid = uid || userId;
    if (!targetUid) return;

    try {
      // 1. Obter informações de perfil do usuário logado
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', targetUid)
        .single();

      const isStaff = userProfile && userProfile.role !== 'cliente';

      // 2. Buscar memberships com last_read_at
      const { data: memberData, error: memberError } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', targetUid);

      if (memberError) throw memberError;

      const memberChannelIds = (memberData || []).map((m: any) => m.channel_id);
      const lastReadMap: Record<string, string> = {};
      (memberData || []).forEach((m: any) => {
        lastReadMap[m.channel_id] = m.last_read_at || '2000-01-01T00:00:00Z';
      });

      let channelData = [];

      if (isStaff) {
        // Se for staff, buscar todos os canais de suporte E os outros canais que ele é membro
        const memberFilterStr = memberChannelIds.length > 0 ? memberChannelIds.join(',') : '00000000-0000-0000-0000-000000000000';
        const { data, error: channelError } = await supabase
          .from('chat_channels')
          .select('*')
          .or(`type.eq.support,id.in.(${memberFilterStr})`)
          .order('created_at', { ascending: false });

        if (channelError) throw channelError;
        channelData = data || [];
      } else {
        // Se for cliente, buscar apenas os canais que ele é membro
        if (memberChannelIds.length > 0) {
          const { data, error: channelError } = await supabase
            .from('chat_channels')
            .select('*')
            .in('id', memberChannelIds)
            .order('created_at', { ascending: false });

          if (channelError) throw channelError;
          channelData = data || [];
        }
      }

      // Contar mensagens não lidas para cada canal
      const channelsWithUnread: Channel[] = await Promise.all(
        channelData.map(async (c: any) => {
          const isDirect = c.type === 'direct';
          let channelName = c.name;
          if (isDirect) channelName = 'Chat Individual';

          const lastRead = lastReadMap[c.id] || '2000-01-01T00:00:00Z';

          // Contar mensagens após last_read_at que não foram enviadas por mim
          const { count, error: countError } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', c.id)
            .neq('sender_id', targetUid)
            .gt('created_at', lastRead);

          // Buscar IDs das mensagens deste canal para checar reações
          const { data: messagesIds } = await supabase
            .from('chat_messages')
            .select('id')
            .eq('channel_id', c.id);

          let reactionCount = 0;
          if (messagesIds && messagesIds.length > 0) {
            const mIds = messagesIds.map(m => m.id);
            const { count: rCount } = await supabase
              .from('chat_reactions')
              .select('*', { count: 'exact', head: true })
              .in('message_id', mIds)
              .neq('user_id', targetUid)
              .gt('created_at', lastRead);
            reactionCount = rCount || 0;
          }

          // Buscar a última mensagem real deste canal
          const { data: lastMsgData } = await supabase
            .from('chat_messages')
            .select('text, created_at, attachment_url')
            .eq('channel_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let lastMessage = '';
          if (lastMsgData) {
            if (lastMsgData.text) {
              lastMessage = lastMsgData.text;
            } else if (lastMsgData.attachment_url) {
              lastMessage = '📎 Anexo';
            }
          } else {
            lastMessage = isDirect ? '' : 'Grupo criado';
          }

          const lastTime = lastMsgData ? new Date(lastMsgData.created_at) : new Date(c.created_at);

          return {
            id: c.id,
            name: channelName,
            rawName: c.name,
            type: c.type,
            status: c.status,
            unreadCount: (countError ? 0 : (count || 0)) + reactionCount,
            lastMessage: lastMessage,
            lastMessageTime: lastTime.toISOString(),
            sector_id: c.sector_id,
            assigned_to: c.assigned_to,
            support_status: c.support_status,
            created_by: c.created_by,
            created_at: c.created_at
          };
        })
      );

      setChannels(channelsWithUnread);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const markChannelAsRead = async (channelId: string) => {
    if (!userId) return;
    try {
      await supabase
        .from('chat_channel_members')
        .update({ last_read_at: new Date().toISOString() } as any)
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      // Zerar badge localmente
      if (channelId === selectedChannelIdRef.current) {
        setChannels(prev =>
          prev.map(ch =>
            ch.id === channelId ? { ...ch, unreadCount: 0 } : ch
          )
        );
      }
    } catch (error) {
      console.error('Error marking channel as read:', error);
    }
  };

  const markMessageAsUnread = async (messageId: string, channelId: string) => {
    if (!userId) return;
    try {
      const { data: message } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('id', messageId)
        .single();

      let unreadTimestamp = new Date().toISOString();
      if (message) {
        const dt = new Date(message.created_at);
        dt.setMilliseconds(dt.getMilliseconds() - 1);
        unreadTimestamp = dt.toISOString();
      }

      await supabase
        .from('chat_channel_members')
        .update({ last_read_at: unreadTimestamp } as any)
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      setChannels(prev =>
        prev.map(ch =>
          ch.id === channelId ? { ...ch, unreadCount: Math.max(ch.unreadCount || 1, 1) } : ch
        )
      );

      setSelectedChannelId(null);
    } catch (error) {
      console.error('Error marking message as unread:', error);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return;

    setMessages(prev => {
      const current = prev[selectedChannelId!] || [];
      const msg = current.find(m => m.id === messageId);
      if (!msg) return prev;

      const reactions = msg.reactions || [];
      const existingReaction = reactions.find(r => r.emoji === emoji && r.user_id === userId);

      const newReactions = existingReaction
        ? reactions.filter(r => r.id !== existingReaction.id)
        : [...reactions, { id: 'temp-' + Date.now(), message_id: messageId, user_id: userId, emoji }];

      return {
        ...prev,
        [selectedChannelId!]: current.map(m => m.id === messageId ? { ...m, reactions: newReactions } : m)
      };
    });

    try {
      const { data: existing } = await supabase
        .from('chat_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        await supabase.from('chat_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('chat_reactions').insert({
          message_id: messageId,
          user_id: userId,
          emoji: emoji
        });
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Re-fetch to fix optimistic ui failure
      if (selectedChannelId) fetchMessages(selectedChannelId);
    }
  };

  const handleStartDirectChat = async (contactId: string) => {
    if (!userId || creatingDirect) return;
    setCreatingDirect(true);

    try {
      // 1. Criar nome determinístico
      const participants = [userId, contactId].sort();
      const directChannelName = `${participants[0]}-${participants[1]}`;

      // 2. Buscar ou criar o canal
      let channelId: string;
      const { data: existingChannel, error: searchError } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('name', directChannelName)
        .eq('type', 'direct')
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingChannel) {
        channelId = existingChannel.id;
      } else {
        const { data: newChannel, error: createError } = await supabase
          .from('chat_channels')
          .insert([{
            name: directChannelName,
            type: 'direct',
            created_by: userId
          }])
          .select()
          .single();

        if (createError) throw createError;
        channelId = newChannel.id;
      }

      // 3. Garantir que ambos são membros (importante para resiliência)
      const { error: membersError } = await supabase
        .from('chat_channel_members')
        .upsert([
          { channel_id: channelId, user_id: userId, role: 'admin' },
          { channel_id: channelId, user_id: contactId, role: 'member' }
        ], { onConflict: 'channel_id,user_id', ignoreDuplicates: true });

      if (membersError) throw membersError;

      // 4. Sincronizar estado e abrir
      await fetchChannels(userId);
      setSelectedChannelId(channelId);
      setActiveTab('chats');
    } catch (error) {
      console.error('Error starting direct chat:', error);
      alert('Falha ao iniciar conversa');
      setCreatingDirect(false);
    }
  };

  const handleStartSupportTicket = async () => {
    if (!userId || !currentUser || !supportSectorId) return;

    try {
      setIsCreatingSupport(true);
      const sector = sectors.find(s => s.id === supportSectorId);

      // 1. Verificar se já existem canais de suporte deste setor
      const { data: channelsWithSector, error: channelsError } = await supabase
        .from('chat_channels')
        .select('id')
        .eq('type', 'support')
        .eq('sector_id', supportSectorId);

      if (channelsError) throw channelsError;

      const channelIds = (channelsWithSector || []).map(c => c.id);
      if (channelIds.length > 0) {
        // 2. Verificar se o cliente já é membro de algum desses canais
        const { data: clientMemberships, error: membersError } = await supabase
          .from('chat_channel_members')
          .select('channel_id')
          .eq('user_id', userId)
          .in('channel_id', channelIds);

        if (membersError) throw membersError;

        if (clientMemberships && clientMemberships.length > 0) {
          const sectorName = sector?.name || 'Geral';
          
          // Abre o modal personalizado de duplicidade e fecha o modal de criação
          const existingChannelId = clientMemberships[0].channel_id;
          setIsSupportCreateModalOpen(false);
          setSupportSectorId('');
          
          setDuplicateModal({
            isOpen: true,
            sectorName,
            existingChannelId,
            type: 'client'
          });
          return;
        }
      }

      const channelName = `Atendimento - ${currentUser.full_name} (${sector?.name || 'Geral'})`;

      // INSERT apenas com as colunas originais para evitar erro 400 de cache do PostgREST
      const { data: newChannel, error: createError } = await supabase
        .from('chat_channels')
        .insert([{
          name: channelName,
          type: 'support',
          created_by: userId
        }])
        .select()
        .single();

      if (createError) throw createError;
      const channelId = newChannel.id;

      // UPDATE separado para as colunas novas (sector_id e status) 
      await supabase
        .from('chat_channels')
        .update({ sector_id: supportSectorId, status: 'open' } as any)
        .eq('id', channelId);

      // Pegar todos os usuários do escritório (não-clientes)
      const { data: staffMembers } = await supabase
        .from('profiles')
        .select('id')
        .neq('role', 'cliente');

      const membersToInsert = [
        { channel_id: channelId, user_id: userId, role: 'admin' }
      ];

      if (staffMembers) {
        staffMembers.forEach(staff => {
           membersToInsert.push({ channel_id: channelId, user_id: staff.id, role: 'member' });
        });
      }

      const { error: membersError } = await supabase
        .from('chat_channel_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      await fetchChannels(userId);
      setSelectedChannelId(channelId);
      setIsSupportCreateModalOpen(false);
      setSupportSectorId('');
      setActiveTab('chats');
    } catch (error) {
      console.error('Error starting support ticket:', error);
      alert('Falha ao iniciar atendimento.');
    } finally {
      setIsCreatingSupport(false);
    }
  };

  const handleStartSupportTicketForClient = async () => {
    if (!userId || !staffSupportClientId) return;

    try {
      setIsCreatingStaffSupport(true);
      const sector = sectors.find(s => s.id === staffSupportSectorId);
      const client = clientProfiles.find(c => c.id === staffSupportClientId);

      // Se tiver setor selecionado, faz a validação de duplicidade
      if (staffSupportSectorId) {
        // 1. Buscar canais de suporte com o sector_id selecionado
        const { data: channelsWithSector, error: channelsError } = await supabase
          .from('chat_channels')
          .select('id')
          .eq('type', 'support')
          .eq('sector_id', staffSupportSectorId);

        if (channelsError) throw channelsError;

        const channelIds = (channelsWithSector || []).map(c => c.id);
        if (channelIds.length > 0) {
          // 2. Verificar se o cliente selecionado é membro de algum desses canais
          const { data: clientMemberships, error: membersError } = await supabase
            .from('chat_channel_members')
            .select('channel_id')
            .eq('user_id', staffSupportClientId)
            .in('channel_id', channelIds);

          if (membersError) throw membersError;

          if (clientMemberships && clientMemberships.length > 0) {
            const sectorName = sector?.name || 'Geral';
            
            // Abre o modal personalizado de duplicidade e fecha o modal de criação
            const existingChannelId = clientMemberships[0].channel_id;
            setIsStaffSupportModalOpen(false);
            setStaffSupportClientId('');
            setStaffSupportSectorId('');

            setDuplicateModal({
              isOpen: true,
              sectorName,
              clientName: client?.full_name || 'Cliente',
              existingChannelId,
              type: 'staff'
            });
            return;
          }
        }
      }

      const channelName = `Atendimento - ${client?.full_name || 'Cliente'}${sector ? ` (${sector.name})` : ''}`;

      const { data: newChannel, error: createError } = await supabase
        .from('chat_channels')
        .insert([{
          name: channelName,
          type: 'support',
          created_by: userId
        }])
        .select()
        .single();

      if (createError) throw createError;
      const channelId = newChannel.id;

      // UPDATE separado p/ colunas novas
      if (staffSupportSectorId) {
        await supabase
          .from('chat_channels')
          .update({ sector_id: staffSupportSectorId, status: 'open' } as any)
          .eq('id', channelId);
      } else {
        await supabase
          .from('chat_channels')
          .update({ status: 'open' } as any)
          .eq('id', channelId);
      }

      // Pegar todos os membros do escritório
      const { data: staffMembers } = await supabase
        .from('profiles')
        .select('id')
        .neq('role', 'cliente');

      const membersToInsert: any[] = [
        { channel_id: channelId, user_id: staffSupportClientId, role: 'member' }
      ];

      if (staffMembers) {
        staffMembers.forEach(staff => {
          membersToInsert.push({ channel_id: channelId, user_id: staff.id, role: staff.id === userId ? 'admin' : 'member' });
        });
      }

      const { error: membersError } = await supabase
        .from('chat_channel_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      await fetchChannels(userId);
      setSelectedChannelId(channelId);
      setIsStaffSupportModalOpen(false);
      setStaffSupportClientId('');
      setStaffSupportSectorId('');
      setActiveTab('support');
    } catch (error) {
      console.error('Error creating support ticket for client:', error);
      alert('Falha ao iniciar atendimento.');
    } finally {
      setIsCreatingStaffSupport(false);
    }
  };

  const handleAssignToMe = async (channelId: string) => {
    if (!userId) return;
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      // Buscar o status atual do canal para saber se estava resolvido
      const { data: currentChannel } = await supabase
        .from('chat_channels')
        .select('support_status')
        .eq('id', channelId)
        .single();

      const wasResolved = currentChannel?.support_status === 'resolved';

      // Garantir que o operador é membro do canal antes de assumir e enviar a mensagem de sistema
      const { data: isMember } = await supabase
        .from('chat_channel_members')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!isMember) {
        await supabase.from('chat_channel_members').insert({
          channel_id: channelId,
          user_id: userId,
          role: 'member'
        });
      }

      const { error } = await supabase
        .from('chat_channels')
        .update({ 
          assigned_to: userId,
          support_status: 'in_progress',
          status: 'open'
        } as any)
        .eq('id', channelId);
        
      if (error) throw error;
      
      const systemText = wasResolved
        ? `Atendimento retomado por ${userProfile?.full_name || 'Operador'}.`
        : `${userProfile?.full_name || 'Operador'} iniciou o atendimento.`;

      await supabase.from('chat_messages').insert({
        channel_id: channelId,
        sender_id: userId,
        text: systemText,
        status: 'sent',
        is_system: true
      } as any);
      
      await fetchChannels(userId);
    } catch (e) {
      console.error('Error assigning support ticket to me:', e);
    }
  };

  const executeFinishSupportTicket = async () => {
    if (!selectedChannelId || !userId) return;
    
    setIsFinishingSupport(true);
    const finishedChannelId = selectedChannelId;
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      await supabase.from('chat_channels').update({ 
        support_status: 'resolved',
        assigned_to: null
      } as any).eq('id', finishedChannelId);
      
      await supabase.from('chat_messages').insert({
        channel_id: finishedChannelId,
        sender_id: userId,
        text: `Atendimento finalizado por ${userProfile?.full_name || 'Operador'}.`,
        status: 'sent',
        is_system: true
      } as any);

      setSelectedChannelId(null);
      setActiveTab(currentUser?.role === 'cliente' ? 'chats' : 'support');
      setShowSidebarOnMobile(true);

      await fetchChannels(userId);
    } catch (error) {
      console.error('Error closing support ticket:', error);
    } finally {
      setIsFinishingSupport(false);
      setIsFinishModalOpen(false);
    }
  };

  const handleTransferSupportTicket = async () => {
    if (!selectedChannelId || !userId || !transferUserId) return;

    setIsTransferring(true);
    try {
      const channel = channels.find(c => c.id === selectedChannelId);
      const targetUser = profiles.find(p => p.id === transferUserId);
      const currentUserProfile = currentUser;
      
      if (!channel || !targetUser) throw new Error('Canal ou colaborador não encontrado');

      let newSectorId = transferSectorId || channel.sector_id || null;
      let newName = channel.name;

      if (transferSectorId) {
        const newSector = sectors.find(s => s.id === transferSectorId);
        if (newSector) {
          const oldName = channel.name || '';
          if (oldName.includes('(')) {
            newName = `${oldName.split('(')[0].trim()} (${newSector.name})`;
          } else {
            newName = `${oldName} (${newSector.name})`;
          }
        }
      }

      const { error: updateError } = await supabase
        .from('chat_channels')
        .update({ 
          assigned_to: transferUserId,
          support_status: 'in_progress',
          sector_id: newSectorId,
          name: newName
        } as any)
        .eq('id', selectedChannelId);

      if (updateError) throw updateError;

      const { data: isMember } = await supabase
        .from('chat_channel_members')
        .select('*')
        .eq('channel_id', selectedChannelId)
        .eq('user_id', transferUserId)
        .maybeSingle();

      if (!isMember) {
        await supabase.from('chat_channel_members').insert({
          channel_id: selectedChannelId,
          user_id: transferUserId,
          role: 'member'
        });
      }

      await supabase.from('chat_messages').insert({
        channel_id: selectedChannelId,
        sender_id: userId,
        text: `Atendimento transferido para ${targetUser.full_name} por ${currentUserProfile?.full_name || 'Operador'}.`,
        status: 'sent',
        is_system: true
      } as any);

      setIsTransferModalOpen(false);
      setTransferUserId('');
      setTransferSectorId('');
      await fetchChannels(userId);
    } catch (error) {
      console.error('Error transferring ticket:', error);
      alert('Erro ao transferir atendimento.');
    } finally {
      setIsTransferring(false);
    }
  };

  const startCall = async (isVideoEnabled: boolean) => {
    if (!selectedChannelId || !userId) return;

    try {
      const safeRoomName = `TaskAccount_${selectedChannelId.replace(/-/g, '')}`;
      const url = await getOrCreateDailyRoom(safeRoomName);

      setCallState({ isOpen: true, isVideoEnabled, roomUrl: url });

      const messageText = isVideoEnabled
        ? '📹 Iniciei uma chamada de vídeo. Clique no ícone de câmera acima ou no botão Atender para entrar.'
        : '📞 Iniciei uma chamada de áudio. Clique no ícone de telefone acima ou no botão Atender para entrar.';

      await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannelId,
          contact_id: null as any,
          sender_id: userId,
          text: messageText,
          status: 'sent',
          is_me: true
        });

      // --- Sinalização de chamada via Broadcast ---
      const { data: members } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', selectedChannelId)
        .neq('user_id', userId);

      if (members) {
        for (const m of members) {
          await (supabase as any).from('chat_calls').insert({
            caller_id: userId,
            target_id: m.user_id,
            channel_id: selectedChannelId,
            is_video: isVideoEnabled,
            status: 'pending'
          });
        }
      }
    } catch (e) {
      console.error('Failed to send call start message or create room', e);
      alert('Não foi possível iniciar a chamada devido a falha de conexão.');
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessageInput(prev => prev + emojiData.emoji);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB
        alert('O arquivo selecionado é muito grande. Tamanho máximo: 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && !selectedFile) || !selectedChannelId || !userId) return;

    const selectedChannel = enrichedChannels.find(c => c.id === selectedChannelId);
    const isSupport = selectedChannel?.type === 'support';
    const isClosed = selectedChannel?.status === 'closed' || selectedChannel?.support_status === 'resolved';

    const textToSend = messageInput.trim();
    const tempId = `temp-${Date.now()}`;
    const fileToSend = selectedFile;

    setMessageInput('');
    clearSelectedFile();
    setShowEmojiPicker(false);

    const optimisticMsg: Message = {
      id: tempId,
      sender_id: userId,
      text: textToSend,
      created_at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent',
      reply_to_id: replyingTo ? replyingTo.id : undefined
    };

    setReplyingTo(null);

    setMessages(prev => ({
      ...prev,
      [selectedChannelId]: [...(prev[selectedChannelId] || []), optimisticMsg]
    }));

    try {
      if (isSupport) {
        // Obter perfil do usuário
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', userId)
          .single();

        const isUserClient = userProfile?.role === 'cliente' || selectedChannel?.created_by === userId;
        const isStaff = !isUserClient;

        if (isUserClient && isClosed) {
          console.log("[Reabertura] Reabrindo atendimento pelo cliente/criador...");
          const { error: updateError } = await supabase
            .from('chat_channels')
            .update({
              status: 'open',
              support_status: 'pending',
              assigned_to: null
            } as any)
            .eq('id', selectedChannelId);

          if (updateError) {
            console.error("[Reabertura] Erro ao reabrir canal pelo cliente:", updateError);
            throw updateError;
          }

          const { error: systemMsgError } = await supabase
            .from('chat_messages')
            .insert({
              channel_id: selectedChannelId,
              sender_id: userId,
              text: `Atendimento reaberto pelo cliente.`,
              status: 'sent',
              is_system: true
            } as any);

          if (systemMsgError) {
            console.error("[Reabertura] Erro ao inserir mensagem de sistema pelo cliente:", systemMsgError);
            throw systemMsgError;
          }
          await fetchChannels(userId);
        } else if (isStaff && (isClosed || selectedChannel?.support_status === 'pending' || selectedChannel?.assigned_to === null)) {
          console.log("[Reabertura] Atribuindo/Retomando atendimento pelo operador...");
          
          // Garantir associação de membro do operador no canal
          const { data: isMember } = await supabase
            .from('chat_channel_members')
            .select('id')
            .eq('channel_id', selectedChannelId)
            .eq('user_id', userId)
            .maybeSingle();

          if (!isMember) {
            await supabase.from('chat_channel_members').insert({
              channel_id: selectedChannelId,
              user_id: userId,
              role: 'member'
            });
          }

          const { error: updateError } = await supabase
            .from('chat_channels')
            .update({
              status: 'open',
              support_status: 'in_progress',
              assigned_to: userId
            } as any)
            .eq('id', selectedChannelId);

          if (updateError) {
            console.error("[Reabertura] Erro ao atualizar canal pelo operador:", updateError);
            throw updateError;
          }

          const systemText = isClosed 
            ? `Atendimento retomado por ${userProfile?.full_name || 'Operador'}.`
            : `Atendimento assumido por ${userProfile?.full_name || 'Operador'}.`;

          const { error: systemMsgError } = await supabase
            .from('chat_messages')
            .insert({
              channel_id: selectedChannelId,
              sender_id: userId,
              text: systemText,
              status: 'sent',
              is_system: true
            } as any);

          if (systemMsgError) {
            console.error("[Reabertura] Erro ao inserir mensagem de sistema pelo operador:", systemMsgError);
            throw systemMsgError;
          }
          await fetchChannels(userId);
        }
      }

      let attachmentUrl = null;
      let fileType = null;
      let fileName = null;
      let fileSize = null;

      if (fileToSend) {
        setUploadProgress(10);
        const fileExt = fileToSend.name.split('.').pop();
        const filePath = `${selectedChannelId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, fileToSend);

        // OBS: o SDK do supabase.storage client em algumas versões não suporta o parâmetro onUploadProgress no método upload() nativamente.
        // Simulando o carregamento rápido para UX
        setUploadProgress(100);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        fileName = fileToSend.name;
        fileType = fileToSend.type;
        fileSize = fileToSend.size;
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannelId,
          contact_id: null as any,
          sender_id: userId,
          text: textToSend,
          status: 'sent',
          is_me: true,
          attachment_url: attachmentUrl,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          reply_to_id: optimisticMsg.reply_to_id || null
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      // Remover a mensagem otimista em caso de falha
      setMessages(prev => ({
        ...prev,
        [selectedChannelId]: (prev[selectedChannelId] || []).filter(m => m.id !== tempId)
      }));
      alert('Falha ao enviar mensagem');
    }
  };
  const teamItems = React.useMemo(() => {
    if (currentUser?.role === 'cliente') return [];
    
    // 1. Canais de grupo ativos
    const groupChannels = enrichedChannels.filter(c => c.type === 'group' && c.status !== 'closed');
    
    // 2. Perfis da equipe (não-clientes)
    const staffProfiles = profiles.filter(p => (p.role === 'gestor' || p.role === 'operacional') && p.id !== userId);
    
    // 3. Mapear perfis para itens de chat (associando canais diretos se existirem)
    const staffItems = staffProfiles.map(profile => {
      const channel = enrichedChannels.find(c => 
        c.type === 'direct' && (c.rawName.startsWith(profile.id) || c.rawName.endsWith(profile.id))
      );
      
      if (channel) {
        return { ...channel, isProfile: false, profileId: profile.id };
      } else {
        return {
          id: `profile-${profile.id}`,
          name: profile.full_name || 'Usuário',
          rawName: `${userId}-${profile.id}`,
          type: 'direct',
          unreadCount: 0,
          lastMessage: profile.sector || 'Sem Setor',
          lastMessageTime: '',
          avatar_url: profile.avatar_url,
          fallbackAvatar: profile.full_name?.substring(0, 2).toUpperCase() || 'DM',
          contactStatus: 'offline', // simplistic for now
          isProfile: true,
          profileId: profile.id
        };
      }
    });

    const combined = [...groupChannels, ...staffItems].filter(item => {
      const searchTerm = contactSearchTerm.toLowerCase();
      return item.name.toLowerCase().includes(searchTerm) || 
             (item.lastMessage || '').toLowerCase().includes(searchTerm);
    });

    return combined.sort((a, b) => {
      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [enrichedChannels, profiles, contactSearchTerm, currentUser, userId]);

  const supportCounts = React.useMemo(() => {
    let queue = 0;
    let mine = 0;
    let all = 0;

    channels.forEach(c => {
      if (c.type === 'support') {
        const isClosed = c.support_status === 'resolved' || c.status === 'closed';
        if (!isClosed) {
          all++;
          if (!c.assigned_to) {
            queue++;
          }
          if (c.assigned_to === userId) {
            mine++;
          }
        }
      }
    });

    return { queue, mine, all };
  }, [channels, userId]);

  const filteredChannels = enrichedChannels.filter(channel => {
    if (!channel.name?.toLowerCase().includes(contactSearchTerm.toLowerCase())) return false;

    // Filtro por Setor (Suporte)
    if (activeTab === 'support' && selectedSectorFilterId && channel.sector_id !== selectedSectorFilterId) {
      return false;
    }
    
    if (currentUser?.role === 'cliente') {
      return channel.type === 'support';
    } else {
      // Para o escritório, a aba 'chats' (Equipe) agora é handled pelo teamItems
      if (activeTab === 'chats') return false; 
      if (activeTab === 'support') {
        if (channel.type !== 'support') {
          return false;
        }
        // Sub-filtros de atendimento para staff
        if (supportSubTab === 'queue') {
          return !channel.assigned_to && channel.support_status !== 'resolved' && channel.status !== 'closed';
        }
        if (supportSubTab === 'mine') {
          return channel.assigned_to === userId && channel.support_status !== 'resolved' && channel.status !== 'closed';
        }
        // 'all' (Todos - mostra ativos e encerrados/resolvidos)
        return true;
      }
      return false;
    }
  });

  const sortedFilteredChannels = React.useMemo(() => {
    const list = [...filteredChannels];
    list.sort((a, b) => {
      const aIsClosed = a.support_status === 'resolved' || a.status === 'closed';
      const bIsClosed = b.support_status === 'resolved' || b.status === 'closed';
      
      if (aIsClosed && !bIsClosed) return 1;
      if (!aIsClosed && bIsClosed) return -1;
      
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
    return list;
  }, [filteredChannels]);

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.full_name?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
      profile.sector?.toLowerCase().includes(contactSearchTerm.toLowerCase());
    
    // Na aba de contatos, mostrar apenas equipe/colaboradores (não clientes)
    // Clientes devem ser atendidos pela aba 'Suporte' (Clientes)
    const isStaff = profile.role !== 'cliente';
    
    return matchesSearch && isStaff;
  });

  return (
    <div className="flex h-[calc(100vh-6.5rem)] md:h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 border-x border-b md:border border-slate-200 dark:border-slate-800 md:rounded-xl overflow-hidden shadow-sm relative -mx-4 -mb-4 md:mx-0 md:mb-0">

      {/* Sidebar - Contact List */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden h-full flex-col bg-slate-50/50 dark:bg-slate-950/30 absolute md:relative z-10 ${showSidebarOnMobile ? 'w-full flex' : 'w-0 hidden md:flex'} ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 border-r border-transparent pointer-events-none' : 'md:w-80 md:opacity-100 border-r border-slate-200 dark:border-slate-800'}`}>
        <div className="w-80 h-full flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="tooltip-container tooltip-bottom">
                <button 
                  className="hidden md:flex p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/50"
                  onClick={() => setIsSidebarCollapsed(true)}
                >
                  <PanelLeft size={18} />
                </button>
                <span className="tooltip-content">Encolher</span>
              </div>
              
              <div className="flex flex-col text-left">
                <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                  Chat
                </h1>
                <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="tooltip-container tooltip-bottom">
                <div className="relative" ref={statusMenuRef}>
                  <button
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className="flex items-center gap-2 h-[38px] px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[currentUser?.chat_status || 'disponível']}`} />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize hidden sm:inline-block">
                      {currentUser?.chat_status || 'Disponível'}
                    </span>
                  </button>

                  {showStatusMenu && (
                    <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50">
                      {(['disponível', 'ocupado', 'ausente', 'almoço', 'férias'] as const).map(status => (
                        <button
                          key={status}
                          onClick={() => updateChatStatus(status)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                        >
                          <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                          <span className="capitalize">{status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="tooltip-content">Alterar Status</span>
              </div>
              {currentUser?.role !== 'cliente' ? (
                <>
                  {activeTab === 'support' ? (
                    <div className="tooltip-container tooltip-bottom">
                      <button
                        onClick={() => { fetchClients(); setIsStaffSupportModalOpen(true); }}
                        className="w-[38px] h-[38px] flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                      <span className="tooltip-content">Novo Atendimento para Cliente</span>
                    </div>
                  ) : (
                    <div className="tooltip-container tooltip-bottom">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-[38px] h-[38px] flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                      <span className="tooltip-content">Novo Grupo</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="tooltip-container tooltip-bottom">
                  <button
                    onClick={() => setIsSupportCreateModalOpen(true)}
                    className="w-[38px] h-[38px] flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                  <span className="tooltip-content">Novo Atendimento</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-3">
          {activeTab === 'support' && currentUser?.role !== 'cliente' && (
            <div className="flex flex-col gap-1.5 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                Filtrar por Setor
              </label>
              <select
                value={selectedSectorFilterId}
                onChange={(e) => setSelectedSectorFilterId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '0.75rem' }}
              >
                <option value="">Todos os Setores</option>
                {sectors.map(sector => (
                  <option key={sector.id} value={sector.id}>{sector.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder={activeTab === 'contacts' ? "Buscar equipe..." : "Buscar conversas..."}
              value={contactSearchTerm}
              onChange={(e) => setContactSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>

          {activeTab === 'support' && currentUser?.role !== 'cliente' && (
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                type="button"
                onClick={() => setSupportSubTab('queue')}
                className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  supportSubTab === 'queue'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>Fila</span>
                {supportCounts.queue > 0 && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-colors ${
                    supportSubTab === 'queue'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {supportCounts.queue}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSupportSubTab('mine')}
                className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  supportSubTab === 'mine'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>Meus</span>
                {supportCounts.mine > 0 && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-colors ${
                    supportSubTab === 'mine'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {supportCounts.mine}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSupportSubTab('all')}
                className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  supportSubTab === 'all'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>Todos</span>
                {supportCounts.all > 0 && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full transition-colors ${
                    supportSubTab === 'all'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {supportCounts.all}
                  </span>
                )}
              </button>
            </div>
          )}
          </div>

        </div>

        {currentUser?.role !== 'cliente' && (
          <div className="px-4 py-2 shrink-0 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex p-1 bg-slate-100/80 dark:bg-slate-900/50 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
              <button
                onClick={() => { setActiveTab('chats'); setSelectedChannelId(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'chats'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Users size={14} />
                <span>Equipe</span>
              </button>
              <button
                onClick={() => { setActiveTab('support'); setSelectedChannelId(null); }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'support'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <MessageSquare size={14} />
                <span>Clientes</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {activeTab === 'chats' && currentUser?.role !== 'cliente' ? (
            teamItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">Nenhum membro ou grupo encontrado.</div>
            ) : teamItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if ((item as any).isProfile) {
                    handleStartDirectChat((item as any).profileId);
                  } else {
                    setSelectedChannelId(item.id);
                  }
                  setShowSidebarOnMobile(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedChannelId === item.id
                  ? 'bg-indigo-50 dark:bg-indigo-500/10'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold overflow-hidden">
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      item.fallbackAvatar
                    )}
                  </div>
                  {item.type === 'direct' && (
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${(item as any).contactStatus ? STATUS_COLORS[(item as any).contactStatus] : STATUS_COLORS['disponível']}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm font-semibold truncate ${selectedChannelId === item.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                      {item.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate ${item.unreadCount > 0 ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500'}`}>
                      {item.lastMessage}
                    </p>
                    {item.unreadCount > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (activeTab === 'support' || currentUser?.role === 'cliente') ? (
            sortedFilteredChannels.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">Nenhuma conversa encontrada.</div>
            ) : sortedFilteredChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => {
                  setSelectedChannelId(channel.id);
                  setShowSidebarOnMobile(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedChannelId === channel.id
                  ? 'bg-indigo-50 dark:bg-indigo-500/10'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold overflow-hidden">
                    {channel.avatar_url ? (
                      <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      channel.fallbackAvatar
                    )}
                  </div>
                  {(channel.type === 'direct' || channel.type === 'support') && (channel as any).contactStatus && (
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${STATUS_COLORS[(channel as any).contactStatus]}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm font-semibold truncate ${selectedChannelId === channel.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                      {channel.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {channel.lastMessageTime ? new Date(channel.lastMessageTime).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                  {channel.type === 'support' && (
                    <div className="flex items-center gap-1.5 mb-1 animate-in fade-in duration-200">
                      {/* Badge de Atribuição (só para equipe) */}
                      {currentUser?.role !== 'cliente' && (
                        channel.assigned_to ? (
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium border border-slate-200/50 dark:border-slate-700/50">
                            {channel.assigned_to === userId 
                              ? (currentUser?.full_name?.split(' ')[0] || 'Eu') 
                              : (profiles.find(p => p.id === channel.assigned_to)?.full_name?.split(' ')[0] || 'Atendente')}
                          </span>
                        ) : (
                          channel.support_status !== 'resolved' && (
                            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-indigo-100/50 dark:border-indigo-900/30">
                              Fila
                            </span>
                          )
                        )
                      )}

                      {/* Badge do Setor (para todos: equipe e cliente) */}
                      {channel.sector_id && (
                        <span className="text-[9px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-semibold border border-blue-100/50 dark:border-blue-900/30">
                          {sectors.find(s => s.id === channel.sector_id)?.name || 'Suporte'}
                        </span>
                      )}

                      {/* Badge de Status (para todos: equipe e cliente) */}
                      {channel.support_status === 'resolved' ? (
                        <span className="text-[9px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-semibold border border-rose-100/50 dark:border-rose-900/30">
                          Fechado
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-semibold border border-emerald-100/50 dark:border-emerald-900/30">
                          Aberto
                        </span>
                      )}
                    </div>
                  )}
                  <p className={`text-xs truncate ${selectedChannelId === channel.id ? 'text-indigo-700/70 dark:text-indigo-300/70' : 'text-slate-500 dark:text-slate-400'}`}>
                    {channel.lastMessage}
                  </p>
                </div>
                {channel.unreadCount > 0 && (
                  <div className="shrink-0 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {channel.unreadCount}
                  </div>
                )}
              </button>
            ))
          ) : (
            filteredProfiles.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">Nenhum contato encontrado.</div>
            ) : filteredProfiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => {
                  handleStartDirectChat(profile.id);
                  setShowSidebarOnMobile(false);
                }}
                disabled={creatingDirect}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 text-left"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile.full_name?.substring(0, 2).toUpperCase() || 'UN'
                    )}
                  </div>
                  {(() => {
                    let isProfileOffline = true;
                    if (profile.current_session_start) {
                      const sessionStart = new Date(profile.current_session_start).getTime();
                      const lastActive = profile.last_active_at ? new Date(profile.last_active_at).getTime() : sessionStart;
                      if (Date.now() - lastActive < 30 * 60 * 1000) {
                        isProfileOffline = false;
                      }
                    }
                    return (
                      <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${STATUS_COLORS[isProfileOffline ? 'offline' : (profile.chat_status || 'disponível')]}`} />
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {profile.full_name || 'Usuário Sem Nome'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {profile.sector || 'Sem Setor'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>

      {/* Main Chat Area */}
      {selectedChannel ? (
        <div className={`flex-1 flex-col min-w-0 h-full ${!showSidebarOnMobile ? 'flex' : 'hidden md:flex'}`}>

          {/* Header */}
          <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                className="md:hidden p-1.5 mr-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => setShowSidebarOnMobile(true)}
              >
                <ArrowLeft size={20} />
              </button>
              {isSidebarCollapsed && (
                <div className="tooltip-container tooltip-bottom">
                  <button 
                    className="hidden md:flex p-1.5 mr-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/50"
                    onClick={() => setIsSidebarCollapsed(false)}
                  >
                    <PanelLeft size={20} />
                  </button>
                  <span className="tooltip-content">Expandir</span>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {selectedChannel.name}
                </h3>
                {selectedChannel.type === 'support' && selectedChannel.assigned_to && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Atendente: {selectedChannel.assigned_to === userId 
                      ? (currentUser?.full_name || 'Eu') 
                      : (profiles.find(p => p.id === selectedChannel.assigned_to)?.full_name || 'Desconhecido')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Busca e Favoritos */}
              <div className="relative group/search hidden sm:flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={messageSearchTerm}
                  onChange={(e) => setMessageSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-40 lg:w-48 bg-slate-50 dark:bg-slate-950/50 border border-transparent focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-slate-900 dark:text-white transition-all outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="tooltip-container tooltip-bottom">
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`p-2 rounded-lg transition-colors ${showFavoritesOnly ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-slate-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <Star size={20} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                </button>
                <span className="tooltip-content">Mostrar Apenas Favoritos</span>
              </div>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

              {/* Menu de Chamada de Áudio e Vídeo */}
              <div className="relative" ref={callMenuRef}>
                <div className="tooltip-container tooltip-bottom">
                  <button
                    onClick={() => setShowCallMenu(!showCallMenu)}
                    className={`p-2 rounded-lg transition-colors ${showCallMenu ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <PhoneOutgoing size={20} />
                  </button>
                  <span className="tooltip-content">Chamada</span>
                </div>

                {showCallMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        startCall(false);
                        setShowCallMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"
                    >
                      <Phone size={16} className="text-emerald-500" />
                      <span>Chamada de Áudio</span>
                    </button>
                    <button
                      onClick={() => {
                        startCall(true);
                        setShowCallMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"
                    >
                      <Video size={16} className="text-indigo-500" />
                      <span>Chamada de Vídeo</span>
                    </button>
                  </div>
                )}
              </div>

              {selectedChannel.type === 'group' && (
                <div className="tooltip-container tooltip-bottom">
                  <button
                    onClick={() => setIsGroupSettingsOpen(true)}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <MoreVertical size={20} />
                  </button>
                  <span className="tooltip-content">Configurações do Grupo</span>
                </div>
              )}

              {/* Menu de Ações de Atendimento (Assumir, Transferir, Concluir) */}
              {selectedChannel.type === 'support' && currentUser?.role !== 'cliente' && (
                <div className="relative animate-in fade-in duration-200" ref={supportActionsMenuRef}>
                  <div className="tooltip-container tooltip-bottom">
                    <button
                      onClick={() => setShowSupportActionsMenu(!showSupportActionsMenu)}
                      className={`p-2 rounded-lg transition-colors ${showSupportActionsMenu ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <MoreVertical size={20} />
                    </button>
                    <span className="tooltip-content">Ações de Atendimento</span>
                  </div>

                  {showSupportActionsMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {selectedChannel.support_status === 'resolved' ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleAssignToMe(selectedChannel.id);
                            setShowSupportActionsMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center gap-2 font-semibold"
                        >
                          <Users size={16} />
                          <span>Reabrir e Assumir</span>
                        </button>
                      ) : (
                        <>
                          {selectedChannel.assigned_to !== userId && (
                            <button
                              type="button"
                              onClick={() => {
                                handleAssignToMe(selectedChannel.id);
                                setShowSupportActionsMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"
                            >
                              <Users size={16} className="text-indigo-500" />
                              <span>Assumir</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setTransferSectorId(selectedChannel.sector_id || '');
                              setTransferUserId('');
                              setIsTransferModalOpen(true);
                              setShowSupportActionsMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2 font-medium"
                          >
                            <Shuffle size={16} className="text-slate-500" />
                            <span>Transferir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsFinishModalOpen(true);
                              setShowSupportActionsMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 font-semibold"
                          >
                            <CheckCheck size={16} />
                            <span>Concluir</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedChannel.type === 'support' && currentUser?.role === 'cliente' && selectedChannel.support_status !== 'resolved' && (
                <div className="tooltip-container tooltip-bottom">
                  <button
                    onClick={() => setIsFinishModalOpen(true)}
                    className="p-2 text-rose-500 hover:text-white rounded-lg hover:bg-rose-500 transition-colors"
                  >
                    <CheckCheck size={20} />
                  </button>
                  <span className="tooltip-content">Finalizar Atendimento</span>
                </div>
              )}
              {selectedChannel.type !== 'group' && selectedChannel.type !== 'support' && (
                <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <MoreVertical size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/50">
            {displayedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p className="text-sm">{currentMessages.length === 0 ? `Inicie a conversa em ${selectedChannel.name}` : 'Nenhuma mensagem encontrada.'}</p>
              </div>
            ) : (
              displayedMessages.map((msg) => {
                const senderProfile = !msg.isMe ? profiles.find(p => p.id === msg.sender_id) : null;
                const senderName = msg.isMe ? (currentUser?.full_name || 'Eu') : (senderProfile?.full_name || (selectedChannel.type === 'group' ? 'Membro' : selectedChannel.name));
                const senderInitials = senderName.substring(0, 2).toUpperCase();

                if (msg.is_system) {
                  // Limpar o prefixo [Atendimento] caso exista (útil para retrocompatibilidade com registros antigos)
                  let cleanText = msg.text;
                  if (cleanText.startsWith('[Atendimento]')) {
                    cleanText = cleanText.replace(/^\[Atendimento\]\s*/, '');
                  }

                  // Determinar o tipo de checkpoint baseado nas palavras-chave do texto para aplicar cores e ícones premium
                  let bgClass = "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400";
                  let IconComponent = MessageSquare;
                  let iconColor = "text-slate-500 dark:text-slate-400";

                  const textLower = cleanText.toLowerCase();
                  if (textLower.includes('iniciou') || textLower.includes('iniciado')) {
                    // Início do atendimento
                    bgClass = "bg-blue-50/75 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-100/10";
                    IconComponent = MessageSquare;
                    iconColor = "text-blue-500 dark:text-blue-400";
                  } else if (textLower.includes('reaberto') || textLower.includes('retomado') || textLower.includes('assumido')) {
                    // Reabertura / Retomada / Assumido
                    bgClass = "bg-amber-50/75 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-100/10";
                    IconComponent = RotateCcw;
                    iconColor = "text-amber-500 dark:text-amber-400";
                  } else if (textLower.includes('transferido') || textLower.includes('transferência')) {
                    // Transferência
                    bgClass = "bg-purple-50/75 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm shadow-purple-100/10";
                    IconComponent = Shuffle;
                    iconColor = "text-purple-500 dark:text-purple-400";
                  } else if (textLower.includes('finalizado') || textLower.includes('concluído')) {
                    // Finalização
                    bgClass = "bg-emerald-50/75 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 shadow-sm shadow-emerald-100/10";
                    IconComponent = CheckCheck;
                    iconColor = "text-emerald-500 dark:text-emerald-400";
                  }

                  return (
                    <div
                      key={msg.id}
                      className="flex justify-center w-full my-3.5 animate-in fade-in zoom-in-95 duration-200"
                    >
                      <div className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-full text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)] max-w-[90%] text-center ${bgClass}`}>
                        <IconComponent size={13} className={`${iconColor} shrink-0`} />
                        <span>{cleanText}</span>
                        <span className="text-[10px] opacity-50 shrink-0 font-normal ml-1 border-l border-current/20 pl-1.5">{msg.created_at}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[80%] ${msg.isMe ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`hidden md:flex shrink-0 w-8 h-8 rounded-full items-center justify-center text-[10px] font-bold ${msg.isMe
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                      }`}>
                      {senderInitials}
                    </div>

                    <div className={`group relative p-3 rounded-2xl shadow-sm text-sm flex flex-col ${msg.isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}>

                      {(selectedChannel.type === 'group' || selectedChannel.type === 'support') && (
                        <span className={`text-[10px] font-bold mb-1 ${msg.isMe ? 'text-indigo-100/90' : 'text-indigo-600 dark:text-indigo-400'}`}>
                          {senderName}
                        </span>
                      )}

                      {/* Msg Reply Render */}
                      {msg.reply_to_id && (
                        <div className={`mb-2 p-2.5 rounded-r-lg shadow-sm text-xs flex flex-col gap-0.5 border-l-4 ${msg.isMe ? 'bg-indigo-700/50 border-indigo-300 text-indigo-50' : 'bg-slate-100 dark:bg-slate-900/50 border-indigo-500 text-slate-600 dark:text-slate-300'}`}>
                          {(() => {
                            const repliedMsg = currentMessages.find(m => m.id === msg.reply_to_id);
                            if (!repliedMsg) return <span className="opacity-70 italic">Mensagem original não encontrada</span>;
                            const repliedSenderProfile = profiles.find(p => p.id === repliedMsg.sender_id);
                            const repliedSenderName = repliedMsg.isMe ? 'Você' : (repliedSenderProfile?.full_name || 'Usuário');

                            return (
                              <>
                                <span className={`font-bold ${msg.isMe ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}`}>{repliedSenderName}</span>
                                <span className="line-clamp-2 leading-relaxed opacity-90">{repliedMsg.text || 'Anexo'}</span>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      {/* Botões flutuantes Hover */}
                      <div className={`absolute -top-3 ${msg.isMe ? '-left-8' : '-right-8'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-20`}>
                        <button
                          onClick={() => setReactionMessageId(reactionMessageId === msg.id ? null : msg.id)}
                          title="Reagir"
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                        >
                          <Smile size={14} className="text-slate-400 hover:text-indigo-500" />
                        </button>
                        <button
                          onClick={() => setReplyingTo(msg)}
                          title="Responder"
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                        >
                          <Reply size={14} className="text-slate-400 hover:text-indigo-500" />
                        </button>
                        <button
                          onClick={() => markMessageAsUnread(msg.id, selectedChannelId!)}
                          title="Marcar como não lido"
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                        >
                          <EyeOff size={14} className="text-slate-400 hover:text-indigo-500" />
                        </button>
                        <button
                          onClick={() => toggleFavorite(msg.id)}
                          title={favoritedMessages.includes(msg.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                        >
                          <Star size={14} className={favoritedMessages.includes(msg.id) ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'} fill={favoritedMessages.includes(msg.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      {/* Emoji Picker Popover */}
                      {reactionMessageId === msg.id && (
                        <div className={`absolute z-50 ${msg.isMe ? 'right-0 -top-12' : 'left-0 -top-12'} shadow-xl rounded-xl custom-scrollbar overflow-hidden border border-slate-200 dark:border-slate-800 scale-75 origin-bottom`}>
                          <EmojiPicker
                            onEmojiClick={(emojiData) => {
                              toggleReaction(msg.id, emojiData.emoji);
                              setReactionMessageId(null);
                            }}
                            autoFocusSearch={false}
                            theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                            searchDisabled
                            skinTonesDisabled
                            width={250}
                            height={300}
                          />
                        </div>
                      )}

                      {msg.attachment_url && (
                        <div className="mb-2">
                          {msg.file_type?.startsWith('image/') ? (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                              <img src={msg.attachment_url} alt="Anexo" className="rounded-lg max-w-full max-h-60 object-contain cursor-pointer hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg ${msg.isMe ? 'bg-indigo-700/50 hover:bg-indigo-700' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600'} transition-colors`}>
                              <Paperclip size={16} />
                              <span className="truncate max-w-[150px] text-xs underline">{msg.file_name || 'Anexo'}</span>
                            </a>
                          )}
                        </div>
                      )}

                      {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                      <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${msg.isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                        <span>{msg.created_at}</span>
                        {msg.isMe && (
                          <span>
                            {msg.status === 'sent' && <Check size={12} />}
                            {msg.status === 'delivered' && <CheckCheck size={12} />}
                            {msg.status === 'read' && <CheckCheck size={12} className="text-blue-300" />}
                          </span>
                        )}
                      </div>

                      {/* Msg Reactions Render */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 -mb-1 z-10">
                          {Object.entries(
                            msg.reactions.reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([emoji, count]) => {
                            const iReacted = msg.reactions!.some(r => r.emoji === emoji && r.user_id === userId);
                            return (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className={`px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm border ${iReacted
                                  ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                  }`}
                              >
                                <span>{emoji}</span>
                                <span className={iReacted ? 'opacity-90' : 'opacity-70'}>{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 relative">
            {showEmojiPicker && (
              <div className="absolute bottom-[calc(100%+0.5rem)] right-4 z-50 shadow-xl rounded-xl custom-scrollbar overflow-hidden border border-slate-200 dark:border-slate-800">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  autoFocusSearch={false}
                  theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                />
              </div>
            )}

            {selectedFile && (
              <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl relative flex items-center gap-3 w-fit pr-10">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 overflow-hidden">
                  {selectedFile.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Paperclip size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {replyingTo && (
              <div className="mb-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl relative flex flex-col gap-1 w-full pr-10 border-l-4 border-l-indigo-500">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                  Respondendo a {replyingTo.isMe ? 'Você' : (profiles.find(p => p.id === replyingTo.sender_id)?.full_name || 'Usuário')}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate opacity-80">
                  {replyingTo.text || 'Anexo'}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {(() => {
              const isInputBlockedForStaff = selectedChannel?.type === 'support' && 
                                             selectedChannel?.support_status === 'resolved' && 
                                             currentUser?.role !== 'cliente';
              return (
                <form onSubmit={handleSendMessage} className="flex flex-col">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*, .pdf, .doc, .docx, .xls, .xlsx, .zip"
                    disabled={isInputBlockedForStaff}
                  />
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/50 p-2 rounded-xl border border-transparent transition-all">
                    {!isInputBlockedForStaff && (
                      <>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Paperclip size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = "image/*";
                              fileInputRef.current.click();
                              setTimeout(() => {
                                if (fileInputRef.current) fileInputRef.current.accept = "image/*, .pdf, .doc, .docx, .xls, .xlsx, .zip";
                              }, 100);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors hidden sm:block"
                        >
                          <ImageIcon size={20} />
                        </button>
                      </>
                    )}

                    {isInputBlockedForStaff ? (
                      <div className="flex-1 flex items-center justify-center bg-rose-50/60 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/40 rounded-lg py-2.5 px-4 text-xs font-semibold text-rose-700 dark:text-rose-400 select-none animate-in fade-in duration-200 w-full text-center">
                        <RotateCcw size={14} className="mr-2 animate-pulse text-rose-500 shrink-0" />
                        <span>Atendimento Finalizado! Utilize a opção <strong className="bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded text-rose-800 dark:text-rose-300 font-bold">[reabrir e assumir]</strong> disponível no menu de ações do chat.</span>
                      </div>
                    ) : (
                      <>
                        <textarea
                          ref={textareaRef}
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none py-2.5 max-h-32 min-h-[44px]"
                          rows={1}
                        />

                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-2 rounded-lg transition-colors hidden sm:block ${showEmojiPicker ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                          <Smile size={20} />
                        </button>
                        <button
                          type="submit"
                          disabled={(!messageInput.trim() && !selectedFile)}
                          className="relative p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm overflow-hidden shrink-0"
                        >
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div
                              className="absolute inset-0 bg-indigo-800 opacity-50 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          )}
                          <Send size={18} className="relative z-10" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400">
                      {isInputBlockedForStaff ? "Para interagir, clique no botão 'Reabrir e Assumir' nas Ações do cabeçalho" : "Pressione Enter para enviar"}
                    </p>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className={`flex-1 flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-950/30 text-slate-400 ${!showSidebarOnMobile ? 'flex' : 'hidden'} md:flex relative`}>
          {/* Barra superior com botão de expandir */}
          <div className="absolute top-0 left-0 right-0 h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
            <button
              className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setShowSidebarOnMobile(true)}
            >
              <ArrowLeft size={20} />
            </button>
            {isSidebarCollapsed && (
              <div className="tooltip-container tooltip-bottom hidden md:flex">
                <button
                  className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/50"
                  onClick={() => setIsSidebarCollapsed(false)}
                >
                  <PanelLeft size={18} />
                </button>
                <span className="tooltip-content">Expandir</span>
              </div>
            )}
          </div>

          {/* Conteúdo central */}
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <MoreVertical size={32} />
          </div>
          <p>Selecione uma conversa para começar</p>
        </div>
      )}

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          if (userId) fetchChannels(userId);
        }}
      />

      <GroupSettingsModal
        isOpen={isGroupSettingsOpen}
        onClose={() => setIsGroupSettingsOpen(false)}
        channelId={selectedChannelId || ''}
        channelName={selectedChannel?.name || ''}
        channelType={selectedChannel?.type || ''}
        onSuccess={() => {
          setIsGroupSettingsOpen(false);
          if (userId) fetchChannels(userId);
        }}
      />

      {/* Modal de Transferência de Atendimento */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transferir Atendimento"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsTransferModalOpen(false)} disabled={isTransferring}>
              Cancelar
            </Button>
            <Button 
              onClick={handleTransferSupportTicket} 
              disabled={isTransferring || !transferUserId}
              icon={isTransferring ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
            >
              {isTransferring ? 'Transferindo...' : 'Transferir'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selecione o colaborador para quem deseja transferir o atendimento e, opcionalmente, o novo setor.
          </p>
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Colaborador <span className="text-rose-500">*</span>
            </label>
            <select
              value={transferUserId}
              onChange={(e) => setTransferUserId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione o Colaborador</option>
              {profiles
                .filter(p => p.role !== 'cliente')
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.role})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider font-semibold">
              Setor <span className="text-slate-400 text-[10px]">(Opcional)</span>
            </label>
            <select
              value={transferSectorId}
              onChange={(e) => setTransferSectorId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Manter setor atual ou sem setor</option>
              {sectors.map(sector => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {selectedChannel && (
        <VideoCallModal
          isOpen={callState.isOpen}
          onClose={() => setCallState(prev => ({ ...prev, isOpen: false }))}
          channelId={selectedChannel.id}
          userName={currentUser?.full_name || 'Usuário'}
          roomName={selectedChannel.name}
          roomUrl={callState.roomUrl}
          isVideoEnabled={callState.isVideoEnabled}
        />
      )}

      {isSupportCreateModalOpen && (() => {
        const selectedSector = sectors.find(s => s.id === supportSectorId);
        const scopeList = selectedSector ? getSectorScope(selectedSector.name) : [];

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-all duration-300">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                <h2 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none flex items-center gap-2">
                  <Plus size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Novo Atendimento</span>
                </h2>
                <button
                  onClick={() => setIsSupportCreateModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Selecione o setor de destino para iniciar o seu chamado de suporte.
                </p>
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Setor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={supportSectorId}
                    onChange={(e) => setSupportSectorId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                  >
                    <option value="">Selecione um Setor</option>
                    {sectors.map(sector => (
                      <option key={sector.id} value={sector.id}>{sector.name}</option>
                    ))}
                  </select>
                </div>

                {scopeList.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-2">
                      Assuntos atendidos por este setor:
                    </div>
                    <ul className="grid grid-cols-1 gap-2">
                      {scopeList.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0 text-[10px] font-bold mt-0.5">
                            ✓
                          </span>
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-950/20">
                <button
                  onClick={() => setIsSupportCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartSupportTicket}
                  disabled={!supportSectorId || isCreatingSupport}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  {isCreatingSupport ? 'Iniciando...' : 'Iniciar Atendimento'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {isStaffSupportModalOpen && (() => {
        const selectedSector = sectors.find(s => s.id === staffSupportSectorId);
        const scopeList = selectedSector ? getSectorScope(selectedSector.name) : [];

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-all duration-300">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                <h2 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none flex items-center gap-2">
                  <Plus size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Iniciar Atendimento</span>
                </h2>
                <button
                  onClick={() => setIsStaffSupportModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Abra um canal de atendimento para um cliente específico.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cliente <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={staffSupportClientId}
                    onChange={(e) => setStaffSupportClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clientProfiles.map(client => (
                      <option key={client.id} value={client.id}>{client.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Setor <span className="text-slate-400 text-[10px] lowercase italic">(opcional)</span>
                  </label>
                  <select
                    value={staffSupportSectorId}
                    onChange={(e) => setStaffSupportSectorId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                  >
                    <option value="">Nenhum setor específico</option>
                    {sectors.map(sector => (
                      <option key={sector.id} value={sector.id}>{sector.name}</option>
                    ))}
                  </select>
                </div>

                {scopeList.length > 0 && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-2">
                      Assuntos atendidos por este setor:
                    </div>
                    <ul className="grid grid-cols-1 gap-2">
                      {scopeList.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0 text-[10px] font-bold mt-0.5">
                            ✓
                          </span>
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-950/20">
                <button
                  onClick={() => { setIsStaffSupportModalOpen(false); setStaffSupportClientId(''); setStaffSupportSectorId(''); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartSupportTicketForClient}
                  disabled={!staffSupportClientId || isCreatingStaffSupport}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  {isCreatingStaffSupport ? 'Criando...' : 'Iniciar Atendimento'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Confirmar Finalização */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => !isFinishingSupport && setIsFinishModalOpen(false)}
        title="Finalizar Atendimento"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Deseja realmente finalizar este atendimento? A conversa será marcada como encerrada.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="secondary"
              onClick={() => setIsFinishModalOpen(false)}
              disabled={isFinishingSupport}
            >
              Cancelar
            </Button>
            <Button
              onClick={executeFinishSupportTicket}
              disabled={isFinishingSupport}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isFinishingSupport ? 'Finalizando...' : 'Finalizar Atendimento'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Aviso de Atendimento Duplicado */}
      <Modal
        isOpen={duplicateModal.isOpen}
        onClose={() => setDuplicateModal(prev => ({ ...prev, isOpen: false }))}
        title={
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <AlertCircle size={22} className="shrink-0" />
            <span>Atendimento Existente</span>
          </div>
        }
      >
        <div className="space-y-4">
          {duplicateModal.type === 'client' ? (
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Já existe um atendimento para o setor <strong className="text-slate-900 dark:text-white">"{duplicateModal.sectorName}"</strong>. 
              Para manter o histórico das conversas unificado, utilize a conversa existente. Você pode reabri-la se necessário.
            </p>
          ) : (
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              O cliente <strong className="text-slate-900 dark:text-white">{duplicateModal.clientName}</strong> já possui um atendimento para o setor <strong className="text-slate-900 dark:text-white">"{duplicateModal.sectorName}"</strong>. 
              Para manter o histórico das conversas unificado, utilize a conversa existente.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="secondary"
              onClick={() => setDuplicateModal(prev => ({ ...prev, isOpen: false }))}
            >
              Fechar
            </Button>
            <Button
              onClick={() => handleGoToExistingChannel(duplicateModal.existingChannelId, duplicateModal.type)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
            >
              <MessageSquare size={16} />
              Acessar Conversa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};