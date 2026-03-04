import React, { useEffect, useState } from 'react';
import { AlertCircle, FileWarning } from 'lucide-react';
import { WidgetContainer } from '../WidgetContainer';
import { supabase } from '../../../utils/supabaseClient';

interface Props {
    orgId: string;
    onRemove?: () => void;
}

type AlertItem = {
    id: string;
    type: 'certificate' | 'license';
    title: string;
    clientName: string;
    date: string;
    daysRemaining: number;
};

export const DocumentAlertsWidget: React.FC<Props> = ({ orgId, onRemove }) => {
    const [data, setData] = useState<AlertItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            if (!orgId) return;
            try {
                const today = new Date();
                const thirtyDaysFromNow = new Date();
                thirtyDaysFromNow.setDate(today.getDate() + 30);

                const todayStr = today.toISOString().split('T')[0];
                const futureStr = thirtyDaysFromNow.toISOString().split('T')[0];

                // Fetch Certificates
                const { data: certs } = await supabase
                    .from('client_certificates')
                    .select('id, expires_at, clients!inner(id, org_id, company_name)')
                    .eq('clients.org_id', orgId)
                    .gte('expires_at', todayStr)
                    .lte('expires_at', futureStr);

                // Fetch Licenses
                const { data: licenses } = await supabase
                    .from('client_licenses')
                    .select('id, license_name, expiry_date, clients!inner(id, org_id, company_name)')
                    .eq('clients.org_id', orgId)
                    .gte('expiry_date', todayStr)
                    .lte('expiry_date', futureStr);

                const combined: AlertItem[] = [];

                if (certs) {
                    certs.forEach((c: any) => {
                        const expDate = new Date(c.expires_at + 'T00:00:00');
                        const diffTime = expDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        combined.push({
                            id: `cert-${c.id}`,
                            type: 'certificate',
                            title: 'Certificado Digital',
                            clientName: c.clients?.company_name || 'Desconhecido',
                            date: c.expires_at,
                            daysRemaining: diffDays
                        });
                    });
                }

                if (licenses) {
                    licenses.forEach((l: any) => {
                        const expDate = new Date(l.expiry_date + 'T00:00:00');
                        const diffTime = expDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        combined.push({
                            id: `lic-${l.id}`,
                            type: 'license',
                            title: l.license_name || 'Licença/Alvará',
                            clientName: l.clients?.company_name || 'Desconhecido',
                            date: l.expiry_date,
                            daysRemaining: diffDays
                        });
                    });
                }

                combined.sort((a, b) => a.daysRemaining - b.daysRemaining);
                setData(combined.slice(0, 10));
            } catch (err) {
                console.error('Error fetching document alerts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, [orgId]);

    return (
        <WidgetContainer title="Alertas de Documentos" icon={<AlertCircle size={18} className="text-red-500" />} onRemove={onRemove}>
            <div className="flex-1 overflow-y-auto pr-2">
                {loading ? (
                    <div className="animate-pulse space-y-3">
                        {[1, 2].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded"></div>)}
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm p-4 text-center">
                        <FileWarning size={32} className="mb-2 opacity-50" />
                        Nenhuma certidão, certificado ou licença vencendo nos próximos 30 dias.
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {data.map((item) => (
                            <li key={item.id} className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 flex justify-between items-center group">
                                <div className="overflow-hidden min-w-0 pr-2">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.title}>
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={item.clientName}>
                                        {item.clientName}
                                    </p>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <div className="text-sm font-bold text-red-600 dark:text-red-400">
                                        {item.daysRemaining === 0 ? 'Hoje' : `${item.daysRemaining} dias`}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                        {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </WidgetContainer>
    );
};
