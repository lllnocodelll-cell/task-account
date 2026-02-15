
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
}

export interface Client {
  id: number;
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
