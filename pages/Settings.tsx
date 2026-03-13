
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Users, Briefcase, List, Mail, Send, Calendar, Trash2, ChevronLeft, ChevronRight, Loader2, Save, Copy, Clock, Settings as SettingsIcon, ListFilter, CloudDownload } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';

interface SettingsProps {
  userProfile: any;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'equipe' | 'setores' | 'tipos' | 'calendario'>('equipe');

  const contentProps = { userProfile };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('equipe')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'equipe' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Users size={18} /> Equipe
          </button>
          <button
            onClick={() => setActiveTab('setores')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'setores' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Briefcase size={18} /> Setores
          </button>
          <button
            onClick={() => setActiveTab('tipos')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'tipos' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <List size={18} /> Tipos de Tarefa
          </button>
          <button
            onClick={() => setActiveTab('calendario')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'calendario' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Calendar size={18} /> Calendário
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'equipe' && <TeamSettings {...contentProps} />}
          {activeTab === 'setores' && <SectorSettings {...contentProps} />}
          {activeTab === 'tipos' && <TaskTypeSettings {...contentProps} />}
          {activeTab === 'calendario' && <CalendarSettings {...contentProps} />}
        </div>
      </div>
    </div>
  );
};

// ------------------- TEAM SETTINGS -------------------

const TeamSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [role, setRole] = useState('operacional'); // New state for access role
  const [initialPassword, setInitialPassword] = useState(''); // Just for UI, logic pending

  // Deletion Modal State
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [deleteModalState, setDeleteModalState] = useState<'closed' | 'checking' | 'can_delete' | 'cannot_delete' | 'deleting'>('closed');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [membersRes, sectorsRes] = await Promise.all([
        supabase.from('members').select('*, sectors(name)').eq('org_id', userProfile.org_id),
        supabase.from('sectors').select('*').eq('org_id', userProfile.org_id)
      ]);

