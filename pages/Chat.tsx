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
  PhoneOff
} from 'lucide-react';
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
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  avatar_url?: string;
  fallbackAvatar?: string;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  role: string;
  status?: string;
  chat_status?: 'disponível' | 'ocupado' | 'ausente' | 'almoço' | 'férias';
}

const STATUS_COLORS: Record<string, string> = {
  'disponível': 'bg-emerald-500',
  'ocupado': 'bg-red-500',
  'ausente': 'bg-amber-500',
  'almoço': 'bg-blue-500',
  'férias': 'bg-slate-400'
};

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
}

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
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [creatingDirect, setCreatingDirect] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);

  // Favoritos
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoritedMessages, setFavoritedMessages] = useState<string[]>([]);

  // Resposta a
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Status Menu
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Emojis e Anexos
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return {
        ...channel,
        name: theirProfile?.full_name || 'Usuário Desconhecido',
        avatar_url: theirProfile?.avatar_url,
        fallbackAvatar: theirProfile?.full_name?.substring(0, 2).toUpperCase() || 'DM',
        contactStatus: theirProfile?.chat_status || 'disponível'
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
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
            // Só incrementar se NÃO for minha mensagem e NÃO estiver com o canal aberto no momento
            if (newMsg.sender_id !== userId && newMsg.channel_id !== selectedChannelIdRef.current) {
              setChannels(prev =>
                prev.map(ch =>
                  ch.id === newMsg.channel_id
                    ? { ...ch, unreadCount: (ch.unreadCount || 0) + 1 }
                    : ch
                )
              );
            }
          }
        )
        .subscribe();
      return sub;
    });

    return () => {
      globalSubs.forEach(sub => supabase.removeChannel(sub));
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
                ? { ...p, chat_status: updatedProfile.chat_status }
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
              reply_to_id: newMsg.reply_to_id
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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedChannelId, userId]);

  const fetchMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
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
        reply_to_id: msg.reply_to_id
      }));

      setMessages(prev => ({
        ...prev,
        [channelId]: formatted
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
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
      if (profile) setCurrentUser(profile);
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', uid)
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchChannels = async (uid?: string) => {
    const targetUid = uid || userId;
    if (!targetUid) return;

    try {
      // Buscar memberships com last_read_at
      const { data: memberData, error: memberError } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .eq('user_id', targetUid);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setChannels([]);
        return;
      }

      const channelIds = memberData.map((m: any) => m.channel_id);
      const lastReadMap: Record<string, string> = {};
      memberData.forEach((m: any) => {
        lastReadMap[m.channel_id] = m.last_read_at || '2000-01-01T00:00:00Z';
      });

      const { data: channelData, error: channelError } = await supabase
        .from('chat_channels')
        .select('*')
        .in('id', channelIds)
        .order('created_at', { ascending: false });

      if (channelError) throw channelError;

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

          return {
            id: c.id,
            name: channelName,
            rawName: c.name,
            type: c.type,
            unreadCount: countError ? 0 : (count || 0),
            lastMessage: isDirect ? 'Inicie uma conversa' : 'Grupo criado',
            lastMessageTime: new Date(c.created_at).toLocaleDateString('pt-BR')
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
      setChannels(prev =>
        prev.map(ch =>
          ch.id === channelId ? { ...ch, unreadCount: 0 } : ch
        )
      );
    } catch (error) {
      console.error('Error marking channel as read:', error);
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
      const { data: channelMembers } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', selectedChannelId)
        .neq('user_id', userId);

      let callerName = 'Alguém';
      const { data: callerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();
      if (callerProfile?.full_name) callerName = callerProfile.full_name;

      let roomDisplayName = callerName;
      const { data: channelInfo } = await supabase
        .from('chat_channels')
        .select('type, name')
        .eq('id', selectedChannelId)
        .maybeSingle();
      if (channelInfo && channelInfo.type === 'group') {
        roomDisplayName = channelInfo.name;
      }

      if (channelMembers) {
        for (const member of channelMembers) {
          const broadcastChannel = supabase.channel(`user-call-${member.user_id}`);
          broadcastChannel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              broadcastChannel.send({
                type: 'broadcast',
                event: 'incoming-call',
                payload: {
                  channelId: selectedChannelId,
                  callerName: roomDisplayName,
                  callerId: userId,
                  isVideoEnabled
                }
              });
              setTimeout(() => supabase.removeChannel(broadcastChannel), 1000);
            }
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

  const filteredChannels = enrichedChannels.filter(channel =>
    channel.name?.toLowerCase().includes(contactSearchTerm.toLowerCase())
  );

  const filteredProfiles = profiles.filter(profile =>
    profile.full_name?.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    profile.role?.toLowerCase().includes(contactSearchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">

      {/* Sidebar - Contact List */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/30">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mensagens</h2>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-2 p-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  title="Alterar Status"
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
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                title="Novo Grupo"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar equipe..."
              value={contactSearchTerm}
              onChange={(e) => setContactSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          </div>

        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chats'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            Conversas
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contacts'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            Contatos
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {activeTab === 'chats' ? (
            filteredChannels.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">Nenhuma conversa encontrada.</div>
            ) : filteredChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannelId(channel.id)}
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
                  {channel.type === 'direct' && (
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${(channel as any).contactStatus ? STATUS_COLORS[(channel as any).contactStatus] : STATUS_COLORS['disponível']}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm font-semibold truncate ${selectedChannelId === channel.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                      {channel.name}
                    </h3>
                    <span className="text-[10px] text-slate-400">{channel.lastMessageTime}</span>
                  </div>
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
                onClick={() => handleStartDirectChat(profile.id)}
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
                  <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${STATUS_COLORS[profile.chat_status || 'disponível']}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {profile.full_name || 'Usuário Sem Nome'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {profile.role || 'Membro da Equipe'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedChannel ? (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold overflow-hidden">
                  {selectedChannel.avatar_url ? (
                    <img src={selectedChannel.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedChannel.fallbackAvatar
                  )}
                </div>
                {selectedChannel.type === 'direct' && (
                  <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${(selectedChannel as any).contactStatus ? STATUS_COLORS[(selectedChannel as any).contactStatus] : STATUS_COLORS['disponível']}`} />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedChannel.name}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedChannel.type === 'group' ? 'Grupo' : ((selectedChannel as any).contactStatus ? (selectedChannel as any).contactStatus.charAt(0).toUpperCase() + (selectedChannel as any).contactStatus.slice(1) : 'Disponível')} &bull; {selectedChannel.type === 'group' ? 'Conversa em grupo' : 'Mensagem Direta'}
                  </span>
                </div>
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
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`p-2 rounded-lg transition-colors ${showFavoritesOnly ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-slate-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Mostrar Apenas Favoritos"
              >
                <Star size={20} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
              </button>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

              <button
                onClick={() => startCall(false)}
                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Chamada de Áudio"
              >
                <Phone size={20} />
              </button>
              <button
                onClick={() => startCall(true)}
                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Chamada de Vídeo"
              >
                <Video size={20} />
              </button>
              {selectedChannel.type === 'group' && (
                <button
                  onClick={() => setIsGroupSettingsOpen(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Configurações do Grupo"
                >
                  <MoreVertical size={20} />
                </button>
              )}
              {selectedChannel.type !== 'group' && (
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
                const senderName = senderProfile?.full_name || (selectedChannel.type === 'group' ? 'Membro' : selectedChannel.name);
                const senderInitials = msg.isMe ? 'EU' : senderName.substring(0, 2).toUpperCase();

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[80%] ${msg.isMe ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${msg.isMe
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                      }`}>
                      {senderInitials}
                    </div>

                    <div className={`group relative p-3 rounded-2xl shadow-sm text-sm flex flex-col ${msg.isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}>

                      {selectedChannel.type === 'group' && !msg.isMe && (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
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
                      <div className={`absolute -top-3 ${msg.isMe ? '-left-6' : '-right-6'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10`}>
                        <button
                          onClick={() => setReplyingTo(msg)}
                          title="Responder"
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                        >
                          <Reply size={14} className="text-slate-400 hover:text-indigo-500" />
                        </button>
                        <button
                          onClick={() => toggleFavorite(msg.id)}
                          title={favoritedMessages.includes(msg.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                        >
                          <Star size={14} className={favoritedMessages.includes(msg.id) ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'} fill={favoritedMessages.includes(msg.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>

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

            <form onSubmit={handleSendMessage} className="flex flex-col">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*, .pdf, .doc, .docx, .xls, .xlsx, .zip"
              />
              <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-950/50 p-2 rounded-xl border border-transparent focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
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
                      // Reset accept after tick to not affect the paperclip button future clicks permanently
                      setTimeout(() => {
                        if (fileInputRef.current) fileInputRef.current.accept = "image/*, .pdf, .doc, .docx, .xls, .xlsx, .zip";
                      }, 100);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors hidden sm:block"
                >
                  <ImageIcon size={20} />
                </button>

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
                  className="relative p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm overflow-hidden"
                >
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div
                      className="absolute inset-0 bg-indigo-800 opacity-50 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  )}
                  <Send size={18} className="relative z-10" />
                </button>
              </div>
              <div className="text-center mt-2">
                <p className="text-[10px] text-slate-400">Pressione Enter para enviar</p>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-950/30 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <MoreVertical size={32} />
          </div>
          <p>Selecione uma conversa para começar</p>
        </div>
      )}

      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchChannels()}
      />

      {selectedChannel && selectedChannel.type === 'group' && (
        <GroupSettingsModal
          isOpen={isGroupSettingsOpen}
          onClose={() => setIsGroupSettingsOpen(false)}
          onSuccess={() => {
            fetchChannels();
            setSelectedChannelId(null);
          }}
          channelId={selectedChannel.id}
          channelName={selectedChannel.name}
          channelType={selectedChannel.type}
        />
      )}

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
    </div>
  );
};