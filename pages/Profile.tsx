
import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Mail, Phone, MapPin, Camera, Shield, Key, Bell, Save, LogOut } from 'lucide-react';
import { UserRole } from '../types';

interface ProfileProps {
  userRole?: UserRole;
}

export const Profile: React.FC<ProfileProps> = ({ userRole = 'gestor' }) => {
  const [activeTab, setActiveTab] = useState('personal');

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meu Perfil</h1>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Identity Card */}
          <div className="lg:col-span-1 space-y-6">
             <Card className="flex flex-col items-center text-center p-8">
                <div className="relative mb-4 group cursor-pointer">
                   <div className="w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center text-4xl text-white font-bold border-4 border-white dark:border-slate-800 shadow-lg">
                      AU
                   </div>
                   <div className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white border-2 border-white dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform">
                      <Camera size={16} />
                   </div>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin User</h2>
                <p className="text-slate-500 dark:text-slate-400 capitalize">{userRole} &bull; Diretoria</p>
                
                <div className="w-full mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                   <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Mail size={16} className="text-slate-400" /> admin@taskaccount.com
                   </div>
                   <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Phone size={16} className="text-slate-400" /> (11) 99999-9999
                   </div>
                   <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <MapPin size={16} className="text-slate-400" /> São Paulo, SP
                   </div>
                </div>
             </Card>
          </div>

          {/* Right Column: Settings Tabs */}
          <div className="lg:col-span-2">
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm min-h-[500px]">
                <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                   <button 
                      onClick={() => setActiveTab('personal')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'personal' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                   >
                      <User size={18} /> Dados Pessoais
                   </button>
                   <button 
                      onClick={() => setActiveTab('security')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'security' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                   >
                      <Shield size={18} /> Segurança
                   </button>
                   <button 
                      onClick={() => setActiveTab('notifications')}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'notifications' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                   >
                      <Bell size={18} /> Notificações
                   </button>
                </div>
                
                <div className="p-6">
                   {activeTab === 'personal' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label="Nome" defaultValue="Admin" />
                            <Input label="Sobrenome" defaultValue="User" />
                            <Input label="E-mail" defaultValue="admin@taskaccount.com" />
                            <Input label="Telefone" defaultValue="(11) 99999-9999" />
                            <Input label="Cargo" defaultValue={userRole === 'gestor' ? 'Gestor' : 'Analista'} disabled className="bg-slate-100 dark:bg-slate-800" />
                            <Input label="Setor" defaultValue="Diretoria" disabled className="bg-slate-100 dark:bg-slate-800" />
                         </div>
                         <div className="flex justify-end pt-4">
                            <Button icon={<Save size={18} />}>Salvar Alterações</Button>
                         </div>
                      </div>
                   )}
                   
                   {activeTab === 'security' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="space-y-4 max-w-md">
                            <Input label="Senha Atual" type="password" icon={<Key size={16} />} />
                            <Input label="Nova Senha" type="password" icon={<Key size={16} />} />
                            <Input label="Confirmar Nova Senha" type="password" icon={<Key size={16} />} />
                         </div>
                         <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Autenticação de Dois Fatores (2FA)</h3>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                               <div>
                                  <p className="font-medium text-slate-900 dark:text-white">Proteger minha conta</p>
                                  <p className="text-xs text-slate-500">Adiciona uma camada extra de segurança ao fazer login.</p>
                               </div>
                               <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-slate-200 dark:bg-slate-700 cursor-pointer">
                                  <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm"></span>
                               </div>
                            </div>
                         </div>
                         <div className="flex justify-end pt-4">
                            <Button icon={<Save size={18} />}>Atualizar Segurança</Button>
                         </div>
                      </div>
                   )}

                   {activeTab === 'notifications' && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div className="space-y-4">
                            {[
                               { title: "Novas tarefas atribuídas", desc: "Receba um e-mail quando uma tarefa for atribuída a você." },
                               { title: "Prazos de vencimento", desc: "Alertas sobre tarefas próximas do vencimento." },
                               { title: "Atualizações de sistema", desc: "Novidades sobre funcionalidades do Task Account." },
                            ].map((item, idx) => (
                               <div key={idx} className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                                  <div>
                                     <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                                     <p className="text-xs text-slate-500">{item.desc}</p>
                                  </div>
                                  <div className="relative inline-block w-11 h-6 transition duration-200 ease-in-out rounded-full bg-indigo-600 cursor-pointer">
                                     <span className="translate-x-5 absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm"></span>
                                  </div>
                               </div>
                            ))}
                         </div>
                         <div className="flex justify-end pt-4">
                            <Button icon={<Save size={18} />}>Salvar Preferências</Button>
                         </div>
                      </div>
                   )}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};
