
// Global types
export const TAX_REGIME_GROUPS = [
  {
    category: 'Simples Nacional',
    options: [
      { value: 'simples', label: 'Simples' },
      { value: 'simples_iva', label: 'Simples IVA Dual' }
    ]
  },
  {
    category: 'Lucro Presumido',
    options: [
      { value: 'presumido', label: 'Presumido' },
      { value: 'presumido_imune', label: 'Presumido Imune-Isento' }
    ]
  },
  {
    category: 'Lucro Real',
    options: [
      { value: 'real_trimestral', label: 'Real Trimestral' },
      { value: 'real_anual', label: 'Real Anual' },
      { value: 'real_imune', label: 'Real Imune-Isento' }
    ]
  },
  {
    category: 'Lucro Arbitrado',
    options: [
      { value: 'arbitrado', label: 'Arbitrado' }
    ]
  },
  {
    category: 'Outros Regimes',
    options: [
      { value: 'mei', label: 'Microempreendedor' },
      { value: 'nanoempreendedor', label: 'Nanoempreendedor' },
      { value: 'irpf', label: 'IRPF Progressivo' }
    ]
  }
];

export const TAX_REGIME_LABELS: Record<string, string> = {
  // Configured mappings
  'simples': 'Simples',
  'simples_iva': 'Simples IVA Dual',
  'presumido': 'Presumido',
  'presumido_imune': 'Presumido Imune-Isento',
  'real_trimestral': 'Real Trimestral',
  'real_anual': 'Real Anual',
  'real_imune': 'Real Imune-Isento',
  'arbitrado': 'Arbitrado',
  'mei': 'Microempreendedor',
  'nanoempreendedor': 'Nanoempreendedor',
  'irpf': 'IRPF Progressivo',
  
  // Legacy mappings for retro-compatibility
  'lp': 'Lucro Presumido (Legado)',
  'lr': 'Lucro Real (Legado)'
};

export enum TaskStatus {
  PENDENTE = 'Pendente',
  INICIADA = 'Iniciada',
  ATRASADA = 'Atrasada',
  CONCLUIDA = 'Concluída',
}

export enum Priority {
  BAIXA = 'Baixa',
  MEDIA = 'Média',
  ALTA = 'Alta',
}

export type UserRole = 'gestor' | 'operacional' | 'cliente';

export interface TaskWorkflow {
  id: string;
  task_id?: string;
  description: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  order_index?: number;
}

export interface Task {
  id: string;
  clientId?: string;
  clientName: string;
  taskName: string;
  competence: string; // MM/YYYY
  priority: Priority;
  sector: string;
  responsible: string;
  status: TaskStatus;
  dueDate?: string;
  variableAdjustment?: string;
  recurrence?: string;
  recurrenceMonths?: number[];
  observation?: string;
  taxRegime?: string;
  registrationRegime?: string;
  noMovement?: boolean;
  exceededSublimit?: boolean;
  factorR?: boolean;
  notifiedExclusion?: boolean;
  selectedAnnexes?: string[];
  clientCity?: string;
  clientState?: string;
  clientDocument?: string;
  establishmentType?: string;
  hasBranches?: boolean;
  clientDfes?: { id: string; dfe_type: string; login_url?: string; issuer?: string; series?: string; username?: string; password?: string; }[];
  clientAccesses?: { id: string; access_name: string; username?: string; password?: string; access_url?: string; sector?: string; }[];
  clientLegislations?: { id: string; description: string; status?: string; access_url?: string; }[];
  attachments?: { id?: string; name: string; size: number; url?: string; storage_path?: string }[];
  temporary_tag?: string;
  workflows?: TaskWorkflow[];
}

export interface Client {
  id: string;
  code: string;
  companyName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  document: string; // CPF or CNPJ
  contactName: string;
  phoneFixed: string;
  phoneMobile: string;
  email: string;
  status: 'Ativo' | 'Inativo';
  segment: string;
  created_at?: string;
  person_type?: string;
  constitution_date?: string;
  entry_date?: string;
  exit_date?: string;
  admin_partner_name?: string;
  admin_partner_cpf?: string;
  admin_partner_birthdate?: string;
  establishment_type?: string;
  has_branches?: boolean; // Mantendo para retrocompatibilidade no front
  zip_code?: string;
  street?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  tax_regime?: string;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  sector: string;
  email: string;
}

export interface Sector {
  id: string;
  name: string;
  leader: string;
  costCenter: string;
}

export interface TaskType {
  id: string;
  name: string;
  sector: string;
  federativeEntity: 'Municipal' | 'Estadual' | 'Federal' | 'Outro';
}

export interface Tutorial {
  id: string;
  org_id: string;
  subject: string;
  client_id?: string | null;
  url?: string | null;
  description?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
  clients?: { company_name?: string; trade_name?: string } | null;
  profiles?: { full_name?: string; avatar_url?: string } | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string | null;
  related_entity_id?: string | null;
  created_at: string;
}

export interface UsefulLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  sector_id?: string;
  icon_name?: string;
  created_at?: string;
}
