
// Lista base de feriados (compartilhada entre Configurações e Tarefas)
export const HOLIDAYS = [
  { date: '01-01', name: 'Confraternização Universal', type: 'Nacional' },
  { date: '02-12', name: 'Carnaval', type: 'Facultativo' },
  { date: '02-13', name: 'Carnaval', type: 'Facultativo' },
  { date: '03-29', name: 'Sexta-feira Santa', type: 'Nacional' },
  { date: '04-21', name: 'Tiradentes', type: 'Nacional' },
  { date: '05-01', name: 'Dia do Trabalho', type: 'Nacional' },
  { date: '05-30', name: 'Corpus Christi', type: 'Facultativo' },
  { date: '09-07', name: 'Independência do Brasil', type: 'Nacional' },
  { date: '10-12', name: 'Nossa Senhora Aparecida', type: 'Nacional' },
  { date: '11-02', name: 'Finados', type: 'Nacional' },
  { date: '11-15', name: 'Proclamação da República', type: 'Nacional' },
  { date: '12-25', name: 'Natal', type: 'Nacional' },
];

export const isBusinessDay = (date: Date): boolean => {
  const day = date.getDay();
  // 0 = Domingo, 6 = Sábado
  if (day === 0 || day === 6) return false;

  // Formato MM-DD para comparar com a lista de feriados (ignorando ano para simplificar a base)
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const dayDate = date.getDate().toString().padStart(2, '0');
  const dateString = `${month}-${dayDate}`;

  return !HOLIDAYS.some(h => h.date === dateString);
};

export const calculateAdjustedDate = (baseDateStr: string, rule: 'none' | 'antecipar' | 'prorrogar'): string => {
  if (!baseDateStr || rule === 'none') return baseDateStr;

  let date = new Date(baseDateStr + 'T12:00:00'); // T12:00:00 evita problemas de timezone
  
  // Se já é dia útil, retorna a própria data
  if (isBusinessDay(date)) return baseDateStr;

  const direction = rule === 'antecipar' ? -1 : 1;

  while (!isBusinessDay(date)) {
    date.setDate(date.getDate() + direction);
  }

  return date.toISOString().split('T')[0];
};
