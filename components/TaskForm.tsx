import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Save,
  Calendar,
  AlertCircle,
  Upload,
  File,
  Trash2,
  Repeat,
  ListChecks,
  ChevronRight,
  FileText,
  Building2,
  Layers,
  Clock,
  Zap,
  Play,
  FileCheck2,
  Plus,
  GitCompareArrows,
  SquarePen
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Select, SearchableSelect, Toggle, GroupedSelect } from './ui/Input';
import { Modal } from './ui/Modal';
import { Tooltip } from './ui/Tooltip';
import { Notification, NotificationType } from './ui/Notification';
import { Task, TaskStatus, Priority, Client, TAX_REGIME_GROUPS } from '../types';
import { supabase } from '../utils/supabaseClient';
import { calculateAdjustedDate } from '../utils/dateUtils';

interface ClientConfig {
  taxRegime: string;
  regimeRegistro: string;
  semMovimento: boolean;
  selectedAnnexes: string[];
  excedeuSublimite: boolean;
  fatorR: boolean;
  notifiedExclusion: boolean;
  observation: string;
  uploadedFiles: File[];
  existingAttachments: { name: string; size: number; url?: string; storage_path?: string; id?: string }[];
  workflows: any[];
}

const SIMPLES_ANNEXES = ['Anexo I', 'Anexo II', 'Anexo III', 'Anexo IV', 'Anexo V', 'Nulo'];

