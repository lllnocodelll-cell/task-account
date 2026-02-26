
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Users, Briefcase, List, Mail, Send, Calendar, Trash2, ChevronLeft, ChevronRight, Loader2, Save, Copy, Clock, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

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
  const [initialPassword, setInitialPassword] = useState(''); // Just for UI, logic pending

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
      }).select();

      if (error) throw error;

      if (data) {
        setMembers([...members, ...data]);
        setFirstName('');
        setLastName('');
        setEmail('');
        setSectorId('');
        setInitialPassword('');
        alert('Membro adicionado com sucesso!');
      }
    } catch (error: any) {
      alert('Erro ao adicionar membro: ' + error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      setMembers(members.filter(m => m.id !== id));
    } catch (error: any) {
      alert('Erro ao remover: ' + error.message);
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
              onClick={() => handleDelete(member.id)}
              className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-3 flex items-center justify-center text-xl font-bold text-slate-900 dark:text-white uppercase">
              {member.first_name ? member.first_name.substring(0, 2) : 'U'}
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">{member.first_name} {member.last_name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{member.email}</p>
            {member.sectors?.name && (
              <span className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">
                {member.sectors.name}
              </span>
            )}
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
                  const msg = `Olá ${member.first_name}, você foi convidado para o Task Account! Finalize seu cadastro em: ${inviteLink}`;
                  navigator.clipboard.writeText(msg);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Remover setor?')) return;
    try {
      await supabase.from('sectors').delete().eq('id', id);
      setSectors(sectors.filter(s => s.id !== id));
    } catch (e) { }
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
          <div key={sector.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm group relative">
            <button
              onClick={() => handleDelete(sector.id)}
              className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={16} />
            </button>
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-slate-900 dark:text-white text-lg">{sector.name}</h4>
              {sector.cost_center && <span className="text-xs font-mono text-slate-500">CC: {sector.cost_center}</span>}
            </div>
            {sector.leader && <p className="text-sm text-slate-500 dark:text-slate-400">Líder: <span className="text-slate-900 dark:text-white">{sector.leader}</span></p>}
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

  const handleDelete = async (id: string) => {
    if (!confirm("Remover?")) return;
    await supabase.from('task_types').delete().eq('id', id);
    setTaskTypes(taskTypes.filter(t => t.id !== id));
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
          <div key={task.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm group relative">
            <button onClick={() => handleDelete(task.id)} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{task.name}</h4>
            <div className="space-y-1">
              {task.sectors?.name && <p className="text-xs text-slate-500 dark:text-slate-400">Setor: <span className="text-indigo-600 dark:text-indigo-400">{task.sectors?.name}</span></p>}
              {task.federative_entity && <p className="text-xs text-slate-500 dark:text-slate-400">Ente: <span className="text-emerald-600 dark:text-emerald-400">{task.federative_entity}</span></p>}
            </div>
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