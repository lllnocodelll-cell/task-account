import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, MultiSelect, GroupedSelect } from '../components/ui/Input';
import { TAX_REGIME_GROUPS } from '../types';
import { Users, Briefcase, List, Mail, Send, Calendar, Trash2, ChevronLeft, ChevronRight, Loader2, Save, Copy, Clock, Settings as SettingsIcon, ListFilter, CloudDownload, UserCircle, UserPlus, UserMinus, Edit2, Check, X, Link2, Blocks, LayoutList, CalendarClock, ChevronDown, ChevronUp, User, Hash, Target, ShieldCheck, AlertCircle, Edit3, MapPin, Map, Globe, FileText, HelpCircle, Activity, SquarePlus, Smile } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { Tooltip } from '../components/ui/Tooltip';

interface SettingsProps {
  userProfile: any;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'credenciais' | 'setores' | 'tipos' | 'feriados' | 'templates'>('credenciais');

  const contentProps = { userProfile };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2 md:mb-0">
        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
          <SettingsIcon size={18} className="text-slate-500 dark:text-slate-400" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
            Configurações
          </h1>
          <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('credenciais')}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${activeTab === 'credenciais' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <ShieldCheck size={16} /> Credenciais
          </button>
          <button
            onClick={() => setActiveTab('setores')}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${activeTab === 'setores' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Briefcase size={16} /> Setores
          </button>
          <button
            onClick={() => setActiveTab('tipos')}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tipos' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <List size={16} /> Tipos de Tarefa
          </button>
          <button
            onClick={() => setActiveTab('feriados')}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${activeTab === 'feriados' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Calendar size={16} /> Feriados
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${activeTab === 'templates' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Mail size={16} /> Modelos de Mensagem
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'credenciais' && <TeamSettings {...contentProps} />}
          {activeTab === 'setores' && <SectorSettings {...contentProps} />}
          {activeTab === 'tipos' && <TaskTypeSettings {...contentProps} />}
          {activeTab === 'feriados' && <CalendarSettings {...contentProps} />}
          {activeTab === 'templates' && <MessageTemplateSettings {...contentProps} />}
        </div>
      </div>
    </div>
  );
};

// ------------------- TEAM SETTINGS -------------------

const TeamSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const { addToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [sectorIds, setSectorIds] = useState<string[]>([]);
  const [role, setRole] = useState('operacional'); // New state for access role
  const [initialPassword, setInitialPassword] = useState(''); // Just for UI, logic pending

  // Edit Form
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSectorIds, setEditSectorIds] = useState<string[]>([]);
  const [editRole, setEditRole] = useState('operacional');

  // Deletion Modal State
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [deleteModalState, setDeleteModalState] = useState<'closed' | 'checking' | 'can_delete' | 'cannot_delete' | 'deleting'>('closed');

  const [clients, setClients] = useState<any[]>([]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [editClientIds, setEditClientIds] = useState<string[]>([]);

  // Accordion state
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);
  const [isClientsExpanded, setIsClientsExpanded] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [membersRes, sectorsRes, clientsRes] = await Promise.all([
        supabase.from('members').select('*, sectors(name), clients(company_name)').eq('org_id', userProfile.org_id),
        supabase.from('sectors').select('*').eq('org_id', userProfile.org_id),
        supabase.from('clients').select('id, company_name, status')
      ]);

      if (membersRes.data) setMembers(membersRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (clientsRes.data) setClients(clientsRes.data);

    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!firstName || !email) {
      addToast('error', 'Erro', 'Nome e Email são obrigatórios');
      return;
    }
    setAdding(true);
    try {
      if (role === 'cliente' && clientIds.length === 0) {
        addToast('error', 'Erro', 'Selecione pelo menos uma empresa para vincular o cliente');
        setAdding(false);
        return;
      }

      const { data, error } = await supabase.from('members').insert({
        org_id: userProfile.org_id,
        first_name: firstName,
        last_name: lastName,
        email,
        sector_id: role !== 'cliente' ? (sectorIds[0] || null) : null,
        sector_ids: role !== 'cliente' ? sectorIds : [],
        client_ids: role === 'cliente' ? clientIds : [],
        role: role
      }).select('*, sectors(name), clients(company_name)');

      if (error) throw error;

      if (data) {
        setMembers([...members, ...data]);
        setFirstName('');
        setLastName('');
        setEmail('');
        setSectorIds([]);
        setClientIds([]);
        setRole('operacional');
        addToast('success', 'Sucesso', 'Membro cadastrado com sucesso!');
      }
    } catch (error: any) {
      addToast('error', 'Erro', 'Erro ao adicionar: ' + error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';

    // Otimista: atualiza a lista local imediatamente
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));

    try {
      const { error } = await supabase
        .from('members')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      // Reverte se der erro
      setMembers(prev => prev.map(m => m.id === id ? { ...m, status: currentStatus } : m));
      addToast('error', 'Erro', 'Erro ao atualizar situação: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const startEditingMember = (member: any) => {
    setEditingMemberId(member.id);
    setEditFirstName(member.first_name || '');
    setEditLastName(member.last_name || '');
    setEditEmail(member.email || '');
    setEditSectorIds(member.sector_ids || (member.sector_id ? [member.sector_id] : []));
    setEditRole(member.role || 'operacional');
    setEditClientIds(member.client_ids || []);
  };

  const cancelEditingMember = () => {
    setEditingMemberId(null);
    setEditFirstName('');
    setEditLastName('');
    setEditEmail('');
    setEditSectorIds([]);
    setEditRole('operacional');
    setEditClientIds([]);
  };

  const handleUpdateMember = async (id: string) => {
    if (!editFirstName || !editEmail) return addToast('error', 'Erro', 'Nome e e-mail são obrigatórios');

    // Otimista parcial
    const originalMembers = [...members];
    const sectorName = sectors.find(s => s.id === editSectorIds[0])?.name || '';

    setMembers(prev => prev.map(m => m.id === id ? {
      ...m,
      first_name: editFirstName,
      last_name: editLastName,
      email: editEmail,
      sector_id: editRole !== 'cliente' ? (editSectorIds[0] || null) : null,
      sector_ids: editRole !== 'cliente' ? editSectorIds : [],
      client_ids: editRole === 'cliente' ? editClientIds : [],
      role: editRole,
      sectors: sectorName ? { name: sectorName } : null
    } : m));

    try {
      const { error } = await supabase
        .from('members')
        .update({
          first_name: editFirstName,
          last_name: editLastName,
          email: editEmail,
          sector_id: editRole !== 'cliente' ? (editSectorIds[0] || null) : null,
          sector_ids: editRole !== 'cliente' ? editSectorIds : [],
          client_ids: editRole === 'cliente' ? editClientIds : [],
          role: editRole
        })
        .eq('id', id);

      if (error) throw error;
      setEditingMemberId(null);
      addToast('success', 'Sucesso', 'Alterações salvas!');
    } catch (error: any) {
      setMembers(originalMembers); // rollback
      addToast('error', 'Erro', 'Erro ao atualizar: ' + error.message);
    }
  };

  const initDeleteMember = async (member: any) => {
    setMemberToDelete(member);
    setDeleteModalState('checking');

    try {
      const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('responsible', fullName);

      if (tasksError) throw tasksError;

      if (tasks && tasks.length > 0) {
        setDeleteModalState('cannot_delete');
      } else {
        setDeleteModalState('can_delete');
      }
    } catch (error: any) {
      console.error('Erro ao buscar dependências do membro:', error);
      addToast('error', 'Erro', 'Erro ao verificar tarefas: ' + error.message);
      setDeleteModalState('closed');
      setMemberToDelete(null);
    }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeleteModalState('deleting');

    try {
      const { error } = await supabase.from('members').delete().eq('id', memberToDelete.id);
      if (error) throw error;
      setMembers(members.filter(m => m.id !== memberToDelete.id));
    } catch (error: any) {
      addToast('error', 'Erro', 'Erro ao excluir membro: ' + error.message);
    } finally {
      setDeleteModalState('closed');
      setMemberToDelete(null);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer group/header"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm group-hover/header:border-indigo-300 transition-colors">
              <Users size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Adicionar Membros
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <div className={`p-1.5 rounded-lg border shadow-sm transition-all duration-200 ${isFormExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'} group-hover/header:border-emerald-300 group-hover/header:shadow-md`}>
            {isFormExpanded ? <ChevronUp size={16} /> : <SquarePlus size={16} />}
          </div>
        </div>
        
        <div className={`grid transition-all duration-300 ease-in-out ${isFormExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
          <div className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
              <Input label="Nome" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="João" />
              <Input label="Sobrenome" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Silva" />
              <Input label="E-mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@empresa.com" type="email" autoComplete="new-password" />
              <Select
                label="Nível de Permissão"
                value={role}
                onChange={e => setRole(e.target.value)}
                options={[
                  { value: 'operacional', label: 'Operacional' },
                  { value: 'gestor', label: 'Gestor' },
                  { value: 'cliente', label: 'Cliente (Portal)' }
                ]}
              />
              {role === 'cliente' ? (
                <MultiSelect
                  label="Empresas Vinculadas"
                  value={clientIds}
                  onChange={setClientIds}
                  options={clients
                    .filter((c: any) => c.status === 'Ativo' || clientIds.includes(c.id))
                    .map((c: any) => ({ 
                      value: c.id, 
                      label: c.status === 'Ativo' ? c.company_name : `${c.company_name} (Inativa)` 
                    }))}
                />
              ) : (
                <MultiSelect
                  label="Setores Vinculados"
                  value={sectorIds}
                  onChange={setSectorIds}
                  options={sectors.map(s => ({ value: s.id, label: s.name }))}
                />
              )}
              <div className="md:col-span-1">
                <Button onClick={handleAddMember} disabled={adding} className="w-full">
                  {adding ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna 1: Membros Internos */}
        <div className="space-y-4">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer group/header"
            onClick={() => setIsMembersExpanded(!isMembersExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm group-hover/header:border-indigo-300 transition-colors">
                <Users size={18} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                  MEMBROS
                </h3>
                <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-1 rounded-full font-bold">
                {members.filter(m => m.role !== 'cliente').length}
              </span>
              <div className={`p-1.5 rounded-lg border shadow-sm transition-all duration-200 ${isMembersExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'} group-hover/header:border-indigo-300 group-hover/header:shadow-md`}>
                {isMembersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </div>
          
          <div className={`grid transition-all duration-300 ease-in-out ${isMembersExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
            <div className="overflow-hidden">
              <div className="space-y-3 pt-4">
                {members.filter(m => m.role !== 'cliente').map(member => (
                  <MemberCard 
                    key={member.id} 
                    member={member} 
                    isEditing={editingMemberId === member.id}
                    onEdit={() => startEditingMember(member)}
                    onCancel={cancelEditingMember}
                    onUpdate={handleUpdateMember}
                    onToggleStatus={handleToggleStatus}
                    onDelete={initDeleteMember}
                    editStates={{
                      editFirstName, setEditFirstName,
                      editLastName, setEditLastName,
                      editEmail, setEditEmail,
                      editRole, setEditRole,
                      editSectorIds, setEditSectorIds,
                      editClientIds, setEditClientIds
                    }}
                    sectors={sectors}
                    clients={clients}
                    addToast={addToast}
                  />
                ))}
                {members.filter(m => m.role !== 'cliente').length === 0 && (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-500">Nenhum membro cadastrado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: Clientes com Acesso */}
        <div className="space-y-4">
          <div 
            className="flex items-center justify-between mb-4 cursor-pointer group/header"
            onClick={() => setIsClientsExpanded(!isClientsExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm group-hover/header:border-emerald-300 transition-colors">
                <UserCircle size={18} className="text-slate-500 dark:text-slate-400" />
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                  CLIENTES
                </h3>
                <div className="h-0.5 w-6 bg-emerald-500/30 dark:bg-emerald-400/20 mt-1.5 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-1 rounded-full font-bold">
                {members.filter(m => m.role === 'cliente').length}
              </span>
              <div className={`p-1.5 rounded-lg border shadow-sm transition-all duration-200 ${isClientsExpanded ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30' : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'} group-hover/header:border-emerald-300 group-hover/header:shadow-md`}>
                {isClientsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </div>

          <div className={`grid transition-all duration-300 ease-in-out ${isClientsExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
            <div className="overflow-hidden">
              <div className="space-y-3 pt-4">
                {members.filter(m => m.role === 'cliente').map(member => (
                  <MemberCard 
                    key={member.id} 
                    member={member} 
                    isEditing={editingMemberId === member.id}
                    onEdit={() => startEditingMember(member)}
                    onCancel={cancelEditingMember}
                    onUpdate={handleUpdateMember}
                    onToggleStatus={handleToggleStatus}
                    onDelete={initDeleteMember}
                    editStates={{
                      editFirstName, setEditFirstName,
                      editLastName, setEditLastName,
                      editEmail, setEditEmail,
                      editRole, setEditRole,
                      editSectorIds, setEditSectorIds,
                      editClientIds, setEditClientIds
                    }}
                    sectors={sectors}
                    clients={clients}
                    addToast={addToast}
                  />
                ))}
                {members.filter(m => m.role === 'cliente').length === 0 && (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-slate-500">Nenhum cliente com acesso liberado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Exclusão de Membro */}
      <Modal
          isOpen={deleteModalState !== 'closed'}
          onClose={() => {
              if (deleteModalState !== 'deleting') {
                  setDeleteModalState('closed');
              }
          }}
          title={deleteModalState === 'cannot_delete' ? "Exclusão Bloqueada" : "Confirmar Exclusão"}
          size="md"
          footer={
              deleteModalState === 'can_delete' ? (
                  <>
                      <Button variant="secondary" onClick={() => setDeleteModalState('closed')}>
                          Cancelar
                      </Button>
                      <Button
                          variant="danger"
                          onClick={confirmDeleteMember}
                          className="bg-red-600 hover:bg-red-700 text-white"
                      >
                          Excluir Membro
                      </Button>
                  </>
              ) : deleteModalState === 'deleting' ? (
                  <Button variant="secondary" disabled>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                      Excluindo...
                  </Button>
              ) : (
                  <Button variant="secondary" onClick={() => setDeleteModalState('closed')}>
                      Entendi
                  </Button>
              )
          }
      >
          {deleteModalState === 'checking' && (
              <div className="flex flex-col items-center justify-center py-6 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
                  <p>Verificando dependências do membro...</p>
              </div>
          )}

          {deleteModalState === 'cannot_delete' && (
              <div className="py-4 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg">
                      <ListFilter className="w-6 h-6 shrink-0" />
                      <p className="font-medium">
                          Não é possível excluir <strong>{memberToDelete?.first_name} {memberToDelete?.last_name}</strong>.
                      </p>
                  </div>
                  <p>
                      Este membro possui <strong>tarefas vinculadas</strong> no módulo de Tarefas.
                      Para manter o histórico íntegro, a exclusão sistêmica foi bloqueada.
                  </p>
                  <p className="mt-4 text-sm text-slate-500">
                      Caso ele não faça mais parte da equipe, recomendamos alterar a Situação dele para <strong>Inativo</strong> no switch do card.
                  </p>
              </div>
          )}

          {deleteModalState === 'can_delete' && (
              <div className="py-4 text-slate-700 dark:text-slate-300">
                  <p>
                      Você tem certeza que deseja excluir permanentemente o membro <strong>{memberToDelete?.first_name} {memberToDelete?.last_name}</strong>?
                  </p>
                  <p className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded border border-red-100 dark:border-red-900/50">
                      Esta ação é irreversível. O membro perderá o acesso e todos os dados serão apagados.
                  </p>
              </div>
          )}
      </Modal>

    </div>
  );
};

// Componente Auxiliar para o Card de Membro
const MemberCard: React.FC<any> = ({ 
  member, 
  isEditing, 
  onEdit, 
  onCancel, 
  onUpdate, 
  onToggleStatus, 
  onDelete,
  editStates,
  sectors,
  clients,
  addToast
}) => {
  const {
    editFirstName, setEditFirstName,
    editLastName, setEditLastName,
    editEmail, setEditEmail,
    editRole, setEditRole,
    editSectorIds, setEditSectorIds,
    editClientIds, setEditClientIds
  } = editStates;

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-indigo-500 p-4 rounded-xl shadow-lg space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
          <Input label="Sobrenome" value={editLastName} onChange={e => setEditLastName(e.target.value)} />
        </div>
        <Input label="E-mail" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
        <Select
          label="Permissão"
          value={editRole}
          onChange={e => setEditRole(e.target.value)}
          options={[
            { value: 'operacional', label: 'Operacional' },
            { value: 'gestor', label: 'Gestor' },
            { value: 'cliente', label: 'Cliente' }
          ]}
        />
        {editRole === 'cliente' ? (
          <MultiSelect
            label="Empresas Vinculadas"
            value={editClientIds}
            onChange={setEditClientIds}
            options={clients
              .filter((c: any) => c.status === 'Ativo' || editClientIds.includes(c.id))
              .map((c: any) => ({ 
                value: c.id, 
                label: c.status === 'Ativo' ? c.company_name : `${c.company_name} (Inativa)` 
              }))}
          />
        ) : (
          <MultiSelect
            label="Setores Vinculados"
            value={editSectorIds}
            onChange={setEditSectorIds}
            options={sectors.map((s: any) => ({ value: s.id, label: s.name }))}
          />
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onUpdate(member.id)} icon={<Check size={16} />} className="flex-1">Salvar</Button>
          <Button size="sm" variant="secondary" onClick={onCancel} icon={<X size={16} />}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold uppercase shrink-0 ${member.role === 'cliente' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'}`}>
            {member.first_name?.[0]}{member.last_name?.[0]}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
              {member.first_name} {member.last_name}
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${
                member.role === 'gestor' ? 'bg-amber-100 text-amber-600' : 
                member.role === 'cliente' ? 'bg-emerald-100 text-emerald-600' : 
                'bg-slate-100 text-slate-500'
              }`}>
                {member.role}
              </span>
            </h4>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate"><Mail size={12} /> {member.email}</span>
              {member.role === 'cliente' ? (
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center mr-1">🏢</span>
                  {member.client_ids && member.client_ids.length > 0 ? (
                    member.client_ids.map((cid: string) => {
                      const foundClient = clients.find((c: any) => c.id === cid);
                      const isInactive = foundClient && foundClient.status !== 'Ativo';
                      const clientName = foundClient ? foundClient.company_name : 'Desconhecida';
                      return (
                        <span 
                          key={cid} 
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold border truncate max-w-[120px] ${
                            isInactive 
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-100 dark:border-rose-500/20' 
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20'
                          }`}
                        >
                          {clientName}{isInactive && ' (Inativa)'}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Nenhuma empresa vinculada</span>
                  )}
                </div>
              ) : (member.sector_ids && member.sector_ids.length > 0) ? (
                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center mr-1">📁</span>
                  {member.sector_ids.map((sid: string) => {
                    const foundSector = sectors.find((s: any) => s.id === sid);
                    const sectorName = foundSector ? foundSector.name : 'Desconhecido';
                    return (
                      <span 
                        key={sid} 
                        className="text-[9px] px-1.5 py-0.5 rounded font-bold border truncate max-w-[120px] bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20"
                      >
                        {sectorName}
                      </span>
                    );
                  })}
                </div>
              ) : member.sectors?.name && (
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                  📁 {member.sectors.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Tooltip content={member.status === 'Inativo' ? "Ativar" : "Inativar"}>
            <button
              onClick={() => onToggleStatus(member.id, member.status || 'Ativo')}
              className={`p-1.5 rounded-lg transition-colors ${member.status === 'Inativo' ? 'text-red-400 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
            >
              {member.status === 'Inativo' ? <UserPlus size={16} /> : <UserMinus size={16} />}
            </button>
          </Tooltip>
          <Tooltip content="Editar">
            <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
              <Edit2 size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Excluir">
            <button onClick={() => onDelete(member)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 size={16} />
            </button>
          </Tooltip>
        </div>
      </div>
      
      {/* Botões de convite rápidos */}
      <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 flex">
         <button 
           onClick={() => {
             const inviteLink = `${window.location.origin}/auth?email=${encodeURIComponent(member.email)}`;
             navigator.clipboard.writeText(inviteLink);
             addToast('success', 'Sucesso', 'Link de convite copiado!');
           }}
           className="flex-1 py-2 text-[9px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center gap-1.5 border border-transparent hover:border-indigo-200 hover:bg-white dark:hover:bg-slate-700 transition-all uppercase"
         >
           <Copy size={11} /> Copiar Link de Acesso
         </button>
      </div>
    </div>
  );
};

// ------------------- SECTOR SETTINGS -------------------

const SectorSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const { addToast } = useToast();
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [leader, setLeader] = useState('');
  const [costCenter, setCostCenter] = useState('');
  const [chatAvailable, setChatAvailable] = useState(true);

  // Edit Form
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLeader, setEditLeader] = useState('');
  const [editCostCenter, setEditCostCenter] = useState('');
  const [editChatAvailable, setEditChatAvailable] = useState(true);

  // Deletion Modal State
  const [sectorToDelete, setSectorToDelete] = useState<any>(null);
  const [deleteSectorModalState, setDeleteSectorModalState] = useState<'closed' | 'checking' | 'can_delete' | 'cannot_delete' | 'deleting'>('closed');

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('sectors').select('*').eq('org_id', userProfile.org_id);
      if (data) setSectors(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSector = async () => {
    if (!name) return addToast('error', 'Erro', 'Nome é obrigatório');
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from('sectors').insert({
        org_id: userProfile.org_id,
        name,
        leader,
        cost_center: costCenter,
        chat_available: chatAvailable
      }).select();

      if (error) throw error;
      if (data) {
        setSectors([...sectors, ...data]);
        setName('');
        setLeader('');
        setCostCenter('');
        setChatAvailable(true);
      }
    } catch (error: any) {
      addToast('error', 'Erro', 'Erro: ' + error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleImportDefaultSectors = async () => {
    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const defaultNames = [
        'Contábil', 'Fiscal', 'Folha', 'Societário', 'Comercial',
        'Financeiro', 'Consultoria', 'Qualidade', 'Auditoria', 'Tecnologia', 'Administrativo'
      ];

      // Pegar nomes existentes para comparar
      const existingNames = sectors.map(s => s.name.toLowerCase().trim());
      const toAdd = defaultNames.filter(name => !existingNames.includes(name.toLowerCase().trim()));

      if (toAdd.length === 0) {
        addToast('info', 'Setores padrão', 'Todos os setores padrão já estão cadastrados.');
        return;
      }

      const newSectors = toAdd.map(name => ({
        org_id: userProfile.org_id,
        name,
        status: 'Ativo'
      }));

      const { data, error } = await supabase.from('sectors').insert(newSectors).select();

      if (error) throw error;
      if (data) {
        setSectors([...sectors, ...data]);
        addToast('success', 'Sucesso', `${toAdd.length} setores padrão cadastrados com sucesso!`);
      }
    } catch (error: any) {
      addToast('error', 'Erro', 'Erro ao importar setores: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleToggleSectorStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';

    // Otimista
    setSectors(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));

    try {
      const { error } = await supabase
        .from('sectors')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao atualizar status do setor:', error);
      // Reverte se der erro
      setSectors(prev => prev.map(s => s.id === id ? { ...s, status: currentStatus } : s));
      alert('Erro ao atualizar situação do setor: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleToggleSectorChatAvailability = async (id: string, currentChatAvailable: boolean) => {
    const newChatAvailable = !currentChatAvailable;

    // Otimista
    setSectors(prev => prev.map(s => s.id === id ? { ...s, chat_available: newChatAvailable } : s));

    try {
      const { error } = await supabase
        .from('sectors')
        .update({ chat_available: newChatAvailable })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao atualizar disponibilidade de chat do setor:', error);
      // Reverte se der erro
      setSectors(prev => prev.map(s => s.id === id ? { ...s, chat_available: currentChatAvailable } : s));
      alert('Erro ao atualizar disponibilidade de chat do setor: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const startEditing = (sector: any) => {
    setEditingSectorId(sector.id);
    setEditName(sector.name);
    setEditLeader(sector.leader || '');
    setEditCostCenter(sector.cost_center || '');
    setEditChatAvailable(sector.chat_available !== false);
  };

  const cancelEditing = () => {
    setEditingSectorId(null);
    setEditName('');
    setEditLeader('');
    setEditCostCenter('');
    setEditChatAvailable(true);
  };

  const handleUpdateSector = async (id: string) => {
    if (!editName) return alert('Nome é obrigatório');

    // Otimista
    const originalSectors = [...sectors];
    setSectors(prev => prev.map(s => s.id === id ? { ...s, name: editName, leader: editLeader, cost_center: editCostCenter, chat_available: editChatAvailable } : s));

    try {
      const { error } = await supabase
        .from('sectors')
        .update({
          name: editName,
          leader: editLeader,
          cost_center: editCostCenter,
          chat_available: editChatAvailable
        })
        .eq('id', id);

      if (error) throw error;
      setEditingSectorId(null);
    } catch (error: any) {
      setSectors(originalSectors); // rollback
      alert('Erro ao atualizar setor: ' + error.message);
    }
  };

  const initDeleteSector = async (sector: any) => {
    setSectorToDelete(sector);
    setDeleteSectorModalState('checking');

    try {
      const [membersRes, typesRes] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('sector_id', sector.id),
        supabase.from('task_types').select('id', { count: 'exact', head: true }).eq('sector_id', sector.id)
      ]);

      if (membersRes.error) throw membersRes.error;
      if (typesRes.error) throw typesRes.error;

      const hasMembers = (membersRes.count ?? 0) > 0;
      const hasTypes = (typesRes.count ?? 0) > 0;

      if (hasMembers || hasTypes) {
        setDeleteSectorModalState('cannot_delete');
      } else {
        setDeleteSectorModalState('can_delete');
      }
    } catch (error: any) {
      console.error('Erro ao verificar dependências do setor:', error);
      alert('Erro ao verificar dependências: ' + error.message);
      setDeleteSectorModalState('closed');
      setSectorToDelete(null);
    }
  };

  const confirmDeleteSector = async () => {
    if (!sectorToDelete) return;
    setDeleteSectorModalState('deleting');

    try {
      const { error } = await supabase.from('sectors').delete().eq('id', sectorToDelete.id);
      if (error) throw error;
      setSectors(sectors.filter(s => s.id !== sectorToDelete.id));
    } catch (error: any) {
      alert('Erro ao excluir setor: ' + error.message);
    } finally {
      setDeleteSectorModalState('closed');
      setSectorToDelete(null);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 cursor-pointer group/header"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm group-hover/header:border-indigo-300 transition-colors">
              <Blocks size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Adicionar Setor
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="sm"
              icon={<CloudDownload size={16} />}
              onClick={(e) => {
                e.stopPropagation();
                handleImportDefaultSectors();
              }}
              disabled={importing || adding}
            >
              {importing ? 'Cadastrando...' : 'Sugerir Setores Padrão'}
            </Button>
            <div className={`p-1.5 rounded-lg border shadow-sm transition-all duration-200 ${isFormExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'} group-hover/header:border-emerald-300 group-hover/header:shadow-md`}>
              {isFormExpanded ? <ChevronUp size={16} /> : <SquarePlus size={16} />}
            </div>
          </div>
        </div>

        <div className={`grid transition-all duration-300 ease-in-out ${isFormExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
          <div className="overflow-hidden">
            <div className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <Input label="Nome do Setor" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Líder" value={leader} onChange={e => setLeader(e.target.value)} />
                <Input label="Centro de Custo" value={costCenter} onChange={e => setCostCenter(e.target.value)} />
                <div className="flex items-center gap-2 h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <Toggle checked={chatAvailable} onChange={() => setChatAvailable(!chatAvailable)} />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Disponível no Chat</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleAddSector} disabled={adding}>{adding ? 'Salvando...' : 'Salvar Setor'}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectors.map(sector => (
          <div 
            key={sector.id} 
            className={`group relative bg-white dark:bg-slate-900 border transition-all duration-300 rounded-2xl p-5 ${
              editingSectorId === sector.id 
                ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-xl' 
                : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:border-indigo-400/30'
            }`}
          >
            {editingSectorId === sector.id ? (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                    <Edit3 size={18} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Editar Setor</h4>
                </div>
                
                <div className="space-y-3">
                  <Input label="Nome do Setor" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ex: Financeiro" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Líder" value={editLeader} onChange={e => setEditLeader(e.target.value)} placeholder="Nome do responsável" />
                    <Input label="C. Custo" value={editCostCenter} onChange={e => setEditCostCenter(e.target.value)} placeholder="001.01" />
                  </div>
                  <div className="flex items-center gap-2 h-10 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <Toggle checked={editChatAvailable} onChange={() => setEditChatAvailable(!editChatAvailable)} />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Disponível no Chat</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={cancelEditing}>Cancelar</Button>
                  <Button variant="primary" size="sm" onClick={() => handleUpdateSector(sector.id)} icon={<Save size={16} />}>Salvar</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Ações */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <Tooltip content="Editar Setor">
                    <button
                      onClick={() => startEditing(sector)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Excluir Setor">
                    <button
                      onClick={() => initDeleteSector(sector)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Tooltip>
                </div>

                {/* Cabeçalho do Card */}
                <div className="flex items-start gap-4 mb-6">
                  <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm ${
                    sector.status === 'Inativo'
                      ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                      : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-200 dark:shadow-none'
                  }`}>
                    {sector.name.substring(0, 2).toUpperCase()}
                    
                    {/* Status Indicator (Pulse) */}
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${
                      sector.status === 'Inativo' ? 'bg-slate-400' : 'bg-emerald-500'
                    }`}>
                      {sector.status !== 'Inativo' && (
                        <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                      )}
                    </div>
                  </div>

                  <div className="pr-12">
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {sector.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${sector.status === 'Inativo' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        sector.status === 'Inativo' ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {sector.status === 'Inativo' ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corpo do Card */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-700/30">
                    <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                      <UserCircle size={14} className="text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">Líder</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {sector.leader || 'Não definido'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-700/30">
                    <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                      <Target size={14} className="text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider leading-none mb-1">C. Custo</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {sector.cost_center || '---'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rodapé do Card */}
                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={sector.status !== 'Inativo'}
                        onChange={() => handleToggleSectorStatus(sector.id, sector.status || 'Ativo')}
                      />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {sector.status === 'Inativo' ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={sector.chat_available !== false}
                        onChange={() => handleToggleSectorChatAvailability(sector.id, sector.chat_available !== false)}
                      />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Chat
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 dark:text-slate-600 border-t border-slate-100/50 dark:border-slate-800/30 pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {sector.chat_available !== false ? 'Disponível no Chat' : 'Indisponível no Chat'}
                    </span>
                    <div className="flex items-center gap-1 group-hover:text-indigo-500/50 transition-colors">
                      <Blocks size={12} />
                      #{sector.id.slice(0, 4)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de Exclusão de Setor */}
      <Modal
          isOpen={deleteSectorModalState !== 'closed'}
          onClose={() => {
              if (deleteSectorModalState !== 'deleting') {
                  setDeleteSectorModalState('closed');
              }
          }}
          title={deleteSectorModalState === 'cannot_delete' ? "Exclusão Bloqueada" : "Confirmar Exclusão"}
          size="md"
          footer={
              deleteSectorModalState === 'can_delete' ? (
                  <>
                      <Button variant="secondary" onClick={() => setDeleteSectorModalState('closed')}>
                          Cancelar
                      </Button>
                      <Button
                          variant="danger"
                          onClick={confirmDeleteSector}
                          className="bg-red-600 hover:bg-red-700 text-white"
                      >
                          Excluir Setor
                      </Button>
                  </>
              ) : deleteSectorModalState === 'deleting' ? (
                  <Button variant="secondary" disabled>
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                      Excluindo...
                  </Button>
              ) : (
                  <Button variant="secondary" onClick={() => setDeleteSectorModalState('closed')}>
                      Entendi
                  </Button>
              )
          }
      >
          {deleteSectorModalState === 'checking' && (
              <div className="flex flex-col items-center justify-center py-6 text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-600" />
                  <p>Verificando dependências do setor...</p>
              </div>
          )}

          {deleteSectorModalState === 'cannot_delete' && (
              <div className="py-4 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-3 mb-4 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg">
                      <ListFilter className="w-6 h-6 shrink-0" />
                      <p className="font-medium">
                          Não é possível excluir o setor <strong>{sectorToDelete?.name}</strong>.
                      </p>
                  </div>
                  <p>
                      Este setor possui <strong>membros da equipe</strong> vinculados ou <strong>tipos de tarefa</strong> associados.
                      Para manter o histórico íntegro, a exclusão sistêmica foi bloqueada.
                  </p>
                  <p className="mt-4 text-sm text-slate-500">
                      Caso o setor não esteja mais em uso, recomendamos alterar a Situação para <strong>Inativo</strong> no switch do card.
                  </p>
              </div>
          )}

          {deleteSectorModalState === 'can_delete' && (
              <div className="py-4 text-slate-700 dark:text-slate-300">
                  <p>
                      Você tem certeza que deseja excluir permanentemente o setor <strong>{sectorToDelete?.name}</strong>?
                  </p>
                  <p className="mt-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded border border-red-100 dark:border-red-900/50">
                      Esta ação é irreversível. Todas as configurações deste setor serão apagadas do sistema.
                  </p>
              </div>
          )}
      </Modal>

    </div>
  );
};

// ------------------- TASK TYPE SETTINGS -------------------

const TaskTypeSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const { addToast } = useToast();
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [entity, setEntity] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [nonWorkingAction, setNonWorkingAction] = useState('antecipar');

  // Edit Form
  const [editingTaskTypeId, setEditingTaskTypeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSectorId, setEditSectorId] = useState('');
  const [editEntity, setEditEntity] = useState('');
  const [editDueDay, setEditDueDay] = useState('');
  const [editNonWorkingAction, setEditNonWorkingAction] = useState('antecipar');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [typesRes, sectorsRes] = await Promise.all([
        supabase.from('task_types').select('*, sectors(name)').eq('org_id', userProfile.org_id),
        supabase.from('sectors').select('*').eq('org_id', userProfile.org_id)
      ]);
      if (typesRes.data) setTaskTypes(typesRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAddToken = async () => {
    if (!name) return addToast('error', 'Erro', 'Nome obrigatório');
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('task_types').insert({
        org_id: userProfile.org_id,
        name,
        sector_id: sectorId || null,
        federative_entity: entity,
        due_day: dueDay ? parseInt(dueDay) : null,
        non_working_day_action: nonWorkingAction
      }).select('*, sectors(name)'); // Join to get sector name back immediately

      if (error) throw error;
      if (data) {
        // If join doesn't work on insert (sometimes Supabase limitation), 
        // we might need to refetch or manually attach name. 
        // Actually, Supabase returns what is in the table. joins in insert select are not always populated.
        // We'll trust it or refetch. 
        // Ideally we just append data.
        const inserted = data[0];
        // Manually find sector name for display if missing
        if (!inserted.sectors && sectorId) {
          const s = sectors.find(sec => sec.id === sectorId);
          if (s) inserted.sectors = { name: s.name };
        }
        setTaskTypes([...taskTypes, inserted]);
        setName(''); setSectorId(''); setEntity(''); setDueDay(''); setNonWorkingAction('antecipar');
      }
    } catch (e: any) { addToast('error', 'Erro', e.message); }
    finally { setAdding(false); }
  };

  const handleToggleTaskTypeStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';

    // Otimista
    setTaskTypes(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

    try {
      const { error } = await supabase
        .from('task_types')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      // Reverte se der erro
      setTaskTypes(prev => prev.map(t => t.id === id ? { ...t, status: currentStatus } : t));
      addToast('error', 'Erro', 'Erro ao atualizar situação: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const startEditing = (task: any) => {
    setEditingTaskTypeId(task.id);
    setEditName(task.name);
    setEditSectorId(task.sector_id || '');
    setEditEntity(task.federative_entity || 'Outro');
    setEditDueDay(task.due_day?.toString() || '');
    setEditNonWorkingAction(task.non_working_day_action || 'antecipar');
  };

  const cancelEditing = () => {
    setEditingTaskTypeId(null);
    setEditName('');
    setEditSectorId('');
    setEditEntity('');
    setEditDueDay('');
    setEditNonWorkingAction('antecipar');
  };

  const handleUpdateTaskType = async (id: string) => {
    if (!editName) return addToast('error', 'Erro', 'Nome é obrigatório');

    // Otimista parcial (vamos manter backup do estado)
    const originalTaskTypes = [...taskTypes];

    // Procura o nome do setor visualmente para update otimista
    const sectorName = sectors.find(s => s.id === editSectorId)?.name || '';

    setTaskTypes(prev => prev.map(t => t.id === id ? {
      ...t,
      name: editName,
      sector_id: editSectorId,
      federative_entity: editEntity,
      due_day: editDueDay ? parseInt(editDueDay) : null,
      non_working_day_action: editNonWorkingAction,
      sectors: sectorName ? { name: sectorName } : null
    } : t));

    try {
      const { error } = await supabase
        .from('task_types')
        .update({
          name: editName,
          sector_id: editSectorId || null,
          federative_entity: editEntity,
          due_day: editDueDay ? parseInt(editDueDay) : null,
          non_working_day_action: editNonWorkingAction
        })
        .eq('id', id);

      if (error) throw error;
      setEditingTaskTypeId(null);
    } catch (error: any) {
      setTaskTypes(originalTaskTypes); // rollback
      addToast('error', 'Erro', 'Erro ao atualizar tarefa: ' + error.message);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer group/header"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm group-hover/header:border-indigo-300 transition-colors">
              <LayoutList size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Adicionar Tipo de Tarefa
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <div className={`p-1.5 rounded-lg border shadow-sm transition-all duration-200 ${isFormExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'} group-hover/header:border-emerald-300 group-hover/header:shadow-md`}>
            {isFormExpanded ? <ChevronUp size={16} /> : <SquarePlus size={16} />}
          </div>
        </div>

        <div className={`grid transition-all duration-300 ease-in-out ${isFormExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
          <div className="overflow-hidden">
            <div className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input label="Nome da Tarefa" value={name} onChange={e => setName(e.target.value)} />
                <Select
                  label="Setor Responsável"
                  value={sectorId}
                  onChange={e => setSectorId(e.target.value)}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...sectors.map(s => ({ value: s.id, label: s.name }))
                  ]}
                />
                <Select
                  label="Ente Federativo"
                  value={entity}
                  onChange={e => setEntity(e.target.value)}
                  options={[
                    { value: 'Municipal', label: 'Municipal' },
                    { value: 'Estadual', label: 'Estadual' },
                    { value: 'Federal', label: 'Federal' },
                    { value: 'Outro', label: 'Outro' },
                  ]}
                />
                <Input label="Vencimento (dia)" value={dueDay} onChange={e => setDueDay(e.target.value)} type="number" min="1" max="31" placeholder="Ex: 20" />
                <Select
                  label="Dia não útil"
                  value={nonWorkingAction}
                  onChange={e => setNonWorkingAction(e.target.value)}
                  options={[
                    { value: 'antecipar', label: 'Antecipar' },
                    { value: 'prorrogar', label: 'Prorrogar' },
                    { value: 'nao_se_aplica', label: 'Não se aplica' }
                  ]}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleAddToken} disabled={adding}>{adding ? 'Salvando...' : 'Salvar Tarefa'}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {taskTypes.map(task => {
          // Entity-specific Icon and Styling
          const getEntityConfig = (entity: string) => {
            switch (entity) {
              case 'Municipal': return { icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' };
              case 'Estadual': return { icon: Map, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' };
              case 'Federal': return { icon: Globe, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20' };
              default: return { icon: HelpCircle, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-100 dark:border-slate-500/20' };
            }
          };
          const entityCfg = getEntityConfig(task.federative_entity);
          const SectorIcon = Briefcase;
          const EntityIcon = entityCfg.icon;

          return (
            <div 
              key={task.id} 
              className={`group relative h-full bg-white dark:bg-slate-900 border transition-all duration-300 rounded-2xl p-5 flex flex-col ${
                editingTaskTypeId === task.id 
                  ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-xl' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-xl dark:hover:border-indigo-400/30'
              }`}
            >
              {editingTaskTypeId === task.id ? (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
                      <Edit3 size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Editar Tipo</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <Input label="Nome da Tarefa" value={editName} onChange={e => setEditName(e.target.value)} />
                    <Select
                      label="Setor Responsável"
                      value={editSectorId}
                      onChange={e => setEditSectorId(e.target.value)}
                      options={[{ value: '', label: 'Sem restrição' }, ...sectors.map(s => ({ value: s.id, label: s.name }))]}
                    />
                    <Select
                      label="Ente Federativo"
                      value={editEntity}
                      onChange={e => setEditEntity(e.target.value)}
                      options={[
                        { value: 'Municipal', label: 'Municipal' },
                        { value: 'Estadual', label: 'Estadual' },
                        { value: 'Federal', label: 'Federal' },
                        { value: 'Outro', label: 'Outro' },
                      ]}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Venc. (dia)" value={editDueDay} onChange={e => setEditDueDay(e.target.value)} type="number" />
                      <Select
                        label="Dia não útil"
                        value={editNonWorkingAction}
                        onChange={e => setEditNonWorkingAction(e.target.value)}
                        options={[
                          { value: 'antecipar', label: 'Antecipar' },
                          { value: 'prorrogar', label: 'Prorrogar' },
                          { value: 'nao_se_aplica', label: 'Ponto' }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={cancelEditing}>Cancelar</Button>
                    <Button variant="primary" size="sm" onClick={() => handleUpdateTaskType(task.id)} icon={<Save size={16} />}>Salvar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Ações Fixas */}
                  <div className="absolute top-4 right-4 translate-x-1 -translate-y-1">
                    <Tooltip content="Editar Tipo de Tarefa">
                      <button
                        onClick={() => startEditing(task)}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Cabeçalho */}
                  <div className="mb-4 pr-8">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg ${entityCfg.bg} ${entityCfg.color} border ${entityCfg.border}`}>
                        <EntityIcon size={14} />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${entityCfg.color}`}>
                        {task.federative_entity || 'Outro'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {task.name}
                    </h4>
                  </div>

                  {/* Informações Principais */}
                  <div className="space-y-3 mb-6">
                    {/* Badge do Setor */}
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <SectorIcon size={12} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {task.sectors?.name || 'Setor não definido'}
                      </span>
                    </div>

                    {/* Regra de Vencimento */}
                    {task.due_day && (
                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-indigo-500" />
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Vencimento</span>
                          </div>
                          <div className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">Dia {task.due_day}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 opacity-80">
                          <Activity size={10} className="text-slate-400" />
                          <span className="text-[10px] font-semibold text-slate-500">
                            Regra: <span className="text-indigo-600 dark:text-indigo-500 uppercase">{task.non_working_day_action === 'antecipar' ? 'Antecipar' : task.non_working_day_action === 'prorrogar' ? 'Prorrogar' : 'Manter'}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rodapé */}
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Toggle
                        checked={task.status !== 'Inativo'}
                        onChange={() => handleToggleTaskTypeStatus(task.id, task.status || 'Ativo')}
                      />
                      <span className={`text-[11px] font-black uppercase tracking-wider ${
                        task.status === 'Inativo' ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {task.status === 'Inativo' ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 dark:text-slate-700">
                      <FileText size={12} />
                      #{task.id.slice(0, 4)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------- CALENDAR SETTINGS -------------------

const CalendarSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const { addToast } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<any | null>(null);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Form
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Nacional');

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('holidays').select('*').eq('org_id', userProfile.org_id);
      if (data) setHolidays(data);
    } catch (e) { }
    finally { setLoading(false); }
  };

  const handleAddHoliday = async () => {
    if (!date || !name) return addToast('error', 'Erro', 'Data e Nome obrigatórios');
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('holidays').insert({
        org_id: userProfile.org_id,
        date,
        name,
        type
      }).select();

      if (error) throw error;
      if (data) {
        setHolidays([...holidays, ...data]);
        setName(''); setDate('');
      }
    } catch (e: any) { addToast('error', 'Erro', e.message); }
    finally { setAdding(false); }
  };

  const handleDelete = (holiday: any) => {
    setHolidayToDelete(holiday);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!holidayToDelete) return;
    try {
      const { error } = await supabase.from('holidays').delete().eq('id', holidayToDelete.id);
      if (error) throw error;
      setHolidays(holidays.filter(h => h.id !== holidayToDelete.id));
      addToast('success', 'Sucesso', 'Feriado removido com sucesso!');
    } catch (e: any) {
      addToast('error', 'Erro', 'Erro ao remover feriado: ' + e.message);
    } finally {
      setIsDeleteModalOpen(false);
      setHolidayToDelete(null);
    }
  };

  const handleImportHolidays = async () => {
    setImporting(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
      if (!response.ok) throw new Error('Falha ao buscar feriados da Brasil API');
      
      const apiHolidays = await response.json();
      
      // Filter out existing holidays for this year by date
      const existingDates = new Set(
        holidays
          .filter(h => h.date && h.date.startsWith(String(year)))
          .map(h => h.date)
      );
      
      const newHolidays = apiHolidays.filter((apiH: any) => !existingDates.has(apiH.date));
      
      if (newHolidays.length === 0) {
        addToast('info', 'Feriados', `Todos os feriados nacionais de ${year} já estão no calendário.`);
        setImporting(false);
        return;
      }

      // Prepare payload for Supabase
      const payload = newHolidays.map((apiH: any) => ({
        org_id: userProfile.org_id,
        date: apiH.date,
        name: apiH.name,
        type: 'Nacional'
      }));

      const { data, error } = await supabase
        .from('holidays')
        .insert(payload)
        .select();

      if (error) throw error;
      
      if (data) {
        setHolidays(prev => [...prev, ...data]);
        addToast('success', 'Sucesso', `${newHolidays.length} feriados nacionais importados com sucesso!`);
      }
    } catch (error: any) {
      addToast('error', 'Erro', 'Erro ao importar feriados: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  // Filter keys by year
  const filteredHolidays = holidays.filter(h => h.date && h.date.startsWith(String(year)));
  const sortedHolidays = [...filteredHolidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <div 
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 cursor-pointer group/header"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm group-hover/header:border-indigo-300 transition-colors">
              <CalendarClock size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                Adicionar Feriado
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              icon={importing ? <Loader2 className="animate-spin" size={16} /> : <CloudDownload size={16} />}
              onClick={(e) => {
                e.stopPropagation();
                handleImportHolidays();
              }}
              disabled={importing}
            >
              {importing ? 'Importando...' : `Importar Nacionais ${year}`}
            </Button>
            <div className={`p-1.5 rounded-lg border shadow-sm transition-all duration-200 ${isFormExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'} group-hover/header:border-emerald-300 group-hover/header:shadow-md`}>
              {isFormExpanded ? <ChevronUp size={16} /> : <SquarePlus size={16} />}
            </div>
          </div>
        </div>

        <div className={`grid transition-all duration-300 ease-in-out ${isFormExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
          <div className="overflow-hidden">
            <div className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <Input label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
                <Input label="Descrição" placeholder="Ex: Aniversário" className="md:col-span-2" value={name} onChange={e => setName(e.target.value)} />
                <Select label="Tipo" value={type} onChange={e => setType(e.target.value)} options={[
                  { value: 'Nacional', label: 'Nacional' },
                  { value: 'Estadual', label: 'Estadual' },
                  { value: 'Municipal', label: 'Municipal' },
                  { value: 'Facultativo', label: 'Ponto Facultativo' },
                ]} />
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleAddHoliday} disabled={adding} icon={<Calendar size={16} />}>
                  {adding ? 'Salvando...' : 'Adicionar ao Calendário'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
          <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
            Feriados de {year}
          </h4>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
            <button
              onClick={() => setYear(year - 1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold px-2 min-w-[3rem] text-center">{year}</span>
            <button
              onClick={() => setYear(year + 1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sortedHolidays.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Nenhum feriado cadastrado para este ano.
            </div>
          ) : (
            sortedHolidays.map((h) => {
              const dateObj = new Date(h.date + 'T12:00:00');
              const month = dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
              const day = dateObj.getDate();
              const weekday = dateObj.toLocaleString('pt-BR', { weekday: 'long' });

              return (
                <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border shadow-sm ${h.type === 'Facultativo'
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30'
                      }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{month.replace('.', '')}</span>
                      <span className="text-xl font-bold leading-none">{day}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-base">{h.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 capitalize">{weekday}</span>
                        <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${h.type === 'Facultativo' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                          {h.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(h)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remover feriado"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remover Feriado"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDelete}>Remover</Button>
          </>
        }
      >
        <div className="py-2">
          <p className="text-slate-600 dark:text-slate-400">
            Tem certeza que deseja remover o feriado <span className="font-bold text-slate-900 dark:text-white">"{holidayToDelete?.name}"</span>?
          </p>
        </div>
      </Modal>
    </div>
  );
};

// ------------------- MESSAGE TEMPLATE SETTINGS -------------------

interface MessageTemplate {
  id: string;
  org_id: string;
  title: string;
  content: string;
  target_tax_regimes: string[];
  target_sectors: string[];
  target_segments: string[];
  target_client_ids: string[];
  reference_task_type_id: string | null;
  is_automated: boolean;
  trigger_type: 'day_of_month' | 'days_before_due' | 'manual';
  trigger_value: number | null;
  trigger_time?: string;
  send_email_copy: boolean;
  email_subject: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const MessageTemplateSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetTaxRegimes, setTargetTaxRegimes] = useState<string[]>([]);
  const [targetSectors, setTargetSectors] = useState<string[]>([]);
  const [targetClientIds, setTargetClientIds] = useState<string[]>([]);
  const [referenceTaskTypeId, setReferenceTaskTypeId] = useState('');
  const [isAutomated, setIsAutomated] = useState(false);
  const [triggerType, setTriggerType] = useState<'day_of_month' | 'days_before_due' | 'manual' | ''>('');
  const [triggerValue, setTriggerValue] = useState<string>('');
  const [triggerTime, setTriggerTime] = useState('09:00');
  const [sendEmailCopy, setSendEmailCopy] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');

  // Bulk send modal state
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendTotal, setSendTotal] = useState(0);
  const [sendCurrentIndex, setSendCurrentIndex] = useState(0);
  const [sendLogs, setSendLogs] = useState<string[]>([]);
  const [sendTemplate, setSendTemplate] = useState<MessageTemplate | null>(null);

  // Delete modal state
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const insertMarkdownFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.getElementById('template-content-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const selectedText = text.substring(start, end);
      const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        const offset = prefix.length + selectedText.length + suffix.length;
        textarea.setSelectionRange(start + offset, start + offset);
      }, 0);
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const textarea = document.getElementById('template-content-textarea') as HTMLTextAreaElement;
    const emoji = emojiData.emoji;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setContent(prev => prev + emoji);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [templatesRes, taskTypesRes, sectorsRes, clientsRes] = await Promise.all([
        supabase.from('chat_message_templates').select('*').eq('org_id', userProfile.org_id).order('created_at', { ascending: false }),
        supabase.from('task_types').select('*').eq('org_id', userProfile.org_id).order('name'),
        supabase.from('sectors').select('*').eq('org_id', userProfile.org_id).order('name'),
        supabase.from('clients').select('id, company_name, trade_name, status, client_tax_regime_history(*)').order('company_name')
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data as MessageTemplate[]);
      if (taskTypesRes.data) setTaskTypes(taskTypesRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (clientsRes.data) {
        const mappedClients = (clientsRes.data as any[]).map(c => {
          const history = c.client_tax_regime_history || [];
          const currentRegime = history.find((h: any) => !h.end_date);
          return {
            ...c,
            tax_regime: currentRegime?.regime || null
          };
        });
        setClients(mappedClients);
      }

    } catch (error) {
      console.error('Erro ao buscar dados de templates:', error);
      addToast('error', 'Erro', 'Falha ao carregar configurações de templates.');
    } finally {
      setLoading(false);
    }
  };

  const insertPlaceholder = (tag: string) => {
    const textarea = document.getElementById('template-content-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const newText = text.substring(0, start) + tag + text.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      setContent(prev => prev + tag);
    }
  };

  const handleSaveTemplate = async () => {
    if (!title.trim() || !content.trim()) {
      addToast('error', 'Erro', 'Título e Conteúdo da Mensagem são obrigatórios');
      return;
    }

    if (isAutomated && !triggerType) {
      addToast('error', 'Erro', 'Selecione o Tipo de Agendamento para disparos automáticos.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tValue = triggerValue ? parseInt(triggerValue) : null;

      const templateData = {
        org_id: userProfile.org_id,
        title: title.trim(),
        content: content.trim(),
        target_tax_regimes: targetTaxRegimes,
        target_sectors: targetSectors,
        target_client_ids: targetClientIds,
        reference_task_type_id: referenceTaskTypeId || null,
        is_automated: isAutomated,
        trigger_type: isAutomated ? triggerType : 'manual',
        trigger_value: isAutomated ? tValue : null,
        trigger_time: isAutomated ? (triggerTime + ':00') : '09:00:00',
        send_email_copy: sendEmailCopy,
        email_subject: sendEmailCopy ? emailSubject.trim() : null,
        created_by: user.id
      };

      if (editingId) {
        const { error } = await supabase
          .from('chat_message_templates')
          .update(templateData)
          .eq('id', editingId);

        if (error) throw error;
        addToast('success', 'Sucesso', 'Modelo de mensagem atualizado!');
      } else {
        const { error } = await supabase
          .from('chat_message_templates')
          .insert([templateData]);

        if (error) throw error;
        addToast('success', 'Sucesso', 'Modelo de mensagem criado!');
      }

      // Reset form
      clearForm();
      fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar template:', error);
      addToast('error', 'Erro', 'Falha ao salvar modelo: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (template: MessageTemplate) => {
    setEditingId(template.id);
    setTitle(template.title);
    setContent(template.content);
    setTargetTaxRegimes(template.target_tax_regimes || []);
    setTargetSectors(template.target_sectors || []);
    setTargetClientIds(template.target_client_ids || []);
    setReferenceTaskTypeId(template.reference_task_type_id || '');
    setIsAutomated(template.is_automated);
    setTriggerType(template.trigger_type || 'manual');
    setTriggerValue(template.trigger_value ? template.trigger_value.toString() : '');
    setTriggerTime(template.trigger_time ? template.trigger_time.substring(0, 5) : '09:00');
    setSendEmailCopy(template.send_email_copy);
    setEmailSubject(template.email_subject || '');
    setIsFormExpanded(true);
  };

  const clearForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setTargetTaxRegimes([]);
    setTargetSectors([]);
    setTargetClientIds([]);
    setReferenceTaskTypeId('');
    setIsAutomated(false);
    setTriggerType('manual');
    setTriggerValue('');
    setTriggerTime('09:00');
    setSendEmailCopy(false);
    setEmailSubject('');
    setIsFormExpanded(false);
  };

  const initDelete = (template: MessageTemplate) => {
    setTemplateToDelete(template);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('chat_message_templates')
        .delete()
        .eq('id', templateToDelete.id);

      if (error) throw error;
      addToast('success', 'Sucesso', 'Modelo de mensagem excluído!');
      setTemplateToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir template:', error);
      addToast('error', 'Erro', 'Erro ao excluir modelo: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkSend = async (template: MessageTemplate) => {
    setSendTemplate(template);
    setSendProgress(0);
    setSendLogs([]);
    setSending(true);
    setIsSendModalOpen(true);

    try {
      let targets: any[] = [];

      // 1. Obter os IDs de clientes associados à tarefa de referência, se houver
      let allowedClientIdsByTask: Set<string> | null = null;
      if (template.reference_task_type_id) {
        const taskTypeName = taskTypes.find(t => t.id === template.reference_task_type_id)?.name;
        if (taskTypeName) {
          const { data: tasksOfType } = await supabase
            .from('tasks')
            .select('client_id')
            .eq('task_name', taskTypeName);
          
          if (tasksOfType) {
            allowedClientIdsByTask = new Set(
              tasksOfType
                .map(t => t.client_id)
                .filter((id): id is string => !!id)
            );
          }
        }
      }

      // A. Filtro por clientes específicos
      if (template.target_client_ids && template.target_client_ids.length > 0) {
        const { data } = await supabase
          .from('clients')
          .select('*, client_tax_regime_history(*)')
          .in('id', template.target_client_ids);
        if (data) {
          targets = data
            .filter(c => c.status === 'Ativo')
            .map(c => {
              const history = c.client_tax_regime_history || [];
              const currentRegime = history.find((h: any) => !h.end_date);
              return {
                ...c,
                tax_regime: currentRegime?.regime || null
              };
            });
        }
      } else {
        // Filtro amplo
        let query: any = supabase.from('clients').select('*, client_tax_regime_history(*)').eq('status', 'Ativo');

        const { data } = await query;
        if (data) {
          let mapped = data.map((c: any) => {
            const history = c.client_tax_regime_history || [];
            const currentRegime = history.find((h: any) => !h.end_date);
            return {
              ...c,
              tax_regime: currentRegime?.regime || null
            };
          });

          // Filtro por regime (Removido da lógica ativa - apenas informativo)
          /*
          if (template.target_tax_regimes && template.target_tax_regimes.length > 0) {
            mapped = mapped.filter((c: any) => template.target_tax_regimes.includes(c.tax_regime));
          }
          */

          // Filtro cruzado por setor (Removido da lógica ativa - apenas informativo)
          /*
          if (template.target_sectors && template.target_sectors.length > 0) {
            const { data: membersInSectors } = await supabase
              .from('members')
              .select('client_ids, client_id')
              .in('sector_id', template.target_sectors);

            if (membersInSectors) {
              const allowedClientIds = new Set<string>();
              membersInSectors.forEach(m => {
                if (m.client_id) allowedClientIds.add(m.client_id);
                if (m.client_ids && Array.isArray(m.client_ids)) {
                  m.client_ids.forEach(cid => allowedClientIds.add(cid));
                }
              });
              mapped = mapped.filter(t => allowedClientIds.has(t.id));
            }
          }
          */

          targets = mapped;
        }
      }

      // Filtrar targets finais pela tarefa de referência, se houver
      if (allowedClientIdsByTask) {
        targets = targets.filter(t => allowedClientIdsByTask!.has(t.id));
      }

      if (targets.length === 0) {
        setSendLogs(prev => [...prev, "⚠️ Nenhum cliente ativo atende aos critérios deste modelo."]);
        setSending(false);
        return;
      }

      setSendTotal(targets.length);
      setSendLogs(prev => [...prev, `🚀 Iniciando disparo de lote contendo ${targets.length} cliente(s)...`]);

      // Iterar pelos destinatários com controle de vazão (Throttling)
      for (let i = 0; i < targets.length; i++) {
        const client = targets[i];
        setSendCurrentIndex(i + 1);
        setSendProgress(Math.round(((i + 1) / targets.length) * 100));

        try {
          // 1. Localizar os perfis de login do cliente e seus cadastros de membros (contemplando arrays client_ids)
          const [profilesRes, membersRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, full_name')
              .eq('role', 'cliente')
              .or(`client_id.eq.${client.id},client_ids.cs.{"${client.id}"}`),
            supabase
              .from('members')
              .select('email, first_name, last_name')
              .eq('role', 'cliente')
              .or(`client_id.eq.${client.id},client_ids.cs.{"${client.id}"}`)
          ]);

          const profilesList = profilesRes.data || [];
          const membersList = membersRes.data || [];

          // Pega o e-mail do primeiro membro localizado (fallback para e-mail geral de envio)
          let clientEmail = membersList.find(m => m.email)?.email || '';

          if (profilesList.length > 0) {
            for (const prof of profilesList) {
              const profileId = prof.id;

              // Localizar o cadastro de membro associado ao e-mail ou perfil
              const memberForProfile = membersList.find(m => m.first_name && prof.full_name?.includes(m.first_name)) || membersList[0];

              let contactName = memberForProfile 
                ? `${memberForProfile.first_name} ${memberForProfile.last_name}` 
                : (prof.full_name || client.admin_partner_name || client.company_name);

              const regimeLabel = client.tax_regime ? getTaxRegimeLabel(client.tax_regime) : 'Não Definido';
              const portalLink = typeof window !== 'undefined' ? window.location.origin : 'https://portal.taskaccount.com.br';

              const lastMonthDate = new Date();
              lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
              const competenceLabel = lastMonthDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });

              // 2. Personalizar placeholders da mensagem padrão
              let personalizedText = template.content
                .replace(/{nome_contato}/g, contactName)
                .replace(/{razao_social}/g, client.company_name)
                .replace(/{nome_fantasia}/g, client.trade_name || client.company_name)
                .replace(/{mes_competencia}/g, competenceLabel)
                .replace(/{cnpj_empresa}/g, client.document || 'Não Informado')
                .replace(/{regime_tributario}/g, regimeLabel)
                .replace(/{link_portal}/g, portalLink)
                .replace(/{codigo_cliente}/g, client.code || 'Não Informado')
                .replace(/{cidade_empresa}/g, client.city || 'Não Informado')
                .replace(/{estado_empresa}/g, client.state || 'Não Informado')
                .replace(/{segmento_empresa}/g, client.segment || 'Não Informado');

              // 3. Placeholders da tarefa vinculada
              let vencimentoPadraoStr = 'Não Definido';
              if (template.reference_task_type_id) {
                const taskTypeObj = taskTypes.find(t => t.id === template.reference_task_type_id);
                const dueDay = taskTypeObj?.due_day;
                if (dueDay) {
                  const today = new Date();
                  const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
                  vencimentoPadraoStr = dueDate.toLocaleDateString('pt-BR');
                } else {
                  const today = new Date();
                  const dueDate = new Date(today.getFullYear(), today.getMonth(), 20);
                  vencimentoPadraoStr = dueDate.toLocaleDateString('pt-BR');
                }

                const taskTypeName = taskTypes.find(t => t.id === template.reference_task_type_id)?.name;
                let taskQuery = (supabase.from('tasks') as any)
                  .select('due_date, task_name')
                  .eq('client_id', client.id);

                if (taskTypeName) {
                  taskQuery = taskQuery.eq('task_name', taskTypeName);
                }

                const { data: taskData } = await taskQuery
                  .order('due_date', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (taskData) {
                  const dueDateStr = taskData.due_date ? new Date(taskData.due_date).toLocaleDateString('pt-BR') : 'Data não definida';
                  personalizedText = personalizedText
                    .replace(/{nome_tarefa}/g, taskData.task_name || 'Obrigação Fiscal')
                    .replace(/{vencimento_tarefa}/g, dueDateStr);
                } else {
                  const taskTypeNameFallback = taskTypeName || 'Imposto';
                  personalizedText = personalizedText
                    .replace(/{nome_tarefa}/g, taskTypeNameFallback)
                    .replace(/{vencimento_tarefa}/g, 'Data limite');
                }
              }
              personalizedText = personalizedText
                .replace(/{vencimento_padrao}/g, vencimentoPadraoStr)
                .replace(/{vencimento_competencia}/g, vencimentoPadraoStr);

              // 4. Enviar para o Chat se o cliente tiver acesso
              let channelId = null;

              const { data: memberships } = await supabase
                .from('chat_channel_members')
                .select('channel_id')
                .eq('user_id', profileId);

              const targetSectorId = template.target_sectors && template.target_sectors.length > 0 
                ? template.target_sectors[0] 
                : null;

              if (memberships && memberships.length > 0) {
                const channelIds = memberships.map(m => m.channel_id);
                
                // Priorizar canais de suporte vinculados ao setor do template, se houver
                let queryCh = supabase
                  .from('chat_channels')
                  .select('id, sector_id')
                  .eq('type', 'support')
                  .in('id', channelIds);
                
                if (targetSectorId) {
                  queryCh = queryCh.eq('sector_id', targetSectorId);
                }

                const { data: existingChannels } = await queryCh;
                
                if (existingChannels && existingChannels.length > 0) {
                  channelId = existingChannels[0].id;
                } else if (!targetSectorId) {
                  // Fallback: pega o primeiro canal de suporte encontrado para o cliente
                  const { data: fallbackCh } = await supabase
                    .from('chat_channels')
                    .select('id')
                    .eq('type', 'support')
                    .in('id', channelIds)
                    .limit(1)
                    .maybeSingle();
                  
                  if (fallbackCh) channelId = fallbackCh.id;
                }
              }

              // Criar canal de suporte se não houver
              if (!channelId) {
                const sectorName = template.target_sectors && template.target_sectors.length > 0
                  ? (sectors.find(s => s.id === template.target_sectors[0])?.name || 'Geral')
                  : 'Geral';
                
                const channelName = `Atendimento - ${contactName} (${sectorName})`;

                const { data: newCh, error: chErr } = await supabase
                  .from('chat_channels')
                  .insert({
                    name: channelName,
                    type: 'support',
                    created_by: userProfile.id,
                    status: 'open',
                    support_status: 'pending',
                    sector_id: targetSectorId,
                    is_notification: true
                  } as any)
                  .select()
                  .single();

                if (chErr) throw chErr;
                channelId = newCh.id;

                // Vincular membros (cliente + operador)
                await supabase.from('chat_channel_members').insert([
                  { channel_id: channelId, user_id: profileId, role: 'member' },
                  { channel_id: channelId, user_id: userProfile.id, role: 'admin' }
                ]);
              }

              // Inserir mensagem de chat
              const { error: msgErr } = await supabase
                .from('chat_messages')
                .insert({
                  channel_id: channelId,
                  sender_id: userProfile.id,
                  text: personalizedText,
                  status: 'sent'
                });

              if (msgErr) throw msgErr;
              setSendLogs(prev => [...prev, `✅ Chat enviado para ${contactName} (${client.company_name})`]);
            }
          } else {
            setSendLogs(prev => [...prev, `ℹ️ Pulei Chat: ${client.company_name} sem usuários vinculados.`]);
          }

          // 5. Enviar cópia por e-mail (Simulação / Auditoria)
          if (template.send_email_copy && clientEmail) {
            setSendLogs(prev => [...prev, `✉️ E-mail disparado para <${clientEmail}> (Assunto: ${template.email_subject || 'Aviso Contábil'})`]);
          }

        } catch (itemErr: any) {
          setSendLogs(prev => [...prev, `❌ Falha em ${client.company_name}: ${itemErr.message}`]);
        }

        // Delay Throttling de 200ms
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      setSendLogs(prev => [...prev, "🎉 Envio em massa finalizado com sucesso!"]);

    } catch (err: any) {
      console.error(err);
      setSendLogs(prev => [...prev, `🚨 Falha geral: ${err.message}`]);
    } finally {
      setSending(false);
    }
  };

  const getTaxRegimeLabel = (regime: string) => {
    const labels: Record<string, string> = {
      'simples': 'Simples',
      'simples_iva': 'Simples IVA Dual',
      'presumido': 'Presumido',
      'presumido_imune': 'Presumido Imune-Isento',
      'real_trimestral': 'Real Trimestral',
      'real_anual': 'Real Anual',
      'real_imune': 'Real Imune-Isento',
      'arbitrado': 'Arbitrado',
      'mei': 'MEI',
      'nanoempreendedor': 'Nanoempreendedor',
      'irpf': 'IRPF'
    };
    return labels[regime] || regime;
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-8">
      {/* 1. Cadastrar / Editar Template */}
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer group/header"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm group-hover/header:border-indigo-300 transition-colors">
              <Mail size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                {editingId ? 'Editar Modelo' : 'Novo Modelo de Mensagem'}
              </h1>
              <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
          </div>
          <div className={`p-1.5 rounded-lg border shadow-sm transition-all duration-200 ${isFormExpanded ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20'} group-hover/header:border-emerald-300 group-hover/header:shadow-md`}>
            {isFormExpanded ? <ChevronUp size={16} /> : <SquarePlus size={16} />}
          </div>
        </div>

        <div className={`grid transition-all duration-300 ease-in-out ${isFormExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
          <div className="overflow-hidden">
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Nome do Modelo" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="DAS Simples Nacional" 
                />
                
                <Select
                  label="Tarefa de Referência"
                  badge="Opcional"
                  value={referenceTaskTypeId}
                  onChange={e => setReferenceTaskTypeId(e.target.value)}
                  options={[
                    { value: '', label: 'Sem vinculação de tarefa' },
                    ...taskTypes.map(t => ({ value: t.id, label: t.name }))
                  ]}
                />

                <GroupedSelect
                  label="Regime Tributário"
                  groups={TAX_REGIME_GROUPS}
                  value={targetTaxRegimes[0] || ''}
                  onChange={(value) => setTargetTaxRegimes(value ? [value] : [])}
                  placeholder="Selecione um Regime"
                />

                <Select
                  label="Setor"
                  value={targetSectors[0] || ''}
                  onChange={e => setTargetSectors(e.target.value ? [e.target.value] : [])}
                  options={[
                    { value: '', label: 'Selecione um Setor' },
                    ...sectors.map(s => ({ value: s.id, label: s.name }))
                  ]}
                />
              </div>

              {/* Editor de Mensagem e Placeholders */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Mensagem Padrão Customizável
                </label>

                <div className="space-y-0 relative">
                  {/* Barra de Ferramentas de Formatação e Placeholders */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/60 p-2 rounded-t-xl border-t border-x border-slate-200 dark:border-slate-700/50">
                    {/* Botões de Formatação */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => insertMarkdownFormatting('**')}
                        className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 flex items-center justify-center min-w-[28px] h-[28px] shadow-sm"
                        title="Negrito"
                      >
                        <strong>B</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdownFormatting('*')}
                        className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 italic flex items-center justify-center min-w-[28px] h-[28px] shadow-sm"
                        title="Itálico"
                      >
                        <em>I</em>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdownFormatting('_')}
                        className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 underline flex items-center justify-center min-w-[28px] h-[28px] shadow-sm"
                        title="Sublinhado"
                      >
                        <u>U</u>
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMarkdownFormatting('~')}
                        className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 line-through flex items-center justify-center min-w-[28px] h-[28px] shadow-sm"
                        title="Tachado"
                      >
                        <s>S</s>
                      </button>
                      
                      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                      
                      <div className="relative">
                        <button
                          ref={emojiButtonRef}
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`px-2 py-1 text-xs bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-200 flex items-center justify-center h-[28px] gap-1 transition-colors shadow-sm ${showEmojiPicker ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' : ''}`}
                          title="Inserir Emoji"
                        >
                          <Smile size={14} className={showEmojiPicker ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'} />
                          <span className="text-[10px] font-bold">Emoji</span>
                        </button>

                        {/* Emoji Picker Popover */}
                        {showEmojiPicker && (
                          <div 
                            ref={emojiPickerRef}
                            className="absolute top-full left-0 mt-1 z-50 shadow-xl rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                          >
                            <EmojiPicker
                              onEmojiClick={onEmojiClick}
                              autoFocusSearch={false}
                              theme={document.documentElement.classList.contains('dark') ? Theme.DARK : Theme.LIGHT}
                              height={280}
                              width={240}
                              searchDisabled
                              skinTonesDisabled
                              previewConfig={{ showPreview: false }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Placeholders Rápidos */}
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('{nome_contato}')}
                        className="px-2 py-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded border border-indigo-200/50"
                        title="Primeiro nome do contato principal"
                      >
                        {`{nome_contato}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('{razao_social}')}
                        className="px-2 py-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded border border-indigo-200/50"
                        title="Razão Social da Empresa"
                      >
                        {`{razao_social}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('{cnpj_empresa}')}
                        className="px-2 py-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded border border-indigo-200/50"
                        title="CNPJ/CPF do Cliente"
                      >
                        {`{cnpj_empresa}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('{regime_tributario}')}
                        className="px-2 py-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded border border-indigo-200/50"
                        title="Regime Tributário do Cliente"
                      >
                        {`{regime_tributario}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder('{mes_competencia}')}
                        className="px-2 py-1 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded border border-indigo-200/50"
                        title="Mês corrente (MM/AAAA)"
                      >
                        {`{mes_competencia}`}
                      </button>
                      {referenceTaskTypeId && (
                        <>
                          <button
                            type="button"
                            onClick={() => insertPlaceholder('{nome_tarefa}')}
                            className="px-2 py-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded border border-emerald-200/50"
                          >
                            {`{nome_tarefa}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => insertPlaceholder('{vencimento_padrao}')}
                            className="px-2 py-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded border border-emerald-200/50"
                            title="Vencimento Padrão do Tipo de Tarefa"
                          >
                            {`{vencimento_padrao}`}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <textarea
                    id="template-content-textarea"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Olá {nome_contato}, informamos que a guia de {nome_tarefa} da empresa {razao_social} referente a {mes_competencia} já está disponível no portal."
                    className="w-full h-32 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-b-xl border-t-0 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 dark:text-white"
                  />
                </div>
              </div>

              {/* Segmentação & Destinatários */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Target size={14} /> Mensagem Direcionada
                </h3>
                
                <div className="w-full">
                  <MultiSelect
                    label="Lista de clientes"
                    tooltip="As mensagens serão direcionadas apenas para os clientes adicionados a lista."
                    value={targetClientIds}
                    onChange={setTargetClientIds}
                    options={clients.map(c => ({ value: c.id, label: c.company_name }))}
                  />
                </div>
              </div>

              {/* Agendamento Automático */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} /> Agendamento e Disparo Automático (pg_cron)
                  </h3>
                  <Toggle checked={isAutomated} onChange={(checked) => {
                    setIsAutomated(checked);
                    if (checked && (triggerType === 'manual' || triggerType === '')) {
                      setTriggerType('');
                    }
                  }} />
                </div>

                {isAutomated && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Select
                      label="Tipo de Agendamento"
                      value={triggerType}
                      onChange={e => {
                        setTriggerType(e.target.value as any);
                        setTriggerValue('');
                      }}
                      options={[
                        { value: 'day_of_month', label: 'Dia Fixo do Mês' },
                        { value: 'days_before_due', label: 'Dias de Antecedência do Vencimento' }
                      ]}
                    />
                    
                    {triggerType === 'day_of_month' ? (
                      <Input
                        label="Dia do Disparo (1 a 31)"
                        type="number"
                        min="1"
                        max="31"
                        value={triggerValue}
                        onChange={e => setTriggerValue(e.target.value)}
                        placeholder="Ex: 20"
                      />
                    ) : (
                      <Input
                        label="Dias Antes do Vencimento"
                        type="number"
                        min="1"
                        value={triggerValue}
                        onChange={e => setTriggerValue(e.target.value)}
                        placeholder="Ex: 5"
                        disabled={!referenceTaskTypeId}
                        required={triggerType === 'days_before_due'}
                      />
                    )}

                    <Input
                      label="Horário do Disparo"
                      type="time"
                      value={triggerTime}
                      onChange={e => setTriggerTime(e.target.value)}
                      required={isAutomated}
                    />
                  </div>
                )}
              </div>

              {/* Cópia Multicanal */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Mail size={14} /> Enviar também cópia por E-mail
                  </h3>
                  <Toggle checked={sendEmailCopy} onChange={setSendEmailCopy} />
                </div>

                {sendEmailCopy && (
                  <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Input
                      label="Assunto do E-mail"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="Ex: Guia do Simples Nacional - Santos & Associados"
                    />
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button variant="secondary" onClick={clearForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTemplate} disabled={saving} icon={<Save size={16} />}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Modelo'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Listagem de Templates Existentes */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            <LayoutList size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
              Modelos Salvos
            </h3>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map(tmpl => (
            <div
              key={tmpl.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    {tmpl.title}
                  </h4>
                  <div className="flex items-center gap-1">
                    {tmpl.is_automated && (
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-indigo-200/50">
                        <CalendarClock size={11} /> Automático {
                          tmpl.trigger_type === 'day_of_month'
                            ? `(Dia ${tmpl.trigger_value} às ${tmpl.trigger_time?.substring(0, 5)})`
                            : tmpl.trigger_type === 'days_before_due'
                              ? `(${tmpl.trigger_value} dias antes às ${tmpl.trigger_time?.substring(0, 5)})`
                              : tmpl.trigger_time ? `(${tmpl.trigger_time.substring(0, 5)})` : ''
                        }
                      </span>
                    )}
                    {tmpl.send_email_copy && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-200/50">
                        <Mail size={11} /> Multicanal
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50 font-medium">
                  {tmpl.content}
                </p>

                {/* Tags de Filtro */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {tmpl.target_client_ids && tmpl.target_client_ids.length > 0 ? (
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100/50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
                      Direcionado ({tmpl.target_client_ids.length} cl.)
                    </span>
                  ) : (
                    <>
                      {tmpl.target_tax_regimes && tmpl.target_tax_regimes.map(reg => (
                        <span key={reg} className="text-[9px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200/30">
                          {getTaxRegimeLabel(reg)}
                        </span>
                      ))}
                      {tmpl.target_sectors && tmpl.target_sectors.map(secId => (
                        <span key={secId} className="text-[9px] font-semibold bg-blue-50 text-blue-600 border border-blue-100/50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded">
                          📁 {sectors.find(s => s.id === secId)?.name || 'Setor'}
                        </span>
                      ))}
                    </>
                  )}
                  {tmpl.reference_task_type_id && (
                    <span className="text-[9px] font-semibold bg-purple-50 text-purple-600 border border-purple-100/50 dark:bg-purple-950/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Target size={10} /> {taskTypes.find(t => t.id === tmpl.reference_task_type_id)?.name || 'Tarefa'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  size="sm"
                  onClick={() => handleBulkSend(tmpl)}
                  icon={<Send size={14} />}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg"
                >
                  Disparar Agora
                </Button>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditing(tmpl)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                    title="Editar modelo"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => initDelete(tmpl)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    title="Remover modelo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="col-span-2 text-center py-12 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum modelo de mensagem padrão cadastrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal de Exclusão de Template */}
      <Modal
        isOpen={!!templateToDelete}
        onClose={() => setTemplateToDelete(null)}
        title="Confirmar Exclusão"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTemplateToDelete(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Excluir Modelo'}
            </Button>
          </>
        }
      >
        <div className="py-2 space-y-2 text-slate-700 dark:text-slate-300">
          <p>Tem certeza que deseja excluir permanentemente o modelo de mensagem <strong className="text-slate-900 dark:text-white">"{templateToDelete?.title}"</strong>?</p>
          <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
        </div>
      </Modal>

      {/* 4. Modal de Progresso do Envio em Massa */}
      <Modal
        isOpen={isSendModalOpen}
        onClose={() => {
          if (!sending) setIsSendModalOpen(false);
        }}
        title="Disparo de Mensagens em Massa"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setIsSendModalOpen(false)} disabled={sending}>
            {sending ? 'Aguarde o envio...' : 'Fechar'}
          </Button>
        }
      >
        <div className="py-4 space-y-5">
          <div className="space-y-2 text-left">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              Disparando: <span className="text-indigo-600">{sendTemplate?.title}</span>
            </h4>
            <p className="text-xs text-slate-500">
              Processando envio em lotes sequenciais de 200ms para evitar sobrecargas de banco de dados e tráfego de rede.
            </p>
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>{sending ? 'Progresso de Envio' : 'Envio Concluído'}</span>
              <span>{sendCurrentIndex} / {sendTotal} ({sendProgress}%)</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${sendProgress}%` }}
              />
            </div>
          </div>

          {/* Logs do Disparo */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Histórico do Lote
            </label>
            <div className="w-full h-48 bg-slate-950 text-slate-300 font-mono text-[11px] p-4 rounded-xl overflow-y-auto border border-slate-800/80 space-y-1 custom-scrollbar">
              {sendLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`py-0.5 border-b border-white/5 last:border-b-0 ${
                    log.includes('✅') ? 'text-emerald-400' :
                    log.includes('❌') ? 'text-rose-400 font-bold' :
                    log.includes('⚠️') ? 'text-amber-400 font-bold' :
                    log.includes('🚀') ? 'text-indigo-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-1.5 py-1 text-slate-400 animate-pulse">
                  <Loader2 size={12} className="animate-spin text-indigo-400" />
                  <span>Enviando mensagens...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};