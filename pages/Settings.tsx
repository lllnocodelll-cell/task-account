import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Users, Briefcase, List, Mail, Send, Calendar, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'equipe' | 'setores' | 'tipos' | 'calendario'>('equipe');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('equipe')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'equipe' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users size={18} /> Equipe
          </button>
          <button
            onClick={() => setActiveTab('setores')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'setores' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Briefcase size={18} /> Setores
          </button>
          <button
            onClick={() => setActiveTab('tipos')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'tipos' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <List size={18} /> Tipos de Tarefa
          </button>
          <button
            onClick={() => setActiveTab('calendario')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'calendario' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar size={18} /> Calendário
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'equipe' && <TeamSettings />}
          {activeTab === 'setores' && <SectorSettings />}
          {activeTab === 'tipos' && <TaskTypeSettings />}
          {activeTab === 'calendario' && <CalendarSettings />}
        </div>
      </div>
    </div>
  );
};

const TeamSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Adicionar Membro</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input label="Nome" placeholder="João" />
          <Input label="Sobrenome" placeholder="Silva" />
          <Input label="E-mail" placeholder="joao@empresa.com" type="email" />
          <Select 
            label="Setor"
            options={[{value: 1, label: 'Fiscal'}, {value: 2, label: 'Contábil'}]}
          />
          <Input label="Senha Inicial" type="password" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button>Cadastrar Membro</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 flex flex-col items-center text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-3 flex items-center justify-center text-xl font-bold text-slate-900 dark:text-white">
              JS
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">João Silva</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">joao.silva@email.com</p>
            <span className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">Fiscal</span>
            <Button size="sm" variant="secondary" icon={<Send size={14} />}>Reenviar Convite</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SectorSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Novo Setor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input label="Nome do Setor" />
          <Input label="Líder" />
          <Input label="Centro de Custo" />
        </div>
        <div className="mt-4 flex justify-end">
          <Button>Salvar Setor</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
             <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-slate-900 dark:text-white text-lg">Fiscal</h4>
                <span className="text-xs font-mono text-slate-500">CC: 001</span>
             </div>
             <p className="text-sm text-slate-500 dark:text-slate-400">Líder: <span className="text-slate-900 dark:text-white">Ana Souza</span></p>
          </div>
        ))}
      </div>
    </div>
  );
};

const TaskTypeSettings: React.FC = () => {
  return (
     <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Novo Tipo de Tarefa</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input label="Nome da Tarefa" />
          <Select 
            label="Setor Responsável"
            options={[{value: 1, label: 'Fiscal'}]}
          />
          <Select 
            label="Ente Federativo"
            options={[
              {value: 'mun', label: 'Municipal'},
              {value: 'est', label: 'Estadual'},
              {value: 'fed', label: 'Federal'},
              {value: 'out', label: 'Outro'},
            ]}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button>Salvar Tarefa</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-sm">
             <h4 className="font-semibold text-slate-900 dark:text-white mb-2">DAS</h4>
             <div className="space-y-1">
               <p className="text-xs text-slate-500 dark:text-slate-400">Setor: <span className="text-indigo-600 dark:text-indigo-400">Fiscal</span></p>
               <p className="text-xs text-slate-500 dark:text-slate-400">Ente: <span className="text-emerald-600 dark:text-emerald-400">Federal</span></p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CalendarSettings: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([
    { id: 1, date: `${year}-01-01`, name: 'Confraternização Universal', type: 'Nacional' },
    { id: 2, date: `${year}-02-12`, name: 'Carnaval', type: 'Facultativo' },
    { id: 3, date: `${year}-02-13`, name: 'Carnaval', type: 'Facultativo' },
    { id: 4, date: `${year}-03-29`, name: 'Sexta-feira Santa', type: 'Nacional' },
    { id: 5, date: `${year}-04-21`, name: 'Tiradentes', type: 'Nacional' },
    { id: 6, date: `${year}-05-01`, name: 'Dia do Trabalho', type: 'Nacional' },
    { id: 7, date: `${year}-05-30`, name: 'Corpus Christi', type: 'Facultativo' },
    { id: 8, date: `${year}-09-07`, name: 'Independência do Brasil', type: 'Nacional' },
    { id: 9, date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', type: 'Nacional' },
    { id: 10, date: `${year}-11-02`, name: 'Finados', type: 'Nacional' },
    { id: 11, date: `${year}-11-15`, name: 'Proclamação da República', type: 'Nacional' },
    { id: 12, date: `${year}-12-25`, name: 'Natal', type: 'Nacional' },
  ]);

  const handleDelete = (id: number) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  const sortedHolidays = [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Adicionar Feriado</h3>
              <p className="text-sm text-slate-500">Cadastre feriados nacionais, estaduais ou municipais para o controle de vencimentos.</p>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Input label="Data" type="date" />
            <Input label="Descrição" placeholder="Ex: Aniversário da Cidade" className="md:col-span-2" />
            <Select label="Tipo" options={[
                {value: 'nacional', label: 'Nacional'},
                {value: 'estadual', label: 'Estadual'},
                {value: 'municipal', label: 'Municipal'},
                {value: 'facultativo', label: 'Ponto Facultativo'},
            ]} />
         </div>
         <div className="mt-4 flex justify-end">
            <Button icon={<Calendar size={16} />}>Adicionar ao Calendário</Button>
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
                 const dateObj = new Date(h.date + 'T12:00:00'); // T12:00:00 to avoid timezone issues showing wrong day
                 const month = dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                 const day = dateObj.getDate();
                 const weekday = dateObj.toLocaleString('pt-BR', { weekday: 'long' });

                 return (
                   <div key={h.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border shadow-sm ${
                           h.type === 'Facultativo' 
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
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                h.type === 'Facultativo' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
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