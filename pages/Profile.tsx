import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Mail, Phone, MapPin, Camera, Shield, Key, Save, LogOut, Loader2, Briefcase, ScanFace, Building2, Upload, FileText, ExternalLink, HardDrive, ChevronDown } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { Modal } from '../components/ui/Modal';
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

   const { addToast } = useToast();

   // Modal Change Plan State
   const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
   const [selectedNewPlan, setSelectedNewPlan] = useState('');
   const [activeClientsCount, setActiveClientsCount] = useState(0);
   const [planChangeError, setPlanChangeError] = useState<string | null>(null);

   // Office Form States
   const [isSection1Expanded, setIsSection1Expanded] = useState(true);
   const [isSection2Expanded, setIsSection2Expanded] = useState(true);
   const [officeExists, setOfficeExists] = useState(false);
   const [officeCompanyName, setOfficeCompanyName] = useState('');
   const [officeDocument, setOfficeDocument] = useState('');
   const [officeConstitutionDate, setOfficeConstitutionDate] = useState('');
   const [officeZipCode, setOfficeZipCode] = useState('');
   const [officeStreet, setOfficeStreet] = useState('');
   const [officeStreetNumber, setOfficeStreetNumber] = useState('');
   const [officeComplement, setOfficeComplement] = useState('');
   const [officeNeighborhood, setOfficeNeighborhood] = useState('');
   const [officeCity, setOfficeCity] = useState('');
   const [officeState, setOfficeState] = useState('');
   const [officePlanName, setOfficePlanName] = useState('Bronze');
   const [officePlanValue, setOfficePlanValue] = useState(199.90);
   const [officeStorageLimitGb, setOfficeStorageLimitGb] = useState(50);
   const [officeStorageUsedBytes, setOfficeStorageUsedBytes] = useState(Math.round(12.4 * 1024 * 1024 * 1024)); // mock inicial realista
   const [officeContractUrl, setOfficeContractUrl] = useState('');
   const [loadingOffice, setLoadingOffice] = useState(false);
   const [savingOffice, setSavingOffice] = useState(false);
   const [uploadingContract, setUploadingContract] = useState(false);

   const contractInputRef = useRef<HTMLInputElement>(null);

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
      } catch (error) {
         console.error('Error fetching companies:', error);
      } finally {
         setLoadingCompanies(false);
      }
   };

   const fetchOfficeDetails = async (orgId: string) => {
      try {
         setLoadingOffice(true);
         const { data, error } = await (supabase as any)
            .from('office_details')
            .select('*')
            .eq('org_id', orgId)
            .maybeSingle();

         if (error) throw error;

         if (data) {
            setOfficeExists(true);
            setOfficeCompanyName(data.company_name || '');
            setOfficeDocument(data.document || '');
            setOfficeConstitutionDate(data.constitution_date || '');
            setOfficeZipCode(data.zip_code || '');
            setOfficeStreet(data.street || '');
            setOfficeStreetNumber(data.street_number || '');
            setOfficeComplement(data.complement || '');
            setOfficeNeighborhood(data.neighborhood || '');
            setOfficeCity(data.city || '');
            setOfficeState(data.state || '');
            setOfficePlanName(data.plan_name || 'Bronze');
            setOfficePlanValue(Number(data.plan_value || 199.90));
            setOfficeStorageLimitGb(data.storage_limit_gb || 50);
            setOfficeStorageUsedBytes(Number(data.storage_used_bytes || 0));
            setOfficeContractUrl(data.contract_url || '');
         } else {
            setOfficeExists(false);
            setOfficePlanName('Bronze');
            setOfficePlanValue(199.90);
            setOfficeStorageLimitGb(50);
            setOfficeStorageUsedBytes(Math.round(12.4 * 1024 * 1024 * 1024)); // mock inicial realista
         }
      } catch (err) {
         console.error('Error fetching office details:', err);
      } finally {
         setLoadingOffice(false);
      }
   };

   const fetchActiveClientsCount = async (orgId: string) => {
      try {
         const { count, error } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId)
            .eq('status', 'Ativo');

         if (!error && count !== null) {
            setActiveClientsCount(count);
         }
      } catch (err) {
         console.error('Error counting active clients:', err);
      }
   };

   const formatCnpjCpf = (value: string) => {
      const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      
      if (clean.length <= 11) {
         let formatted = clean;
         if (clean.length > 3) {
            formatted = `${clean.slice(0, 3)}.${clean.slice(3)}`;
         }
         if (clean.length > 6) {
            formatted = `${formatted.slice(0, 7)}.${formatted.slice(7)}`;
         }
         if (clean.length > 9) {
            formatted = `${formatted.slice(0, 11)}-${formatted.slice(11, 13)}`;
         }
         return formatted.slice(0, 14);
      } else {
         let formatted = clean;
         if (clean.length > 2) {
            formatted = `${clean.slice(0, 2)}.${clean.slice(2)}`;
         }
         if (clean.length > 5) {
            formatted = `${formatted.slice(0, 6)}.${formatted.slice(6)}`;
         }
         if (clean.length > 8) {
            formatted = `${formatted.slice(0, 10)}/${formatted.slice(10)}`;
         }
         if (clean.length > 12) {
            formatted = `${formatted.slice(0, 15)}-${formatted.slice(15, 17)}`;
         }
         return formatted.slice(0, 18);
      }
   };

   const validatePlanChange = (targetPlan: string) => {
      setSelectedNewPlan(targetPlan);
      setPlanChangeError(null);

      if (targetPlan === officePlanName) {
         return;
      }

      let clientLimit = 100;
      let storageLimitGb = 50;
      if (targetPlan === 'Prata') {
         clientLimit = 250;
         storageLimitGb = 100;
      } else if (targetPlan === 'Ouro') {
         clientLimit = 350;
         storageLimitGb = 120;
      } else if (targetPlan === 'Elite') {
         clientLimit = 999999;
         storageLimitGb = 500;
      }

      // Regra 1: Clientes ativos excedem limite do destino (Downgrade)
      if (activeClientsCount > clientLimit) {
         setPlanChangeError(`Seu escritório possui ${activeClientsCount} clientes ativos, mas o plano ${targetPlan} suporta no máximo ${clientLimit} clientes. Para prosseguir, inative clientes adicionais no CRM.`);
         return;
      }

      // Regra 2: Storage utilizado excede limite do destino (Downgrade)
      const storageUsedGb = officeStorageUsedBytes / (1024 * 1024 * 1024);
      if (storageUsedGb > storageLimitGb) {
         setPlanChangeError(`Seu escritório utiliza ${storageUsedGb.toFixed(2)} GB, mas o plano ${targetPlan} suporta no máximo ${storageLimitGb} GB. Para prosseguir, remova anexos ou arquivos.`);
         return;
      }
   };

   const handleConfirmPlanChange = async () => {
      if (planChangeError) {
         addToast('error', 'Alteração Bloqueada', 'Limites excedidos para o plano selecionado.');
         return;
      }

      let limitGb = 50;
      let val = 199.90;
      if (selectedNewPlan === 'Prata') {
         limitGb = 100;
         val = 349.90;
      } else if (selectedNewPlan === 'Ouro') {
         limitGb = 120;
         val = 499.90;
      } else if (selectedNewPlan === 'Elite') {
         limitGb = 500;
         val = 0;
      }

      try {
         if (officeExists) {
            const { error } = await (supabase as any)
               .from('office_details')
               .update({
                  plan_name: selectedNewPlan,
                  plan_value: val,
                  storage_limit_gb: limitGb,
                  updated_at: new Date().toISOString()
               })
               .eq('org_id', profile?.org_id);

            if (error) throw error;
         } else {
            const { error } = await (supabase as any)
               .from('office_details')
               .insert({
                  org_id: profile?.org_id,
                  company_name: officeCompanyName || 'Meu Escritório de Contabilidade',
                  plan_name: selectedNewPlan,
                  plan_value: val,
                  storage_limit_gb: limitGb,
                  storage_used_bytes: officeStorageUsedBytes
               });

            if (error) throw error;
            setOfficeExists(true);
            setOfficeCompanyName('Meu Escritório de Contabilidade');
         }

         setOfficePlanName(selectedNewPlan);
         setOfficePlanValue(val);
         setOfficeStorageLimitGb(limitGb);
         setIsPlanModalOpen(false);
         addToast('success', 'Plano Atualizado', `Plano alterado para ${selectedNewPlan} com sucesso!`);
      } catch (err: any) {
         console.error('Error changing plan:', err);
         addToast('error', 'Erro', 'Erro ao alterar plano: ' + err.message);
      }
   };

   const handleSaveOffice = async () => {
      if (!profile?.org_id) {
         addToast('error', 'Erro', 'Erro: Organização do perfil não identificada.');
         return;
      }
      if (!officeCompanyName.trim()) {
         addToast('warning', 'Razão Social Requerida', 'A Razão Social do escritório é obrigatória.');
         return;
      }
      setSavingOffice(true);

      let limitGb = 50;
      let val = 199.90;
      if (officePlanName === 'Prata') {
         limitGb = 100;
         val = 349.90;
      } else if (officePlanName === 'Ouro') {
         limitGb = 120;
         val = 499.90;
      } else if (officePlanName === 'Elite') {
         limitGb = 500;
         val = 0;
      }

      const payload = {
         org_id: profile.org_id,
         company_name: officeCompanyName,
         document: officeDocument,
         constitution_date: officeConstitutionDate || null,
         zip_code: officeZipCode,
         street: officeStreet,
         street_number: officeStreetNumber,
         complement: officeComplement,
         neighborhood: officeNeighborhood,
         city: officeCity,
         state: officeState,
         plan_name: officePlanName,
         plan_value: val,
         storage_limit_gb: limitGb,
         storage_used_bytes: Math.round(officeStorageUsedBytes),
         contract_url: officeContractUrl,
         updated_at: new Date().toISOString()
      };

      try {
         const { error } = await (supabase as any)
            .from('office_details')
            .upsert(payload, { onConflict: 'org_id' });

         if (error) throw error;
         
         addToast('success', 'Salvo com Sucesso', 'Dados do escritório salvos com sucesso!');
         setOfficeExists(true);
         setOfficePlanValue(val);
         setOfficeStorageLimitGb(limitGb);
      } catch (err: any) {
         console.error('Error saving office details:', err);
         addToast('error', 'Erro ao Salvar', err.message || 'Erro ao salvar dados do escritório.');
      } finally {
         setSavingOffice(false);
      }
   };

   const handleCepChange = async (cep: string) => {
      const cleanCep = cep.replace(/\D/g, '');
      setOfficeZipCode(cleanCep.slice(0, 8));
      
      if (cleanCep.length === 8) {
         try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await res.json();
            if (!data.erro) {
               setOfficeStreet(data.logradouro || '');
               setOfficeNeighborhood(data.bairro || '');
               setOfficeCity(data.localidade || '');
               setOfficeState(data.uf || '');
            }
         } catch (err) {
            console.error('Error fetching address by CEP:', err);
         }
      }
   };

   const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
         addToast('warning', 'Formato Inválido', 'Apenas arquivos PDF são permitidos.');
         return;
      }

      try {
         setUploadingContract(true);
         const fileExt = 'pdf';
         const fileName = `${profile?.org_id || 'office'}_contract_${Date.now()}.${fileExt}`;
         const filePath = `office_contracts/${fileName}`;

         const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, { upsert: true });

         if (uploadError) throw uploadError;

         const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

         setOfficeContractUrl(publicUrl);
         addToast('success', 'PDF Anexado', 'Contrato PDF enviado com sucesso!');
      } catch (err: any) {
         console.error('Erro no upload de contrato:', err);
         addToast('error', 'Erro de Envio', 'Erro ao fazer upload do contrato: ' + err.message);
      } finally {
         setUploadingContract(false);
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

            if (data.org_id) {
               fetchOfficeDetails(data.org_id);
               fetchActiveClientsCount(data.org_id);
            }
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

         addToast('success', 'Foto Atualizada', 'Foto de perfil atualizada com sucesso!');
      } catch (error: any) {
         addToast('error', 'Erro no Upload', error.message || 'Erro ao subir imagem.');
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
            if (error.code === '23514') {
               throw new Error('O valor selecionado para o Nível de Acesso é inválido.');
            }
            throw error;
         }

         addToast('success', 'Perfil Atualizado', 'Seus dados de perfil foram atualizados!');

         setProfile(prev => prev ? ({
            ...prev,
            ...updates
         }) : null);

         if (onProfileUpdate) onProfileUpdate();

      } catch (error: any) {
         console.error('Error updating profile:', error);
         addToast('error', 'Erro', error.message || 'Erro ao atualizar perfil.');
      } finally {
         setUpdating(false);
      }
   };

   const handleUpdatePassword = async () => {
      if (!newPassword || !confirmNewPassword || !currentPassword) {
         addToast('warning', 'Dados Incompletos', 'Por favor, preencha todos os campos de senha.');
         return;
      }

      if (newPassword !== confirmNewPassword) {
         addToast('warning', 'Divergência de Senha', 'A nova senha e a confirmação não coincidem.');
         return;
      }

      if (newPassword.length < 6) {
         addToast('warning', 'Senha Curta', 'A nova senha deve ter pelo menos 6 caracteres.');
         return;
      }

      setUpdatingPassword(true);

      try {
         const { error: signInError } = await supabase.auth.signInWithPassword({
            email: profile?.email || '',
            password: currentPassword,
         });

         if (signInError) {
            throw new Error('Senha atual incorreta.');
         }

         const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
         });

         if (updateError) {
            throw updateError;
         }

         addToast('success', 'Segurança Atualizada', 'Sua senha foi alterada com sucesso!');
         setCurrentPassword('');
         setNewPassword('');
         setConfirmNewPassword('');

      } catch (error: any) {
         console.error('Error updating password:', error);
         addToast('error', 'Erro', error.message || 'Erro ao atualizar senha.');
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
                     <button
                        onClick={() => setActiveTab('office')}
                        className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'office' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                     >
                        <Building2 size={18} /> Escritório
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

                              <Input
                                 label="Cargo (Exibição no Perfil)"
                                 value={jobTitle}
                                 onChange={(e) => setJobTitle(e.target.value)}
                                 placeholder="Ex: CEO, Contador, Gerente"
                              />

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

                     {activeTab === 'office' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                           {loadingOffice ? (
                              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                 <Loader2 size={24} className="animate-spin mb-2 text-indigo-500" />
                                 <span className="text-xs font-bold uppercase tracking-widest">Carregando dados do escritório...</span>
                              </div>
                           ) : (
                              <>
                                 <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 shadow-sm">
                                    <div 
                                       onClick={() => setIsSection1Expanded(!isSection1Expanded)}
                                       className="flex justify-between items-center px-6 py-4 bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 cursor-pointer transition-colors select-none"
                                    >
                                       <div>
                                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-350 flex items-center gap-2">
                                             <Building2 size={16} className="text-indigo-500" />
                                             Dados do Escritório
                                          </h3>
                                          <p className="text-[11px] text-slate-505 dark:text-slate-400 mt-0.5 font-normal">
                                             {profile?.role === 'gestor' 
                                                ? 'Informações cadastrais e endereço do seu escritório de contabilidade.' 
                                                : 'Informações de contato e localização do escritório que atende você.'}
                                          </p>
                                       </div>
                                       <ChevronDown 
                                          size={20} 
                                          className={`text-slate-400 transition-transform duration-300 ${isSection1Expanded ? 'rotate-180' : ''}`}
                                       />
                                    </div>

                                    {isSection1Expanded && (
                                       <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                          {profile?.role === 'gestor' ? (
                                             <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                   <Input
                                                      label="Razão Social"
                                                      value={officeCompanyName}
                                                      onChange={(e) => setOfficeCompanyName(e.target.value)}
                                                      placeholder="Contabilidade Exemplo LTDA"
                                                      required
                                                   />
                                                   <Input
                                                      label="CNPJ ou CPF"
                                                      value={officeDocument}
                                                      onChange={(e) => setOfficeDocument(formatCnpjCpf(e.target.value))}
                                                      placeholder="00.000.000/0001-00 ou 000.000.000-00"
                                                   />
                                                   <Input
                                                      label="Data de Constituição"
                                                      type="date"
                                                      value={officeConstitutionDate}
                                                      onChange={(e) => setOfficeConstitutionDate(e.target.value)}
                                                   />
                                                   <Input
                                                      label="CEP"
                                                      value={officeZipCode}
                                                      onChange={(e) => handleCepChange(e.target.value)}
                                                      placeholder="00000-000"
                                                   />
                                                </div>
                                                
                                                <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800/80 my-2" />
                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Endereço Completo</h4>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                   <div className="md:col-span-2">
                                                      <Input
                                                         label="Rua / Logradouro"
                                                         value={officeStreet}
                                                         onChange={(e) => setOfficeStreet(e.target.value)}
                                                         placeholder="Av. Paulista"
                                                      />
                                                   </div>
                                                   <Input
                                                      label="Número"
                                                      value={officeStreetNumber}
                                                      onChange={(e) => setOfficeStreetNumber(e.target.value)}
                                                      placeholder="123"
                                                   />
                                                   <Input
                                                      label="Complemento"
                                                      value={officeComplement}
                                                      onChange={(e) => setOfficeComplement(e.target.value)}
                                                      placeholder="Apto 45, Bloco B"
                                                   />
                                                   <Input
                                                      label="Bairro"
                                                      value={officeNeighborhood}
                                                      onChange={(e) => setOfficeNeighborhood(e.target.value)}
                                                      placeholder="Centro"
                                                   />
                                                   <div className="grid grid-cols-2 gap-4">
                                                      <Input
                                                         label="Cidade"
                                                         value={officeCity}
                                                         onChange={(e) => setOfficeCity(e.target.value)}
                                                         placeholder="São Paulo"
                                                      />
                                                      <Input
                                                         label="Estado"
                                                         value={officeState}
                                                         onChange={(e) => setOfficeState(e.target.value)}
                                                         placeholder="SP"
                                                      />
                                                   </div>
                                                </div>

                                                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                                                   <Button
                                                      icon={savingOffice ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                      onClick={handleSaveOffice}
                                                      disabled={savingOffice}
                                                   >
                                                      {savingOffice ? 'Salvando Escritório...' : 'Salvar Dados do Escritório'}
                                                   </Button>
                                                </div>
                                             </div>
                                          ) : (
                                             <div className="space-y-4">
                                                {!officeExists ? (
                                                   <p className="text-sm text-slate-500 dark:text-slate-400 italic">As informações do escritório ainda não foram preenchidas pelo administrador.</p>
                                                ) : (
                                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                      <div className="space-y-4">
                                                         <div>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-xs">Razão Social</span>
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{officeCompanyName}</span>
                                                         </div>
                                                         <div>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-xs">Documento (CNPJ/CPF)</span>
                                                            <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{officeDocument || 'Não informado'}</span>
                                                         </div>
                                                         {officeConstitutionDate && (
                                                            <div>
                                                               <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-xs">Data de Constituição</span>
                                                               <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                  {new Date(officeConstitutionDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                               </span>
                                                            </div>
                                                         )}
                                                      </div>
                                                      <div className="space-y-4">
                                                         <div>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-xs">Endereço</span>
                                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                                                               {officeStreet}{officeStreetNumber ? `, nº ${officeStreetNumber}` : ''}
                                                               {officeComplement ? ` - ${officeComplement}` : ''}
                                                            </span>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                                                               {officeNeighborhood ? `${officeNeighborhood}, ` : ''}{officeCity} - {officeState}
                                                            </span>
                                                            {officeZipCode && (
                                                               <span className="text-xs font-mono text-slate-450 block mt-0.5">CEP: {officeZipCode}</span>
                                                            )}
                                                         </div>
                                                      </div>
                                                   </div>
                                                )}
                                             </div>
                                          )}
                                       </div>
                                    )}
                                 </div>

                                 <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 shadow-sm">
                                    <div 
                                       onClick={() => setIsSection2Expanded(!isSection2Expanded)}
                                       className="flex justify-between items-center px-6 py-4 bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 cursor-pointer transition-colors select-none"
                                    >
                                       <div>
                                          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-350 flex items-center gap-2">
                                             <HardDrive size={16} className="text-indigo-500" />
                                             Planos & Contratação
                                          </h3>
                                          <p className="text-[11px] text-slate-505 dark:text-slate-400 mt-0.5 font-normal">
                                             {profile?.role === 'gestor' 
                                                ? 'Dados da sua assinatura do sistema Task Account, consumo de espaço e contrato.' 
                                                : 'Dados contratuais e espaço disponibilizado.'}
                                          </p>
                                       </div>
                                       <ChevronDown 
                                          size={20} 
                                          className={`text-slate-400 transition-transform duration-300 ${isSection2Expanded ? 'rotate-180' : ''}`}
                                       />
                                    </div>

                                    {isSection2Expanded && (
                                       <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between gap-4">
                                                <div>
                                                   <div className="flex justify-between items-start">
                                                      <div>
                                                         <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-xs">Plano Atual</span>
                                                         <span className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-sky-400 bg-clip-text text-transparent">{officePlanName}</span>
                                                      </div>
                                                      <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-wide">
                                                         Assinatura Ativa
                                                      </span>
                                                   </div>

                                                   <div className="mt-4 flex justify-between items-end">
                                                      <div>
                                                         <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-xs">Valor Mensal</span>
                                                         <span className="text-xl font-bold text-slate-900 dark:text-white">
                                                            {officePlanName === 'Elite' ? 'Sob Consulta' : `R$ ${officePlanValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                         </span>
                                                      </div>
                                                      {profile?.role === 'gestor' && (
                                                         <button
                                                            onClick={() => {
                                                               setSelectedNewPlan(officePlanName);
                                                               setPlanChangeError(null);
                                                               setIsPlanModalOpen(true);
                                                            }}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
                                                         >
                                                            Alterar Plano / Upgrade
                                                         </button>
                                                      )}
                                                   </div>
                                                </div>

                                                <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-4">
                                                   <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 text-xs">Contrato de Prestação de Serviços</span>
                                                   {officeContractUrl ? (
                                                      <div className="flex items-center gap-3">
                                                         <a
                                                            href={officeContractUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                         >
                                                            <FileText size={14} /> Ver Contrato (PDF) <ExternalLink size={12} />
                                                         </a>
                                                         {profile?.role === 'gestor' && (
                                                            <button
                                                               onClick={() => contractInputRef.current?.click()}
                                                               className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                                            >
                                                               Substituir PDF
                                                            </button>
                                                         )}
                                                      </div>
                                                   ) : (
                                                      <div>
                                                         <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-2">Contrato em formato PDF ainda não anexado.</p>
                                                         {profile?.role === 'gestor' && (
                                                            <button
                                                               onClick={() => contractInputRef.current?.click()}
                                                               className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                                            >
                                                               <Upload size={14} /> Anexar PDF do Contrato
                                                            </button>
                                                         )}
                                                      </div>
                                                   )}
                                                   
                                                   <input
                                                      type="file"
                                                      ref={contractInputRef}
                                                      onChange={handleContractUpload}
                                                      className="hidden"
                                                      accept="application/pdf"
                                                   />
                                                   {uploadingContract && (
                                                      <span className="text-xs text-indigo-500 flex items-center gap-1.5 mt-2 font-medium">
                                                         <Loader2 size={12} className="animate-spin" /> Enviando PDF do contrato...
                                                      </span>
                                                   )}
                                                </div>
                                             </div>

                                             <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
                                                <div>
                                                   <div className="flex justify-between items-center mb-3">
                                                      <div>
                                                         <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-xs">Armazenamento do Storage</span>
                                                         <span className="text-base font-bold text-slate-900 dark:text-white">Uso de Dados</span>
                                                      </div>
                                                      <HardDrive size={20} className="text-slate-400" />
                                                   </div>

                                                   <div className="space-y-2 mt-4">
                                                      <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative border border-slate-300/30 dark:border-slate-700/30">
                                                         <div 
                                                            className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-500"
                                                            style={{ 
                                                               width: `${Math.min(
                                                                  100, 
                                                                  (officeStorageUsedBytes / (officeStorageLimitGb * 1024 * 1024 * 1024)) * 100
                                                               )}%` 
                                                            }}
                                                         />
                                                      </div>
                                                      <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                         <span>{(officeStorageUsedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB utilizados</span>
                                                         <span>{officeStorageLimitGb} GB totais</span>
                                                      </div>
                                                   </div>

                                                   <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 leading-normal text-xs font-normal">
                                                      * Backup por 5 anos incluso na sua licença contábil. Cobrança adicional de R$ 9,99 para cada 1GB excedente de armazenamento.
                                                   </p>
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </>
                           )}
                        </div>
                     )}

                     <Modal
                        isOpen={isPlanModalOpen}
                        onClose={() => setIsPlanModalOpen(false)}
                        title="Alterar Plano Contratado"
                        size="lg"
                        footer={
                           <div className="flex gap-3">
                              <button
                                 onClick={() => setIsPlanModalOpen(false)}
                                 className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors border border-slate-300/50 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 cursor-pointer"
                              >
                                 Cancelar
                              </button>
                              <button
                                 onClick={handleConfirmPlanChange}
                                 disabled={!!planChangeError || selectedNewPlan === officePlanName}
                                 className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                    !!planChangeError || selectedNewPlan === officePlanName
                                       ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                                       : selectedNewPlan === 'Elite' || selectedNewPlan === 'Ouro'
                                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                 }`}
                              >
                                 {selectedNewPlan === officePlanName 
                                    ? 'Plano Atual' 
                                    : (selectedNewPlan === 'Bronze' || (selectedNewPlan === 'Prata' && officePlanName === 'Ouro')) 
                                       ? 'Confirmar Downgrade' 
                                       : 'Confirmar Upgrade'}
                              </button>
                           </div>
                        }
                     >
                        <div className="space-y-6">
                           <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                                 Escolha o plano de destino. Se for um downgrade, o sistema validará os limites de clientes cadastrados e de armazenamento contratado.
                              </p>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[
                                 { name: 'Bronze', limit: 100, storage: 50, price: 199.90, desc: 'Até 100 clientes | 50GB' },
                                 { name: 'Prata', limit: 250, storage: 100, price: 349.90, desc: 'Até 250 clientes | 100GB' },
                                 { name: 'Ouro', limit: 350, storage: 120, price: 499.90, desc: 'Até 350 clientes | 120GB' },
                                 { name: 'Elite', limit: 999999, storage: 500, price: 0, desc: 'Clientes & Espaço sob demanda' }
                              ].map((p) => {
                                 const isCurrent = p.name === officePlanName;
                                 const isSelected = p.name === selectedNewPlan;
                                 
                                 let cardStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950';
                                 if (isCurrent) cardStyle = 'border-indigo-500/80 bg-indigo-50/10 dark:bg-indigo-500/5 ring-1 ring-indigo-500/30';
                                 else if (isSelected) cardStyle = 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-500/5 ring-1 ring-emerald-500/30';

                                 return (
                                    <div
                                       key={p.name}
                                       onClick={() => validatePlanChange(p.name)}
                                       className={`p-4 border rounded-2xl cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition-all flex flex-col justify-between ${cardStyle}`}
                                    >
                                       <div className="flex justify-between items-start">
                                          <div>
                                             <span className="font-black text-sm text-slate-900 dark:text-white block">{p.name}</span>
                                             <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-normal">{p.desc}</span>
                                          </div>
                                          {isCurrent && (
                                             <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-wider shrink-0">
                                                Atual
                                             </span>
                                          )}
                                       </div>
                                       <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-850 flex justify-between items-baseline">
                                          <span className="text-xs text-slate-400 font-normal">Mensalidade</span>
                                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                             {p.price === 0 ? 'Sob Consulta' : `R$ ${p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                          </span>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>

                           {planChangeError ? (
                              <div className="p-4 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 rounded-xl flex items-start gap-3 text-rose-800 dark:text-rose-400 text-xs leading-relaxed animate-in fade-in font-normal">
                                 <span className="font-bold text-xs shrink-0">⚠️ Limite Excedido:</span>
                                 <span>{planChangeError}</span>
                              </div>
                           ) : (
                              selectedNewPlan !== officePlanName && selectedNewPlan && (
                                 <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-xl flex items-start gap-3 text-emerald-800 dark:text-emerald-400 text-xs leading-relaxed animate-in fade-in font-normal">
                                    <span className="font-bold text-xs shrink-0">✨ Autorizado:</span>
                                    <span>
                                       {selectedNewPlan === 'Elite' || (officePlanName === 'Bronze' || (officePlanName === 'Prata' && selectedNewPlan === 'Ouro'))
                                          ? `Upgrade disponível! Os limites do seu escritório serão expandidos para acomodar as novas demandas de serviço.`
                                          : `Downgrade disponível! Seu escritório cumpre todas as regras e limites do plano de destino.`
                                       }
                                    </span>
                                 </div>
                              )
                           )}
                        </div>
                     </Modal>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};
