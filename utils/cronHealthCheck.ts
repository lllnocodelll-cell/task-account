import { supabase } from './supabaseClient';

const HEALTH_CHECK_KEY = 'task_account_last_cron_healthcheck';
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // Checar no máximo a cada 12 horas por navegador
const MAX_STALE_CRON_HOURS = 48; // Se o cron estiver há mais de 48h sem rodar, aciona a auto-cura

/**
 * Mecanismo de Redundância e Auto-Cura (Frontend Fallback).
 * Verifica se a rotina do pg_cron executou recentemente.
 * Se o daemon do banco falhou ou o projeto esteve pausado,
 * invoca a RPC process_recurring_tasks_cycle() silenciosamente em background.
 */
export async function triggerCronHealthCheck(userRole?: string): Promise<void> {
  // Apenas equipe interna / gestores / staff executam o fallback (clientes não disparam jobs em lote)
  if (userRole === 'cliente') return;

  try {
    const lastCheckStr = localStorage.getItem(HEALTH_CHECK_KEY);
    const now = Date.now();

    if (lastCheckStr) {
      const lastCheckTime = parseInt(lastCheckStr, 10);
      if (!isNaN(lastCheckTime) && now - lastCheckTime < CHECK_INTERVAL_MS) {
        return; // Já verificado recentemente nesta sessão
      }
    }

    // Grava timestamp preliminar para evitar múltiplas chamadas concorrentes
    localStorage.setItem(HEALTH_CHECK_KEY, now.toString());

    // Consultar o último registro de auditoria do cron
    const { data: logs, error } = await (supabase as any)
      .from('recurring_task_cron_logs')
      .select('executed_at')
      .order('executed_at', { ascending: false })
      .limit(1);

    if (error) {
      console.debug('Aviso silencioso healthcheck cron:', error.message);
      return;
    }

    let needsHeal = false;

    if (!logs || logs.length === 0) {
      needsHeal = true;
    } else {
      const lastExecutedAt = new Date(logs[0].executed_at).getTime();
      const diffHours = (now - lastExecutedAt) / (1000 * 60 * 60);

      if (diffHours >= MAX_STALE_CRON_HOURS) {
        needsHeal = true;
      }
    }

    if (needsHeal) {
      console.info('Auto-cura disparada: cron com mais de 48h sem registro ou vazio. Recompondo ciclo em background...');
      await supabase.rpc('process_recurring_tasks_cycle');
      localStorage.setItem(HEALTH_CHECK_KEY, Date.now().toString());
    }
  } catch (err) {
    // Falha silenciosa para não impactar a navegação do usuário
    console.debug('Healthcheck cron fallback ignorado:', err);
  }
}
