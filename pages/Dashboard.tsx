
import React from 'react';
import { MetricCard, Card } from '../components/ui/Card';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  PlayCircle,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { UserRole } from '../types';

const dataTasks = [
  { name: 'Jan', Pendentes: 40, Concluidas: 24 },
  { name: 'Fev', Pendentes: 30, Concluidas: 13 },
  { name: 'Mar', Pendentes: 20, Concluidas: 58 },
  { name: 'Abr', Pendentes: 27, Concluidas: 39 },
  { name: 'Mai', Pendentes: 18, Concluidas: 48 },
  { name: 'Jun', Pendentes: 23, Concluidas: 38 },
];

const dataProductivity = [
  { name: 'Sem 1', Tarefas: 12 },
  { name: 'Sem 2', Tarefas: 19 },
  { name: 'Sem 3', Tarefas: 15 },
  { name: 'Sem 4', Tarefas: 28 },
];

interface DashboardProps {
  userProfile: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ userProfile }) => {
  const userRole = userProfile?.role || 'gestor';
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {userRole === 'gestor' ? 'Visão Geral do Escritório' : 'Minhas Atividades'}
          </p>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
          Última atualização: Hoje, 14:30
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Tarefas Concluídas"
          value="1,248"
          icon={<CheckCircle size={24} />}
          trend="+12% esse mês"
          color="emerald"
        />
        <MetricCard
          title="Em Andamento"
          value="45"
          icon={<PlayCircle size={24} />}
          trend="8 novas hoje"
          color="indigo"
        />
        <MetricCard
          title="Atrasadas"
          value="12"
          icon={<AlertTriangle size={24} />}
          trend="-2% que a média"
          color="rose"
        />
        <MetricCard
          title="Clientes Ativos"
          value="89"
          icon={<Briefcase size={24} />}
          trend="+3 novos clientes"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Tarefas por Mês" className="lg:col-span-2">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataTasks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.2} />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="Pendentes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Concluidas" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Produtividade Semanal">
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataProductivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#64748b" strokeOpacity={0.2} />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="Tarefas" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Próximos Vencimentos">
          <div className="space-y-4 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Fechamento Fiscal - Cliente ABC</p>
                    <p className="text-xs text-slate-500">Vence em 2 dias</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">Alta</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Atividades Recentes">
          <div className="space-y-4 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500"></div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">João Silva</span> concluiu a tarefa <span className="text-indigo-600 dark:text-indigo-400">DAS - 01/2026</span>
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Há 15 minutos</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
