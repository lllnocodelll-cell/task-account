import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../utils/supabaseClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2, Users, Trash2, UserPlus, UserMinus, Pencil, AlertTriangle, UserCog, X, Check, Search } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface Profile {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
}

interface Member {
    id: string;
    user_id: string;
    role: string;
    profile?: Profile;
}

interface GroupSettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    channelId: string;
    channelName: string;
    channelType: string;
}

export const GroupSettingsDrawer: React.FC<GroupSettingsDrawerProps> = ({
    isOpen, onClose, onSuccess, channelId, channelName, channelType
}) => {
    const [shouldRender, setShouldRender] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const [name, setName] = useState(channelName);
    const [members, setMembers] = useState<Member[]>([]);
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ userId: string; name: string } | null>(null);
    const [isRemovingMember, setIsRemovingMember] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [searchNewMembers, setSearchNewMembers] = useState('');

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            const timer = setTimeout(() => setIsVisible(true), 10);
            setName(channelName);
            setShowAddMembers(false);
            setSelectedNewMembers([]);
            setShowDeleteConfirm(false);
            setSearchNewMembers('');
            fetchData();
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [isOpen, channelId]);

    const handleTransitionEnd = () => {
        if (!isVisible) {
            setShouldRender(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // Fetch channel info to check created_by
            const { data: channelInfo } = await supabase
                .from('chat_channels')
                .select('created_by')
                .eq('id', channelId)
                .single();

            // Fetch current user profile to check if gestor
            const { data: myProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            // Fetch members
            const { data: memberData, error: memberError } = await supabase
                .from('chat_channel_members')
                .select('*')
                .eq('channel_id', channelId);

            if (memberError) throw memberError;

            // Check if current user is admin:
            const isGestor = myProfile?.role === 'gestor';
            setIsAdmin(isGestor);

            // Fetch profiles for members
            const memberIds = memberData?.map((m: any) => m.user_id) || [];
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .in('id', memberIds);

            const enrichedMembers: Member[] = (memberData || []).map((m: any) => ({
                id: m.id,
                user_id: m.user_id,
                role: m.role,
                profile: profileData?.find((p: any) => p.id === m.user_id)
            }));

            setMembers(enrichedMembers);

            // Fetch all profiles for "add members"
            const { data: allProfileData } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .neq('role', 'cliente')
                .order('full_name');

            setAllProfiles(allProfileData || []);
        } catch (error) {
            console.error('Error fetching group data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateName = async () => {
        if (!name.trim() || name.trim() === channelName) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('chat_channels')
                .update({ name: name.trim() } as any)
                .eq('id', channelId);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error updating group:', error);
            alert('Erro ao atualizar grupo: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;
        setIsRemovingMember(true);
        try {
            const { error } = await supabase
                .from('chat_channel_members')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', memberToRemove.userId);

            if (error) throw error;
            setMembers(prev => prev.filter(m => m.user_id !== memberToRemove.userId));
            setMemberToRemove(null);
        } catch (error: any) {
            console.error('Error removing member:', error);
            alert('Erro ao remover participante: ' + error.message);
        } finally {
            setIsRemovingMember(false);
        }
    };

    const handleAddMembers = async () => {
        if (selectedNewMembers.length === 0) return;
        setSaving(true);
        try {
            const inserts = selectedNewMembers.map(uid => ({
                channel_id: channelId,
                user_id: uid,
                role: 'member'
            }));

            const { error } = await supabase
                .from('chat_channel_members')
                .upsert(inserts, { onConflict: 'channel_id,user_id', ignoreDuplicates: true });

            if (error) throw error;

            setSelectedNewMembers([]);
            setShowAddMembers(false);
            fetchData();
        } catch (error: any) {
            console.error('Error adding members:', error);
            alert('Erro ao adicionar participantes: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteGroup = async () => {
        setSaving(true);
        try {
            const { error: membersError } = await supabase
                .from('chat_channel_members')
                .delete()
                .eq('channel_id', channelId);

            if (membersError) throw membersError;

            const { error: messagesError } = await supabase
                .from('chat_messages')
                .delete()
                .eq('channel_id', channelId);

            if (messagesError) console.warn('Error deleting messages:', messagesError);

            const { error: channelError } = await supabase
                .from('chat_channels')
                .delete()
                .eq('id', channelId);

            if (channelError) throw channelError;

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error deleting group:', error);
            alert('Erro ao excluir grupo: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleNewMember = (id: string) => {
        setSelectedNewMembers(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const existingMemberIds = members.map(m => m.user_id);
    const availableProfiles = allProfiles
        .filter(p => !existingMemberIds.includes(p.id))
        .filter(p => p.full_name?.toLowerCase().includes(searchNewMembers.toLowerCase()));

    if (channelType === 'direct') return null;
    if (!shouldRender && !isOpen) return null;

    return createPortal(
        <>
            {/* Backdrop com transição suave */}
            <div 
                className={`fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998] transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Drawer Slide-over Container */}
            <div 
                onTransitionEnd={handleTransitionEnd}
                className={`fixed inset-y-0 right-0 w-full sm:w-[480px] md:w-[520px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[9999] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25, 0.1, 0.25, 1)] border-l border-white/20 dark:border-slate-800/50 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
                            <UserCog size={18} className="text-slate-500 dark:text-slate-400" />
                        </div>
                        <div className="flex flex-col text-left">
                            <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                                Configurações do Grupo
                            </h1>
                            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Drawer Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 size={32} className="animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <>
                            {/* Card 1: Nome do Grupo */}
                            <div className="bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 shadow-sm space-y-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    <Pencil size={13} className="text-indigo-500" /> Nome do Grupo
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Nome do grupo"
                                        disabled={!isAdmin}
                                        className="text-xs h-9"
                                    />
                                    {isAdmin && name.trim() !== channelName && (
                                        <Button onClick={handleUpdateName} disabled={saving} size="sm" className="h-9 shrink-0">
                                            Salvar
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Card 2: Lista de Participantes */}
                            <div className="bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        <Users size={13} className="text-emerald-500" /> Participantes ({members.length})
                                    </label>
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowAddMembers(!showAddMembers)}
                                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/50"
                                        >
                                            <UserPlus size={13} />
                                            {showAddMembers ? 'Fechar' : 'Adicionar'}
                                        </button>
                                    )}
                                </div>

                                {/* Painel de Adicionar Novos Membros */}
                                {showAddMembers && (
                                    <div className="border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-3 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                                Selecionar Novos Colaboradores
                                            </span>
                                            {selectedNewMembers.length > 0 && (
                                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                                                    {selectedNewMembers.length} selecionado(s)
                                                </span>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome..."
                                                value={searchNewMembers}
                                                onChange={e => setSearchNewMembers(e.target.value)}
                                                className="w-full pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>

                                        <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                            {availableProfiles.length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-3">
                                                    Nenhum novo colaborador disponível.
                                                </p>
                                            ) : (
                                                availableProfiles.map(p => {
                                                    const isChecked = selectedNewMembers.includes(p.id);
                                                    return (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => toggleNewMember(p.id)}
                                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                                                                isChecked
                                                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                                                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <div className="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                                                                    {p.full_name?.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <span className="truncate">{p.full_name}</span>
                                                            </div>
                                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                                                                isChecked
                                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                                            }`}>
                                                                {isChecked && <Check size={11} strokeWidth={3} />}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {selectedNewMembers.length > 0 && (
                                            <Button
                                                onClick={handleAddMembers}
                                                disabled={saving}
                                                size="sm"
                                                className="w-full"
                                                icon={saving ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                                            >
                                                {saving ? 'Adicionando...' : `Adicionar ${selectedNewMembers.length} Participante(s)`}
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {/* Lista dos membros atuais */}
                                <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                                    {members.map(m => {
                                        const profileName = m.profile?.full_name || 'Usuário';
                                        const initials = profileName.substring(0, 2).toUpperCase();
                                        const isSelf = m.user_id === currentUserId;

                                        return (
                                            <div key={m.id} className="flex items-center justify-between py-2 pt-2.5 first:pt-0">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                                        {initials}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                            {profileName} {isSelf && <span className="text-[10px] text-indigo-500 font-normal">(você)</span>}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 capitalize">
                                                            {m.role === 'admin' ? 'Administrador do Grupo' : 'Membro'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {isAdmin && !isSelf && (
                                                    <button
                                                        onClick={() => setMemberToRemove({ userId: m.user_id, name: profileName })}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                                        title="Remover do grupo"
                                                    >
                                                        <UserMinus size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Card 3: Exclusão do Grupo */}
                            {isAdmin && (
                                <div className="border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 bg-rose-50/30 dark:bg-rose-950/10 space-y-3">
                                    {!showDeleteConfirm ? (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-xs"
                                        >
                                            <Trash2 size={14} /> Excluir Grupo
                                        </button>
                                    ) : (
                                        <div className="space-y-3 pt-1">
                                            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
                                                Todas as mensagens e participantes serão removidos permanentemente. Deseja prosseguir?
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    className="w-1/2 text-xs"
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    onClick={handleDeleteGroup}
                                                    disabled={saving}
                                                    size="sm"
                                                    className="w-1/2 !bg-rose-600 hover:!bg-rose-700 text-white text-xs"
                                                    icon={saving ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                >
                                                    {saving ? 'Excluindo...' : 'Confirmar Exclusão'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal Confirmar Remoção de Participante */}
            <Modal
                isOpen={!!memberToRemove}
                onClose={() => !isRemovingMember && setMemberToRemove(null)}
                title="Remover Participante"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Deseja realmente remover <strong className="text-slate-900 dark:text-white">{memberToRemove?.name}</strong> deste grupo de trabalho?
                    </p>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button
                            variant="secondary"
                            onClick={() => setMemberToRemove(null)}
                            disabled={isRemovingMember}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmRemoveMember}
                            disabled={isRemovingMember}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {isRemovingMember ? 'Removendo...' : 'Remover Participante'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>,
        document.body
    );
};

// Export para retrocompatibilidade
export const GroupSettingsModal = GroupSettingsDrawer;
