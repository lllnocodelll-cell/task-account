import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2, Users, Trash2, UserPlus, UserMinus, Pencil, AlertTriangle } from 'lucide-react';

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

interface GroupSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    channelId: string;
    channelName: string;
    channelType: string;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
    isOpen, onClose, onSuccess, channelId, channelName, channelType
}) => {
    const [name, setName] = useState(channelName);
    const [members, setMembers] = useState<Member[]>([]);
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(channelName);
            setShowAddMembers(false);
            setSelectedNewMembers([]);
            setShowDeleteConfirm(false);
            fetchData();
        }
    }, [isOpen, channelId]);

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
            // 1) role = 'admin' na tabela de membros do grupo, OU
            // 2) criador do grupo (created_by), OU
            // 3) perfil de 'gestor' na aplicação (admin geral)
            const myMembership = memberData?.find((m: any) => m.user_id === user.id);
            const isCreator = channelInfo?.created_by === user.id;
            const isGestor = myProfile?.role === 'gestor';
            setIsAdmin(myMembership?.role === 'admin' || isCreator || isGestor);

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

    const handleRemoveMember = async (memberUserId: string) => {
        if (!confirm('Deseja remover este participante do grupo?')) return;
        try {
            const { error } = await supabase
                .from('chat_channel_members')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', memberUserId);

            if (error) throw error;
            setMembers(prev => prev.filter(m => m.user_id !== memberUserId));
        } catch (error: any) {
            console.error('Error removing member:', error);
            alert('Erro ao remover participante: ' + error.message);
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
            fetchData(); // Recarregar membros
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
            // Deletar membros primeiro
            const { error: membersError } = await supabase
                .from('chat_channel_members')
                .delete()
                .eq('channel_id', channelId);

            if (membersError) throw membersError;

            // Deletar mensagens do canal
            const { error: messagesError } = await supabase
                .from('chat_messages')
                .delete()
                .eq('channel_id', channelId);

            if (messagesError) console.warn('Error deleting messages:', messagesError);

            // Deletar canal
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
    const availableProfiles = allProfiles.filter(p => !existingMemberIds.includes(p.id));

    if (channelType === 'direct') return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Configurações do Grupo"
            size="md"
        >
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 size={32} className="animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Editar Nome */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            <Pencil size={14} /> Nome do Grupo
                        </label>
                        <div className="flex gap-2">
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nome do grupo"
                                disabled={!isAdmin}
                            />
                            {isAdmin && name.trim() !== channelName && (
                                <Button onClick={handleUpdateName} disabled={saving} size="sm">
                                    Salvar
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Lista de Participantes */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                <Users size={14} /> Participantes ({members.length})
                            </label>
                            {isAdmin && (
                                <button
                                    onClick={() => setShowAddMembers(!showAddMembers)}
                                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                >
                                    <UserPlus size={14} />
                                    Adicionar
                                </button>
                            )}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                                            {member.profile?.avatar_url ? (
                                                <img src={member.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                member.profile?.full_name?.substring(0, 2).toUpperCase() || 'UN'
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {member.profile?.full_name || 'Usuário'}
                                                {member.user_id === currentUserId && <span className="text-xs text-slate-400 ml-1">(Você)</span>}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {member.role === 'admin' ? '👑 Admin' : 'Membro'}
                                            </p>
                                        </div>
                                    </div>
                                    {isAdmin && member.user_id !== currentUserId && (
                                        <button
                                            onClick={() => handleRemoveMember(member.user_id)}
                                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Remover participante"
                                        >
                                            <UserMinus size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Adicionar Participantes */}
                    {showAddMembers && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Selecionar Novos Participantes
                            </label>
                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar">
                                {availableProfiles.length === 0 ? (
                                    <p className="text-sm text-slate-500 text-center p-3">Todos os usuários já fazem parte do grupo.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {availableProfiles.map(profile => (
                                            <label
                                                key={profile.id}
                                                className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={selectedNewMembers.includes(profile.id)}
                                                    onChange={() => toggleNewMember(profile.id)}
                                                />
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 overflow-hidden">
                                                    {profile.avatar_url ? (
                                                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        profile.full_name?.substring(0, 2).toUpperCase() || 'UN'
                                                    )}
                                                </div>
                                                <span className="text-sm text-slate-900 dark:text-slate-100 truncate">
                                                    {profile.full_name || 'Usuário Sem Nome'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedNewMembers.length > 0 && (
                                <Button
                                    onClick={handleAddMembers}
                                    disabled={saving}
                                    className="mt-2 w-full"
                                    size="sm"
                                    icon={saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                >
                                    Adicionar {selectedNewMembers.length} participante(s)
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Excluir Grupo */}
                    {isAdmin && (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                >
                                    <Trash2 size={16} /> Excluir Grupo
                                </button>
                            ) : (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400">
                                        <AlertTriangle size={18} />
                                        <span className="text-sm font-semibold">Excluir este grupo?</span>
                                    </div>
                                    <p className="text-xs text-red-500 dark:text-red-400 mb-3">
                                        Todas as mensagens e participantes serão removidos permanentemente.
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowDeleteConfirm(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleDeleteGroup}
                                            disabled={saving}
                                            size="sm"
                                            className="!bg-red-600 hover:!bg-red-700 text-white"
                                            icon={saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        >
                                            {saving ? 'Excluindo...' : 'Confirmar Exclusão'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};
