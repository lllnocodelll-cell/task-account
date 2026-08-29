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
  AlertCircle,
  SlidersHorizontal,
  Building2,
  MousePointerClick,
  UserCog,
  Zap,
  Palmtree,
  Utensils,
  Clock,
  MinusCircle,
  CheckCircle2,
  CircleOff,
  ChevronDown,
  Pin,
  PinOff,
  GripVertical,
  Lock,
  Unlock,
  CornerUpRight,
  Copy,
  RefreshCw
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { supabase } from '../utils/supabaseClient';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import { GroupSettingsModal } from '../components/chat/GroupSettingsModal';
import { VideoCallModal } from '../components/chat/VideoCallModal';
import { getOrCreateDailyRoom } from '../utils/dailyApi';
import EmojiPicker, { EmojiClickData, Theme, SkinTones } from 'emoji-picker-react';
import { formatMessageText, stripFormatting } from '../utils/stringUtils';
import { Tooltip } from '../components/ui/Tooltip';
import { useToast } from '../contexts/ToastContext';
import { MessageTemplatesDrawer } from '../components/chat/MessageTemplatesDrawer';

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
  opened_at?: string | null;
  resolved_at?: string | null;
  last_duration_seconds?: number | null;
  is_notification?: boolean;
  is_private?: boolean;
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
  client_id?: string | null;
  client_ids?: string[] | null;
  org_id?: string | null;
  sector_ids?: string[] | null;
}


export type UserChatStatus = 'disponível' | 'ocupado' | 'ausente' | 'almoço' | 'férias' | 'offline';

export const STATUS_CONFIG: Record<string, {
  label: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  iconText: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  description: string;
}> = {
  'disponível': {
    label: 'Disponível',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800/50',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
    description: 'Online e pronto para atender'
  },
  'ocupado': {
    label: 'Ocupado',
    dotColor: 'bg-rose-500',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800/50',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconText: 'text-rose-600 dark:text-rose-400',
    icon: MinusCircle,
    description: 'Em reunião ou foco total'
  },
  'ausente': {
    label: 'Ausente',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800/50',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconText: 'text-amber-600 dark:text-amber-400',
    icon: Clock,
    description: 'Temporariamente afastado'
  },
  'almoço': {
    label: 'Almoço',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    badgeText: 'text-blue-700 dark:text-blue-300',
    badgeBorder: 'border-blue-200 dark:border-blue-800/50',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconText: 'text-blue-600 dark:text-blue-400',
    icon: Utensils,
    description: 'Em intervalo de almoço'
  },
  'férias': {
    label: 'Férias',
    dotColor: 'bg-teal-500',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
    badgeText: 'text-teal-700 dark:text-teal-300',
    badgeBorder: 'border-teal-200 dark:border-teal-800/50',
    iconBg: 'bg-teal-100 dark:bg-teal-900/50',
    iconText: 'text-teal-600 dark:text-teal-400',
    icon: Palmtree,
    description: 'Em período de férias/recesso'
  },
  'offline': {
    label: 'Offline',
    dotColor: 'bg-slate-400 dark:bg-slate-500',
    badgeBg: 'bg-slate-100 dark:bg-slate-800/60',
    badgeText: 'text-slate-600 dark:text-slate-400',
    badgeBorder: 'border-slate-200 dark:border-slate-700/50',
    iconBg: 'bg-slate-200 dark:bg-slate-700',
    iconText: 'text-slate-500 dark:text-slate-400',
    icon: CircleOff,
    description: 'Desconectado'
  }
};

const STATUS_COLORS: Record<string, string> = {
  'disponível': 'bg-emerald-500',
  'ocupado': 'bg-rose-500',
  'ausente': 'bg-amber-500',
  'almoço': 'bg-blue-500',
  'férias': 'bg-teal-500',
  'offline': 'bg-slate-400 dark:bg-slate-500'
};

