
// Global types

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

export type UserRole = 'gestor' | 'operacional';

export interface Task {
  id: string;
  clientName: string;
  taskName: string;
  competence: string; // MM/YYYY
  taxRegime: string;
  priority: Priority;
  sector: string;
  responsible: string;
  status: TaskStatus;
  dueDate?: string;
  recurrence?: string;
  attachments?: { name: string; size: number; url?: string }[];
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
  has_branches?: boolean;
  zip_code?: string;
  street?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
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