      if (membersRes.data) setMembers(membersRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);

    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!firstName || !email) {
      alert('Nome e Email são obrigatórios');
      return;
    }
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data, error } = await supabase.from('members').insert({
        org_id: userProfile.org_id,
        first_name: firstName,
        last_name: lastName,
        email,
        sector_id: sectorId || null,
        role: role // Add role here
      }).select();

      if (error) throw error;

      if (data) {
        setMembers([...members, ...data]);
        setFirstName('');
        setLastName('');
        setEmail('');
        setSectorId('');
        setRole('operacional');
        setInitialPassword('');
        alert('Membro adicionado com sucesso!');
      }
    } catch (error: any) {
      alert('Erro ao adicionar membro: ' + error.message);
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
      alert('Erro ao atualizar situação: ' + (error.message || 'Erro desconhecido'));
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
      alert('Erro ao verificar tarefas: ' + error.message);
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
      alert('Erro ao excluir membro: ' + error.message);
    } finally {
      setDeleteModalState('closed');
      setMemberToDelete(null);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Adicionar Membro</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input label="Nome" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="João" />
          <Input label="Sobrenome" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Silva" />
          <Input label="E-mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@empresa.com" type="email" />
          <Select
            label="Setor"
            value={sectorId} // Control the select
            onChange={e => setSectorId(e.target.value)}
            options={[
              { value: '', label: 'Selecione um setor' },
              ...sectors.map(s => ({ value: s.id, label: s.name }))
            ]}
          />
          <Select
             label="Nível de Permissão"
             value={role}
             onChange={e => setRole(e.target.value)}
             options={[
               { value: 'operacional', label: 'Operacional' },
               { value: 'gestor', label: 'Gestor' }
             ]}
          />
          <Input label="Senha Inicial (Opcional)" value={initialPassword} onChange={e => setInitialPassword(e.target.value)} type="password" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleAddMember} disabled={adding}>
            {adding ? 'Salvando...' : 'Cadastrar Membro'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {members.map(member => (
          <div key={member.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 flex flex-col items-center text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors shadow-sm relative group">
            <button
              onClick={() => initDeleteMember(member)}
              className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-3 flex items-center justify-center text-xl font-bold text-slate-900 dark:text-white uppercase">
              {member.first_name ? member.first_name.substring(0, 2) : 'U'}
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">{member.first_name} {member.last_name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{member.email}</p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-2">
              {member.sectors?.name && (
                <span className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full">
                  {member.sectors.name}
                </span>
              )}
              {member.role && (
                <span className={`text-xs px-2 py-1 rounded-full ${member.role === 'gestor' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  {member.role === 'gestor' ? 'Gestor' : 'Operacional'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <Toggle
                checked={member.status !== 'Inativo'}
                onChange={() => handleToggleStatus(member.id, member.status || 'Ativo')}
              />
              <span className={`text-xs font-semibold ${member.status === 'Inativo' ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {member.status === 'Inativo' ? 'Inativo' : 'Ativo'}
              </span>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Button
                size="sm"
                variant="primary"
                icon={<Send size={14} />}
                onClick={() => {
                  const inviteLink = `${window.location.origin}/auth?email=${encodeURIComponent(member.email)}`;
                  const subject = encodeURIComponent('Convite para acessar o Task Account');
                  const body = encodeURIComponent(`Olá ${member.first_name},\n\nVocê foi convidado para participar da organização no Task Account!\n\nPara finalizar seu cadastro, acesse o link abaixo usando este e-mail (${member.email}):\n\n${inviteLink}\n\nSeja bem-vindo!`);
                  window.location.href = `mailto:${member.email}?subject=${subject}&body=${body}`;
                }}
              >
                Enviar por E-mail
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<Copy size={14} />}
                onClick={() => {
                  const inviteLink = `${window.location.origin}/auth?email=${encodeURIComponent(member.email)}`;
                  navigator.clipboard.writeText(inviteLink);
                  alert('Link de convite copiado!');
                }}
              >
                Copiar Link
              </Button>
            </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="md:col-span-3 text-center py-8 text-slate-500">Nenhum membro cadastrado.</div>
        )}
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

// ------------------- SECTOR SETTINGS -------------------

const SectorSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [leader, setLeader] = useState('');
  const [costCenter, setCostCenter] = useState('');

  // Edit Form
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLeader, setEditLeader] = useState('');
  const [editCostCenter, setEditCostCenter] = useState('');

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
    if (!name) return alert('Nome é obrigatório');
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from('sectors').insert({
        org_id: userProfile.org_id,
        name,
        leader,
        cost_center: costCenter
      }).select();

      if (error) throw error;
      if (data) {
        setSectors([...sectors, ...data]);
        setName('');
        setLeader('');
        setCostCenter('');
      }
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setAdding(false);
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

  const startEditing = (sector: any) => {
    setEditingSectorId(sector.id);
    setEditName(sector.name);
    setEditLeader(sector.leader || '');
    setEditCostCenter(sector.cost_center || '');
  };

  const cancelEditing = () => {
    setEditingSectorId(null);
    setEditName('');
    setEditLeader('');
    setEditCostCenter('');
  };

  const handleUpdateSector = async (id: string) => {
    if (!editName) return alert('Nome é obrigatório');

    // Otimista
    const originalSectors = [...sectors];
    setSectors(prev => prev.map(s => s.id === id ? { ...s, name: editName, leader: editLeader, cost_center: editCostCenter } : s));

    try {
      const { error } = await supabase
        .from('sectors')
        .update({
          name: editName,
          leader: editLeader,
          cost_center: editCostCenter
        })
        .eq('id', id);

      if (error) throw error;
      setEditingSectorId(null);
    } catch (error: any) {
      setSectors(originalSectors); // rollback
      alert('Erro ao atualizar setor: ' + error.message);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Novo Setor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input label="Nome do Setor" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Líder" value={leader} onChange={e => setLeader(e.target.value)} />
          <Input label="Centro de Custo" value={costCenter} onChange={e => setCostCenter(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleAddSector} disabled={adding}>{adding ? 'Salvando...' : 'Salvar Setor'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sectors.map(sector => (
          <div key={sector.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm group relative flex flex-col justify-between">
            {editingSectorId === sector.id ? (
              <div className="space-y-3">
                <Input label="Nome do Setor" value={editName} onChange={e => setEditName(e.target.value)} />
                <Input label="Líder" value={editLeader} onChange={e => setEditLeader(e.target.value)} />
                <Input label="Centro de Custo" value={editCostCenter} onChange={e => setEditCostCenter(e.target.value)} />

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="secondary" size="sm" onClick={cancelEditing}>Cancelar</Button>
                  <Button variant="primary" size="sm" onClick={() => handleUpdateSector(sector.id)}>Salvar</Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => startEditing(sector)}
                  className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Editar Setor"
                >
                  <SettingsIcon size={16} />
                </button>
                <div>
                  <div className="flex justify-between items-start mb-2 pr-6">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-lg">{sector.name}</h4>
                    {sector.cost_center && <span className="text-xs font-mono text-slate-500 whitespace-nowrap">CC: {sector.cost_center}</span>}
                  </div>
                  {sector.leader && <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Líder: <span className="text-slate-900 dark:text-white">{sector.leader}</span></p>}
                </div>

                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Toggle
                    checked={sector.status !== 'Inativo'}
                    onChange={() => handleToggleSectorStatus(sector.id, sector.status || 'Ativo')}
                  />
                  <span className={`text-xs font-semibold ${sector.status === 'Inativo' ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {sector.status === 'Inativo' ? 'Inativo' : 'Ativo'}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ------------------- TASK TYPE SETTINGS -------------------

const TaskTypeSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [entity, setEntity] = useState('');

  // Edit Form
  const [editingTaskTypeId, setEditingTaskTypeId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSectorId, setEditSectorId] = useState('');
  const [editEntity, setEditEntity] = useState('');

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
    if (!name) return alert('Nome obrigatório');
    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('task_types').insert({
        org_id: userProfile.org_id,
        name,
        sector_id: sectorId || null,
        federative_entity: entity
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
        setName(''); setSectorId(''); setEntity('');
      }
    } catch (e: any) { alert(e.message); }
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
      alert('Erro ao atualizar situação: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const startEditing = (task: any) => {
    setEditingTaskTypeId(task.id);
    setEditName(task.name);
    setEditSectorId(task.sector_id || '');
    setEditEntity(task.federative_entity || 'Outro');
  };

  const cancelEditing = () => {
    setEditingTaskTypeId(null);
    setEditName('');
    setEditSectorId('');
    setEditEntity('');
  };

  const handleUpdateTaskType = async (id: string) => {
    if (!editName) return alert('Nome é obrigatório');

    // Otimista parcial (vamos manter backup do estado)
    const originalTaskTypes = [...taskTypes];

    // Procura o nome do setor visualmente para update otimista
    const sectorName = sectors.find(s => s.id === editSectorId)?.name || '';

    setTaskTypes(prev => prev.map(t => t.id === id ? {
      ...t,
      name: editName,
      sector_id: editSectorId,
      federative_entity: editEntity,
      sectors: sectorName ? { name: sectorName } : null
    } : t));

    try {
      const { error } = await supabase
        .from('task_types')
        .update({
          name: editName,
          sector_id: editSectorId || null,
          federative_entity: editEntity
        })
        .eq('id', id);

      if (error) throw error;
      setEditingTaskTypeId(null);
    } catch (error: any) {
      setTaskTypes(originalTaskTypes); // rollback
      alert('Erro ao atualizar tarefa: ' + error.message);
    }
  };

  if (loading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Novo Tipo de Tarefa</h3>
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
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleAddToken} disabled={adding}>{adding ? 'Salvando...' : 'Salvar Tarefa'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {taskTypes.map(task => (
          <div key={task.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm group relative flex flex-col justify-between">
            {editingTaskTypeId === task.id ? (
              <div className="space-y-3">
                <Input label="Nome da Tarefa" value={editName} onChange={e => setEditName(e.target.value)} />
                <Select
                  label="Setor Responsável"
                  value={editSectorId}
                  onChange={e => setEditSectorId(e.target.value)}
                  options={[
                    { value: '', label: 'Sem restrição' },
                    ...sectors.map(s => ({ value: s.id, label: s.name }))
                  ]}
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

                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="secondary" size="sm" onClick={cancelEditing}>Cancelar</Button>
                  <Button variant="primary" size="sm" onClick={() => handleUpdateTaskType(task.id)}>Salvar</Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => startEditing(task)}
                  className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Editar Tipo de Tarefa"
                >
                  <SettingsIcon size={16} />
                </button>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2 pr-6">{task.name}</h4>
                  <div className="space-y-1 mb-4">
                    {task.sectors?.name && <p className="text-xs text-slate-500 dark:text-slate-400">Setor: <span className="text-indigo-600 dark:text-indigo-400">{task.sectors?.name}</span></p>}
                    {task.federative_entity && <p className="text-xs text-slate-500 dark:text-slate-400">Ente: <span className="text-emerald-600 dark:text-emerald-400">{task.federative_entity}</span></p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Toggle
                    checked={task.status !== 'Inativo'}
                    onChange={() => handleToggleTaskTypeStatus(task.id, task.status || 'Ativo')}
                  />
                  <span className={`text-xs font-semibold ${task.status === 'Inativo' ? 'text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {task.status === 'Inativo' ? 'Inativo' : 'Ativo'}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ------------------- CALENDAR SETTINGS -------------------

const CalendarSettings: React.FC<{ userProfile: any }> = ({ userProfile }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

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
    if (!date || !name) return alert('Data e Nome obrigatórios');
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
    } catch (e: any) { alert(e.message); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover?")) return;
    await supabase.from('holidays').delete().eq('id', id);
    setHolidays(holidays.filter(h => h.id !== id));
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
        alert(`Todos os feriados nacionais de ${year} já estão no calendário.`);
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
        alert(`${newHolidays.length} feriados nacionais importados com sucesso!`);
      }
    } catch (error: any) {
      alert('Erro ao importar feriados: ' + error.message);
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Adicionar Feriado</h3>
            <p className="text-sm text-slate-500">Cadastre feriados nacionais, estaduais ou municipais.</p>
          </div>
          <Button
            variant="secondary"
            icon={importing ? <Loader2 className="animate-spin" size={16} /> : <CloudDownload size={16} />}
            onClick={handleImportHolidays}
            disabled={importing}
          >
            {importing ? 'Importando...' : `Importar Nacionais ${year}`}
          </Button>
        </div>
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
                    onClick={() => handleDelete(h.id)}
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
    </div>
  );
};