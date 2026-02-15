
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Mail, Phone, MapPin, Camera, Shield, Key, Bell, Save, LogOut, Loader2, Briefcase } from 'lucide-react';
import { UserRole } from '../types';
import { supabase } from '../utils/supabaseClient';

interface ProfileProps {
   userRole?: UserRole;
   onProfileUpdate?: () => void;
}

interface UserProfile {
   id: string;
   full_name: string | null;
   role: string; // 'gestor' | 'operacional'
   job_title: string | null; // e.g. 'CEO', 'Contador'
   email: string | null;
   phone: string | null;
   location: string | null;
   avatar_url: string | null;
   org_name: string | null;
}

export const Profile: React.FC<ProfileProps> = ({ userRole = 'gestor', onProfileUpdate }) => {
   const [activeTab, setActiveTab] = useState('personal');
   const [loading, setLoading] = useState(true);
   const [updating, setUpdating] = useState(false);
   const [uploadingAvatar, setUploadingAvatar] = useState(false);
   const [profile, setProfile] = useState<UserProfile | null>(null);

   // File input ref
   const fileInputRef = useRef<HTMLInputElement>(null);

   // Personal Form States
   const [fullName, setFullName] = useState('');
   const [phone, setPhone] = useState('');
   const [location, setLocation] = useState('');
   const [orgName, setOrgName] = useState('');
   const [jobTitle, setJobTitle] = useState('');
   const [role, setRole] = useState<string>('gestor');

   // Security Form States
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmNewPassword, setConfirmNewPassword] = useState('');
   const [updatingPassword, setUpdatingPassword] = useState(false);

   useEffect(() => {
      fetchProfile();
   }, []);

   const fetchProfile = async () => {
      try {
         const { data: { user } } = await supabase.auth.getUser();

         if (!user) return;

         const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

         if (error) throw error;

         if (data) {
            setProfile({
               ...data,
               email: user.email || '',
            });
            setFullName(data.full_name || '');
            setPhone(data.phone || '');
            setLocation(data.location || '');
            setOrgName(data.org_name || '');
            setJobTitle(data.job_title || '');
            setRole(data.role || 'gestor');
         }
      } catch (error) {
         console.error('Error fetching profile:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleAvatarClick = () => {
      fileInputRef.current?.click();
   };

   const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
         setUploadingAvatar(true);

         if (!event.target.files || event.target.files.length === 0) {
            throw new Error('Você deve selecionar uma imagem para fazer upload.');
         }

         const file = event.target.files[0];
         const fileExt = file.name.split('.').pop();
         const fileName = `${profile?.id}/${Date.now()}.${fileExt}`;
         const filePath = `${fileName}`;

         const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

         if (uploadError) {
            throw uploadError;
         }

         const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

         const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', profile?.id);

         if (updateError) {
            throw updateError;
         }

         const newProfile = profile ? { ...profile, avatar_url: publicUrl } : null;
         setProfile(newProfile);

         if (onProfileUpdate) onProfileUpdate();

         alert('Foto de perfil atualizada!');
      } catch (error: any) {
         alert(error.message);
      } finally {
         setUploadingAvatar(false);
      }
   };

   const handleUpdateProfile = async () => {
      if (!profile) return;
      setUpdating(true);

      try {
         const updates = {
            full_name: fullName,
            phone,
            location,
            org_name: orgName,
            job_title: jobTitle,
            role: role,
         };

         const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profile.id)
            .select();

         if (error) {
            // Check for specific constraint violation
            if (error.code === '23514') { // check_violation
               throw new Error('O valor selecionado para o Nível de Acesso é inválido.');
            }
            throw error;
         }

         // Verification
         if (data && data.length > 0) {
            const updatedRecord = data[0];
            // Verify loosely
            if (updatedRecord.role !== role) {
               console.warn('Role update mismatch. Server returned:', updatedRecord.role);
            }
         }

         alert('Perfil atualizado com sucesso!');

         setProfile(prev => prev ? ({
            ...prev,
            ...updates
         }) : null);

         if (onProfileUpdate) onProfileUpdate();

      } catch (error: any) {
         console.error('Error updating profile:', error);
         alert(error.message || 'Erro ao atualizar perfil.');
      } finally {
         setUpdating(false);
      }
   };

   const handleUpdatePassword = async () => {
      if (!newPassword || !confirmNewPassword || !currentPassword) {
         alert('Por favor, preencha todos os campos de senha.');
         return;
      }

      if (newPassword !== confirmNewPassword) {
         alert('A nova senha e a confirmação não coincidem.');
         return;
      }

      if (newPassword.length < 6) {
         alert('A nova senha deve ter pelo menos 6 caracteres.');
         return;
      }

      setUpdatingPassword(true);

      try {
         // 1. Verify current password
         const { error: signInError } = await supabase.auth.signInWithPassword({
            email: profile?.email || '',
            password: currentPassword,
         });

         if (signInError) {
            throw new Error('Senha atual incorreta.');
         }

         // 2. Update password
         const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
         });

         if (updateError) {
            throw updateError;
         }

         alert('Senha atualizada com sucesso!');
         setCurrentPassword('');
         setNewPassword('');
         setConfirmNewPassword('');

      } catch (error: any) {
         console.error('Error updating password:', error);
         alert(error.message || 'Erro ao atualizar senha.');
      } finally {
         setUpdatingPassword(false);
      }
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meu Perfil</h1>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Identity Card */}
            <div className="lg:col-span-1 space-y-6">
               <Card className="flex flex-col items-center text-center p-8">
                  <input
                     type="file"
                     ref={fileInputRef}
                     onChange={uploadAvatar}
                     className="hidden"
                     accept="image/*"
                  />

                  <div
                     className="relative mb-4 group cursor-pointer"
                     onClick={handleAvatarClick}
                  >
                     <div className="w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center text-4xl text-white font-bold border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden relative">
                        {uploadingAvatar ? (
                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 text-white animate-spin" />
                           </div>
                        ) : null}

                        {profile?.avatar_url ? (
                           <img src={profile.avatar_url} alt={profile.full_name || 'User'} className="w-full h-full object-cover" />
                        ) : (
                           (profile?.full_name || 'U').substring(0, 2).toUpperCase()
                        )}
                     </div>
                     <div className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white border-2 border-white dark:border-slate-800 shadow-sm group-hover:scale-110 transition-transform">
                        <Camera size={16} />
                     </div>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.full_name || 'Usuário'}</h2>
                  <p className="text-slate-500 dark:text-slate-400 capitalize">{profile?.job_title || profile?.role || userRole}</p>
                  {profile?.org_name && (
                     <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">{profile.org_name}</p>
                  )}

                  <div className="w-full mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                     <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <Mail size={16} className="text-slate-400" /> {profile?.email}
                     </div>
                     {profile?.phone && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                           <Phone size={16} className="text-slate-400" /> {profile.phone}
                        </div>
                     )}
                     {profile?.location && (
                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                           <MapPin size={16} className="text-slate-400" /> {profile.location}
                        </div>
                     )}
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
                              <Input
                                 label="Nome Completo"
                                 value={fullName}
                                 onChange={(e) => setFullName(e.target.value)}
                              />
                              <Input
                                 label="Nome da Organização"
                                 value={orgName}
                                 onChange={(e) => setOrgName(e.target.value)}
                                 placeholder="Empresa LTDA"
                              />
                              <Input
                                 label="E-mail"
                                 value={profile?.email || ''}
                                 disabled
                                 className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                              />
                              <Input
                                 label="Telefone"
                                 value={phone}
                                 onChange={(e) => setPhone(e.target.value)}
                                 placeholder="(00) 00000-0000"
                              />

                              {/* Job Title - Free Text */}
                              <Input
                                 label="Cargo (Exibição no Perfil)"
                                 value={jobTitle}
                                 onChange={(e) => setJobTitle(e.target.value)}
                                 placeholder="Ex: CEO, Contador, Gerente"
                              />

                              {/* Access Role - Dropdown */}
                              <div className="flex flex-col gap-1.5">
                                 <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Nível de Acesso (Permissões)
                                 </label>
                                 <div className="relative">
                                    <select
                                       value={role}
                                       onChange={(e) => setRole(e.target.value)}
                                       className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white appearance-none"
                                    >
                                       <option value="gestor">Gestor (Acesso Completo)</option>
                                       <option value="operacional">Operacional (Acesso Restrito)</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                       <Briefcase size={16} className="text-slate-400" />
                                    </div>
                                 </div>
                                 <span className="text-xs text-slate-500">
                                    Define o acesso a áreas sensíveis como Configurações.
                                 </span>
                              </div>

                              <Input
                                 label="Cidade/Estado"
                                 value={location}
                                 onChange={(e) => setLocation(e.target.value)}
                                 placeholder="São Paulo, SP"
                              />
                           </div>
                           <div className="flex justify-end pt-4">
                              <Button
                                 icon={updating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                 onClick={handleUpdateProfile}
                                 disabled={updating}
                              >
                                 {updating ? 'Salvando...' : 'Salvar Alterações'}
                              </Button>
                           </div>
                        </div>
                     )}

                     {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                           {/* Security form content matches previous */}
                           <div className="space-y-4 max-w-md">
                              <Input
                                 label="Senha Atual"
                                 type="password"
                                 icon={<Key size={16} />}
                                 value={currentPassword}
                                 onChange={(e) => setCurrentPassword(e.target.value)}
                                 placeholder="Digite sua senha atual para confirmar"
                              />
                              <div className="pt-2"></div>
                              <Input
                                 label="Nova Senha"
                                 type="password"
                                 icon={<Key size={16} />}
                                 value={newPassword}
                                 onChange={(e) => setNewPassword(e.target.value)}
                                 placeholder="Mínimo 6 caracteres"
                              />
                              <Input
                                 label="Confirmar Nova Senha"
                                 type="password"
                                 icon={<Key size={16} />}
                                 value={confirmNewPassword}
                                 onChange={(e) => setConfirmNewPassword(e.target.value)}
                                 placeholder="Repita a nova senha"
                              />
                           </div>
                           <div className="flex justify-end pt-4">
                              <Button
                                 icon={updatingPassword ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                 onClick={handleUpdatePassword}
                                 disabled={updatingPassword}
                              >
                                 {updatingPassword ? 'Atualizando...' : 'Atualizar Segurança'}
                              </Button>
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