const RenderStatusBadge: React.FC<{ status?: string; showLabel?: boolean; size?: 'xs' | 'sm' | 'md' }> = ({
  status = 'disponível',
  showLabel = true,
  size = 'sm'
}) => {
  const normStatus = (status || 'disponível').toLowerCase();
  const config = STATUS_CONFIG[normStatus] || STATUS_CONFIG['disponível'];
  const IconComponent = config.icon;

  const iconSize = size === 'xs' ? 10 : size === 'sm' ? 11 : 13;
  const paddingClass = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-md border ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${paddingClass} leading-none whitespace-nowrap`}>
      <IconComponent size={iconSize} className="shrink-0" strokeWidth={2.2} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

const formatSupportDuration = (openedAt?: string | null, durationSeconds?: number | null) => {
  if (durationSeconds !== undefined && durationSeconds !== null) {
    const mins = Math.floor(durationSeconds / 60);
    if (mins < 1) return '1m';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs < 24) return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
  }

  if (!openedAt) return '0m';
  const start = new Date(openedAt).getTime();
  if (isNaN(start)) return '0m';

  const diffMinutes = Math.floor(Math.max(0, Date.now() - start) / (1000 * 60));

  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  if (diffHours < 24) {
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  return remainingHours > 0 ? `${diffDays}d ${remainingHours}h` : `${diffDays}d`;
};

const getSupportSlaBadgeStyle = (openedAt?: string | null, isResolved?: boolean) => {
  if (isResolved) {
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }

  if (!openedAt) return 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/50 dark:border-slate-700/50';
  const start = new Date(openedAt).getTime();
  if (isNaN(start)) return 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200/50 dark:border-slate-700/50';

  const diffMinutes = Math.floor((Date.now() - start) / (1000 * 60));

  if (diffMinutes < 15) {
    return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40';
  }
  if (diffMinutes < 60) {
    return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40';
  }
  return 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40 animate-pulse';
};

const StatusDot: React.FC<{ status?: string; className?: string; size?: 'sm' | 'md' }> = ({
  status = 'disponível',
  className = '',
  size = 'md'
}) => {
  const normStatus = (status || 'disponível').toLowerCase();
  const config = STATUS_CONFIG[normStatus] || STATUS_CONFIG['disponível'];
  const IconComponent = config.icon;

  const dotSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const iconDotSizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (normStatus === 'férias' || normStatus === 'almoço') {
    return (
      <Tooltip content={`Status: ${config.label}`} position="top" className="absolute bottom-0 right-0 z-10">
        <div 
          className={`${iconDotSizeClass} rounded-full border-2 border-white dark:border-slate-800 ${config.dotColor} flex items-center justify-center text-white shadow-sm ring-1 ring-black/5 translate-x-1/4 translate-y-1/4 ${className}`}
        >
          <IconComponent size={size === 'sm' ? 8 : 9} strokeWidth={2.5} />
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={`Status: ${config.label}`} position="top" className="absolute bottom-0 right-0 z-10">
      <div
        className={`${dotSizeClass} border-2 border-white dark:border-slate-800 rounded-full ${config.dotColor} shadow-sm translate-x-1/4 translate-y-1/4 ${className}`}
      />
    </Tooltip>
  );
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
  attachments?: any[] | null;
  file_name?: string;
  file_type?: string;
  reply_to_id?: string;
  reactions?: Reaction[];
  is_system?: boolean;
  rawCreatedAt?: string;
  is_private?: boolean;
  is_forwarded?: boolean;
}
const getSectorScope = (sectorName: string): string[] => {
  if (!sectorName) return [];
  const name = sectorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos

  // Fiscal: "Fiscal", "tax", "tributário" e "Tributos"
  if (name.includes('fiscal') || name.includes('tax') || name.includes('tributario') || name.includes('tributos')) {
    return [
      'Impostos sobre compra e venda;',
      'Emissão de nota fiscal;',
      'Emissão de certidão negativa de débitos;',
      'Parcelamento de impostos;',
      'Declaração de faturamento;',
      'Imposto de renda pessoa física e jurídica;',
      'Planejamento tributário;',
      'Demais assuntos relacionados a área tributária.'
    ];
  }

  // Folha: "folha", "folha de pagamento", "DP", "departamento pessoal", "pessoal" e "RH"
  if (name.includes('folha') || name.includes('dp') || name.includes('departamento pessoal') || name.includes('pessoal') || name.includes('rh')) {
    return [
      'Registro: documentação necessária, modalidades de contratação, contrato de trabalho e exame médico;',
      'Cálculos trabalhistas: folha de pagamento colaboradores, pró-labore sócios, hora extra, férias, décimo terceiro, dissídio, adicional noturno, adicional insalubridade, licença maternidade, afastamento por doença, rescisão de contrato, FGTS, INSS e IRRF;',
      'Gestão de benefícios: vale transporte, vale refeição e alimentação;',
      'Sindicato e convenção coletiva de trabalho: enquadramento sindical, contribuição assistencial, salário base, benefícios e demais exigências sindical;',
      'Extratos e recibos das obrigações acessórias: eSocial, Reinf, DCTFWeb e DIRF;',
      'Gestão de Saúde e Segurança do Trabalho (SST);',
      'Demais assuntos relacionados a gestão de pessoas.'
    ];
  }

  // Contábil: "contábil", "contabil", "contabilidade" e "account"
  if (name.includes('contabil') || name.includes('contabilidade') || name.includes('account')) {
    return [
      'Demonstrações contábeis: balanço patrimonial, livro diário, balancete, demonstração de resultado do exercício (DRE) e demonstração de fluxo de caixa (DFC);',
      'Apuração de IRPJ e CSLL sobre o Lucro Real - Lalur/Lacs;',
      'Apuração de IRRF retido sobre distribuição de lucros e dividendos;',
      'Planejamento contábil e análise das demonstrações;',
      'Controle e gestão de ativo imobilizado;',
      'Extratos e recibos das obrigações acessórias DEFIS, ECD e ECF;',
      'Demais assuntos relacionados a área contábil.'
    ];
  }

  // Societário: "societário", "legalização", "paralegal", "regulatório", "licenças", "alvarás" e "vigilância"
  if (name.includes('societario') || name.includes('legalizacao') || name.includes('paralegal') || name.includes('regulatorio') || name.includes('licenca') || name.includes('alvara') || name.includes('vigilancia')) {
    return [
      'Abertura, alteração ou encerramento de empresa;',
      'Transformação de MEI para ME;',
      'Licenças de Funcionamento: alvará, vigilância sanitária e licença ambiental;',
      'Registro em conselho de classe profissional;',
      'Contrato social e inscrições da empresa;',
      'Emissão ou renovação de certificado digital;',
      'Demais assuntos relacionados a legalização empresarial.'
    ];
  }

  // Financeiro: "financeiro", "finanças", "cobrança" e "finance"
  if (name.includes('financeiro') || name.includes('financas') || name.includes('cobranca') || name.includes('finance')) {
    return [
      'Mensalidade: envio de boleto, prorrogação de vencimento, reembolso, baixa ou cancelamento;',
      'Acordos: negociação de mensalidades em aberto e baixa de protesto;',
      'Contrato de Prestação: cópia do contrato, reajustes, alteração ou Cancelamento;',
      'Demais assuntos relacionados ao financeiro.'
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

const isUserAvailableForTransfer = (profile: any): boolean => {
  // 1. Verificar se está offline (inatividade de 30 min)
  let isOffline = true;
  if (profile.current_session_start) {
    const sessionStart = new Date(profile.current_session_start).getTime();
    const lastActive = profile.last_active_at ? new Date(profile.last_active_at).getTime() : sessionStart;
    if (Date.now() - lastActive < 30 * 60 * 1000) {
      isOffline = false;
    }
  }
  if (isOffline) return false;

  // 2. Verificar se o status é incompatível (ocupado, ausente, almoço, férias)
  const status = profile.chat_status || 'disponível';
  const unavailableStatuses = ['ocupado', 'ausente', 'almoço', 'férias'];
  if (unavailableStatuses.includes(status)) {
    return false;
  }

  return true;
};

const formatDateLabel = (isoString?: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dDate.getTime() === dToday.getTime()) return 'Hoje';
  if (dDate.getTime() === dYesterday.getTime()) return 'Ontem';
  
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const Chat: React.FC = () => {
  const { addToast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
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
  const [groupMemberCount, setGroupMemberCount] = useState<number | null>(null);
  
  // Atendimentos (Support)
  const [isSupportCreateModalOpen, setIsSupportCreateModalOpen] = useState(false);
  const [supportSectorId, setSupportSectorId] = useState('');
  const [isCreatingSupport, setIsCreatingSupport] = useState(false);
  const [isInitiatingSupport, setIsInitiatingSupport] = useState(false);
  const [assignSectorModalState, setAssignSectorModalState] = useState<{
    isOpen: boolean;
    channelId: string;
    channelName: string;
    currentSectorId?: string | null;
    allowedSectors: any[];
    selectedSectorId: string;
  }>({
    isOpen: false,
    channelId: '',
    channelName: '',
    currentSectorId: null,
    allowedSectors: [],
    selectedSectorId: ''
  });
  const [isAssigningSector, setIsAssigningSector] = useState(false);
  const [sectors, setSectors] = useState<any[]>([]);
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [clientSubTab, setClientSubTab] = useState<'atendimento' | 'notificacao'>('atendimento');
  const [supportSubTab, setSupportSubTab] = useState<'queue' | 'mine' | 'alerts' | 'all'>('mine');

  // Atendimento iniciado pelo escritório
  const [isStaffSupportModalOpen, setIsStaffSupportModalOpen] = useState(false);
  const [staffSupportClientId, setStaffSupportClientId] = useState('');
  const [staffSupportSectorId, setStaffSupportSectorId] = useState('');
  const [isCreatingStaffSupport, setIsCreatingStaffSupport] = useState(false);
  const [clientProfiles, setClientProfiles] = useState<any[]>([]);

  // Favoritos
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoritedMessages, setFavoritedMessages] = useState<string[]>([]);

  // Conversas Fixadas (Pinned Channels)
  const [pinnedChannelIds, setPinnedChannelIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`chat_pinned_channels_${userId || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Encaminhar Mensagens
  const [forwardMessageModal, setForwardMessageModal] = useState<{ isOpen: boolean; message: Message | null }>({
    isOpen: false,
    message: null
  });
  const [selectedForwardChannels, setSelectedForwardChannels] = useState<string[]>([]);
  const [forwardSearchTerm, setForwardSearchTerm] = useState('');
  const [forwardTab, setForwardTab] = useState<'team' | 'clients'>('team');
  const [isForwarding, setIsForwarding] = useState(false);

  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(`chat_pinned_channels_${userId}`);
      if (saved) {
        setPinnedChannelIds(JSON.parse(saved));
      }
    } catch {
      // Silent ignore
    }
  }, [userId]);

  const togglePinChannel = (channelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPinnedChannelIds(prev => {
      const isPinned = prev.includes(channelId);
      const updated = isPinned ? prev.filter(id => id !== channelId) : [...prev, channelId];
      if (userId) {
        localStorage.setItem(`chat_pinned_channels_${userId}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Ordenação personalizada via Drag and Drop
  const [customChannelOrder, setCustomChannelOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`chat_custom_order_${userId || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(null);
  const [draggableChannelId, setDraggableChannelId] = useState<string | null>(null);
  const [, setSupportTimerTicker] = useState(0);

  // Ticker para atualizar tempo de atendimento a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setSupportTimerTicker(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(`chat_custom_order_${userId}`);
      if (saved) {
        setCustomChannelOrder(JSON.parse(saved));
      }
    } catch {
      // Silent ignore
    }
  }, [userId]);

  const handleChannelDrop = (draggedId: string, targetId: string, currentItems: { id: string }[]) => {
    if (!draggedId || !targetId || draggedId === targetId) return;

    let baseOrder = [...customChannelOrder];
    currentItems.forEach(item => {
      if (!baseOrder.includes(item.id)) {
        baseOrder.push(item.id);
      }
    });

    const fromIndex = baseOrder.indexOf(draggedId);
    const toIndex = baseOrder.indexOf(targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const newOrder = [...baseOrder];
      const [moved] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, moved);

      setCustomChannelOrder(newOrder);
      if (userId) {
        localStorage.setItem(`chat_custom_order_${userId}`, JSON.stringify(newOrder));
      }
    }
  };

  const getChannelDragProps = (channelId: string, currentItems: { id: string }[]) => {
    return {
      draggable: draggableChannelId === channelId,
      onDragStart: (e: React.DragEvent) => {
        setDraggedChannelId(channelId);
        e.dataTransfer.setData('text/plain', channelId);
        e.dataTransfer.effectAllowed = 'move';
      },
      onDragEnd: () => {
        setDraggedChannelId(null);
        setDragOverChannelId(null);
        setDraggableChannelId(null);
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedChannelId && draggedChannelId !== channelId) {
          setDragOverChannelId(channelId);
        }
      },
      onDragLeave: () => {
        if (dragOverChannelId === channelId) {
          setDragOverChannelId(null);
        }
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedChannelId) {
          handleChannelDrop(draggedChannelId, channelId, currentItems);
        }
        setDraggedChannelId(null);
        setDragOverChannelId(null);
        setDraggableChannelId(null);
      }
    };
  };

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
    if (type === 'staff') {
      setSupportSubTab('all');
    }
    setDuplicateModal(prev => ({ ...prev, isOpen: false }));
  };
  const [showSupportActionsMenu, setShowSupportActionsMenu] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinTones>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chat_emoji_skin_tone');
      if (saved) return saved as SkinTones;
    }
    return SkinTones.NEUTRAL;
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
  const [showSectorFilter, setShowSectorFilter] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'reconnecting'>('online');
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<string, boolean>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeChannelCompanies, setActiveChannelCompanies] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const PAGE_LIMIT = 40;
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const templatePickerRef = useRef<HTMLDivElement>(null);
  const templateButtonRef = useRef<HTMLButtonElement>(null);


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
    const handleOnline = () => {
      setConnectionStatus('online');
    };

    const handleOffline = () => {
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setConnectionStatus('offline');
    } else {
      setConnectionStatus('online');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(target) && emojiButtonRef.current && !emojiButtonRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }
      if (reactionMessageId && reactionPickerRef.current && !reactionPickerRef.current.contains(target)) {
        const isReactButtonClick = (target as HTMLElement).closest('[data-action="react"]');
        if (!isReactButtonClick) {
          setReactionMessageId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCallMenu, showSupportActionsMenu, showStatusMenu, showEmojiPicker, reactionMessageId]);

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

      const checkIsProfileOffline = (profile: any) => {
        if (!profile) return true;
        if (profile.chat_status === 'offline') return true;

        const now = Date.now();
        const lastActiveTime = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
        const sessionStartTime = profile.current_session_start ? new Date(profile.current_session_start).getTime() : 0;
        const mostRecentTime = Math.max(lastActiveTime, sessionStartTime);

        if (mostRecentTime > 0 && (now - mostRecentTime < 30 * 60 * 1000)) {
          return false;
        }

        if (profile.chat_status && profile.chat_status !== 'ausente') {
          return false;
        }

        return true;
      };

      const isOffline = checkIsProfileOffline(theirProfile);

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

        const checkIsProfileOffline = (profile: any) => {
          if (!profile) return true;
          if (profile.chat_status === 'offline') return true;

          const now = Date.now();
          const lastActiveTime = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
          const sessionStartTime = profile.current_session_start ? new Date(profile.current_session_start).getTime() : 0;
          const mostRecentTime = Math.max(lastActiveTime, sessionStartTime);

          if (mostRecentTime > 0 && (now - mostRecentTime < 30 * 60 * 1000)) {
            return false;
          }

          if (profile.chat_status && profile.chat_status !== 'ausente') {
            return false;
          }

          return true;
        };

        const isOffline = checkIsProfileOffline(clientProfile);
        const contactStatus = isOffline ? 'offline' : (clientProfile?.chat_status || 'disponível');

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

  const { unreadSupportCount, unreadNotificationCount, staffUnreadNotificationCount } = React.useMemo(() => {
    let support = 0;
    let notif = 0;
    let staffNotif = 0;
    
    const localIsChannelCreatedByClient = (ch: any) => {
      if (!ch.created_by) return false;
      if (ch.created_by === userId) {
        return currentUser?.role === 'cliente';
      }
      const creatorProfile = profiles.find(p => p.id === ch.created_by);
      return creatorProfile?.role === 'cliente';
    };

    enrichedChannels.forEach(c => {
      if (c.type === 'support') {
        if (currentUser?.role === 'cliente') {
          if (c.is_notification) {
            notif += (c.unreadCount || 0);
          } else {
            support += (c.unreadCount || 0);
          }
        } else {
          const isClosed = c.support_status === 'resolved' || c.status === 'closed';
          if (!isClosed) {
            const isNotificationTab = !!c.is_notification;
            if (isNotificationTab) {
              staffNotif += (c.unreadCount || 0);
            } else {
              // Para equipe: somar na aba principal apenas atendimentos da Fila (não atribuídos) ou atribuídos a MIM
              if (!c.assigned_to || c.assigned_to === userId) {
                support += (c.unreadCount || 0);
              }
            }
          }
        }
      }
    });
    
    return { unreadSupportCount: support, unreadNotificationCount: notif, staffUnreadNotificationCount: staffNotif };
  }, [enrichedChannels, currentUser, userId, profiles]);

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
  const isFetchingMoreRef = useRef<boolean>(false);

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
      // Buscar emails de membros ativos com a role 'cliente'
      const { data: activeMembers } = await supabase
        .from('members')
        .select('email')
        .eq('role', 'cliente')
        .neq('status', 'Inativo');

      const activeEmails = (activeMembers || []).map((m: any) => m.email?.toLowerCase()).filter(Boolean);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'cliente')
        .order('full_name');

      if (profilesData) {
        setClientProfiles(profilesData);
      }
    } catch (e) {
      console.error('Error fetching clients:', e);
    }
  };

  const fetchTemplates = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_message_templates')
        .select('*')
        .eq('org_id', orgId)
        .order('title');
      if (error) throw error;
      if (data) setTemplates(data);
    } catch (e) {
      console.error('Error fetching templates:', e);
    }
  };

  const fetchTaskTypes = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_types')
        .select('*')
        .eq('org_id', orgId);
      if (error) throw error;
      if (data) setTaskTypes(data);
    } catch (e) {
      console.error('Error fetching task types:', e);
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

    if (isFetchingMoreRef.current) {
      prevMessageCountRef.current = currentCount;
      return;
    }

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
            const currentChannels = channelsRef.current;
            const targetChannel = currentChannels.find(c => c.id === newMsg.channel_id);
            
            // Só incrementar se NÃO estiver com o canal aberto no momento
            if (newMsg.channel_id === currentSelectedChannelId) return;

            // Se for canal de suporte:
            if (targetChannel && targetChannel.type === 'support') {
              // Se a mensagem foi enviada pelo responsável pelo atendimento, não conta como não lida para outros
              if (targetChannel.assigned_to && newMsg.sender_id === targetChannel.assigned_to) {
                return;
              }
              // Se a mensagem foi enviada pelo próprio usuário logado
              if (newMsg.sender_id === currentUserId) {
                return;
              }

              // Incrementar contagem
              setChannels(prev =>
                prev.map(ch =>
                  ch.id === newMsg.channel_id
                    ? { ...ch, unreadCount: (ch.unreadCount || 0) + 1, lastMessage: newMsg.text || '📎 Anexo', lastMessageTime: newMsg.created_at }
                    : ch
                )
              );
            } else {
              // Canais normais (direct, group): só incrementa se não for minha mensagem
              if (newMsg.sender_id !== currentUserId) {
                setChannels(prev =>
                  prev.map(ch =>
                    ch.id === newMsg.channel_id
                      ? { ...ch, unreadCount: (ch.unreadCount || 0) + 1, lastMessage: newMsg.text || '📎 Anexo', lastMessageTime: newMsg.created_at }
                      : ch
                  )
                );
              }
            }
              
            // Tocar som de notificação se não foi enviado por mim
            if (newMsg.sender_id !== currentUserId) {
              playNotificationSound();
              
              // Buscar canal e remetente para exibir na notificação do sistema
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

  // Listener para novos canais e atualizações de leitura em tempo real
  useEffect(() => {
    if (!userId) return;

    const memberSub = supabase
      .channel('all-channel-memberships')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channel_members',
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

  // Listener em tempo real para alterações de status e presença dos perfis (profiles)
  useEffect(() => {
    if (!userId) return;

    const profilesSub = supabase
      .channel('chat-profiles-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload: any) => {
          if (payload.new && payload.new.id) {
            const updatedProfile = payload.new;
            setProfiles(prev =>
              prev.map(p => p.id === updatedProfile.id ? { ...p, ...updatedProfile } : p)
            );
            if (currentUser && currentUser.id === updatedProfile.id) {
              setCurrentUser(prev => prev ? { ...prev, ...updatedProfile } : prev);
            }
          }
        }
      )
      .subscribe();

    const statusInterval = setInterval(() => {
      fetchProfiles(userId);
    }, 15000);

    return () => {
      supabase.removeChannel(profilesSub);
      clearInterval(statusInterval);
    };
  }, [userId, currentUser?.id]);

  // Touch de presença e atividade do usuário logado no Supabase
  useEffect(() => {
    if (!userId) return;

    const touchPresence = async () => {
      try {
        const nowStr = new Date().toISOString();
        await supabase
          .from('profiles')
          .update({
            last_active_at: nowStr,
            current_session_start: nowStr
          } as any)
          .eq('id', userId);
      } catch (e) {
        console.error('Error updating presence:', e);
      }
    };

    touchPresence();
    const heartbeat = setInterval(touchPresence, 3 * 60 * 1000);

    return () => clearInterval(heartbeat);
  }, [userId]);

  // Auto-sync inteligente ao retornar à aba (visibilitychange / focus) ou reconectar à rede (online)
  useEffect(() => {
    if (!userId) return;

    let lastSyncTime = Date.now();

    const handleAutoSync = async () => {
      const now = Date.now();
      if (now - lastSyncTime < 2500) return; // Debounce de 2.5 segundos
      lastSyncTime = now;

      try {
        if (supabase.realtime && typeof (supabase.realtime as any).connect === 'function') {
          (supabase.realtime as any).connect();
        }

        await fetchChannels(userId);
        await fetchProfiles(userId);

        if (selectedChannelIdRef.current) {
          await fetchMessages(selectedChannelIdRef.current);
        }
      } catch (e) {
        console.error('Erro no auto-sync de retorno à aba:', e);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAutoSync();
      }
    };

    const onWindowFocus = () => {
      handleAutoSync();
    };

    const onOnline = () => {
      handleAutoSync();
      addToast('info', 'Conexão restabelecida', 'O chat foi reconectado à rede.');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('online', onOnline);
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

  // Buscar empresas vinculadas ao canal de atendimento ativo
  useEffect(() => {
    const fetchActiveChannelCompanies = async () => {
      if (!selectedChannelId || !channels.length) {
        setActiveChannelCompanies([]);
        return;
      }

      const channel = channels.find(c => c.id === selectedChannelId);
      if (!channel || channel.type !== 'support') {
        setActiveChannelCompanies([]);
        return;
      }

      // Extrair o nome do cliente a partir do rawName do canal
      const match = channel.rawName.match(/^Atendimento - (.+?)(?:\s*\(|$)/);
      const clientName = match ? match[1].trim() : '';

      if (!clientName) {
        setActiveChannelCompanies([]);
        return;
      }

      // Encontrar o perfil do cliente (seja nos perfis globais ou no currentUser)
      const clientProfile = profiles.find(p => (p.full_name || '').trim() === clientName) || 
                            (currentUser && (currentUser.full_name || '').trim() === clientName ? currentUser : null);

      const clientIds = clientProfile?.client_ids || (clientProfile?.client_id ? [clientProfile.client_id] : []);

      if (!clientIds || clientIds.length === 0) {
        setActiveChannelCompanies([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .in('id', clientIds);

        if (error) throw error;

        if (data) {
          setActiveChannelCompanies(data);
        } else {
          setActiveChannelCompanies([]);
        }
      } catch (err) {
        console.error('Error fetching active channel companies:', err);
        setActiveChannelCompanies([]);
      }
    };

    const fetchGroupMemberCount = async () => {
      if (!selectedChannelId) {
        setGroupMemberCount(null);
        return;
      }
      const ch = channels.find(c => c.id === selectedChannelId);
      if (!ch || (ch.type !== 'group' && ch.type !== 'sector')) {
        setGroupMemberCount(null);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('chat_channel_members')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', selectedChannelId);

        if (!error && count !== null) {
          setGroupMemberCount(count);
        } else {
          setGroupMemberCount(null);
        }
      } catch (e) {
        setGroupMemberCount(null);
      }
    };

    fetchActiveChannelCompanies();
    fetchGroupMemberCount();
  }, [selectedChannelId, channels, profiles, currentUser]);

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
              is_system: newMsg.is_system,
              rawCreatedAt: newMsg.created_at,
              is_private: newMsg.is_private ?? false,
              is_forwarded: newMsg.is_forwarded ?? false
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

    subscription.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('online');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        if (navigator.onLine) {
          setConnectionStatus('reconnecting');
        } else {
          setConnectionStatus('offline');
        }
      }
    });
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
        .order('created_at', { ascending: false })
        .limit(PAGE_LIMIT);

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
        is_system: msg.is_system,
        rawCreatedAt: msg.created_at,
        is_private: msg.is_private ?? false,
        is_forwarded: msg.is_forwarded ?? false
      })).reverse();

      setMessages(prev => ({
        ...prev,
        [channelId]: formatted
      }));

      setHasMoreMessages(prev => ({
        ...prev,
        [channelId]: data.length === PAGE_LIMIT
      }));

    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchMoreMessages = async () => {
    if (!selectedChannelId || !userId) return;

    const currentChannelMessages = messages[selectedChannelId] || [];
    if (currentChannelMessages.length === 0) return;

    const oldestMessage = currentChannelMessages[0];
    if (!oldestMessage.rawCreatedAt) return;

    try {
      isFetchingMoreRef.current = true;
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, chat_reactions(*)')
        .eq('channel_id', selectedChannelId)
        .lt('created_at', oldestMessage.rawCreatedAt)
        .order('created_at', { ascending: false })
        .limit(PAGE_LIMIT);

      if (error) throw error;

      if (data && data.length > 0) {
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
          is_system: msg.is_system,
          rawCreatedAt: msg.created_at,
          is_private: msg.is_private ?? false,
          is_forwarded: msg.is_forwarded ?? false
        })).reverse();

        const container = messagesContainerRef.current;
        const prevScrollHeight = container ? container.scrollHeight : 0;
        const prevScrollTop = container ? container.scrollTop : 0;

        setMessages(prev => ({
          ...prev,
          [selectedChannelId]: [...formatted, ...(prev[selectedChannelId] || [])]
        }));

        setHasMoreMessages(prev => ({
          ...prev,
          [selectedChannelId]: data.length === PAGE_LIMIT
        }));

        setTimeout(() => {
          if (container) {
            const deltaHeight = container.scrollHeight - prevScrollHeight;
            container.scrollTop = prevScrollTop + deltaHeight;
          }
          isFetchingMoreRef.current = false;
        }, 0);
      } else {
        setHasMoreMessages(prev => ({
          ...prev,
          [selectedChannelId]: false
        }));
        isFetchingMoreRef.current = false;
      }
    } catch (error) {
      console.error('Error fetching more messages:', error);
      isFetchingMoreRef.current = false;
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (container.scrollTop === 0 && hasMoreMessages[selectedChannelId || ''] && !loadingMore) {
      setLoadingMore(true);
      fetchMoreMessages().finally(() => {
        setLoadingMore(false);
      });
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
        if (profile.org_id) {
          fetchTemplates(profile.org_id);
          fetchTaskTypes(profile.org_id);
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
          sector_ids,
          sectors (
            name
          )
        `);

      const enrichedProfiles = (profilesData || []).map(profile => {
        const profileName = (profile.full_name || '').trim().toLowerCase();
        
        const member = (membersData as any[] || []).find(m => {
          const mName = `${m.first_name || ''} ${m.last_name || ''}`.trim().toLowerCase();
          if (mName === profileName) return true;
          
          // Dividir em palavras para aceitar nomes com ordem invertida
          const mWords = mName.split(/\s+/).filter(Boolean);
          const pWords = profileName.split(/\s+/).filter(Boolean);
          if (mWords.length > 0 && pWords.length > 0) {
            const matchesAll = mWords.every(word => pWords.includes(word)) && pWords.every(word => mWords.includes(word));
            if (matchesAll) return true;
          }
          
          return mName.startsWith(profileName) || profileName.startsWith(mName);
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
          sector: sectorName,
          sector_ids: member?.sector_ids || []
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

      // Se for staff, buscar last_read_at dos colaboradores atribuídos aos canais de suporte
      let assigneeMembersMap: Record<string, string> = {};
      if (isStaff) {
        const supportAssignedChannels = channelData.filter((c: any) => c.type === 'support' && c.assigned_to);
        const supportChannelIds = supportAssignedChannels.map((c: any) => c.id);

        if (supportChannelIds.length > 0) {
          const { data: assigneeData } = await supabase
            .from('chat_channel_members')
            .select('channel_id, user_id, last_read_at')
            .in('channel_id', supportChannelIds);

          (assigneeData || []).forEach((m: any) => {
            if (m.user_id && m.channel_id) {
              assigneeMembersMap[`${m.channel_id}_${m.user_id}`] = m.last_read_at || '2000-01-01T00:00:00Z';
            }
          });
        }
      }

      // Contar mensagens não lidas para cada canal
      const channelsWithUnread: Channel[] = await Promise.all(
        channelData.map(async (c: any) => {
          const isDirect = c.type === 'direct';
          let channelName = c.name;
          if (isDirect) channelName = 'Chat Individual';

          let effectiveLastRead = lastReadMap[c.id] || '2000-01-01T00:00:00Z';
          let excludeSenderId: string | null = targetUid;

          if (isStaff && c.type === 'support') {
            if (c.assigned_to) {
              if (c.assigned_to === targetUid) {
                // Atendimento está comigo: meu last_read_at
                effectiveLastRead = lastReadMap[c.id] || '2000-01-01T00:00:00Z';
                excludeSenderId = targetUid;
              } else {
                // Atendimento está com outro colaborador: o status de "lido" segue o colaborador responsável!
                const assigneeLastRead = assigneeMembersMap[`${c.id}_${c.assigned_to}`] || '2000-01-01T00:00:00Z';
                effectiveLastRead = assigneeLastRead;
                excludeSenderId = c.assigned_to;
              }
            } else {
              // Atendimento na Fila (não atribuído a ninguém):
              effectiveLastRead = lastReadMap[c.id] || '2000-01-01T00:00:00Z';
              excludeSenderId = targetUid;
            }
          }

          // Contar mensagens após effectiveLastRead (desconsiderando mensagens enviadas pelo próprio leitor)
          let msgQuery = supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', c.id)
            .gt('created_at', effectiveLastRead);

          if (excludeSenderId) {
            msgQuery = msgQuery.neq('sender_id', excludeSenderId);
          }

          const { count, error: countError } = await msgQuery;

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
              .gt('created_at', effectiveLastRead);
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
            created_at: c.created_at,
            opened_at: (c as any).opened_at || c.created_at,
            resolved_at: (c as any).resolved_at,
            last_duration_seconds: (c as any).last_duration_seconds,
            is_notification: c.is_notification,
            is_private: c.is_private ?? false
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
        .upsert({
          channel_id: channelId,
          user_id: userId,
          last_read_at: new Date().toISOString()
        } as any, { onConflict: 'channel_id,user_id' });

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

  const handleMarkAllNotificationsAsRead = async () => {
    if (!userId) return;
    try {
      const unreadNotifications = channels.filter(c => {
        if ((c.unreadCount || 0) <= 0) return false;
        return !!c.is_notification || c.type === 'notification';
      });

      if (unreadNotifications.length === 0) return;

      const channelIds = unreadNotifications.map(c => c.id);
      const nowStr = new Date().toISOString();
      
      const { error } = await supabase
        .from('chat_channel_members')
        .upsert(
          channelIds.map(id => ({
            channel_id: id,
            user_id: userId,
            last_read_at: nowStr,
          })),
          { onConflict: 'channel_id,user_id' }
        );

      if (error) throw error;

      // Zerar contadores no estado local de canais
      setChannels(prev => 
        prev.map(ch => 
          channelIds.includes(ch.id) ? { ...ch, unreadCount: 0 } : ch
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Marcação automática de leitura dos alertas individuais do usuário ao acessar a aba de notificações
  useEffect(() => {
    if (currentUser?.role === 'cliente' && clientSubTab === 'notificacao') {
      handleMarkAllNotificationsAsRead();
    } else if (currentUser?.role !== 'cliente' && activeTab === 'support' && supportSubTab === 'alerts') {
      handleMarkAllNotificationsAsRead();
    }
  }, [clientSubTab, supportSubTab, activeTab, currentUser?.role]);

  const markMessageAsUnread = async (messageId: string, channelId: string) => {
    if (!userId) return;
    try {
      // 1. Desmarcar o canal aberto imediatamente para evitar re-execução do markChannelAsRead
      setSelectedChannelId(null);

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

      // Calcular contagem de mensagens a partir desse timestamp
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .gt('created_at', unreadTimestamp);

      const calculatedCount = Math.max(count || 1, 1);

      setChannels(prev =>
        prev.map(ch =>
          ch.id === channelId ? { ...ch, unreadCount: calculatedCount } : ch
        )
      );
    } catch (error) {
      console.error('Error marking message as unread:', error);
    }
  };

  const handleCopyMessage = async (msg: Message) => {
    const textToCopy = msg.text || msg.attachment_url || '';
    if (!textToCopy) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedMessageId(msg.id);
      addToast('success', 'Mensagem copiada', 'O texto da mensagem foi copiado para a área de transferência.');
      setTimeout(() => {
        setCopiedMessageId(prev => prev === msg.id ? null : prev);
      }, 2000);
    } catch (err) {
      console.error('Erro ao copiar mensagem:', err);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedMessageId(msg.id);
        addToast('success', 'Mensagem copiada', 'O texto da mensagem foi copiado para a área de transferência.');
        setTimeout(() => {
          setCopiedMessageId(prev => prev === msg.id ? null : prev);
        }, 2000);
      } catch (fallbackErr) {
        addToast('error', 'Erro ao copiar', 'Não foi possível copiar o conteúdo da mensagem.');
      }
    }
  };

  const markChannelAsUnread = async (channelId: string) => {
    if (!userId) return;
    try {
      setSelectedChannelId(null);

      const { data: lastMsg } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let unreadTimestamp = new Date(Date.now() - 1000).toISOString();
      if (lastMsg) {
        const dt = new Date(lastMsg.created_at);
        dt.setMilliseconds(dt.getMilliseconds() - 1);
        unreadTimestamp = dt.toISOString();
      }

      await supabase
        .from('chat_channel_members')
        .update({ last_read_at: unreadTimestamp } as any)
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .gt('created_at', unreadTimestamp);

      const calculatedCount = Math.max(count || 1, 1);

      setChannels(prev =>
        prev.map(ch =>
          ch.id === channelId ? { ...ch, unreadCount: calculatedCount } : ch
        )
      );
    } catch (error) {
      console.error('Error marking channel as unread:', error);
    }
  };

  const handleManualSync = async () => {
    if (!userId || isSyncing) return;
    setIsSyncing(true);
    try {
      if (supabase.realtime && typeof (supabase.realtime as any).connect === 'function') {
        (supabase.realtime as any).connect();
      }

      await Promise.all([
        fetchChannels(userId),
        fetchProfiles(userId),
        selectedChannelIdRef.current ? fetchMessages(selectedChannelIdRef.current) : Promise.resolve()
      ]);

      addToast('success', 'Conversas sincronizadas', 'Lista de canais e mensagens atualizadas com sucesso.');
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      addToast('error', 'Falha ao sincronizar', 'Não foi possível atualizar as conversas.');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
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

      // UPDATE separado para as colunas novas (sector_id, status e opened_at) 
      await supabase
        .from('chat_channels')
        .update({ 
          sector_id: supportSectorId, 
          status: 'open',
          opened_at: new Date().toISOString(),
          resolved_at: null,
          last_duration_seconds: null 
        } as any)
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
          created_by: userId,
          assigned_to: userId,
          support_status: 'in_progress',
          status: 'open',
          sector_id: staffSupportSectorId || null
        } as any])
        .select()
        .single();

      if (createError) throw createError;
      const channelId = newChannel.id;

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
      setSupportSubTab('mine');
    } catch (error) {
      console.error('Error creating support ticket for client:', error);
      alert('Falha ao iniciar atendimento.');
    } finally {
      setIsCreatingStaffSupport(false);
    }
  };

  const handleInitiateSupportFromNotification = async (activeChannel: Channel) => {
    if (!userId || !currentUser || isInitiatingSupport) return;

    setIsInitiatingSupport(true);
    try {
      const targetSectorId = activeChannel.sector_id || null;

      // 1. Consultar diretamente no Supabase se este cliente já possui um canal de suporte humano para este setor (ou geral)
      const { data: clientMemberships } = await supabase
        .from('chat_channel_members')
        .select('channel_id')
        .eq('user_id', userId);

      let existingChannelId: string | null = null;
      let existingChannelStatus: string | null = null;
      let existingSupportStatus: string | null = null;

      if (clientMemberships && clientMemberships.length > 0) {
        const memberChannelIds = clientMemberships.map(m => m.channel_id);

        let query: any = (supabase.from('chat_channels') as any)
          .select('id, status, support_status, is_notification, sector_id')
          .eq('type', 'support')
          .or('is_notification.is.null,is_notification.eq.false')
          .in('id', memberChannelIds);

        if (targetSectorId) {
          // Para setores fixos: busca o canal do setor (aberto ou fechado para reabertura)
          query = query.eq('sector_id', targetSectorId);
        } else {
          // Para comunicados gerais: busca apenas se já houver um chamado geral ABERTO e NÃO resolvido
          query = query.is('sector_id', null)
            .eq('status', 'open')
            .neq('support_status', 'resolved');
        }

        const { data: dbExistingChannels } = await query
          .order('created_at', { ascending: false })
          .limit(1);

        if (dbExistingChannels && dbExistingChannels.length > 0) {
          existingChannelId = dbExistingChannels[0].id;
          existingChannelStatus = dbExistingChannels[0].status;
          existingSupportStatus = dbExistingChannels[0].support_status;
        }
      }

      // Buscar a última mensagem de notificação deste canal para contextualizar o assunto do chamado
      let notifText = '';
      let notifAttachmentUrl: string | undefined = undefined;
      let notifFileName: string | undefined = undefined;

      const localList = messages[activeChannel.id] || currentMessages || [];
      const validLocal = [...localList].reverse().find(m => !m.is_system && (m.text || m.attachment_url || m.file_name));
      if (validLocal) {
        notifText = validLocal.text || '';
        notifAttachmentUrl = validLocal.attachment_url;
        notifFileName = validLocal.file_name;
      }

      if (!notifText && !notifAttachmentUrl && !notifFileName) {
        const { data: dbNotifList } = await (supabase
          .from('chat_messages') as any)
          .select('text, attachment_url, file_name, is_system')
          .eq('channel_id', activeChannel.id)
          .order('created_at', { ascending: false })
          .limit(10);

        const validDb = (dbNotifList || []).find((m: any) => !m.is_system && (m.text || m.attachment_url || m.file_name)) || dbNotifList?.[0];
        if (validDb) {
          notifText = validDb.text || '';
          notifAttachmentUrl = validDb.attachment_url;
          notifFileName = validDb.file_name;
        }
      }

      let clientContextText = '';
      if (notifText) {
        clientContextText = `📌 **Dúvida referente ao Comunicado:**\n> "${notifText.trim()}"`;
      } else if (notifFileName) {
        clientContextText = `📌 **Dúvida referente ao Anexo:** ${notifFileName}`;
      } else {
        clientContextText = `📌 **Dúvida sobre Comunicado / Notificação Geral**`;
      }

      if (existingChannelId) {
        // Se existir canal ativo ou canal de setor a ser reaberto
        const isClosed = existingSupportStatus === 'resolved' || existingChannelStatus === 'closed';
        if (isClosed) {
          await supabase
            .from('chat_channels')
            .update({
              status: 'open',
              support_status: 'pending',
              assigned_to: null,
              opened_at: new Date().toISOString()
            } as any)
            .eq('id', existingChannelId);

          const restartText = targetSectorId
            ? `Atendimento retomado pelo cliente a partir de uma notificação.`
            : `Atendimento retomado pelo cliente a partir de um comunicado geral.`;

          // 1. Mensagem de sistema de reabertura
          await supabase
            .from('chat_messages')
            .insert({
              channel_id: existingChannelId,
              sender_id: userId,
              text: restartText,
              status: 'sent',
              is_system: true
            } as any);

          // 2. Mensagem de contexto com o assunto da notificação
          await supabase
            .from('chat_messages')
            .insert({
              channel_id: existingChannelId,
              sender_id: userId,
              text: clientContextText,
              status: 'sent',
              is_system: false
            } as any);
        }

        await fetchChannels(userId);
        setSelectedChannelId(existingChannelId);
        setClientSubTab('atendimento');
        setActiveTab('support');
      } else {
        // 2. Se NÃO existir canal ativo (ou se for novo ciclo de comunicado geral), criar NOVO chamado na Fila
        const sector = targetSectorId ? sectors.find(s => s.id === targetSectorId) : null;
        const channelName = `Atendimento - ${currentUser.full_name} (${sector?.name || 'Geral'})`;

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

        await supabase
          .from('chat_channels')
          .update({ 
            sector_id: targetSectorId, 
            status: 'open', 
            support_status: 'pending',
            is_notification: false,
            opened_at: new Date().toISOString(),
            resolved_at: null,
            last_duration_seconds: null
          } as any)
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

        // 1. Inserir mensagem de sistema informando a criação do chamado
        const systemMsgText = targetSectorId
          ? `Atendimento com o setor ${sector?.name || 'Responsável'} iniciado a partir de uma notificação.`
          : `Atendimento geral iniciado a partir de um comunicado. Aguardando triagem na fila.`;

        await supabase
          .from('chat_messages')
          .insert({
            channel_id: channelId,
            sender_id: userId,
            text: systemMsgText,
            status: 'sent',
            is_system: true
          } as any);

        // 2. Inserir mensagem de contexto visível do cliente contendo o assunto do comunicado
        await supabase
          .from('chat_messages')
          .insert({
            channel_id: channelId,
            sender_id: userId,
            text: clientContextText,
            status: 'sent',
            is_system: false
          } as any);

        await fetchChannels(userId);
        setSelectedChannelId(channelId);
        setClientSubTab('atendimento');
        setActiveTab('support');
      }
    } catch (error) {
      console.error('Error initiating support from notification:', error);
      addToast('error', 'Atendimento', 'Falha ao direcionar para o atendimento.');
    } finally {
      setIsInitiatingSupport(false);
    }
  };

  const handleAssignToMe = async (channelId: string) => {
    if (!userId) return;
    try {
      const { data: userProfile } = await (supabase
        .from('profiles') as any)
        .select('full_name, email, role')
        .eq('id', userId)
        .single();

      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || userProfile?.email || '';

      // Buscar o canal atual
      const { data: currentChannel } = await (supabase
        .from('chat_channels') as any)
        .select('name, support_status, sector_id')
        .eq('id', channelId)
        .single();

      if (!currentChannel) return;

      const isGestor = currentUser?.role === 'gestor' || currentUser?.role === 'admin' || userProfile?.role === 'gestor' || userProfile?.role === 'admin';

      // Descobrir os setores disponíveis para o usuário
      let userAllowedSectors: any[] = [];

      if (isGestor) {
        // Gestor/Admin tem acesso a todos os setores cadastrados da empresa
        userAllowedSectors = [...sectors];
      } else {
        // Colaborador operacional: buscar setores vinculados na tabela members
        const { data: memberRecord } = await (supabase
          .from('members') as any)
          .select('sector_id, sector_ids')
          .eq('email', userEmail)
          .maybeSingle();

        const sIds: string[] = [];
        if (memberRecord?.sector_ids && Array.isArray(memberRecord.sector_ids) && memberRecord.sector_ids.length > 0) {
          sIds.push(...memberRecord.sector_ids);
        } else if (memberRecord?.sector_id) {
          sIds.push(memberRecord.sector_id);
        }

        userAllowedSectors = sectors.filter(s => sIds.includes(s.id));
        if (userAllowedSectors.length === 0) {
          userAllowedSectors = [...sectors];
        }
      }

      // Condição para abrir o Modal:
      // 1. Usuário é Gestor/Admin; OU
      // 2. Usuário possui múltiplos setores vinculados; OU
      // 3. O chamado está sem setor definido (Geral); OU
      // 4. O setor atual do chamado não é o setor do colaborador
      const shouldOpenModal = isGestor || userAllowedSectors.length > 1 || !currentChannel.sector_id;

      if (shouldOpenModal) {
        setAssignSectorModalState({
          isOpen: true,
          channelId,
          channelName: currentChannel.name || 'Atendimento',
          currentSectorId: currentChannel.sector_id || null,
          allowedSectors: userAllowedSectors,
          selectedSectorId: currentChannel.sector_id || userAllowedSectors[0]?.id || ''
        });
        return;
      }

      // Se for operador com 1 único setor e o chamado já for desse setor:
      const targetSectorId = userAllowedSectors[0]?.id || currentChannel.sector_id || null;
      await executeAssignWithSector(channelId, targetSectorId);
    } catch (e) {
      console.error('Error in handleAssignToMe:', e);
      addToast('error', 'Erro', 'Não foi possível carregar os dados para assumir o atendimento.');
    }
  };

  const executeAssignWithSector = async (channelId: string, chosenSectorId: string | null) => {
    if (!userId) return;
    setIsAssigningSector(true);
    try {
      const { data: userProfile } = await (supabase
        .from('profiles') as any)
        .select('full_name')
        .eq('id', userId)
        .single();

      const { data: currentChannel } = await (supabase
        .from('chat_channels') as any)
        .select('name, support_status, sector_id')
        .eq('id', channelId)
        .single();

      const wasResolved = currentChannel?.support_status === 'resolved';

      // 1. Identificar o cliente associado a este canal (canal da fila)
      const { data: channelMembers } = await supabase
        .from('chat_channel_members')
        .select('user_id')
        .eq('channel_id', channelId);

      const memberUserIds = channelMembers?.map(m => m.user_id) || [];

      // Buscar perfil do cliente
      const { data: clientMemberProfile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', memberUserIds)
        .eq('role', 'cliente')
        .maybeSingle();

      const clientUserId = clientMemberProfile?.id;

      // 2. Se um setor foi escolhido e identificamos o cliente, verificar se esse cliente JÁ POSSUI outro canal deste setor
      let existingSectorChannelId: string | null = null;
      if (chosenSectorId && clientUserId) {
        const { data: clientMemberships } = await supabase
          .from('chat_channel_members')
          .select('channel_id')
          .eq('user_id', clientUserId);

        const clientOtherChannelIds = (clientMemberships || [])
          .map(m => m.channel_id)
          .filter(id => id !== channelId);

        if (clientOtherChannelIds.length > 0) {
          const { data: existingChannels } = await (supabase
            .from('chat_channels') as any)
            .select('id, name, status, support_status, sector_id')
            .eq('type', 'support')
            .or('is_notification.is.null,is_notification.eq.false')
            .eq('sector_id', chosenSectorId)
            .in('id', clientOtherChannelIds)
            .order('created_at', { ascending: false })
            .limit(1);

          if (existingChannels && existingChannels.length > 0) {
            existingSectorChannelId = existingChannels[0].id;
          }
        }
      }

      // Identificar o nome do setor escolhido
      let assignedSectorName = '';
      let updatedChannelName = currentChannel?.name || 'Atendimento';

      if (chosenSectorId) {
        const sObj = sectors.find(s => s.id === chosenSectorId);
        assignedSectorName = sObj?.name || '';
        if (assignedSectorName && updatedChannelName) {
          if (/\(Geral\)$/i.test(updatedChannelName)) {
            updatedChannelName = updatedChannelName.replace(/\(Geral\)$/i, `(${assignedSectorName})`);
          } else if (/\(.+?\)$/.test(updatedChannelName)) {
            updatedChannelName = updatedChannelName.replace(/\(.+?\)$/, `(${assignedSectorName})`);
          }
        }
      }

      const nowIso = new Date().toISOString();
      let targetChannelId = channelId;

      if (existingSectorChannelId) {
        // CENÁRIO A: Já existia um canal anterior para este setor (ex: canal do Fiscal que estava fechado).
        // 1. Reabrir e atribuir o canal existente
        targetChannelId = existingSectorChannelId;
        await (supabase.from('chat_channels') as any)
          .update({
            assigned_to: userId,
            support_status: 'in_progress',
            status: 'open',
            opened_at: nowIso,
            resolved_at: null,
            last_duration_seconds: null,
            is_private: false
          })
          .eq('id', existingSectorChannelId);

        // 2. Garantir que o atendente é membro do canal existente
        const { data: isMemberExisting } = await supabase
          .from('chat_channel_members')
          .select('id')
          .eq('channel_id', existingSectorChannelId)
          .eq('user_id', userId)
          .maybeSingle();

        if (!isMemberExisting) {
          await supabase.from('chat_channel_members').insert({
            channel_id: existingSectorChannelId,
            user_id: userId,
            role: 'member'
          });
        }

        // 3. Mover mensagens do canal temporário para o canal existente
        await (supabase.from('chat_messages') as any)
          .update({ channel_id: existingSectorChannelId })
          .eq('channel_id', channelId);

        // 4. Inserir mensagem de sistema no canal existente
        const systemText = `${userProfile?.full_name || 'Operador'} assumiu o atendimento a partir de um comunicado e o vinculou a este canal do setor ${assignedSectorName}.`;
        await supabase.from('chat_messages').insert({
          channel_id: existingSectorChannelId,
          sender_id: userId,
          text: systemText,
          status: 'sent',
          is_system: true
        } as any);

        // 5. Excluir o canal temporário da fila para não gerar duplicidade na lista do cliente
        await supabase.from('chat_channel_members').delete().eq('channel_id', channelId);
        await supabase.from('chat_channels').delete().eq('id', channelId);

      } else {
        // CENÁRIO B: Não existia canal anterior para este setor.
        // O canal atual da fila passa a ser o canal oficial do setor.
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

        const updatePayload: any = { 
          assigned_to: userId,
          support_status: 'in_progress',
          status: 'open',
          sector_id: chosenSectorId || null,
          name: updatedChannelName
        };

        if (wasResolved) {
          updatePayload.opened_at = nowIso;
          updatePayload.resolved_at = null;
          updatePayload.last_duration_seconds = null;
          updatePayload.is_private = false;
        }

        const { error } = await (supabase
          .from('chat_channels') as any)
          .update(updatePayload)
          .eq('id', channelId);
          
        if (error) throw error;
        
        let systemText = wasResolved
          ? `Atendimento retomado por ${userProfile?.full_name || 'Operador'}.`
          : `${userProfile?.full_name || 'Operador'} assumiu o atendimento.`;

        if (assignedSectorName) {
          systemText = `${userProfile?.full_name || 'Operador'} assumiu o atendimento e o vinculou ao setor ${assignedSectorName}.`;
        }

        await supabase.from('chat_messages').insert({
          channel_id: channelId,
          sender_id: userId,
          text: systemText,
          status: 'sent',
          is_system: true
        } as any);
      }
      
      setAssignSectorModalState(prev => ({ ...prev, isOpen: false }));
      await fetchChannels(userId);
      setSelectedChannelId(targetChannelId);
      setSupportSubTab('mine');
      addToast('success', 'Atendimento Assumido', `Atendimento vinculado ${assignedSectorName ? `ao setor ${assignedSectorName}` : ''} com sucesso.`);
    } catch (e) {
      console.error('Error executing assign with sector:', e);
      addToast('error', 'Erro', 'Falha ao assumir o atendimento.');
    } finally {
      setIsAssigningSector(false);
    }
  };

  const executeFinishSupportTicket = async () => {
    if (!selectedChannelId || !userId) return;

    const selectedChannel = channels.find(c => c.id === selectedChannelId);
    if (currentUser?.role === 'operacional' && selectedChannel?.assigned_to && selectedChannel.assigned_to !== userId) {
      alert('Apenas o colaborador responsável por este atendimento (ou um Gestor) pode concluí-lo.');
      setIsFinishModalOpen(false);
      return;
    }
    
    setIsFinishingSupport(true);
    const finishedChannelId = selectedChannelId;
    try {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const activeChan = enrichedChannels.find(c => c.id === finishedChannelId);
      const now = new Date();
      const openedAtMs = activeChan?.opened_at 
        ? new Date(activeChan.opened_at).getTime() 
        : (activeChan?.created_at ? new Date(activeChan.created_at).getTime() : now.getTime());
      const durationSeconds = Math.max(0, Math.floor((now.getTime() - openedAtMs) / 1000));

      await supabase.from('chat_channels').update({ 
        support_status: 'resolved',
        assigned_to: null,
        is_private: false,
        resolved_at: now.toISOString(),
        last_duration_seconds: durationSeconds
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
    if (!selectedChannelId || !userId || !transferSectorId) return;

    const currentChannel = channels.find(c => c.id === selectedChannelId);
    if (currentUser?.role === 'operacional' && currentChannel?.assigned_to && currentChannel.assigned_to !== userId) {
      alert('Apenas o colaborador responsável por este atendimento (ou um Gestor) pode transferi-lo.');
      return;
    }

    setIsTransferring(true);
    try {
      const targetUser = profiles.find(p => p.id === transferUserId);
      const targetSector = sectors.find(s => s.id === transferSectorId);
      if (!targetSector) throw new Error('Setor de destino inválido');

      const isSameSector = currentChannel && currentChannel.sector_id === transferSectorId;
      const isAssignedToUser = !!transferUserId;
      const newStatus = isAssignedToUser ? 'in_progress' : 'pending';
      const newAssignedTo = isAssignedToUser ? transferUserId : null;

      if (isSameSector) {
        // Apenas reatribui o operador / fila no mesmo setor
        await supabase
          .from('chat_channels')
          .update({
            assigned_to: newAssignedTo,
            support_status: newStatus
          } as any)
          .eq('id', selectedChannelId);

        if (isAssignedToUser && transferUserId) {
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
        }

        const systemMsgText = isAssignedToUser
          ? `Atendimento transferido para ${targetUser?.full_name || 'Operador'}.`
          : `Atendimento retornado para a fila do setor ${targetSector.name}.`;

        await supabase.from('chat_messages').insert({
          channel_id: selectedChannelId,
          sender_id: userId,
          text: systemMsgText,
          status: 'sent',
          is_system: true
        } as any);

        setIsTransferModalOpen(false);
        setTransferUserId('');
        setTransferSectorId('');
        await fetchChannels(userId);
        return;
      }

      // Transferência para setor diferente
      const { data: members, error: membersErr } = await (supabase
        .from('chat_channel_members') as any)
        .select('user_id')
        .eq('channel_id', selectedChannelId);

      if (membersErr || !members || members.length === 0) {
        throw new Error('Não foi possível obter os membros do canal');
      }

      const memberIds = members.map((m: any) => m.user_id).filter(Boolean) as string[];

      const { data: dbProfiles, error: profilesErr } = await (supabase
        .from('profiles') as any)
        .select('id, full_name, role')
        .in('id', memberIds)
        .eq('role', 'cliente');

      if (profilesErr || !dbProfiles || dbProfiles.length === 0) {
        throw new Error('Cliente associado ao atendimento não encontrado');
      }

      const clientId = dbProfiles[0].id;
      const clientName = dbProfiles[0].full_name;

      const { data: targetSectorChannels, error: channelsErr } = await (supabase
        .from('chat_channels') as any)
        .select('id, status, support_status, name')
        .eq('type', 'support')
        .eq('sector_id', transferSectorId)
        .eq('is_notification', false);

      if (channelsErr) throw channelsErr;

      let targetChannelId = '';

      if (targetSectorChannels && targetSectorChannels.length > 0) {
        const channelIds = targetSectorChannels.map(c => c.id);
        const { data: clientMemberships, error: membersCheckErr } = await supabase
          .from('chat_channel_members')
          .select('channel_id')
          .eq('user_id', clientId)
          .in('channel_id', channelIds);

        if (membersCheckErr) throw membersCheckErr;

        if (clientMemberships && clientMemberships.length > 0) {
          targetChannelId = clientMemberships[0].channel_id;
        }
      }

      const hasExisting = !!targetChannelId;

      if (hasExisting) {
        await supabase
          .from('chat_channels')
          .update({
            status: 'open',
            support_status: newStatus,
            assigned_to: newAssignedTo
          } as any)
          .eq('id', targetChannelId);

        if (isAssignedToUser && transferUserId) {
          const { data: isMember } = await supabase
            .from('chat_channel_members')
            .select('*')
            .eq('channel_id', targetChannelId)
            .eq('user_id', transferUserId)
            .maybeSingle();

          if (!isMember) {
            await supabase.from('chat_channel_members').insert({
              channel_id: targetChannelId,
              user_id: transferUserId,
              role: 'member'
            });
          }
        }
      } else {
        const channelName = `Atendimento - ${clientName} (${targetSector.name})`;
        
        const { data: newChannel, error: createError } = await supabase
          .from('chat_channels')
          .insert([{
            name: channelName,
            type: 'support',
            created_by: userId,
            status: 'open',
            support_status: newStatus,
            assigned_to: newAssignedTo,
            sector_id: transferSectorId
          } as any])
          .select()
          .single();

        if (createError) throw createError;
        targetChannelId = newChannel.id;

        const { data: staffMembers } = await supabase
          .from('profiles')
          .select('id')
          .neq('role', 'cliente');

        const membersToInsert = [
          { channel_id: targetChannelId, user_id: clientId, role: 'member' }
        ];

        if (staffMembers) {
          staffMembers.forEach(staff => {
            membersToInsert.push({
              channel_id: targetChannelId,
              user_id: staff.id,
              role: (isAssignedToUser && staff.id === transferUserId) ? 'admin' : 'member'
            });
          });
        }

        await supabase.from('chat_channel_members').insert(membersToInsert);
      }

      // Encerrar o canal antigo voltando para o modo normal
      await supabase
        .from('chat_channels')
        .update({ support_status: 'resolved', is_private: false } as any)
        .eq('id', selectedChannelId);

      const transferMsgText = isAssignedToUser
        ? `Atendimento transferido para o setor ${targetSector.name} aos cuidados de ${targetUser?.full_name || 'Operador'}.`
        : `Atendimento transferido para a fila do setor ${targetSector.name}.`;

      await supabase.from('chat_messages').insert({
        channel_id: selectedChannelId,
        sender_id: userId,
        text: transferMsgText,
        status: 'sent',
        is_system: true
      } as any);

      await supabase.from('chat_messages').insert({
        channel_id: targetChannelId,
        sender_id: userId,
        text: `Atendimento iniciado por transferência do setor de origem.`,
        status: 'sent',
        is_system: true
      } as any);

      setIsTransferModalOpen(false);
      setTransferUserId('');
      setTransferSectorId('');
      await fetchChannels(userId);
      setSelectedChannelId(targetChannelId);
    } catch (error) {
      console.error('Error transferring ticket:', error);
      alert('Erro ao transferir atendimento.');
    } finally {
      setIsTransferring(false);
    }
  };

  const teamForwardDestinations = React.useMemo(() => {
    const groups = channels
      .filter(c => c.type === 'group' && c.status !== 'closed' && c.id !== selectedChannelId)
      .map(c => ({
        id: c.id,
        name: c.name,
        subText: 'Grupo de Trabalho',
        avatar: c.avatar_url
      }));

    const staff = profiles
      .filter(p => (p.role === 'gestor' || p.role === 'operacional') && p.id !== userId)
      .map(p => {
        const existingChannel = channels.find(c => c.type === 'direct' && c.rawName.includes(p.id));
        return {
          id: existingChannel ? existingChannel.id : `profile-${p.id}`,
          name: p.full_name || 'Colaborador',
          subText: p.sector || (p.role === 'gestor' ? 'Gestor' : 'Operacional'),
          avatar: p.avatar_url
        };
      });

    return [...groups, ...staff].filter(item =>
      item.name.toLowerCase().includes(forwardSearchTerm.toLowerCase()) ||
      item.subText.toLowerCase().includes(forwardSearchTerm.toLowerCase())
    );
  }, [channels, profiles, userId, selectedChannelId, forwardSearchTerm]);

  const clientForwardDestinations = React.useMemo(() => {
    const supportChannels = channels
      .filter(c => c.type === 'support' && c.id !== selectedChannelId)
      .map(c => ({
        id: c.id,
        name: c.name,
        subText: c.support_status === 'resolved' ? 'Atendimento Concluído' : 'Atendimento Ativo',
        avatar: c.avatar_url
      }));

    return supportChannels.filter(item =>
      item.name.toLowerCase().includes(forwardSearchTerm.toLowerCase()) ||
      item.subText.toLowerCase().includes(forwardSearchTerm.toLowerCase())
    );
  }, [channels, selectedChannelId, forwardSearchTerm]);

  const currentForwardList = forwardTab === 'team' ? teamForwardDestinations : clientForwardDestinations;

  const handleSendForward = async () => {
    if (!forwardMessageModal.message || selectedForwardChannels.length === 0 || !userId) return;

    setIsForwarding(true);
    try {
      const msg = forwardMessageModal.message;
      for (const rawTargetId of selectedForwardChannels) {
        let channelId = rawTargetId;

        // Se for um perfil direto que ainda não possui canal ativo criado
        if (rawTargetId.startsWith('profile-')) {
          const targetProfileId = rawTargetId.replace('profile-', '');
          const existingDirect = channels.find(c => c.type === 'direct' && c.rawName.includes(targetProfileId));
          if (existingDirect) {
            channelId = existingDirect.id;
          } else {
            const rawName = `${userId}_${targetProfileId}`;
            const { data: newChan } = await supabase
              .from('chat_channels')
              .insert({
                name: rawName,
                type: 'direct',
                created_by: userId
              } as any)
              .select('id')
              .single();

            if (newChan) {
              channelId = newChan.id;
              await supabase.from('chat_channel_members').insert([
                { channel_id: channelId, user_id: userId, role: 'member' },
                { channel_id: channelId, user_id: targetProfileId, role: 'member' }
              ] as any);
            }
          }
        }

        await supabase.from('chat_messages').insert({
          channel_id: channelId,
          contact_id: null as any,
          sender_id: userId,
          text: msg.text || '',
          attachment_url: msg.attachment_url || null,
          file_name: msg.file_name || null,
          file_type: msg.file_type || null,
          status: 'sent',
          is_me: true,
          is_forwarded: true
        } as any);
      }

      setForwardMessageModal({ isOpen: false, message: null });
      setSelectedForwardChannels([]);
      await fetchChannels(userId);
    } catch (err) {
      console.error('Error forwarding message:', err);
      alert('Falha ao encaminhar mensagem');
    } finally {
      setIsForwarding(false);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) { // 50MB
        alert(`O arquivo "${file.name}" excede o tamanho máximo de 50MB.`);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 50 * 1024 * 1024) {
            alert(`O arquivo "${file.name}" excede o tamanho máximo de 50MB.`);
          } else {
            pastedFiles.push(file);
          }
        }
      }
    }

    if (pastedFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...pastedFiles]);
    }
  };

  const replaceTemplatePlaceholders = async (text: string, template?: any) => {
    if (!text) return '';

    // Tentar pegar o cliente ativo
    const client = activeChannelCompanies && activeChannelCompanies.length > 0 
      ? activeChannelCompanies[0] 
      : null;

    // Tentar pegar o nome do contato
    let contactName = '';
    if (selectedChannelId) {
      const activeChannel = channels.find(c => c.id === selectedChannelId);
      if (activeChannel) {
        if (activeChannel.type === 'support') {
          const match = activeChannel.rawName ? activeChannel.rawName.match(/^Atendimento - (.+?)(?:\s*\(|$)/) : null;
          contactName = match ? match[1].trim() : activeChannel.name;
        } else if (activeChannel.type === 'direct') {
          contactName = activeChannel.name;
        }
      }
    }

    // Garantir que a palavra "Atendimento" e hifens soltos sejam limpos
    if (contactName) {
      contactName = contactName
        .replace(/Atendimento/gi, '')
        .replace(/^\s*-\s*/, '')
        .trim();
    }

    // Mapeamento de Regimes Tributários para exibição amigável
    const TAX_REGIME_LABELS: Record<string, string> = {
      'simples': 'Simples',
      'simples_iva': 'Simples IVA Dual',
      'presumido': 'Presumido',
      'presumido_imune': 'Presumido Imune-Isento',
      'real_trimestral': 'Real Trimestral',
      'real_anual': 'Real Anual',
      'real_imune': 'Real Imune-Isento',
      'arbitrado': 'Arbitrado',
      'mei': 'Microempreendedor',
      'nanoempreendedor': 'Nanoempreendedor',
      'irpf': 'IRPF Progressivo',
      'lp': 'Lucro Presumido (Legado)',
      'lr': 'Lucro Real (Legado)'
    };

    const regimeLabel = client?.tax_regime ? (TAX_REGIME_LABELS[client.tax_regime] || client.tax_regime) : '';
    
    const d = new Date();
    // Mês anterior como competência padrão (MM/AAAA)
    const prevMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const mesCompetencia = prevMonthDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

    // Placeholders da tarefa vinculada
    let vencimentoPadraoStr = 'Não Definido';
    let taskTypeName = 'Obrigação';
    
    if (template?.reference_task_type_id && taskTypes.length > 0) {
      const taskTypeObj = taskTypes.find(t => t.id === template.reference_task_type_id);
      if (taskTypeObj) {
        taskTypeName = taskTypeObj.name;
        const dueDay = taskTypeObj.due_day;
        const today = new Date();
        const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay || 20);
        vencimentoPadraoStr = dueDate.toLocaleDateString('pt-BR');
      }
    }

    let nomeTarefaStr = taskTypeName;
    let vencimentoTarefaStr = 'Data limite';

    if (template?.reference_task_type_id && client?.id) {
      try {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('due_date, task_name')
          .eq('client_id', client.id)
          .eq('task_name', taskTypeName)
          .order('due_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (taskData) {
          nomeTarefaStr = taskData.task_name || taskTypeName;
          vencimentoTarefaStr = taskData.due_date 
            ? new Date(taskData.due_date).toLocaleDateString('pt-BR') 
            : 'Data não definida';
        }
      } catch (err) {
        console.error('Error fetching task details for placeholder:', err);
      }
    }

    let textProcessed = text
      .replace(/{nome_contato}/g, contactName || '')
      .replace(/{razao_social}/g, client?.company_name || '')
      .replace(/{cnpj_empresa}/g, client?.document || '')
      .replace(/{regime_tributario}/g, regimeLabel || '')
      .replace(/{link_portal}/g, window.location.origin)
      .replace(/{mes_competencia}/g, mesCompetencia)
      .replace(/{codigo_cliente}/g, client?.code || '')
      .replace(/{cidade_empresa}/g, client?.city || '')
      .replace(/{estado_empresa}/g, client?.state || '')
      .replace(/{segmento_empresa}/g, client?.segment || '')
      .replace(/{nome_tarefa}/g, nomeTarefaStr)
      .replace(/{vencimento_tarefa}/g, vencimentoTarefaStr)
      .replace(/{vencimento_padrao}/g, vencimentoPadraoStr);

    // Adicionar a assinatura do setor no final da mensagem se houver setor associado ao canal ativo
    if (selectedChannelId) {
      const activeChannel = channels.find(c => c.id === selectedChannelId);
      if (activeChannel?.sector_id) {
        const sector = sectors.find(s => s.id === activeChannel.sector_id);
        if (sector) {
          textProcessed += `\n\n(${sector.name})`;
        }
      }
    }

    return textProcessed;
  };

  const handleSelectTemplate = async (template: any) => {
    const textProcessed = await replaceTemplatePlaceholders(template.content, template);
    setMessageInput(textProcessed);
    setIsTemplateDrawerOpen(false);
    
    // Focar no textarea e ajustar a altura dele
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 50);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && selectedFiles.length === 0) || !selectedChannelId || !userId) return;

    const selectedChannel = enrichedChannels.find(c => c.id === selectedChannelId);
    const isSupport = selectedChannel?.type === 'support';
    const isClosed = selectedChannel?.status === 'closed' || selectedChannel?.support_status === 'resolved';

    const textToSend = messageInput.trim();
    const filesToSend = [...selectedFiles];

    setMessageInput('');
    clearSelectedFiles();
    setShowEmojiPicker(false);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: userId,
      text: textToSend,
      created_at: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      status: 'sent',
      reply_to_id: replyingTo ? replyingTo.id : undefined,
      rawCreatedAt: new Date().toISOString()
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
          const nowIso = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('chat_channels')
            .update({
              status: 'open',
              support_status: 'pending',
              assigned_to: null,
              opened_at: nowIso,
              resolved_at: null,
              last_duration_seconds: null
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
        } else if (isStaff) {
          // Garantir que o colaborador é membro do canal sem forçar auto-atribuição
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
        }
      }

      // 1. Enviar mensagem com o texto (se digitado)
      if (textToSend) {
        await supabase
          .from('chat_messages')
          .insert({
            channel_id: selectedChannelId,
            contact_id: null as any,
            sender_id: userId,
            text: textToSend,
            status: 'sent',
            is_me: true,
            reply_to_id: optimisticMsg.reply_to_id || null,
            is_private: selectedChannel?.is_private ?? false
          } as any);
      }

      // 2. Enviar cada um dos arquivos anexados sequencialmente
      if (filesToSend.length > 0) {
        setUploadProgress(10);
        for (let i = 0; i < filesToSend.length; i++) {
          const fileToSend = filesToSend[i];
          const fileExt = fileToSend.name.split('.').pop();
          const filePath = `${selectedChannelId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('chat_attachments')
            .upload(filePath, fileToSend);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('chat_attachments')
            .getPublicUrl(filePath);

          await supabase
            .from('chat_messages')
            .insert({
              channel_id: selectedChannelId,
              contact_id: null as any,
              sender_id: userId,
              text: '',
              status: 'sent',
              is_me: true,
              attachment_url: publicUrl,
              file_name: fileToSend.name,
              file_type: fileToSend.type,
              file_size: fileToSend.size,
              is_private: selectedChannel?.is_private ?? false
            } as any);

          setUploadProgress(Math.round(((i + 1) / filesToSend.length) * 100));
        }
        setTimeout(() => setUploadProgress(0), 1000);
      }

      // Manter last_read_at atualizado ao enviar mensagem
      markChannelAsRead(selectedChannelId);
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
      const aPinned = pinnedChannelIds.includes(a.id);
      const bPinned = pinnedChannelIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      const aCustomIdx = customChannelOrder.indexOf(a.id);
      const bCustomIdx = customChannelOrder.indexOf(b.id);

      if (aCustomIdx !== -1 && bCustomIdx !== -1) {
        return aCustomIdx - bCustomIdx;
      }
      if (aCustomIdx !== -1) return -1;
      if (bCustomIdx !== -1) return 1;

      if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [enrichedChannels, profiles, contactSearchTerm, currentUser, userId, pinnedChannelIds, customChannelOrder]);

  // Função para verificar se o canal foi criado por um cliente
  const isChannelCreatedByClient = React.useCallback((ch: Channel) => {
    if (!ch.created_by) return false;
    if (ch.created_by === userId) {
      return currentUser?.role === 'cliente';
    }
    const creatorProfile = profiles.find(p => p.id === ch.created_by);
    return creatorProfile?.role === 'cliente';
  }, [userId, currentUser, profiles]);

  const supportCounts = React.useMemo(() => {
    let queue = 0;
    let mine = 0;
    let alerts = 0;
    let all = 0;

    channels.forEach(c => {
      if (c.type === 'support') {
        const isClosed = c.support_status === 'resolved' || c.status === 'closed';
        if (!isClosed) {
          const createdByClient = isChannelCreatedByClient(c);
          
          if (c.is_notification) {
            alerts++;
          } else {
            all++;
            if (!c.assigned_to) {
              queue++;
            }

            if (c.assigned_to === userId) {
              mine++;
            }
          }
        }
      }
    });

    return { queue, mine, alerts, all };
  }, [channels, userId, isChannelCreatedByClient, selectedSectorFilterId]);

  const filteredChannels = enrichedChannels.filter(channel => {
    if (!channel.name?.toLowerCase().includes(contactSearchTerm.toLowerCase())) return false;

    // Filtro por Setor (Suporte)
    if (activeTab === 'support' && selectedSectorFilterId && channel.sector_id !== selectedSectorFilterId) {
      return false;
    }
    
    if (currentUser?.role === 'cliente') {
      if (channel.type !== 'support') return false;
      if (clientSubTab === 'notificacao') {
        return !!channel.is_notification;
      } else {
        return !channel.is_notification;
      }
    } else {
      // Para o escritório, a aba 'chats' (Equipe) agora é handled pelo teamItems
      if (activeTab === 'chats') return false; 
      if (activeTab === 'support') {
        if (channel.type !== 'support') {
          return false;
        }
        // Ocultar chamadas em modo privado para usuários com perfil operacional enquanto ativas
        if (channel.is_private && currentUser?.role === 'operacional' && channel.support_status !== 'resolved') {
          return false;
        }
        // Sub-filtros de atendimento para staff
        if (supportSubTab === 'queue') {
          return !channel.assigned_to && 
                 channel.support_status !== 'resolved' && 
                 channel.status !== 'closed' &&
                 !channel.is_notification;
        }
        if (supportSubTab === 'mine') {
          return channel.assigned_to === userId && 
                 channel.support_status !== 'resolved' && 
                 channel.status !== 'closed' &&
                 !channel.is_notification;
        }
        if (supportSubTab === 'alerts') {
          return !!channel.is_notification && 
                 channel.support_status !== 'resolved' && 
                 channel.status !== 'closed';
        }
        // 'all' (Todos - mostra ativos e encerrados/resolvidos)
        return !channel.is_notification;
      }
      return false;
    }
  });

  const sortedFilteredChannels = React.useMemo(() => {
    const list = [...filteredChannels];
    list.sort((a, b) => {
      // 1. Status do Atendimento: Abertos no topo, Encerrados/Concluídos para BAIXO
      const aIsClosed = a.support_status === 'resolved' || a.status === 'closed';
      const bIsClosed = b.support_status === 'resolved' || b.status === 'closed';

      if (!aIsClosed && bIsClosed) return -1;
      if (aIsClosed && !bIsClosed) return 1;

      // 2. Canais Fixados (Pinned)
      const aPinned = pinnedChannelIds.includes(a.id);
      const bPinned = pinnedChannelIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // 3. Ordem Personalizada (Drag & Drop)
      const aCustomIdx = customChannelOrder.indexOf(a.id);
      const bCustomIdx = customChannelOrder.indexOf(b.id);

      if (aCustomIdx !== -1 && bCustomIdx !== -1) {
        return aCustomIdx - bCustomIdx;
      }
      if (aCustomIdx !== -1) return -1;
      if (bCustomIdx !== -1) return 1;

      // 4. Data de Última Atividade / Mensagem
      const aTime = a.lastMessageTime 
        ? new Date(a.lastMessageTime).getTime() 
        : (a.opened_at ? new Date(a.opened_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0));
      const bTime = b.lastMessageTime 
        ? new Date(b.lastMessageTime).getTime() 
        : (b.opened_at ? new Date(b.opened_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0));

      return bTime - aTime;
    });
    return list;
  }, [filteredChannels, pinnedChannelIds, customChannelOrder]);

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
      <div className={`transition-all duration-300 ease-in-out overflow-hidden h-full flex-col bg-slate-50/50 dark:bg-slate-950/30 absolute md:relative z-10 ${showSidebarOnMobile ? 'w-full flex' : 'w-0 hidden md:flex'} ${isSidebarCollapsed ? 'md:w-0 md:opacity-0 border-r border-transparent pointer-events-none' : 'md:w-[328px] md:opacity-100 border-r border-slate-200 dark:border-slate-800'}`}>
        <div className="w-[328px] h-full flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="hidden md:flex">
                <Tooltip content="Recolher" position="bottom">
                  <button 
                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/50"
                    onClick={() => setIsSidebarCollapsed(true)}
                  >
                    <PanelLeft size={18} />
                  </button>
                </Tooltip>
              </div>
              
              <div className="flex flex-col text-left">
                <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                  Chat
                </h1>
                <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Tooltip content="Alterar Status" position="bottom">
                <div className="relative" ref={statusMenuRef}>
                  {(() => {
                    const currentStatusKey = (currentUser?.chat_status || 'disponível').toLowerCase();
                    const currentConfig = STATUS_CONFIG[currentStatusKey] || STATUS_CONFIG['disponível'];
                    const CurrentIcon = currentConfig.icon;

                    return (
                      <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        className={`flex items-center gap-2 h-[38px] px-3 bg-white dark:bg-slate-900 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm ${
                          showStatusMenu ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md ${currentConfig.iconBg} ${currentConfig.iconText} flex items-center justify-center shrink-0`}>
                          <CurrentIcon size={12} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize hidden sm:inline-block">
                          {currentConfig.label}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showStatusMenu ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`} />
                      </button>
                    );
                  })()}

                  {showStatusMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Definir meu status</p>
                      </div>
                      {(['disponível', 'ocupado', 'ausente', 'almoço', 'férias'] as const).map(status => {
                        const config = STATUS_CONFIG[status];
                        const Icon = config.icon;
                        const isSelected = (currentUser?.chat_status || 'disponível').toLowerCase() === status;

                        return (
                          <button
                            key={status}
                            onClick={() => {
                              updateChatStatus(status);
                              setShowStatusMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between group ${
                              isSelected 
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold' 
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-6 h-6 rounded-md ${config.iconBg} ${config.iconText} flex items-center justify-center shrink-0 shadow-xs`}>
                                <Icon size={13} strokeWidth={2.4} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold leading-none mb-0.5">{config.label}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-none">{config.description}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" strokeWidth={2.5} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Tooltip>
              {currentUser?.role !== 'cliente' ? (
                <>
                  {activeTab === 'support' ? (
                    <Tooltip content="Novo Atendimento" position="bottom">
                      <button
                        onClick={() => { fetchClients(); setIsStaffSupportModalOpen(true); }}
                        className="w-[38px] h-[38px] flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </Tooltip>
                  ) : (
                    currentUser?.role === 'gestor' && (
                      <Tooltip content="Novo Grupo" position="bottom">
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="w-[38px] h-[38px] flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </Tooltip>
                    )
                  )}
                </>
              ) : (
                <Tooltip content="Novo Atendimento" position="bottom">
                  <button
                    onClick={() => setIsSupportCreateModalOpen(true)}
                    className="w-[38px] h-[38px] flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
          
          <div className="px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={activeTab === 'contacts' ? "Buscar equipe..." : "Buscar conversas..."}
                value={contactSearchTerm}
                onChange={(e) => setContactSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
            {activeTab === 'support' && currentUser?.role !== 'cliente' && (
              <Tooltip content="Filtros" position="bottom">
                <button
                  type="button"
                  onClick={() => setShowSectorFilter(!showSectorFilter)}
                  className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center shrink-0 ${
                    showSectorFilter || selectedSectorFilterId
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <SlidersHorizontal size={15} />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Sincronizar conversas" position="bottom">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <RefreshCw size={15} className={isSyncing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''} />
              </button>
            </Tooltip>
          </div>

          {currentUser?.role === 'cliente' && (
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                type="button"
                onClick={() => { setClientSubTab('atendimento'); setSelectedChannelId(null); }}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  clientSubTab === 'atendimento'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <MessageSquare size={14} />
                <span>Atendimento</span>
                {unreadSupportCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {unreadSupportCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setClientSubTab('notificacao'); setSelectedChannelId(null); }}
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  clientSubTab === 'notificacao'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <AlertCircle size={14} />
                <span>Notificações</span>
                {unreadNotificationCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {currentUser?.role === 'cliente' && clientSubTab === 'notificacao' && (
            <div className="px-1 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                type="button"
                onClick={handleMarkAllNotificationsAsRead}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold border border-indigo-100/50 dark:border-indigo-900/30 transition-all shadow-sm"
              >
                <CheckCheck size={14} />
                <span>Marcar todas como lidas</span>
              </button>
            </div>
          )}

          {activeTab === 'support' && currentUser?.role !== 'cliente' && showSectorFilter && (
            <div className="flex flex-col gap-1.5 px-1 animate-in fade-in slide-in-from-top-2 duration-200">
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

          {activeTab === 'support' && currentUser?.role !== 'cliente' && (
            <div className="grid grid-cols-4 gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                type="button"
                onClick={() => setSupportSubTab('queue')}
                className={`py-1 px-1 text-[10px] font-semibold rounded transition-all flex items-center justify-center gap-1 ${
                  supportSubTab === 'queue'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/30 dark:border-slate-700/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Em fila"
              >
                <span className="truncate">Fila</span>
                {supportCounts.queue > 0 && (
                  <span className={`px-1 py-0.2 text-[8px] font-bold rounded-full shrink-0 ${
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
                className={`py-1 px-1 text-[10px] font-semibold rounded transition-all flex items-center justify-center gap-1 ${
                  supportSubTab === 'mine'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/30 dark:border-slate-700/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Minhas"
              >
                <span className="truncate">Minhas</span>
                {supportCounts.mine > 0 && (
                  <span className={`px-1 py-0.2 text-[8px] font-bold rounded-full shrink-0 ${
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
                className={`py-1 px-1 text-[10px] font-semibold rounded transition-all flex items-center justify-center gap-1 ${
                  supportSubTab === 'all'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/30 dark:border-slate-700/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Todos"
              >
                <span className="truncate">Todas</span>
                {supportCounts.all > 0 && (
                  <span className={`px-1 py-0.2 text-[8px] font-bold rounded-full shrink-0 ${
                    supportSubTab === 'all'
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {supportCounts.all}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSupportSubTab('alerts')}
                className={`py-1 px-1 text-[10px] font-semibold rounded transition-all flex items-center justify-center gap-1 ${
                  supportSubTab === 'alerts'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/30 dark:border-slate-700/30'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Notificação"
              >
                <span className="truncate">Alertas</span>
                {supportCounts.alerts > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Alertas pendentes" />
                )}
              </button>
            </div>
          )}

          {currentUser?.role !== 'cliente' && activeTab === 'support' && supportSubTab === 'alerts' && (
            <div className="px-1 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-200">
              <button
                type="button"
                onClick={handleMarkAllNotificationsAsRead}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold border border-indigo-100/50 dark:border-indigo-900/30 transition-all shadow-sm"
              >
                <CheckCheck size={14} />
                <span>Marcar todas como lidas</span>
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
                {supportCounts.all > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {supportCounts.all}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {activeTab === 'chats' && currentUser?.role !== 'cliente' ? (
            teamItems.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">Nenhum membro ou grupo encontrado.</div>
            ) : teamItems.map(item => {
              const isPinned = pinnedChannelIds.includes(item.id);
              const dragProps = getChannelDragProps(item.id, teamItems);
              const isDragOver = dragOverChannelId === item.id;
              const isDragging = draggedChannelId === item.id;

              return (
                <button
                  key={item.id}
                  {...dragProps}
                  onClick={() => {
                    if ((item as any).isProfile) {
                      handleStartDirectChat((item as any).profileId);
                    } else {
                      setSelectedChannelId(item.id);
                    }
                    setShowSidebarOnMobile(false);
                  }}
                  className={`group/item w-full flex items-center gap-2 py-2 px-2.5 rounded-lg transition-all ${
                    selectedChannelId === item.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isDragOver ? 'border-2 border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40' : 'border border-transparent'} ${
                    isDragging ? 'opacity-40 scale-95' : ''
                  }`}
                >
                  <span
                    className="p-1 cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 opacity-0 group-hover/item:opacity-100 hover:text-slate-500 transition-all shrink-0 -ml-1"
                    onMouseDown={() => setDraggableChannelId(item.id)}
                    title="Arrastar para reordenar"
                  >
                    <GripVertical size={13} />
                  </span>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold overflow-hidden">
                      {item.avatar_url ? (
                        <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        item.fallbackAvatar
                      )}
                    </div>
                    {item.type === 'direct' && (
                      <StatusDot status={(item as any).contactStatus || 'disponível'} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left flex flex-col justify-center gap-0.5">
                    <div className="flex justify-between items-center gap-1 leading-none">
                      <h3 className={`text-sm font-semibold leading-snug truncate flex items-center gap-1.5 min-w-0 ${selectedChannelId === item.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                        {isPinned && (
                          <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <span className="truncate">{item.name}</span>
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">
                          {item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleDateString('pt-BR') : ''}
                        </span>
                        <Tooltip content={isPinned ? "Desfixar conversa" : "Fixar conversa"} position="top">
                          <span
                            role="button"
                            onClick={(e) => togglePinChannel(item.id, e)}
                            className={`p-1 rounded-md transition-all ${
                              isPinned
                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 opacity-100'
                                : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover/item:opacity-100 hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }`}
                          >
                            {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs leading-snug truncate ${item.unreadCount > 0 ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500'}`}>
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
              );
            })
          ) : (activeTab === 'support' || currentUser?.role === 'cliente') ? (
            sortedFilteredChannels.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">Nenhuma conversa encontrada.</div>
            ) : sortedFilteredChannels.map(channel => {
              const isPinned = pinnedChannelIds.includes(channel.id);
              const dragProps = getChannelDragProps(channel.id, sortedFilteredChannels);
              const isDragOver = dragOverChannelId === channel.id;
              const isDragging = draggedChannelId === channel.id;

              return (
                <button
                  key={channel.id}
                  {...dragProps}
                  onClick={() => {
                    setSelectedChannelId(channel.id);
                    setShowSidebarOnMobile(false);
                  }}
                  className={`group/item w-full flex items-center gap-2 py-2 px-2.5 rounded-lg transition-all ${
                    selectedChannelId === channel.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  } ${isDragOver ? 'border-2 border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40' : 'border border-transparent'} ${
                    isDragging ? 'opacity-40 scale-95' : ''
                  }`}
                >
                  <span
                    className="p-1 cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 opacity-0 group-hover/item:opacity-100 hover:text-slate-500 transition-all shrink-0 -ml-1"
                    onMouseDown={() => setDraggableChannelId(channel.id)}
                    title="Arrastar para reordenar"
                  >
                    <GripVertical size={13} />
                  </span>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-semibold overflow-hidden">
                      {channel.avatar_url ? (
                        <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        channel.fallbackAvatar
                      )}
                    </div>
                    {(channel.type === 'direct' || channel.type === 'support') && (channel as any).contactStatus && (
                      <StatusDot status={(channel as any).contactStatus} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left flex flex-col justify-center gap-0.5">
                    <div className="flex justify-between items-center gap-1 leading-none">
                      <h3 className={`text-sm font-semibold leading-snug truncate flex items-center gap-1.5 min-w-0 ${selectedChannelId === channel.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-900 dark:text-white'}`}>
                        {isPinned && (
                          <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <span className="truncate">{channel.name}</span>
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">
                          {channel.lastMessageTime ? new Date(channel.lastMessageTime).toLocaleDateString('pt-BR') : ''}
                        </span>
                        <Tooltip content={isPinned ? "Desfixar conversa" : "Fixar conversa"} position="top">
                          <span
                            role="button"
                            onClick={(e) => togglePinChannel(channel.id, e)}
                            className={`p-1 rounded-md transition-all ${
                              isPinned
                                ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 opacity-100'
                                : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover/item:opacity-100 hover:text-indigo-600 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                            }`}
                          >
                            {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                    {channel.type === 'support' && (
                      <div className="flex items-center gap-1 flex-wrap leading-none animate-in fade-in duration-200">
                        {/* Badge de Atribuição (só para equipe) */}
                        {currentUser?.role !== 'cliente' && (
                          channel.assigned_to ? (
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium border border-slate-200/50 dark:border-slate-700/50">
                              {channel.assigned_to === userId 
                                ? (currentUser?.full_name?.split(' ')[0] || 'Eu') 
                                : (profiles.find(p => p.id === channel.assigned_to)?.full_name?.split(' ')[0] || 'Atendente')}
                            </span>
                          ) : (
                            channel.support_status !== 'resolved' && !channel.is_notification && (
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
                        {channel.is_notification ? (
                          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-semibold border border-indigo-100/50 dark:border-indigo-900/30 animate-pulse">
                            Notificação
                          </span>
                        ) : channel.support_status === 'resolved' ? (
                          <span className="text-[9px] bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-semibold border border-rose-100/50 dark:border-rose-900/30">
                            Fechado
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-semibold border border-emerald-100/50 dark:border-emerald-900/30">
                            Aberto
                          </span>
                        )}

                        {/* Badge de Tempo de Atendimento (SLA) */}
                        {!channel.is_notification && (
                          channel.support_status === 'resolved' ? (
                            channel.last_duration_seconds ? (
                              <Tooltip content={`Atendimento concluído. Duração total: ${formatSupportDuration(null, channel.last_duration_seconds)}`} position="top">
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold border flex items-center gap-0.5 leading-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                  <Clock size={9} className="shrink-0 text-slate-500" />
                                  <span>{formatSupportDuration(null, channel.last_duration_seconds)}</span>
                                </span>
                              </Tooltip>
                            ) : null
                          ) : (
                            <Tooltip content={`Atendimento aberto há ${formatSupportDuration(channel.opened_at || channel.created_at)}`} position="top">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border flex items-center gap-0.5 leading-none ${getSupportSlaBadgeStyle(channel.opened_at || channel.created_at)}`}>
                                <Clock size={9} className="shrink-0" />
                                <span>{formatSupportDuration(channel.opened_at || channel.created_at)}</span>
                              </span>
                            </Tooltip>
                          )
                        )}
                      </div>
                    )}
                    <p className={`text-xs leading-snug truncate ${selectedChannelId === channel.id ? 'text-indigo-700/70 dark:text-indigo-300/70' : 'text-slate-500 dark:text-slate-400'}`}>
                      {channel.lastMessage}
                    </p>
                  </div>
                  {channel.unreadCount > 0 && (
                    <div className="shrink-0 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {channel.unreadCount}
                    </div>
                  )}
                </button>
              );
            })
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
                    const currentStatus = isProfileOffline ? 'offline' : (profile.chat_status || 'disponível');
                    return <StatusDot status={currentStatus} />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {profile.full_name || 'Usuário Sem Nome'}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {profile.sector || 'Sem Setor'}
                    </p>
                    {(() => {
                      let isProfileOffline = true;
                      if (profile.current_session_start) {
                        const sessionStart = new Date(profile.current_session_start).getTime();
                        const lastActive = profile.last_active_at ? new Date(profile.last_active_at).getTime() : sessionStart;
                        if (Date.now() - lastActive < 30 * 60 * 1000) {
                          isProfileOffline = false;
                        }
                      }
                      const currentStatus = isProfileOffline ? 'offline' : (profile.chat_status || 'disponível');
                      if (currentStatus !== 'disponível' && currentStatus !== 'offline') {
                        return <RenderStatusBadge status={currentStatus} size="xs" />;
                      }
                      return null;
                    })()}
                  </div>
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
          <div className="min-h-16 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                className="md:hidden p-1.5 mr-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => setShowSidebarOnMobile(true)}
              >
                <ArrowLeft size={20} />
              </button>
              {isSidebarCollapsed && (
                <Tooltip content="Expandir" position="bottom">
                  <button 
                    className="hidden md:flex p-1.5 mr-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/50"
                    onClick={() => setIsSidebarCollapsed(false)}
                  >
                    <PanelLeft size={20} />
                  </button>
                </Tooltip>
              )}
              <div>
                <div className="flex flex-col items-start gap-1">
                  {/* 1. Nome */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    {selectedChannel.type === 'support' && currentUser?.role === 'cliente' 
                      ? currentUser?.full_name 
                      : selectedChannel.name}
                    {selectedChannel.type === 'support' && currentUser?.role === 'cliente' && (
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {selectedChannel.name}
                      </span>
                    )}
                  </h3>
                  {selectedChannel.type === 'direct' && (selectedChannel as any).contactStatus && (
                    <RenderStatusBadge status={(selectedChannel as any).contactStatus} size="xs" />
                  )}
                  {(selectedChannel.type === 'group' || selectedChannel.type === 'sector') && groupMemberCount !== null && (
                    <span className="inline-flex items-center gap-1 font-semibold rounded-md border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/50 px-1.5 py-0.5 text-[9px] leading-none whitespace-nowrap">
                      <Users size={10} className="shrink-0 text-indigo-600 dark:text-indigo-400" strokeWidth={2.2} />
                      <span>{groupMemberCount} {groupMemberCount === 1 ? 'participante' : 'participantes'}</span>
                    </span>
                  )}

                  {/* 2. Empresas vinculadas */}
                  {selectedChannel.type === 'support' && activeChannelCompanies.length > 0 && (
                    <div className="flex flex-col gap-1 my-0.5">
                      {activeChannelCompanies.map((company, index) => {
                        const isInactive = company.status !== 'Ativo';
                        return (
                          <div 
                            key={index} 
                            className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border w-fit leading-none ${
                              isInactive 
                                ? 'text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 border-rose-100/60 dark:border-rose-900/40' 
                                : 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/40'
                            }`}
                          >
                            <Building2 size={12} className={isInactive ? 'text-rose-500/70 dark:text-rose-400/70 shrink-0' : 'text-indigo-500/70 dark:text-indigo-400/70 shrink-0'} />
                            <span className="truncate max-w-[200px] sm:max-w-[320px]">
                              {company.company_name}{isInactive && ' (Inativa)'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
              <Tooltip content={showFavoritesOnly ? "Mostrar Todas" : "Favoritos"} position="bottom">
                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`p-2 rounded-lg transition-colors ${showFavoritesOnly ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10' : 'text-slate-400 hover:text-yellow-500 dark:hover:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <Star size={20} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                </button>
              </Tooltip>

              {/* Botão de Alternância de Atendimento Privado (Visível apenas para Gestores no Atendimento de Suporte) */}
              {selectedChannel.type === 'support' && currentUser?.role === 'gestor' && (
                <Tooltip content={selectedChannel.is_private ? "Desativar Modo Privado (Tornar Público)" : "Ativar Modo Privado (Visível Apenas para Gestores e Cliente)"} position="bottom">
                  <button
                    onClick={async () => {
                      const nextPrivateState = !selectedChannel.is_private;
                      const { error } = await supabase
                        .from('chat_channels')
                        .update({ is_private: nextPrivateState } as any)
                        .eq('id', selectedChannel.id);

                      if (!error) {
                        const updated = { ...selectedChannel, is_private: nextPrivateState };
                        setChannels(prev => prev.map(c => c.id === selectedChannel.id ? updated : c));
                        
                        // Mensagem de sistema informando a alteração de privacidade
                        await supabase
                          .from('chat_messages')
                          .insert({
                            channel_id: selectedChannel.id,
                            sender_id: userId,
                            text: nextPrivateState 
                              ? `🔒 Atendimento alterado para MODO PRIVADO por ${currentUser?.full_name || 'Gestor'}.`
                              : `🔓 Atendimento alterado para MODO PÚBLICO por ${currentUser?.full_name || 'Gestor'}.`,
                            status: 'sent',
                            is_system: true
                          } as any);
                      }
                    }}
                    className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
                      selectedChannel.is_private 
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm' 
                        : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {selectedChannel.is_private ? (
                      <>
                        <Lock size={16} className="text-amber-500 shrink-0" />
                        <span className="hidden md:inline">Modo Privado</span>
                      </>
                    ) : (
                      <>
                        <Unlock size={16} className="shrink-0" />
                        <span className="hidden md:inline">Tornar Privado</span>
                      </>
                    )}
                  </button>
                </Tooltip>
              )}

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

              {/* Menu de Chamada de Áudio e Vídeo */}
              {!selectedChannel.is_notification && (
                <div className="relative" ref={callMenuRef}>
                  <Tooltip content="Chamada" position="bottom">
                    <button
                      onClick={() => setShowCallMenu(!showCallMenu)}
                      className={`p-2 rounded-lg transition-colors ${showCallMenu ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <PhoneOutgoing size={20} />
                    </button>
                  </Tooltip>

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
              )}

              {selectedChannel.type === 'group' && currentUser?.role === 'gestor' && (
                <Tooltip content="Configurações do Grupo" position="bottom">
                  <button
                    onClick={() => setIsGroupSettingsOpen(true)}
                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <UserCog size={20} />
                  </button>
                </Tooltip>
              )}

              {/* Menu de Ações de Atendimento (Assumir, Transferir, Concluir) */}
              {selectedChannel.type === 'support' && currentUser?.role !== 'cliente' && !selectedChannel.is_notification && (
                <div className="relative animate-in fade-in duration-200" ref={supportActionsMenuRef}>
                  <Tooltip content="Ações de Atendimento" position="bottom">
                    <button
                      onClick={() => setShowSupportActionsMenu(!showSupportActionsMenu)}
                      className={`p-2 rounded-lg transition-colors ${showSupportActionsMenu ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                      <MoreVertical size={20} />
                    </button>
                  </Tooltip>

                  {showSupportActionsMenu && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {(() => {
                        const isGestor = currentUser?.role === 'gestor';
                        const isAssignedToMe = selectedChannel.assigned_to === userId;
                        const isAssigned = !!selectedChannel.assigned_to;
                        const isResolved = selectedChannel.support_status === 'resolved';

                        if (isResolved) {
                          return (
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
                          );
                        }

                        // Se for Gestor: Permissão Total em qualquer estado do atendimento
                        if (isGestor) {
                          return (
                            <>
                              {!isAssignedToMe && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAssignToMe(selectedChannel.id);
                                    setShowSupportActionsMenu(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center gap-2 font-semibold"
                                >
                                  <Users size={16} />
                                  <span>{isAssigned ? 'Reatribuir a Mim' : 'Assumir'}</span>
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
                          );
                        }

                        // Se for Operacional:
                        // 1. Chamado em Fila -> Pode Apenas Assumir
                        if (!isAssigned) {
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                handleAssignToMe(selectedChannel.id);
                                setShowSupportActionsMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center gap-2 font-semibold"
                            >
                              <Users size={16} />
                              <span>Assumir Atendimento</span>
                            </button>
                          );
                        }

                        // 2. Chamado Assumido por Mim -> Pode Transferir e Concluir
                        if (isAssignedToMe) {
                          return (
                            <>
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
                          );
                        }

                        // 3. Chamado Assumido por Outro Colega -> Exibir aviso informativo
                        const assignedProfile = profiles.find(p => p.id === selectedChannel.assigned_to);
                        return (
                          <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Lock size={13} className="text-amber-500 shrink-0" />
                              <span>Em Andamento</span>
                            </div>
                            <p className="leading-relaxed">
                              Atendimento sob responsabilidade de <strong className="text-slate-700 dark:text-slate-200">{assignedProfile?.full_name || 'outro atendente'}</strong>.
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Banner de Atendimento Privado */}
          {selectedChannel.is_private && (
            <div className="px-4 py-2 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-amber-500 shrink-0" />
                <span>Atendimento em Modo Privado — Visível apenas para Gestores e o Cliente.</span>
              </div>
              <span className="text-[10px] font-medium bg-amber-500/20 px-2 py-0.5 rounded-full text-amber-800 dark:text-amber-200">
                🔒 Confidencial
              </span>
            </div>
          )}

          {/* Connection Status Banner */}
          {connectionStatus !== 'online' && (
            <div className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 border-b transition-all duration-300 animate-in slide-in-from-top duration-300 ${
              connectionStatus === 'offline'
                ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              {connectionStatus === 'offline' ? (
                <>
                  <AlertCircle size={14} className="animate-pulse" />
                  <span>Sem conexão com a internet. Verifique sua rede.</span>
                </>
              ) : (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Conexão com o servidor perdida. Tentando reconectar...</span>
                </>
              )}
            </div>
          )}

          {/* Messages List */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/50"
          >
            {loadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
            {displayedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p className="text-sm">{currentMessages.length === 0 ? `Inicie a conversa em ${selectedChannel.name}` : 'Nenhuma mensagem encontrada.'}</p>
              </div>
            ) : (() => {
              let lastDateStr = '';
              return displayedMessages.map((msg) => {
                const senderProfile = !msg.isMe ? profiles.find(p => p.id === msg.sender_id) : null;
                const senderName = msg.isMe ? (currentUser?.full_name || 'Eu') : (senderProfile?.full_name || (selectedChannel.type === 'group' ? 'Membro' : selectedChannel.name));
                const senderInitials = senderName.substring(0, 2).toUpperCase();

                const msgDate = msg.rawCreatedAt ? new Date(msg.rawCreatedAt) : new Date();
                const msgDateStr = msgDate.toDateString();
                const showDateDivider = msgDateStr !== lastDateStr;
                if (showDateDivider) {
                  lastDateStr = msgDateStr;
                }

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <div className="sticky top-0 z-10 flex justify-center my-4 py-2 pointer-events-none select-none">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-3.5 py-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-full border border-slate-200/50 dark:border-slate-800/50 pointer-events-auto select-text transition-all duration-300">
                          {formatDateLabel(msg.rawCreatedAt || new Date().toISOString())}
                        </span>
                      </div>
                    )}

                    {msg.is_system ? (
                      (() => {
                        let cleanText = msg.text;
                        if (cleanText.startsWith('[Atendimento]')) {
                          cleanText = cleanText.replace(/^\[Atendimento\]\s*/, '');
                        }

                        let bgClass = "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400";
                        let IconComponent = MessageSquare;
                        let iconColor = "text-slate-500 dark:text-slate-400";

                        const textLower = cleanText.toLowerCase();
                        if (textLower.includes('iniciou') || textLower.includes('iniciado')) {
                          bgClass = "bg-blue-50/75 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm shadow-blue-100/10";
                          IconComponent = MessageSquare;
                          iconColor = "text-blue-500 dark:text-blue-400";
                        } else if (textLower.includes('reaberto') || textLower.includes('retomado') || textLower.includes('assumido')) {
                          bgClass = "bg-amber-50/75 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-100/10";
                          IconComponent = RotateCcw;
                          iconColor = "text-amber-500 dark:text-amber-400";
                        } else if (textLower.includes('transferido') || textLower.includes('transferência')) {
                          bgClass = "bg-purple-50/75 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm shadow-purple-100/10";
                          IconComponent = Shuffle;
                          iconColor = "text-purple-500 dark:text-purple-400";
                        } else if (textLower.includes('finalizado') || textLower.includes('concluído')) {
                          bgClass = "bg-rose-50/75 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 shadow-sm shadow-rose-100/10";
                          IconComponent = CheckCheck;
                          iconColor = "text-rose-500 dark:text-rose-400";
                        } else if (textLower.includes('modo privado') || textLower.includes('modo público')) {
                          bgClass = "bg-amber-50/75 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 shadow-sm shadow-amber-100/10";
                          IconComponent = Lock;
                          iconColor = "text-amber-500 dark:text-amber-400";
                        }

                        return (
                          <div
                            className="flex justify-center w-full my-3.5 animate-in fade-in zoom-in-95 duration-200"
                          >
                            <div className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-full text-xs font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)] max-w-[90%] text-center ${bgClass}`}>
                              <IconComponent size={13} className={`${iconColor} shrink-0`} />
                              <span>{cleanText}</span>
                              <span className="text-[10px] opacity-50 shrink-0 font-normal ml-1 border-l border-current/20 pl-1.5">{msg.created_at}</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : msg.is_private && currentUser?.role === 'operacional' ? (
                      <div className="flex justify-center w-full my-2.5 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 rounded-2xl text-xs font-medium shadow-sm max-w-[85%] text-center">
                          <Lock size={14} className="text-amber-500 shrink-0" />
                          <span>[Trecho reservado à gestão - Conteúdo confidencial]</span>
                          <span className="text-[10px] opacity-60 ml-1 border-l border-amber-500/20 pl-2 shrink-0">{msg.created_at}</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flex gap-3 max-w-[80%] ${msg.isMe ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <div className={`hidden md:flex shrink-0 w-8 h-8 rounded-full items-center justify-center text-[10px] font-bold ${msg.isMe
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300'
                          }`}>
                          {senderInitials}
                        </div>

                        <div className={`group relative p-3 rounded-2xl shadow-sm text-sm flex flex-col ${msg.isMe
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                          }`}>

                          {/* Botões flutuantes Hover */}
                          <div className={`absolute -top-3 ${msg.isMe ? '-left-8' : '-right-8'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-20`}>
                            <Tooltip content="Reagir" position="top">
                              <button
                                data-action="react"
                                onClick={() => setReactionMessageId(reactionMessageId === msg.id ? null : msg.id)}
                                className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                              >
                                <Smile size={14} className="text-slate-400 hover:text-indigo-500" />
                              </button>
                            </Tooltip>
                            <Tooltip content={copiedMessageId === msg.id ? "Copiado!" : "Copiar mensagem"} position="top">
                              <button
                                onClick={() => handleCopyMessage(msg)}
                                className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                              >
                                {copiedMessageId === msg.id ? (
                                  <Check size={14} className="text-emerald-500" />
                                ) : (
                                  <Copy size={14} className="text-slate-400 hover:text-indigo-500" />
                                )}
                              </button>
                            </Tooltip>
                            {!selectedChannel?.is_notification && (
                              <Tooltip content="Responder" position="top">
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                                >
                                  <Reply size={14} className="text-slate-400 hover:text-indigo-500" />
                                </button>
                              </Tooltip>
                            )}
                            {!selectedChannel?.is_notification && currentUser?.role !== 'cliente' && (
                              <Tooltip content="Encaminhar" position="top">
                                <button
                                  onClick={() => {
                                    setForwardMessageModal({ isOpen: true, message: msg });
                                    setSelectedForwardChannels([]);
                                    setForwardSearchTerm('');
                                    setForwardTab('team');
                                  }}
                                  className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                                >
                                  <CornerUpRight size={12} className="text-slate-400 hover:text-indigo-500" />
                                </button>
                              </Tooltip>
                            )}
                            <Tooltip content="Marcar como não lido" position="top">
                              <button
                                onClick={() => markMessageAsUnread(msg.id, selectedChannelId!)}
                                className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                              >
                                <EyeOff size={14} className="text-slate-400 hover:text-indigo-500" />
                              </button>
                            </Tooltip>
                            <Tooltip content={favoritedMessages.includes(msg.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"} position="top">
                              <button
                                onClick={() => toggleFavorite(msg.id)}
                                className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-110"
                              >
                                <Star size={14} className={favoritedMessages.includes(msg.id) ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'} fill={favoritedMessages.includes(msg.id) ? 'currentColor' : 'none'} />
                              </button>
                            </Tooltip>
                          </div>

                          {/* Emoji Picker Popover */}
                          {reactionMessageId === msg.id && (
                            <div 
                              ref={reactionPickerRef}
                              className={`absolute z-50 ${msg.isMe ? 'right-0 -top-12' : 'left-0 -top-12'} shadow-xl rounded-xl custom-scrollbar overflow-hidden border border-slate-200 dark:border-slate-800 scale-75 origin-bottom`}
                            >
                              <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                  toggleReaction(msg.id, emojiData.emoji);
                                  setReactionMessageId(null);
                                }}
                                autoFocusSearch={false}
                                theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                                searchDisabled
                                skinTonesDisabled
                                defaultSkinTone={selectedSkinTone}
                                onSkinToneChange={(skinTone) => {
                                  setSelectedSkinTone(skinTone);
                                  localStorage.setItem('chat_emoji_skin_tone', skinTone);
                                }}
                                width={250}
                                height={300}
                              />
                            </div>
                          )}

                          {/* Render de Anexo de Imagem / Banner no Topo da Mensagem (Preenchimento de Ponta a Ponta) */}
                          {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && msg.attachments.some((att: any) => att.url && (att.type === 'image' || att.url.match(/\.(jpeg|jpg|gif|png|webp)/i) || att.name?.includes('Banner') || att.name?.includes('Cabeçalho'))) && (
                            <div className="-mx-3 -mt-3 w-[calc(100%+1.5rem)] overflow-hidden rounded-t-2xl border-b border-black/10 dark:border-white/10 mb-2.5 shrink-0">
                              {msg.attachments.map((att: any, idx: number) => (
                                att.url && (att.type === 'image' || att.url.match(/\.(jpeg|jpg|gif|png|webp)/i) || att.name?.includes('Banner') || att.name?.includes('Cabeçalho')) ? (
                                  <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="block w-full group/attachment">
                                    <img src={att.url} alt={att.name || "Cabeçalho"} className="w-full h-40 sm:h-48 object-cover group-hover/attachment:scale-[1.02] transition-transform duration-300" />
                                  </a>
                                ) : null
                              ))}
                            </div>
                          )}

                          {msg.attachment_url && !msg.attachments && (msg.file_type?.startsWith('image/') || msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)/i)) && (
                            <div className="-mx-3 -mt-3 w-[calc(100%+1.5rem)] overflow-hidden rounded-t-2xl border-b border-black/10 dark:border-white/10 mb-2.5 shrink-0">
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block w-full group/attachment">
                                <img src={msg.attachment_url} alt="Anexo" className="w-full h-40 sm:h-48 object-cover group-hover/attachment:scale-[1.02] transition-transform duration-300" />
                              </a>
                            </div>
                          )}

                          {(selectedChannel.type === 'group' || selectedChannel.type === 'support') && (
                            <span className={`text-[10px] font-bold mb-1 ${msg.isMe ? 'text-indigo-100/90' : 'text-indigo-600 dark:text-indigo-400'}`}>
                              {senderName}
                            </span>
                          )}

                          {/* Badge de Mensagem Encaminhada */}
                          {msg.is_forwarded && (
                            <div className={`flex items-center gap-1 text-[11px] font-semibold mb-1 italic ${msg.isMe ? 'text-indigo-200/90' : 'text-slate-400 dark:text-slate-500'}`}>
                              <CornerUpRight size={12} className="shrink-0" />
                              <span>Encaminhada</span>
                            </div>
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
                                    <span className="line-clamp-2 leading-relaxed opacity-90">{repliedMsg.text ? stripFormatting(repliedMsg.text) : 'Anexo'}</span>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Render de Anexos de Arquivos / Documentos não imagem */}
                          {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.some((att: any) => att.url && !att.type?.startsWith('image') && !att.url.match(/\.(jpeg|jpg|gif|png|webp)/i) && !att.name?.includes('Banner') && !att.name?.includes('Cabeçalho')) && (
                            <div className="mb-2.5 space-y-1.5">
                              {msg.attachments.map((att: any, idx: number) => (
                                att.url && !att.type?.startsWith('image') && !att.url.match(/\.(jpeg|jpg|gif|png|webp)/i) && !att.name?.includes('Banner') && !att.name?.includes('Cabeçalho') ? (
                                  <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg ${msg.isMe ? 'bg-indigo-700/50 hover:bg-indigo-700' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600'} transition-colors`}>
                                    <Paperclip size={16} />
                                    <span className="truncate max-w-[180px] text-xs underline">{att.name || 'Anexo'}</span>
                                  </a>
                                ) : null
                              ))}
                            </div>
                          )}

                          {msg.attachment_url && !msg.attachments && !msg.file_type?.startsWith('image/') && !msg.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)/i) && (
                            <div className="mb-2">
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg ${msg.isMe ? 'bg-indigo-700/50 hover:bg-indigo-700' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600'} transition-colors`}>
                                <Paperclip size={16} />
                                <span className="truncate max-w-[150px] text-xs underline">{msg.file_name || 'Anexo'}</span>
                              </a>
                            </div>
                          )}

                          {msg.text && (
                             <p 
                               className="whitespace-pre-wrap break-words" 
                               dangerouslySetInnerHTML={{ __html: formatMessageText(msg.text) }} 
                             />
                           )}
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${msg.isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {msg.is_private && (
                              <Tooltip content="Mensagem trocada em modo privado" position="top">
                                <Lock size={11} className={msg.isMe ? "text-indigo-200 shrink-0" : "text-amber-500 shrink-0"} />
                              </Tooltip>
                            )}
                            {favoritedMessages.includes(msg.id) && (
                              <Star size={11} className={msg.isMe ? "text-amber-300 fill-amber-300 shrink-0" : "text-amber-500 fill-amber-500 shrink-0"} />
                            )}
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
                    )}
                  </React.Fragment>
                );
              });
            })()}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 relative">
            {showEmojiPicker && (
              <div 
                ref={emojiPickerRef}
                className="absolute bottom-[calc(100%+0.5rem)] right-4 z-50 shadow-2xl rounded-2xl custom-scrollbar overflow-hidden border border-slate-200 dark:border-slate-800 scale-90 origin-bottom-right"
              >
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  autoFocusSearch={false}
                  theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                  defaultSkinTone={selectedSkinTone}
                  onSkinToneChange={(skinTone) => {
                    setSelectedSkinTone(skinTone);
                    localStorage.setItem('chat_emoji_skin_tone', skinTone);
                  }}
                  width={300}
                  height={350}
                />
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="mb-3 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="relative group shrink-0 flex items-center gap-2.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt="Preview" className="w-8 h-8 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded flex items-center justify-center shrink-0">
                        <Paperclip size={16} />
                      </div>
                    )}
                    <div className="max-w-[130px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      <div className="truncate">{file.name}</div>
                      <div className="text-[10px] opacity-60">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
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
              const isClient = currentUser?.role === 'cliente';
              const isNotification = selectedChannel?.is_notification === true;
              const isResolvedSupportForStaff = selectedChannel?.type === 'support' && 
                                                selectedChannel?.support_status === 'resolved' && 
                                                !isClient;

              if (isNotification) {
                if (isClient) {
                  const isGeneralNotif = !selectedChannel?.sector_id;
                  const openSupportChannel = enrichedChannels.find(c => 
                    c.type === 'support' && 
                    !c.is_notification && 
                    c.status === 'open' && 
                    c.support_status !== 'resolved' &&
                    (isGeneralNotif ? !c.sector_id : c.sector_id === selectedChannel.sector_id)
                  );

                  if (openSupportChannel) {
                    const isPendingInQueue = openSupportChannel.support_status === 'pending';
                    return (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl p-4 animate-in fade-in duration-200 shadow-sm">
                        <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs">
                            <Check size={18} strokeWidth={2.5} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                              {isPendingInQueue
                                ? 'Dúvida enviada para a Fila de Atendimento'
                                : 'Atendimento em andamento com a equipe'}
                            </p>
                            <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400 mt-0.5">
                              {isPendingInQueue
                                ? 'Sua solicitação já está na fila aguardando um colaborador assumir.'
                                : 'Um operador já está atendendo sua solicitação.'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChannelId(openSupportChannel.id);
                            setClientSubTab('atendimento');
                          }}
                          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all shrink-0"
                        >
                          <MessageSquare size={14} />
                          <span>Ver Atendimento Aberto</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col items-center justify-center bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 text-center animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 font-semibold text-sm">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>Este canal é apenas para envio de notificações. Não é possível responder diretamente aqui.</span>
                      </div>
                      <button
                        type="button"
                        disabled={isInitiatingSupport}
                        onClick={() => handleInitiateSupportFromNotification(selectedChannel)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all"
                      >
                        {isInitiatingSupport ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{selectedChannel?.sector_id ? 'Conectando ao setor...' : 'Conectando à equipe...'}</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare size={16} />
                            <span>
                              {selectedChannel?.sector_id
                                ? `Tirar Dúvidas com o Setor ${sectors.find(s => s.id === selectedChannel.sector_id)?.name || 'Responsável'}`
                                : 'Tirar Dúvidas com a Equipe'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center justify-center bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 select-none animate-in fade-in duration-200 text-center">
                      <AlertCircle size={14} className="mr-2 text-slate-400 shrink-0" />
                      <span>Este canal é exclusivo para envio de notificações. Não é possível enviar mensagens diretas aqui.</span>
                    </div>
                  );
                }
              }

              if (isResolvedSupportForStaff) {
                return (
                  <div className="flex flex-col">
                    <div className="flex items-center justify-center bg-rose-50/60 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/40 rounded-lg py-2.5 px-4 text-xs font-semibold text-rose-700 dark:text-rose-400 select-none animate-in fade-in duration-200 w-full text-center">
                      <RotateCcw size={14} className="mr-2 animate-pulse text-rose-500 shrink-0" />
                      <span>Atendimento Finalizado! Utilize a opção <strong className="bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded text-rose-800 dark:text-rose-300 font-bold">[reabrir e assumir]</strong> disponível no menu de ações do chat.</span>
                    </div>
                    <div className="text-center mt-2">
                      <p className="text-[10px] text-slate-400">
                        Para interagir, clique no botão 'Reabrir e Assumir' nas Ações do cabeçalho
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <form onSubmit={handleSendMessage} className="flex flex-col">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                    accept="image/*, .pdf, .doc, .docx, .xls, .xlsx, .zip"
                  />
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/50 p-2 rounded-xl border border-transparent transition-all">
                    <Tooltip content="Anexar arquivo" position="top">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Paperclip size={20} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Anexar imagem" position="top">
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
                    </Tooltip>
                    <textarea
                      ref={textareaRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      spellCheck={true}
                      lang="pt-BR"
                      placeholder="Digite sua mensagem ou cole (Ctrl + V)..."
                      className="flex-1 bg-transparent border-0 focus:ring-0 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none py-2.5 max-h-32 min-h-[44px]"
                      rows={1}
                    />

                    {currentUser?.role !== 'cliente' && (
                      <Tooltip content="Mensagens Modelos (Drawer & Favoritos)" position="top">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTemplateDrawerOpen(true);
                            setShowEmojiPicker(false);
                          }}
                          className={`p-2 rounded-lg transition-colors hidden sm:block ${isTemplateDrawerOpen ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                        >
                          <Zap size={20} className={isTemplateDrawerOpen ? 'text-indigo-500 fill-indigo-500' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'} />
                        </button>
                      </Tooltip>
                    )}

                    <Tooltip content="Inserir emoji" position="top">
                      <button
                        ref={emojiButtonRef}
                        type="button"
                        onClick={() => {
                          setShowEmojiPicker(!showEmojiPicker);
                        }}
                        className={`p-2 rounded-lg transition-colors hidden sm:block ${showEmojiPicker ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                      >
                        <Smile size={20} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Enviar mensagem" position="top">
                      <button
                        type="submit"
                        disabled={(!messageInput.trim() && selectedFiles.length === 0)}
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
                    </Tooltip>
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-[10px] text-slate-400 font-medium">
                      Pressione Enter para enviar
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
              <div className="hidden md:flex">
                <Tooltip content="Expandir" position="bottom">
                  <button
                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/50"
                    onClick={() => setIsSidebarCollapsed(false)}
                  >
                    <PanelLeft size={18} />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Conteúdo central */}
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <MousePointerClick size={32} className="text-slate-400 dark:text-slate-500 animate-pulse" />
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
          if (selectedChannelId) {
            supabase
              .from('chat_channel_members')
              .select('*', { count: 'exact', head: true })
              .eq('channel_id', selectedChannelId)
              .then(({ count }) => {
                if (count !== null) setGroupMemberCount(count);
              });
          }
        }}
      />

      {/* Modal de Transferência de Atendimento */}
      {(() => {
        const selectedTransferUser = profiles.find(p => p.id === transferUserId);
        const allowedSectors = selectedTransferUser 
          ? (selectedTransferUser.role === 'gestor' || !selectedTransferUser.sector_ids || selectedTransferUser.sector_ids.length === 0
              ? sectors // Se for gestor ou não tiver setores vinculados, mostra todos
              : sectors.filter(s => selectedTransferUser.sector_ids.includes(s.id))
            )
          : [];

        return (
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
                  disabled={isTransferring || !transferSectorId}
                  icon={isTransferring ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
                >
                  {isTransferring ? 'Transferindo...' : 'Transferir'}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Selecione o setor de destino e, opcionalmente, o colaborador específico. Deixe o colaborador em branco para disponibilizar na fila do setor.
              </p>
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Colaborador <span className="text-slate-400 text-[10px] lowercase font-normal italic">(opcional - em branco para Fila)</span>
                </label>
                <select
                  value={transferUserId}
                  onChange={(e) => {
                    setTransferUserId(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Nenhum (Transferir para a Fila do Setor)</option>
                  {profiles
                    .filter(p => p.role !== 'cliente' && p.id !== userId && isUserAvailableForTransfer(p))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Setor <span className="text-rose-500">*</span>
                </label>
                <select
                  value={transferSectorId}
                  onChange={(e) => setTransferSectorId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione o Setor</option>
                  {allowedSectors.map(sector => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Modal>
        );
      })()}

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
                    {sectors
                      .filter(sector => {
                        const isClient = currentUser?.role === 'cliente';
                        const isActive = sector.status !== 'Inativo';
                        if (isClient) {
                          return isActive && sector.chat_available !== false;
                        }
                        return isActive;
                      })
                      .map(sector => (
                        <option key={sector.id} value={sector.id}>{sector.name}</option>
                      ))
                    }
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
      {/* Modal Encaminhar Mensagem */}
      {forwardMessageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-all duration-300 max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
                  <CornerUpRight size={18} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex flex-col text-left">
                  <h2 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                    Encaminhar Mensagem
                  </h2>
                  <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
                </div>
              </div>
              <button
                onClick={() => setForwardMessageModal({ isOpen: false, message: null })}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Abas: Equipe vs Clientes */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3">
              <button
                onClick={() => setForwardTab('team')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-all flex items-center justify-center gap-1.5 ${
                  forwardTab === 'team'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Users size={14} />
                <span>Equipe ({teamForwardDestinations.length})</span>
              </button>
              <button
                onClick={() => setForwardTab('clients')}
                className={`flex-1 py-2 text-xs font-bold border-b-2 text-center transition-all flex items-center justify-center gap-1.5 ${
                  forwardTab === 'clients'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Building2 size={14} />
                <span>Clientes ({clientForwardDestinations.length})</span>
              </button>
            </div>

            <div className="p-6 space-y-3 flex-1 overflow-y-auto">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={forwardTab === 'team' ? "Pesquisar colaborador ou grupo..." : "Pesquisar cliente ou chamado..."}
                  value={forwardSearchTerm}
                  onChange={(e) => setForwardSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {currentForwardList.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    Nenhum destino encontrado.
                  </div>
                ) : (
                  currentForwardList.map(item => {
                    const isSelected = selectedForwardChannels.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedForwardChannels(prev => 
                            isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id]
                          );
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold truncate">{item.name}</div>
                            <div className="text-[10px] opacity-60 capitalize">{item.subText}</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 pointer-events-none"
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-950/20">
              <button
                onClick={() => setForwardMessageModal({ isOpen: false, message: null })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendForward}
                disabled={selectedForwardChannels.length === 0 || isForwarding}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <CornerUpRight size={14} />
                <span>{isForwarding ? 'Encaminhando...' : `Encaminhar (${selectedForwardChannels.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Setor ao Assumir Atendimento */}
      {assignSectorModalState.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
                  <Building2 size={18} className="text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex flex-col text-left">
                  <h2 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                    Assumir Atendimento
                  </h2>
                  <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignSectorModalState(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/60 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atendimento Selecionado</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {assignSectorModalState.channelName}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Selecione o setor responsável por este atendimento:
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  O chamado será vinculado ao setor escolhido e direcionado para sua lista de atendimentos.
                </p>

                <div className="grid grid-cols-1 gap-2 pt-2">
                  {assignSectorModalState.allowedSectors.map(sector => {
                    const isSelected = assignSectorModalState.selectedSectorId === sector.id;
                    return (
                      <div
                        key={sector.id}
                        onClick={() => setAssignSectorModalState(prev => ({ ...prev, selectedSectorId: sector.id }))}
                        className={`p-3 rounded-xl cursor-pointer border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg flex items-center justify-center ${
                            isSelected 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <Building2 size={16} />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{sector.name}</div>
                            {sector.description && (
                              <div className="text-[10px] opacity-70 truncate">{sector.description}</div>
                            )}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 bg-transparent'
                        }`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}

                  {/* Opção Geral / Administrativo (disponível para Gestores ou quando permitido) */}
                  {(currentUser?.role === 'gestor' || currentUser?.role === 'admin') && (
                    <div
                      onClick={() => setAssignSectorModalState(prev => ({ ...prev, selectedSectorId: '' }))}
                      className={`p-3 rounded-xl cursor-pointer border transition-all flex items-center justify-between ${
                        assignSectorModalState.selectedSectorId === ''
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg flex items-center justify-center ${
                          assignSectorModalState.selectedSectorId === '' 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          <Users size={16} />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold truncate">Geral / Administrativo</div>
                          <div className="text-[10px] opacity-70 truncate">Atendimento de triagem ou diretoria sem setor fixo</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        assignSectorModalState.selectedSectorId === ''
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-transparent'
                      }`}>
                        {assignSectorModalState.selectedSectorId === '' && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-950/20">
              <button
                type="button"
                onClick={() => setAssignSectorModalState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isAssigningSector}
                onClick={() => executeAssignWithSector(assignSectorModalState.channelId, assignSectorModalState.selectedSectorId || null)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                {isAssigningSector ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Assumindo...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirmar e Assumir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer de Mensagens Modelos */}
      <MessageTemplatesDrawer
        isOpen={isTemplateDrawerOpen}
        onClose={() => setIsTemplateDrawerOpen(false)}
        templates={templates}
        userId={userId}
        onSelectTemplate={handleSelectTemplate}
        sectors={sectors}
      />
    </div>
  );
};