export default function TaskForm({ onBack, initialData, clients, userProfile }: { onBack: () => void; initialData?: Task | null; clients: Client[]; userProfile: any }) {
  const isEditing = !!initialData;

  // Selected Clients State
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    initialData?.clientName ? [initialData.clientName] : []
  );
  const [activeClientId, setActiveClientId] = useState<string | null>(
    initialData?.clientName || null
  );

  // Default config for new clients
  const createDefaultConfig = (data?: Task | null, clientName?: string): ClientConfig => {
    let defaultRegime = data?.taxRegime;
    
    if (!defaultRegime && clientName) {
      const client = clients.find(c => c.companyName === clientName);
      if (client?.tax_regime) {
        defaultRegime = client.tax_regime;
      }
    }

    return {
      taxRegime: defaultRegime || 'simples',
      regimeRegistro: data?.registrationRegime || 'competencia',
      semMovimento: data?.noMovement || false,
      selectedAnnexes: data?.selectedAnnexes || [],
      excedeuSublimite: data?.exceededSublimit || false,
      fatorR: data?.factorR || false,
      notifiedExclusion: data?.notifiedExclusion || false,
      observation: data?.observation || '',
      uploadedFiles: [],
      existingAttachments: data?.attachments || [],
      workflows: data?.workflows || []
    };
  };

  // Client Configurations Map
  const [clientConfigs, setClientConfigs] = useState<Record<string, ClientConfig>>(
    initialData?.clientName
      ? { [initialData.clientName]: createDefaultConfig(initialData, initialData.clientName) }
      : {}
  );

  const [activeTab, setActiveTab] = useState('simples');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Data State
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isMandatoryWf, setIsMandatoryWf] = useState(true);
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: NotificationType }>({ show: false, message: '', type: 'info' });

  const showNotify = (message: string, type: NotificationType = 'info') => {
    setNotification({ show: true, message, type });
  };

  // Recurrence Update Flow State
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [updateFutureTasks, setUpdateFutureTasks] = useState<boolean | null>(null);

  // Multi-task State
  const [pendingTasks, setPendingTasks] = useState<any[]>(
    initialData ? [{
      id: initialData.id,
      taskName: initialData.taskName,
      sector: initialData.sector,
      responsible: initialData.responsible,
      competence: initialData.competence,
      vencimento: initialData.dueDate || '',
      vencimentoVariavel: initialData.variableAdjustment || 'nao_aplica',
      recurrence: initialData.recurrence || '',
      months: initialData.recurrenceMonths || [],
      priority: initialData.priority || Priority.MEDIA
    }] : []
  );

  const [tempTask, setTempTask] = useState({
    taskTypeId: '',
    taskName: '',
    sector: '',
    responsible: '',
    priority: Priority.MEDIA,
    competence: new Date().toISOString().substring(0, 7), // YYYY-MM
    vencimento: '',
    vencimentoVariavel: 'nao_aplica',
    recurrence: '',
    months: [] as number[],
    repetitions: 1,
  });

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchFormData();
  }, []);

  useEffect(() => {
    if (updateFutureTasks !== null) {
      handleSaveAll();
    }
  }, [updateFutureTasks]);

  const fetchFormData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [taskTypesRes, sectorsRes, membersRes, clientsRes, holidaysRes] = await Promise.all([
        supabase.from('task_types').select('*').eq('org_id', userProfile.org_id),
        supabase.from('sectors').select('*').eq('org_id', userProfile.org_id),
        supabase.from('members')
          .select('*')
          .eq('org_id', userProfile.org_id)
          .not('sector_id', 'is', null),
        supabase.from('clients').select('*').eq('org_id', userProfile.org_id).eq('status', 'Ativo'),
        supabase.from('holidays').select('date').eq('org_id', userProfile.org_id)
      ]);

      if (taskTypesRes.data) setTaskTypes(taskTypesRes.data);
      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (membersRes.data) setMembers(membersRes.data);
      if (holidaysRes.data) setHolidayDates(holidaysRes.data.map((h: any) => h.date));
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleAnnex = (annex: string) => {
    if (!activeClientId) return;
    setClientConfigs(prev => {
      const config = prev[activeClientId];
      const newAnnexes = config.selectedAnnexes.includes(annex)
        ? config.selectedAnnexes.filter(x => x !== annex)
        : [...config.selectedAnnexes, annex];
      return { ...prev, [activeClientId]: { ...config, selectedAnnexes: newAnnexes } };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && activeClientId) {
      const newFiles = Array.from(e.target.files);
      setClientConfigs(prev => ({
        ...prev,
        [activeClientId]: {
          ...prev[activeClientId],
          uploadedFiles: [...prev[activeClientId].uploadedFiles, ...newFiles]
        }
      }));
    }
  };

  const removeFile = (index: number) => {
    if (!activeClientId) return;
    setClientConfigs(prev => ({
      ...prev,
      [activeClientId]: {
        ...prev[activeClientId],
        uploadedFiles: prev[activeClientId].uploadedFiles.filter((_, i) => i !== index)
      }
    }));
  };

  const handleDeleteExistingAttachment = async (attachment: any, index: number) => {
    if (!initialData || !activeClientId) return;
    
    if (!confirm('Deseja realmente excluir este arquivo? Ele será marcado como excluído no portal do cliente.')) return;
    
    setLoadingData(true);
    try {
      // Atualiza o status no client portal
      await supabase.from('client_documents' as any)
        .update({ status: 'Excluído' })
        .eq('task_id', initialData.id)
        .eq('name', attachment.name);
        
      // Remove fisicamente do bucket
      if (attachment.storage_path) {
        await supabase.storage.from('client-documents').remove([attachment.storage_path]);
      }
      
      // Remove da tabela task_attachments
      if (attachment.id) {
        await supabase.from('task_attachments' as any)
          .delete()
          .eq('id', attachment.id);
      }
      
      // Atualiza estado local
      setClientConfigs(prev => ({
        ...prev,
        [activeClientId]: {
          ...prev[activeClientId],
          existingAttachments: prev[activeClientId].existingAttachments.filter((_, i) => i !== index)
        }
      }));
      
    } catch (error: any) {
      console.error('Erro ao excluir anexo:', error);
      alert('Erro ao excluir anexo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddPendingTask = () => {
    if (selectedClientIds.length === 0) {
      return showNotify('Selecione pelo menos uma empresa no topo antes de adicionar a tarefa.', 'warning');
    }
    if (!tempTask.taskName || !tempTask.responsible || !tempTask.competence || !tempTask.vencimento || !tempTask.recurrence) {
      return showNotify('Preencha os campos obrigatórios (Tarefa, Responsável, Vencimento, Competência e Recorrência)', 'warning');
    }
    if (tempTask.recurrence !== 'mensal' && tempTask.recurrence !== 'personalizado' && tempTask.months.length === 0) {
      return showNotify('Selecione pelo menos um mês para esta recorrência', 'warning');
    }

    const taskWithClients = { ...tempTask, targetClients: null };

    if (editingTaskId) {
      // Update existing
      setPendingTasks(prev => prev.map(t =>
        t.id === editingTaskId ? { ...taskWithClients, id: editingTaskId } : t
      ));
      setEditingTaskId(null);
    } else {
      // Add new
      setPendingTasks([...pendingTasks, { ...taskWithClients, id: Date.now().toString() }]);
    }

    setTempTask({
      taskTypeId: '',
      taskName: '',
      sector: '',
      responsible: '',
      priority: Priority.MEDIA,
      competence: new Date().toISOString().substring(0, 7),
      vencimento: '',
      vencimentoVariavel: 'nao_aplica',
      recurrence: '',
      months: [],
      repetitions: 1,
    });
  };

  const handleEditPendingTask = (task: any) => {
    setEditingTaskId(task.id);
    setTempTask({
      taskTypeId: '', // We don't track the ID back, just the name/sector
      taskName: task.taskName,
      sector: task.sector,
      responsible: task.responsible,
      priority: task.priority,
      competence: task.competence,
      vencimento: task.vencimento,
      vencimentoVariavel: task.vencimentoVariavel,
      recurrence: task.recurrence,
      months: task.months || [],
      repetitions: task.repetitions || 1,
    });
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setTempTask({
      taskTypeId: '',
      taskName: '',
      sector: '',
      responsible: '',
      priority: Priority.MEDIA,
      competence: new Date().toISOString().substring(0, 7),
      vencimento: '',
      vencimentoVariavel: 'nao_aplica',
      recurrence: '',
      months: [],
      repetitions: 1,
    });
  };

  const getAutoFilledDueDate = (taskTypeName: string, comp: string, overrideVariable?: string) => {
    const type = taskTypes.find(t => t.name === taskTypeName);
    if (!type || !type.due_day || !comp) return null;
    
    const [y, m] = comp.split('-');
    if (!y || !m) return null;
    let year = parseInt(y);
    let month = parseInt(m) + 1;
    if (month > 12) { month = 1; year += 1; }
    
    const daysInMonth = new Date(year, month, 0).getDate();
    const day = Math.min(type.due_day, daysInMonth);
    
    const rawDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const variable = overrideVariable !== undefined ? overrideVariable : (type.non_working_day_action || 'nao_se_aplica');
    
    const finalDate = calculateAdjustedDate(rawDate, variable, holidayDates);
    return { vencimento: finalDate, vencimentoVariavel: variable };
  };

  const removePendingTask = (id: string) => {
    setPendingTasks(pendingTasks.filter(t => t.id !== id));
  };

  const handleSaveAll = async () => {
    if (selectedClientIds.length === 0) return showNotify('Selecione pelo menos uma empresa.', 'warning');
    if (selectedClientIds.length > 100) return showNotify('O limite máximo de 100 empresas por lote foi excedido.', 'warning');
    if (pendingTasks.length === 0) return showNotify('Adicione pelo menos uma tarefa à lista clicando no botão (+).', 'warning');

    // Recurrence Check for Editing
    const isRecurring = initialData?.recurrence && !['', 'unico', 'unica', 'única', 'nao_recorre', 'none'].includes(initialData.recurrence.toLowerCase());
    let hasFutureTasks = false;

    if (isEditing && isRecurring && updateFutureTasks === null && initialData?.clientId) {
      try {
        const { count, error } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', initialData.clientId)
          .eq('task_name', initialData.taskName)
          .gt('competence', initialData.competence);
          
        if (!error && count && count > 0) {
          hasFutureTasks = true;
        }
      } catch (e) {
        console.error('Erro ao verificar tarefas futuras:', e);
      }
    }

    if (isEditing && isRecurring && hasFutureTasks && updateFutureTasks === null) {
      setShowRecurrenceModal(true);
      return;
    }

    try {
      setIsSaving(true);
      setLoadingData(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return showNotify('Usuário não autenticado.', 'error');

      const tasksToSave = [...pendingTasks];
      const allTargetClients = new Set<string>();
      tasksToSave.forEach(t => {
        const targets = t.targetClients && t.targetClients.length > 0 ? t.targetClients : selectedClientIds;
        targets.forEach((c: string) => allTargetClients.add(c));
      });

      const finalTasksToInsert: any[] = [];
      const updateTasksToExecute: any[] = [];
      const clientAttachmentsMap: Record<string, File[]> = {};

      // We will iterate over EACH client
      for (const clientName of Array.from(allTargetClients)) {
        const client = clients.find(c => c.companyName === clientName);
        if (!client) continue;

        const config = clientConfigs[clientName];
        if (!config) continue;

        // Validação de Anexos para Simples Nacional
        if (['simples', 'simples_iva'].includes(config.taxRegime)) {
          if (!config.selectedAnnexes || config.selectedAnnexes.length === 0) {
            setIsSaving(false);
            setLoadingData(false);
            return showNotify(`A empresa ${clientName} é optante pelo Simples Nacional. Selecione ao menos 1 anexo.`, 'warning');
          }
        }

        // Mapeia arquivos para este cliente para inserção em lote posterior
        if (config.uploadedFiles && config.uploadedFiles.length > 0) {
          clientAttachmentsMap[clientName] = config.uploadedFiles;
        }

        for (const t of tasksToSave) {
          const tTargets = t.targetClients && t.targetClients.length > 0 ? t.targetClients : selectedClientIds;
          if (!tTargets.includes(clientName)) continue;

          if (isEditing && t.id === initialData.id) {
            const adjustedDate = calculateAdjustedDate(t.vencimento, t.vencimentoVariavel, holidayDates);
            updateTasksToExecute.push({
              id: t.id,
              client_id: client.id,
              client_name: client.companyName,
              task_name: t.taskName,
              sector: t.sector,
              responsible: t.responsible,
              competence: t.competence,
              due_date: adjustedDate || null,
              variable_adjustment: t.vencimentoVariavel,
              priority: t.priority,
              status: initialData.status,
              recurrence: t.recurrence,
              recurrence_months: t.months,
              tax_regime: config.taxRegime,
              registration_regime: config.regimeRegistro,
              no_movement: config.semMovimento,
              exceeded_sublimit: config.excedeuSublimite,
              factor_r: config.fatorR,
              notified_exclusion: config.notifiedExclusion,
              selected_annexes: config.selectedAnnexes,
              observation: config.observation,
              org_id: user.id
            });
          } else {
            // Lógica de expansão para CRIAÇÃO
            const [startYear, startMonth] = t.competence.split('-').map(Number);
            let monthOffset = 0;
            let baseDay = 10;

            if (t.vencimento) {
              const typeDef = taskTypes.find(tt => tt.name === t.taskName);
              const dDate = new Date(t.vencimento + 'T12:00:00');
              const dYear = dDate.getFullYear();
              const dMonth = dDate.getMonth() + 1;
              monthOffset = (dYear - startYear) * 12 + (dMonth - startMonth);
              baseDay = typeDef?.due_day || dDate.getDate();
            }

            const createIterationPayload = (month: number, year: number) => {
              const compStr = `${year}-${month.toString().padStart(2, '0')}`;
              const targetDueDate = new Date(year, (month - 1) + monthOffset, baseDay, 12, 0, 0);
              const yearVal = targetDueDate.getFullYear();
              const monthVal = (targetDueDate.getMonth() + 1).toString().padStart(2, '0');
              const dayVal = targetDueDate.getDate().toString().padStart(2, '0');
              const rawDueStr = `${yearVal}-${monthVal}-${dayVal}`;
              const finalDate = calculateAdjustedDate(rawDueStr, t.vencimentoVariavel, holidayDates);

              return {
                client_id: client.id,
                client_name: client.companyName,
                task_name: t.taskName,
                sector: t.sector,
                responsible: t.responsible,
                competence: compStr,
                due_date: finalDate,
                variable_adjustment: t.vencimentoVariavel,
                priority: t.priority,
                status: TaskStatus.PENDENTE,
                recurrence: t.recurrence,
                recurrence_months: t.months,
                tax_regime: config.taxRegime,
                registration_regime: config.regimeRegistro,
                no_movement: config.semMovimento,
                exceeded_sublimit: config.excedeuSublimite,
                factor_r: config.fatorR,
                notified_exclusion: config.notifiedExclusion,
                selected_annexes: config.selectedAnnexes,
                observation: config.observation,
                org_id: user.id
              };
            };

            if (t.recurrence === 'mensal') {
              for (let i = 0; i < 12; i++) {
                let m = startMonth + i;
                let y = startYear;
                while (m > 12) { m -= 12; y++; }
                finalTasksToInsert.push(createIterationPayload(m, y));
              }
            } else if (t.recurrence === 'personalizado') {
              for (let i = 0; i < (t.repetitions || 1); i++) {
                let currentMonth = startMonth + i;
                let currentYear = startYear;
                while (currentMonth > 12) {
                  currentMonth -= 12;
                  currentYear++;
                }
                finalTasksToInsert.push(createIterationPayload(currentMonth, currentYear));
              }
            } else {
              const selectedMonths = t.months || [];
              for (let i = 0; i < 12; i++) {
                let m = startMonth + i;
                let y = startYear;
                while (m > 12) { m -= 12; y++; }
                if (selectedMonths.includes(m)) {
                  finalTasksToInsert.push(createIterationPayload(m, y));
                }
              }
            }
          }
        }
      }

      // EXECUÇÃO DAS ATUALIZAÇÕES (Edição)
      if (updateTasksToExecute.length > 0) {
        for (const payload of updateTasksToExecute) {
          const { data: taskData, error: taskError } = await (supabase.from('tasks') as any)
            .update(payload)
            .eq('id', payload.id)
            .select().single();

          if (taskError) throw taskError;

          const wfs = clientConfigs[payload.client_name]?.workflows;

          // Atualizar tarefas futuras se solicitado
          if (updateFutureTasks && taskData) {
            const { data: futureTasks, error: fetchFutureError } = await (supabase.from('tasks') as any)
               .select('id, competence')
               .eq('client_id', payload.client_id)
               .eq('org_id', userProfile.org_id)
               .eq('task_name', initialData.taskName)
               .gt('competence', initialData.competence);

            if (futureTasks && futureTasks.length > 0) {
              const t = tasksToSave.find(x => x.id === payload.id);
              for (const ft of futureTasks) {
                let updatedFields: any = {
                  responsible: payload.responsible,
                  priority: payload.priority,
                  tax_regime: payload.tax_regime,
                  registration_regime: payload.registration_regime,
                  no_movement: payload.no_movement,
                  exceeded_sublimit: payload.exceeded_sublimit,
                  factor_r: payload.factor_r,
                  notified_exclusion: payload.notified_exclusion,
                  selected_annexes: payload.selected_annexes,
                  observation: payload.observation
                };

                if (t && t.vencimento) {
                  const [startYear, startMonth] = t.competence.split('-').map(Number);
                  const dDate = new Date(t.vencimento + 'T12:00:00');
                  const dYear = dDate.getFullYear();
                  const dMonth = dDate.getMonth() + 1;
                  const baseDay = dDate.getDate();
                  const monthOffset = (dYear - startYear) * 12 + (dMonth - startMonth);

                  const [fYear, fMonth] = ft.competence.split('-').map(Number);
                  const targetMonthIndex = (fMonth - 1) + monthOffset;
                  const tempDate = new Date(fYear, targetMonthIndex, 1);
                  const resYear = tempDate.getFullYear();
                  const resMonth = tempDate.getMonth();
                  const daysInResMonth = new Date(resYear, resMonth + 1, 0).getDate();
                  const finalDay = Math.min(baseDay, daysInResMonth);
                  const rawFutureDueStr = `${resYear}-${(resMonth + 1).toString().padStart(2, '0')}-${finalDay.toString().padStart(2, '0')}`;

                  const adjustedDueDate = calculateAdjustedDate(rawFutureDueStr, payload.variable_adjustment, holidayDates);

                  updatedFields.due_date = adjustedDueDate;
                  updatedFields.variable_adjustment = payload.variable_adjustment;
                }

                const { error: futureUpdateError } = await (supabase.from('tasks') as any)
                  .update(updatedFields)
                  .eq('id', ft.id);
                if (futureUpdateError) throw futureUpdateError;

                // Replicar os workflows em cascata para a tarefa futura
                if (wfs) {
                  const { error: deleteWfError } = await (supabase as any)
                    .from('task_workflows')
                    .delete()
                    .eq('task_id', ft.id);
                  if (deleteWfError) throw deleteWfError;

                  if (wfs.length > 0) {
                    const futureWfsToInsert = wfs.map((wf: any, idx: number) => ({
                      task_id: ft.id,
                      description: wf.description,
                      is_completed: false, // Tarefas futuras iniciam pendentes
                      is_mandatory: wf.is_mandatory || false,
                      order_index: idx
                    }));
                    const { error: insertWfError } = await (supabase as any)
                      .from('task_workflows')
                      .insert(futureWfsToInsert);
                    if (insertWfError) throw insertWfError;
                  }
                }
              }
            }
          }

          // Arquivos para edição
          const files = clientAttachmentsMap[payload.client_name];
          if (files && files.length > 0) {
            for (const file of files) {
              await (supabase.from('task_attachments') as any).insert({
                task_id: taskData.id,
                file_name: file.name,
                file_size: file.size,
                storage_path: `tasks/${taskData.id}/${file.name}`,
                is_conclude_attachment: false
              });
            }
          }

          // Workflows para edição
          if (wfs) {
            await (supabase as any).from('task_workflows').delete().eq('task_id', taskData.id);
            if (wfs.length > 0) {
              const wfsToInsert = wfs.map((wf: any, idx: number) => ({
                task_id: taskData.id,
                description: wf.description,
                is_completed: wf.is_completed || false,
                is_mandatory: wf.is_mandatory || false,
                order_index: idx
              }));
              await (supabase as any).from('task_workflows').insert(wfsToInsert);
            }
          }
        }
      }

      // EXECUÇÃO DAS INSERÇÕES EM LOTE (Criação)
      if (finalTasksToInsert.length > 0) {
        const { data, error: insertError } = await (supabase as any).from('tasks')
          .insert(finalTasksToInsert)
          .select();

        const insertedTasks = data as any[];

        if (insertError) throw insertError;

        if (insertedTasks && insertedTasks.length > 0) {
          const finalAttachmentsToInsert: any[] = [];
          const finalWorkflowsToInsert: any[] = [];
          for (const task of insertedTasks) {
            const files = clientAttachmentsMap[task.client_name];
            if (files && files.length > 0) {
              for (const file of files) {
                finalAttachmentsToInsert.push({
                  task_id: task.id,
                  file_name: file.name,
                  file_size: file.size,
                  storage_path: `tasks/${task.id}/${file.name}`,
                  is_conclude_attachment: false
                });
              }
            }
            
            const wfs = clientConfigs[task.client_name]?.workflows;
            if (wfs && wfs.length > 0) {
              wfs.forEach((wf: any, idx: number) => {
                finalWorkflowsToInsert.push({
                  task_id: task.id,
                  description: wf.description,
                  is_completed: wf.is_completed || false,
                  is_mandatory: wf.is_mandatory || false,
                  order_index: idx
                });
              });
            }
          }
          if (finalAttachmentsToInsert.length > 0) {
            const { error: attError } = await (supabase as any).from('task_attachments')
              .insert(finalAttachmentsToInsert);
            if (attError) throw attError;
          }
          if (finalWorkflowsToInsert.length > 0) {
            const { error: wfError } = await (supabase as any).from('task_workflows')
              .insert(finalWorkflowsToInsert);
            if (wfError) throw wfError;
          }
        }
      }

      showNotify(`${selectedClientIds.length} empresa(s) processada(s) com sucesso!`, 'success');
      setUpdateFutureTasks(null);
      // Aguarda 1.5s para o usuário ver a notificação antes de voltar
      await new Promise(resolve => setTimeout(resolve, 1500));
      onBack();
    } catch (error: any) {
      console.error('Error saving tasks:', error);
      showNotify('Erro ao salvar tarefas: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setIsSaving(false);
      setLoadingData(false);
    }
  };

  const tabs = [
    { id: 'recorrencia', label: 'Recorrência' },
    { id: 'simples', label: 'Simples Nacional' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'observacao', label: 'Observação' },
    { id: 'arquivos', label: 'Arquivos' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">

      {/* Notification Toast */}
      {notification.show && (
        <Notification
          show={notification.show}
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        />
      )}

      {/* Saving Overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 p-10 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-2xl">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-b-violet-500/60 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Salvando tarefa{pendingTasks.length > 1 ? 's' : ''}...</p>
              <p className="text-slate-400 text-sm mt-1">Aguarde, estamos processando {selectedClientIds.length} empresa(s).</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-lg flex-shrink-0 shadow-sm">
            <FileCheck2 size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-black text-slate-500 dark:text-slate-400 tracking-[0.3em] uppercase leading-none">
                {isEditing ? `Editando` : 'Cadastro de Tarefas em Lote'}
              </h1>
              {!isEditing && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded-full border border-indigo-100 dark:border-indigo-400/20 shadow-sm">
                  {selectedClientIds.length} {selectedClientIds.length === 1 ? 'Empresa' : 'Empresas'}
                </span>
              )}
            </div>
            <div className="h-0.5 w-6 bg-indigo-500/30 dark:bg-indigo-400/20 mt-1.5 rounded-full" />
            {isEditing && initialData && (
              <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">
                {initialData.taskName} | {initialData.clientName}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} disabled={isSaving}>Cancelar</Button>
          <Button
            icon={isSaving ? <div className="w-[18px] h-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save size={18} />}
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : `Criar ${pendingTasks.length || (tempTask.taskName ? 1 : 0)} Tarefa(s)`)}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUNA ESQUERDA: CONTEXTO DO CLIENTE */}
        <div className="lg:col-span-4 space-y-6">
          <Card title="Contexto do Cliente" titleClassName="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">
            {activeClientId && (
              <div className="flex justify-end mb-4">
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-tighter animate-pulse">
                  Editando: {activeClientId}
                </span>
              </div>
            )}
            <div className="space-y-6">
              <div className="space-y-4">
                <SearchableSelect
                  label="Empresa"
                  disabled={isEditing}
                  options={clients
                    .filter(c => !selectedClientIds.includes(c.companyName))
                    .map(c => ({
                      value: c.companyName,
                      label: c.companyName
                    }))}
                  value={isEditing ? (activeClientId || "") : ""}
                  onChange={(val) => {
                    if (val && !selectedClientIds.includes(val)) {
                      if (selectedClientIds.length >= 100) {
                        return showNotify('Você atingiu o limite máximo de 100 empresas selecionadas.', 'warning');
                      }
                      const newIds = [...selectedClientIds, val];
                      setSelectedClientIds(newIds);
                      if (!activeClientId) setActiveClientId(val);
                      setClientConfigs(prev => ({
                        ...prev,
                        [val]: createDefaultConfig(null, val)
                      }));
                    }
                  }}
                  placeholder="Selecione e adicione empresas..."
                />

                {selectedClientIds.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresas Selecionadas</label>
                      <span className={`text-[10px] font-bold ${selectedClientIds.length >= 100 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {selectedClientIds.length}/100
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedClientIds.map(id => (
                        <div
                          key={id}
                          onClick={() => setActiveClientId(id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${activeClientId === id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:border-indigo-300'
                            }`}
                        >
                          <span className="truncate max-w-[150px]">{id}</span>
                          {!isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIds = selectedClientIds.filter(x => x !== id);
                                setSelectedClientIds(newIds);
                                if (activeClientId === id) setActiveClientId(newIds[0] || null);
                                setClientConfigs(prev => {
                                  const { [id]: _, ...rest } = prev;
                                  return rest;
                                });
                              }}
                              className={`p-0.5 rounded-full hover:bg-white/20 ${activeClientId === id ? 'text-indigo-100' : 'text-slate-400'}`}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <GroupedSelect
                  label="Regime Tributário"
                  disabled={!activeClientId}
                  groups={TAX_REGIME_GROUPS}
                  value={activeClientId && clientConfigs[activeClientId] ? clientConfigs[activeClientId].taxRegime : ''}
                  onChange={(value) => {
                    if (activeClientId) {
                      setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], taxRegime: value }
                      }));
                    }
                  }}
                />
                <Select
                  label="Regime de Registro"
                  disabled={!activeClientId}
                  options={[
                    { value: 'competencia', label: 'Competência' },
                    { value: 'caixa', label: 'Caixa' },
                    { value: 'misto', label: 'Misto' },
                  ]}
                  value={activeClientId && clientConfigs[activeClientId] ? clientConfigs[activeClientId].regimeRegistro : ''}
                  onChange={(e) => {
                    if (activeClientId) {
                      setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], regimeRegistro: e.target.value }
                      }));
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-3 py-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={!activeClientId}
                  onClick={() => {
                    if (activeClientId && clientConfigs[activeClientId]) {
                      setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], semMovimento: !prev[activeClientId].semMovimento }
                      }));
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${activeClientId && clientConfigs[activeClientId] && clientConfigs[activeClientId].semMovimento ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${activeClientId && clientConfigs[activeClientId] && clientConfigs[activeClientId].semMovimento ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sem Movimento</span>
              </div>
            </div>
          </Card>

          {/* TABBARS REDUZIDAS PARA CONTEXTO GERAL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50 dark:bg-slate-900/50">
              {tabs
                .filter(t => t.id !== 'recorrencia')
                .map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
            </div>
            <div className="p-4 max-h-[400px] overflow-auto custom-scrollbar">
              {activeTab === 'simples' && activeClientId && clientConfigs[activeClientId] && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <Toggle
                      label="Exclusão Notificada"
                      value={clientConfigs[activeClientId].notifiedExclusion}
                      onChange={(val) => setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], notifiedExclusion: val }
                      }))}
                    />
                    <Toggle
                      label="Excedeu Sublimite?"
                      value={clientConfigs[activeClientId].excedeuSublimite}
                      onChange={(val) => setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], excedeuSublimite: val }
                      }))}
                    />
                    <Toggle
                      label="Fator R"
                      value={clientConfigs[activeClientId].fatorR}
                      onChange={(val) => setClientConfigs(prev => ({
                        ...prev,
                        [activeClientId]: { ...prev[activeClientId], fatorR: val }
                      }))}
                    />
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anexos</h4>
                    <div className="flex flex-wrap gap-2">
                      {SIMPLES_ANNEXES.map((annex) => (
                        <button
                          key={annex}
                          type="button"
                          onClick={() => toggleAnnex(annex)}
                          className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${clientConfigs[activeClientId].selectedAnnexes.includes(annex)
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700'
                            }`}
                        >
                          {annex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'observacao' && activeClientId && clientConfigs[activeClientId] && (
                <textarea
                  value={clientConfigs[activeClientId].observation}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientConfigs(prev => ({
                      ...prev,
                      [activeClientId]: { ...prev[activeClientId], observation: val }
                    }));
                  }}
                  className="w-full h-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Observações gerais para este cliente..."
                />
              )}

              {activeTab === 'arquivos' && activeClientId && clientConfigs[activeClientId] && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Clique ou arraste arquivos</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, PNG, JPG ou DOC (Máx. 10MB)</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">Arquivos selecionados</h4>
                    {(clientConfigs[activeClientId].uploadedFiles.length === 0 && clientConfigs[activeClientId].existingAttachments.length === 0) ? (
                      <div className="text-center py-4 text-xs text-slate-400 italic bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        Nenhum arquivo anexado ainda.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Existing Attachments */}
                        {clientConfigs[activeClientId].existingAttachments.map((file: any, idx: number) => (
                          <div key={`existing-${idx}`} className="flex items-center justify-between p-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline truncate"
                              >
                                {file.name}
                              </a>
                              <span className="text-[10px] text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded">Existente</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingAttachment(file, idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Excluir arquivo do portal"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* New Uploads */}
                        {clientConfigs[activeClientId].uploadedFiles.map((file, idx) => (
                          <div key={`new-${idx}`} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <File size={14} className="text-indigo-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                              <span className="text-[10px] text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                              onClick={() => removeFile(idx)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'workflow' && activeClientId && clientConfigs[activeClientId] && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-end gap-3 bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">Novo Checklist</label>
                      <input
                        type="text"
                        id={`workflow-input-${activeClientId}`}
                        placeholder="Digite e aperte Enter..."
                        className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              const newWfItem = { id: crypto.randomUUID(), description: val, is_completed: false, is_mandatory: isMandatoryWf };
                              setClientConfigs(prev => {
                                const nextConfigs = { ...prev };
                                // Se estiver em modo de criação em lote, aplicar a todas as empresas selecionadas
                                const targets = !isEditing ? selectedClientIds : [activeClientId];
                                
                                targets.forEach(cid => {
                                  if (nextConfigs[cid]) {
                                    nextConfigs[cid] = {
                                      ...nextConfigs[cid],
                                      workflows: [...(nextConfigs[cid].workflows || []), { ...newWfItem, id: crypto.randomUUID() }]
                                    };
                                  }
                                });
                                return nextConfigs;
                              });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="shrink-0 mb-0.5">
                      <Toggle
                        label="Obrigatório"
                        value={isMandatoryWf}
                        onChange={(val) => setIsMandatoryWf(val)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    {(clientConfigs[activeClientId].workflows?.length === 0) ? (
                      <div className="text-center py-4 text-xs text-slate-400 italic bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                        Nenhum item no workflow.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        {clientConfigs[activeClientId].workflows?.map((wf: any, idx: number) => (
                          <div key={wf.id || idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{wf.description}</span>
                              {wf.is_mandatory && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                                  Obrigatório
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const descToRemove = wf.description;
                                setClientConfigs(prev => {
                                  const nextConfigs = { ...prev };
                                  const targets = !isEditing ? selectedClientIds : [activeClientId];
                                  
                                  targets.forEach(cid => {
                                    if (nextConfigs[cid]) {
                                      nextConfigs[cid] = {
                                        ...nextConfigs[cid],
                                        workflows: (nextConfigs[cid].workflows || []).filter((w: any) => w.description !== descToRemove)
                                      };
                                    }
                                  });
                                  return nextConfigs;
                                });
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: TAREFAS */}
        <div className="lg:col-span-8 space-y-6">
          <Card title="Adicionar Tarefas à Operação" titleClassName="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">
            <div className="space-y-6">
              {/* LINHA DE ADIÇÃO RÁPIDA */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3">
                    <Select
                      label="Tarefa"
                      className="text-[11px]"
                      disabled={isEditing}
                      options={taskTypes.map(t => ({ value: t.name, label: t.name }))}
                      value={tempTask.taskName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const type = taskTypes.find(t => t.name === val);
                        
                        let newVencimento = tempTask.vencimento;
                        let newVariavel = tempTask.vencimentoVariavel;
                        const autoFill = getAutoFilledDueDate(val, tempTask.competence);
                        if (autoFill) {
                          newVencimento = autoFill.vencimento;
                          newVariavel = autoFill.vencimentoVariavel;
                        }

                        setTempTask(prev => ({
                          ...prev,
                          taskName: val,
                          sector: type?.sector_id ? sectors.find(s => s.id === type.sector_id)?.name || prev.sector : prev.sector,
                          vencimento: newVencimento,
                          vencimentoVariavel: newVariavel
                        }));
                      }}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Select
                      label="Responsável"
                      className="text-[11px]"
                      options={[
                        ...(userProfile ? [{
                          value: userProfile.full_name || userProfile.email || 'Eu',
                          label: userProfile.full_name || userProfile.email || 'Eu'
                        }] : []),
                        ...members.map(m => ({
                          value: `${m.first_name} ${m.last_name}`,
                          label: `${m.first_name} ${m.last_name}`
                        }))
                      ]}
                      value={tempTask.responsible}
                      onChange={(e) => setTempTask(prev => ({ ...prev, responsible: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="month"
                      label="Período Inicial"
                      className="text-[11px]"
                      value={tempTask.competence}
                      onChange={(e) => {
                        const val = e.target.value;
                        let newVencimento = tempTask.vencimento;
                        let newVariavel = tempTask.vencimentoVariavel;
                        const autoFill = getAutoFilledDueDate(tempTask.taskName, val);
                        if (autoFill) {
                          newVencimento = autoFill.vencimento;
                          newVariavel = autoFill.vencimentoVariavel;
                        }
                        setTempTask(prev => ({ ...prev, competence: val, vencimento: newVencimento, vencimentoVariavel: newVariavel }));
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="date"
                      label="Vencimento"
                      className="text-[11px]"
                      value={tempTask.vencimento}
                      onChange={(e) => setTempTask(prev => ({ ...prev, vencimento: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Select
                      label="Variável"
                      className="text-[11px]"
                      tooltip="Define se o vencimento deve ser antecipado ou prorrogado caso caia em fins de semana ou feriados."
                      options={[
                        { value: 'nao_aplica', label: 'Não se aplica' },
                        { value: 'antecipar', label: 'Antecipar' },
                        { value: 'prorrogar', label: 'Prorrogar' },
                      ]}
                      value={tempTask.vencimentoVariavel}
                      onChange={(e) => {
                        const val = e.target.value;
                        let newVencimento = tempTask.vencimento;
                        const autoFill = getAutoFilledDueDate(tempTask.taskName, tempTask.competence, val);
                        if (autoFill) {
                          newVencimento = autoFill.vencimento;
                        }
                        setTempTask(prev => ({ ...prev, vencimentoVariavel: val, vencimento: newVencimento }));
                      }}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <Select
                      label="Recorrência"
                      className="text-[11px]"
                      disabled={isEditing}
                      options={[
                        { value: '', label: 'Selecione' },
                        { value: 'personalizado', label: 'Personalizado' },
                        { value: 'mensal', label: 'Mensal' },
                        { value: 'bimestral', label: 'Bimestral' },
                        { value: 'trimestral', label: 'Trimestral' },
                        { value: 'semestral', label: 'Semestral' },
                        { value: 'anual', label: 'Anual' },
                      ]}
                      value={tempTask.recurrence}
                      onChange={(e) => {
                        const val = e.target.value;
                        const defaultMonths: Record<string, number[]> = {
                          mensal: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                          bimestral: [2, 4, 6, 8, 10, 12],
                          trimestral: [3, 6, 9, 12],
                          semestral: [6, 12],
                          anual: [],
                          personalizado: [],
                        };
                        setTempTask(prev => ({
                          ...prev,
                          recurrence: val,
                          months: defaultMonths[val] ?? []
                        }));
                      }}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Select
                      label="Prioridade"
                      className="text-[11px]"
                      options={[
                        { value: Priority.BAIXA, label: 'Baixa' },
                        { value: Priority.MEDIA, label: 'Média' },
                        { value: Priority.ALTA, label: 'Alta' },
                      ]}
                      value={tempTask.priority}
                      onChange={(e) => setTempTask(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    />
                  </div>

                  {tempTask.recurrence === 'personalizado' && (
                    <div className="md:col-span-4 animate-in fade-in zoom-in-95 duration-200">
                      <Input
                        type="number"
                        label="Quantidade de Repetições"
                        min={1}
                        max={60}
                        className="text-[11px]"
                        value={tempTask.repetitions}
                        onChange={(e) => setTempTask(prev => ({ ...prev, repetitions: parseInt(e.target.value) || 1 }))}
                      />
                    </div>
                  )}

                  <div className="md:col-span-4 flex gap-2">
                    {editingTaskId ? (
                      <button
                        onClick={handleAddPendingTask}
                        className="flex-1 h-10 flex items-center justify-center gap-2 px-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all animate-in fade-in zoom-in-95 duration-200"
                      >
                        <Save size={18} />
                        Atualizar
                      </button>
                    ) : (
                      <Button
                        variant="success"
                        icon={<Plus size={18} />}
                        onClick={handleAddPendingTask}
                        className="w-full h-10 font-bold"
                      >
                        Adicionar à Lista
                      </Button>
                    )}

                    {editingTaskId && (
                      <button
                        onClick={cancelEditing}
                        className="h-10 flex items-center justify-center gap-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                      >
                        <X size={18} />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* MONTH SELECTOR */}
                {tempTask.recurrence !== 'personalizado' && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">
                      Selecione os meses de repetição
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                      {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((month, idx) => {
                        const monthNum = idx + 1;
                        return (
                          <button
                            key={month}
                            type="button"
                            disabled={isEditing}
                            onClick={() => {
                              setTempTask(prev => ({
                                ...prev,
                                months: prev.months.includes(monthNum)
                                  ? prev.months.filter(m => m !== monthNum)
                                  : [...prev.months, monthNum]
                              }));
                            }}
                            className={`py-2 px-1 rounded-lg border text-xs font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${tempTask.months.includes(monthNum)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-300'
                              }`}
                          >
                            {month}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* LISTA DE TAREFAS ADICIONADAS - CARDS REORGANIZADOS E COMPACTOS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ListChecks size={14} />
                    Tarefas na Fila ({pendingTasks.length})
                  </h4>
                  {pendingTasks.length > 0 && (
                    <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                      Pronto para salvar
                    </span>
                  )}
                </div>

                {pendingTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800/50 rounded-2xl bg-slate-50/30 dark:bg-slate-900/20 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4 scale-110">
                      <Zap size={32} />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhuma tarefa na fila</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Preencha os campos acima e clique em "Adicionar à Lista" para montar sua operação.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {pendingTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className={`group relative overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 rounded-2xl p-4 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${editingTaskId === task.id ? 'ring-2 ring-amber-500/50 border-amber-500 shadow-amber-500/10 bg-amber-50/10 dark:bg-amber-900/5' : ''}`}
                      >
                        {/* Seção 1: Nome e Prioridade */}
                        <div className="flex justify-between items-start gap-2 mb-3 relative z-10">
                          <h5 className="text-[13px] font-black text-slate-800 dark:text-slate-100 truncate tracking-tight leading-tight flex-1">
                            {task.taskName}
                          </h5>
                          <span className={`shrink-0 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm ${
                            task.priority === Priority.ALTA 
                              ? 'bg-rose-500 text-white' 
                              : task.priority === Priority.MEDIA 
                                ? 'bg-amber-400 text-amber-950' 
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Seção 2: Datas e Regra (Compacto) */}
                        <div className="flex items-center gap-2 mb-3 relative z-10 bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100/50 dark:border-slate-700/30 flex-nowrap overflow-hidden">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            <Calendar size={12} className="shrink-0 opacity-80" />
                            <span>{task.competence.split('-').reverse().join('/')}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            <Clock size={12} className="shrink-0 opacity-80" />
                            <span>{task.vencimento ? new Date(task.vencimento + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                          <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap italic truncate">
                            <GitCompareArrows size={12} className="shrink-0 opacity-60" />
                            <span>{task.vencimentoVariavel === 'nao_aplica' ? 'Fixo' : (task.vencimentoVariavel.charAt(0).toUpperCase() + task.vencimentoVariavel.slice(1))}</span>
                          </div>
                        </div>

                        {/* Seção 3: Recorrência e Meses */}
                        <div className="mb-3 relative z-10">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                              <Repeat size={12} className="text-indigo-500 shrink-0" />
                              <span className="capitalize">{task.recurrence}</span>
                            </div>
                          </div>
                          {task.months.length > 0 && task.recurrence !== 'mensal' && (
                            <div className="flex flex-wrap gap-1">
                              {task.months.map((m: number) => (
                                <span key={m} className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[8px] font-bold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 uppercase tracking-tighter shadow-sm">
                                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m - 1]}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Seção 4: Empresas */}
                        <div className="mb-4 relative z-10">
                          {(() => {
                            const targets = task.targetClients && task.targetClients.length > 0 ? task.targetClients : selectedClientIds;
                            if (targets.length === 1) {
                              return (
                                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50">
                                  <div className="p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                                    <Building2 size={12} className="text-slate-500 dark:text-slate-400" />
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate flex-1">{targets[0]}</span>
                                </div>
                              );
                            } else if (targets.length > 1) {
                              return (
                                <Tooltip content={
                                  <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                    {targets.map((c: string, i: number) => (
                                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-200">
                                        <Building2 size={10} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{c}</span>
                                      </div>
                                    ))}
                                  </div>
                                }>
                                  <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 cursor-help">
                                    <div className="p-1.5 bg-white dark:bg-indigo-500/20 rounded-lg shadow-sm">
                                      <Building2 size={12} className="text-indigo-500 dark:text-indigo-400" />
                                    </div>
                                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Lote: {targets.length} Empresas</span>
                                  </div>
                                </Tooltip>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                                  <AlertCircle size={12} className="text-rose-500" />
                                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Nenhuma empresa</span>
                                </div>
                              );
                            }
                          })()}
                        </div>

                        {/* Seção 5: Ações e Info Minimalista */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50 shrink-0">
                              <Layers size={8} className="opacity-50 text-slate-500" />
                              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{task.sector}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleEditPendingTask(task)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 transition-colors"
                              title="Editar"
                            >
                              <SquarePen size={14} />
                            </button>
                            {!isEditing && (
                              <button
                                onClick={() => removePendingTask(task.id)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recurrence Choice Modal for Editing */}
      <Modal isOpen={showRecurrenceModal} onClose={() => setShowRecurrenceModal(false)} title="Editar Tarefa Recorrente">
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
            <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Esta é uma tarefa recorrente</h4>
              <p className="text-xs text-amber-700 dark:text-amber-500/80 mt-1">Como deseja aplicar as alterações realizadas?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => {
                setUpdateFutureTasks(false);
                setShowRecurrenceModal(false);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-indigo-600 transition-colors">
                <FileText size={24} />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">Somente esta tarefa</div>
                <div className="text-xs text-slate-500">Aplica as alterações apenas para a competência selecionada ({initialData?.competence.split('-').reverse().join('/')})</div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => {
                setUpdateFutureTasks(true);
                setShowRecurrenceModal(false);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all group relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:text-indigo-600 transition-colors">
                <Repeat size={24} />
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">Este mês e futuros</div>
                <div className="text-xs text-slate-500">Altera esta e todas as tarefas subsequentes deste cliente</div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
            </button>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => setShowRecurrenceModal(false)}
              className="px-6 py-2 text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
