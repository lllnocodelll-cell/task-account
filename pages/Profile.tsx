
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Mail, Phone, MapPin, Camera, Shield, Key, Save, LogOut, Loader2, Briefcase, ScanFace, Building2 } from 'lucide-react';
import { UserRole, TAX_REGIME_LABELS } from '../types';
import { supabase } from '../utils/supabaseClient';

interface ProfileProps {
   userProfile: any;
   onProfileUpdate?: () => void;
}

interface UserProfile {
   id: string;
   full_name: string | null;
   role: string; // 'gestor' | 'operacional' | 'cliente'
   job_title: string | null; // e.g. 'CEO', 'Contador'
   email: string | null;
   phone: string | null;
   location: string | null;
   avatar_url: string | null;
   org_name: string | null;
   org_id?: string;
   client_ids?: string[];
}

export const Profile: React.FC<ProfileProps> = ({ userProfile, onProfileUpdate }) => {
   const [activeTab, setActiveTab] = useState('personal');
   const [loading, setLoading] = useState(true);
   const [updating, setUpdating] = useState(false);
   const [uploadingAvatar, setUploadingAvatar] = useState(false);
   const [profile, setProfile] = useState<UserProfile | null>(null);

   const [companies, setCompanies] = useState<any[]>([]);
   const [loadingCompanies, setLoadingCompanies] = useState(false);

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

   const fetchCompanies = async (clientIds: string[]) => {
      if (!clientIds || clientIds.length === 0) return;
      try {
         setLoadingCompanies(true);
         const { data, error } = await supabase
            .from('clients')
            .select('id, company_name, trade_name, document, city, state, establishment_type, client_tax_regime_history(*), status')
            .in('id', clientIds);

         if (error) throw error;

         const mappedCompanies = (data || []).map(c => {
            const history = c.client_tax_regime_history || [];
            const currentRegime = history.find((h: any) => !h.end_date);
            return {
               ...c,
               tax_regime: currentRegime?.regime || null
            };
         });

         setCompanies(mappedCompanies);
      } catch (err) {
         console.error('Error fetching companies:', err);
      } finally {
         setLoadingCompanies(false);
      }
   };

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
            let finalProfile: UserProfile = {
               ...data,
               email: user.email || '',
               client_ids: []
            };

            // Buscar client_ids e sector_id da tabela members usando o email
            const { data: memberInfo } = await supabase
               .from('members')
               .select('client_ids')
               .eq('email', user.email || '')
               .maybeSingle();

            if (memberInfo && memberInfo.client_ids && memberInfo.client_ids.length > 0) {
               finalProfile.client_ids = memberInfo.client_ids;
               fetchCompanies(memberInfo.client_ids);
            } else if (userProfile?.client_ids && userProfile.client_ids.length > 0) {
               finalProfile.client_ids = userProfile.client_ids;
               fetchCompanies(userProfile.client_ids);
            }

            setProfile(finalProfile);
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
         <div className="flex items-center gap-3 mb-2 md:mb-0">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
               <ScanFace size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col">
               <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                  Meu Perfil
               </h1>
               <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            </div>
         </div>

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
                  <p className="text-slate-500 dark:text-slate-400 capitalize">{profile?.job_title || profile?.role || 'Usuário'}</p>
                  {profile?.role !== 'cliente' && profile?.org_name && (
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
                     {profile?.client_ids && profile.client_ids.length > 0 && (
                        <button
                           onClick={() => setActiveTab('companies')}
                           className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'companies' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                           <Building2 size={18} /> Minhas Empresas
                        </button>
                     )}
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
                              {profile?.role !== 'cliente' && (
                                 <Input
                                    label="Nome da Organização"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
                                    placeholder="Empresa LTDA"
                                 />
                              )}
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
                              {profile?.role !== 'cliente' && (
                                 <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                       Nível de Acesso (Permissões)
                                    </label>
                                    <div className="relative">
                                       <select
                                          value={role}
                                          onChange={(e) => setRole(e.target.value)}
                                          disabled={profile?.role === 'operacional'}
                                          className={`w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 dark:text-white appearance-none ${profile?.role === 'operacional' ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900' : ''}`}
                                       >
                                          <option value="gestor">Gestor (Acesso Completo)</option>
                                          <option value="operacional">Operacional (Acesso Restrito)</option>
                                       </select>
                                       <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                          <Briefcase size={16} className="text-slate-400" />
                                       </div>
                                    </div>
                                    {profile?.role === 'operacional' ? (
                                       <span className="text-xs text-amber-600 dark:text-amber-500">
                                          Usuários operacionais não podem alterar o próprio nível de acesso. Contate um gestor.
                                       </span>
                                    ) : (
                                       <span className="text-xs text-slate-500">
                                          Define o acesso a áreas sensíveis como Configurações.
                                       </span>
                                    )}
                                 </div>
                              )}

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

                     {activeTab === 'companies' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                           <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white">Empresas Vinculadas</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                 Estas são as empresas associadas ao seu perfil de cliente para acesso a guias e relatórios.
                              </p>
                           </div>

                           {loadingCompanies ? (
                              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                 <Loader2 size={24} className="animate-spin mb-2 text-indigo-500" />
                                 <span className="text-xs font-bold uppercase tracking-widest">Carregando empresas...</span>
                              </div>
                           ) : companies.length === 0 ? (
                              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                 <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma empresa vinculada ao seu perfil.</p>
                              </div>
                           ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {companies.map((company) => {
                                    const statusStyle = company.status === 'Ativo'
                                       ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
                                       : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20';
                                    
                                    const typeStyle = (company.establishment_type || '').toLowerCase() === 'matriz'
                                       ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20'
                                       : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20';

                                    const regimeLabel = TAX_REGIME_LABELS[company.tax_regime || ''] || company.tax_regime || 'Não informado';

                                    return (
                                       <div 
                                          key={company.id} 
                                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-4 group"
                                       >
                                          <div className="space-y-3">
                                             {/* Cabeçalho do Card */}
                                             <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                   <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight truncate" title={company.company_name}>
                                                      {company.company_name}
                                                   </h4>
                                                   {company.trade_name && (
                                                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate mt-0.5" title={company.trade_name}>
                                                         {company.trade_name}
                                                      </p>
                                                   )}
                                                </div>
                                                
                                                {/* Badges de Status e Tipo */}
                                                <div className="flex gap-1 shrink-0">
                                                   {company.establishment_type && (
                                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${typeStyle}`}>
                                                         {company.establishment_type}
                                                      </span>
                                                   )}
                                                   <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusStyle}`}>
                                                      {company.status || 'Ativo'}
                                                   </span>
                                                </div>
                                             </div>

                                             <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800/80" />

                                             {/* Detalhes da Empresa */}
                                             <div className="grid grid-cols-2 gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                <div className="flex flex-col gap-0.5">
                                                   <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">CNPJ</span>
                                                   <span className="font-mono text-slate-800 dark:text-slate-200 font-bold select-all">
                                                      {company.document || 'Não cadastrado'}
                                                   </span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                   <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Localidade</span>
                                                   <span className="text-slate-800 dark:text-slate-200 font-bold truncate">
                                                      {company.city && company.state ? `${company.city} - ${company.state}` : company.city || company.state || 'Não informado'}
                                                   </span>
                                                </div>
                                             </div>
                                          </div>

                                          {/* Rodapé com Regime Tributário */}
                                          <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                             <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Regime Tributário</span>
                                             <span className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] uppercase font-black tracking-wider shadow-sm">
                                                {regimeLabel}
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
