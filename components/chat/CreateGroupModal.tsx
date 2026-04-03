import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2, Users } from 'lucide-react';

interface Profile {
    id: string;
    full_name: string;
    avatar_url: string;
    role: string;
}

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [groupName, setGroupName] = useState('');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProfiles();
        } else {
            setGroupName('');
            setSelectedMembers([]);
        }
    }, [isOpen]);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id)
                .neq('role', 'cliente')
                .order('full_name');

            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Error fetching profiles:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMember = (id: string) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            alert('Nome do grupo é obrigatório');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Create channel
            const { data: channel, error: channelError } = await supabase
                .from('chat_channels')
                .insert([{
                    name: groupName.trim(),
                    type: 'group',
                    created_by: user.id
                }])
                .select()
                .single();

            if (channelError) throw channelError;

            // 2. Add members (including creator as admin)
            const membersToInsert = [
                { channel_id: channel.id, user_id: user.id, role: 'admin' },
                ...selectedMembers.map(memberId => ({
                    channel_id: channel.id,
                    user_id: memberId,
                    role: 'member'
                }))
            ];

            const { error: membersError } = await supabase
                .from('chat_channel_members')
                .insert(membersToInsert);

            if (membersError) throw membersError;

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Erro ao criar grupo:', error.message);
            alert('Erro ao criar grupo: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Novo Grupo"
            size="md"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleCreateGroup} disabled={saving || !groupName.trim()} icon={saving ? <Loader2 size={16} className="animate-spin" /> : undefined}>
                        {saving ? 'Criando...' : 'Criar Grupo'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Nome do Grupo
                    </label>
                    <Input
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        placeholder="Ex: Departamento Fiscal"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 mt-4 flex items-center gap-2">
                        <Users size={16} /> Selecionar Participantes
                    </label>

                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center p-4">
                                <Loader2 size={24} className="animate-spin text-indigo-500" />
                            </div>
                        ) : profiles.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center p-4">Nenhum usuário encontrado.</p>
                        ) : (
                            <div className="space-y-1">
                                {profiles.map(profile => (
                                    <label
                                        key={profile.id}
                                        className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            checked={selectedMembers.includes(profile.id)}
                                            onChange={() => toggleMember(profile.id)}
                                        />
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                profile.full_name?.substring(0, 2).toUpperCase() || 'UN'
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{profile.full_name || 'Usuário Sem Nome'}</span>
                                            <span className="text-xs text-slate-500 truncate">{profile.role || 'Membro'}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Você será incluído automaticamente no grupo.</p>
                </div>
            </div>
        </Modal>
    );
};
