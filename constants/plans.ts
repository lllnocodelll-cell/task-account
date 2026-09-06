/**
 * Configurações e regras de negócio para os planos do Task Account.
 * 
 * Este arquivo é a ÚNICA fonte de verdade para os limites e valores de planos.
 * Qualquer alteração de preços, limites de clientes ou de armazenamento (GB)
 * feita aqui refletirá automaticamente em todo o sistema.
 */

export type PlanName = 'Bronze' | 'Prata' | 'Ouro' | 'Elite';

export interface PlanConfig {
  name: PlanName;
  price: number; // 0 = Sob consulta
  clientLimit: number; // 999999 = ilimitado
  storageLimitGb: number;
  description: string;
  shortDesc: string;
  costPerClient?: string;
  isCustomPrice?: boolean;
}

export const PLANS: Record<PlanName, PlanConfig> = {
  Bronze: {
    name: 'Bronze',
    price: 199.90,
    clientLimit: 100,
    storageLimitGb: 50,
    shortDesc: 'Até 100 clientes | 50GB',
    description: 'Ideal para contadores autônomos e escritórios em início de atividade.',
    costPerClient: 'Investimento de 1,99 por cliente.'
  },
  Prata: {
    name: 'Prata',
    price: 349.90,
    clientLimit: 250,
    storageLimitGb: 100,
    shortDesc: 'Até 250 clientes | 100GB',
    description: 'Ideal para escritórios consolidados que buscam organizar suas rotinas e elevar o padrão de entrega.',
    costPerClient: 'Investimento de 1,40 por cliente.'
  },
  Ouro: {
    name: 'Ouro',
    price: 499.90,
    clientLimit: 350,
    storageLimitGb: 120,
    shortDesc: 'Até 350 clientes | 120GB',
    description: 'Para escritórios em franca expansão com alta demanda de processos e documentos.',
    costPerClient: 'Investimento de 1,42 por cliente.'
  },
  Elite: {
    name: 'Elite',
    price: 0,
    isCustomPrice: true,
    clientLimit: 999999,
    storageLimitGb: 500,
    shortDesc: 'Clientes & Espaço sob demanda',
    description: 'Projetado para grandes organizações contábeis que necessitam de capacidade sob demanda.',
    costPerClient: 'Consulte nossa equipe comercial.'
  }
};

export const PLANS_LIST: PlanConfig[] = [
  PLANS.Bronze,
  PLANS.Prata,
  PLANS.Ouro,
  PLANS.Elite
];

export const DEFAULT_PLAN_NAME: PlanName = 'Bronze';
export const DEFAULT_PLAN: PlanConfig = PLANS[DEFAULT_PLAN_NAME];

/**
 * Retorna a configuração de um plano pelo nome.
 * Se o plano não for encontrado, retorna a configuração do plano padrão (Bronze).
 */
export function getPlanConfig(planName?: string | null): PlanConfig {
  if (!planName) return DEFAULT_PLAN;
  return PLANS[planName as PlanName] || DEFAULT_PLAN;
}

/**
 * Retorna o limite de armazenamento em GB para um determinado plano.
 */
export function getPlanStorageLimitGb(planName?: string | null): number {
  return getPlanConfig(planName).storageLimitGb;
}

/**
 * Retorna o limite de clientes ativos para um determinado plano.
 */
export function getPlanClientLimit(planName?: string | null): number {
  return getPlanConfig(planName).clientLimit;
}

/**
 * Retorna o valor mensal do plano.
 */
export function getPlanPrice(planName?: string | null): number {
  return getPlanConfig(planName).price;
}

/**
 * Converte bytes para Gigabytes com precisão decimal configurável.
 */
export function bytesToGb(bytes: number, decimals: number = 2): number {
  if (!bytes || bytes <= 0) return 0;
  return Number((bytes / (1024 * 1024 * 1024)).toFixed(decimals));
}

/**
 * Formata a quantidade utilizada de forma amigável:
 * Se for menor que 0.1 GB (ex: 9.2 MB), inclui a indicação em MB para clareza imediata.
 */
export function formatStorageUsed(bytes: number): string {
  if (!bytes || bytes <= 0) return '0.00 GB (0 MB)';
  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);
  if (gb < 0.1) {
    return `${gb.toFixed(2)} GB (${mb.toFixed(1)} MB)`;
  }
  return `${gb.toFixed(2)} GB`;
}

/**
 * Calcula a porcentagem de uso de armazenamento dado o consumo em bytes e o limite em GB.
 * Retorna um número entre 0 e 100 (ou mais, caso ultrapasse e clamp seja false).
 */
export function calculateStoragePercentage(
  usedBytes: number,
  limitGb: number,
  clamp: boolean = true
): number {
  if (!limitGb || limitGb <= 0) return 0;
  const limitBytes = limitGb * 1024 * 1024 * 1024;
  const percent = (usedBytes / limitBytes) * 100;
  return clamp ? Math.min(100, Math.max(0, percent)) : percent;
}

/**
 * Retorna a cor e o status do medidor de armazenamento com base no percentual consumido.
 */
export function getStorageUsageStatus(percentage: number): {
  status: 'normal' | 'warning' | 'critical';
  barGradient: string;
  badgeColor: string;
  textColor: string;
} {
  if (percentage >= 90) {
    return {
      status: 'critical',
      barGradient: 'from-rose-500 to-red-600',
      badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
      textColor: 'text-rose-600 dark:text-rose-400'
    };
  }
  if (percentage >= 75) {
    return {
      status: 'warning',
      barGradient: 'from-amber-500 to-orange-500',
      badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400'
    };
  }
  return {
    status: 'normal',
    barGradient: 'from-indigo-500 to-sky-400',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
    textColor: 'text-indigo-600 dark:text-indigo-400'
  };
}
